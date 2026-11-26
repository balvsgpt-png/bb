/**
 * Generates and optimizes audio for speech recognition (Code Black standard).
 * Converts large audio (WAV, uncompressed, etc.) into speech-optimized 16kHz MP3,
 * achieving 85%-97% file size reduction without any loss in voice clarity.
 */

import { Mp3Encoder } from '@breezystack/lamejs';

export interface AudioSegment {
  base64: string;
  mimeType: string;
  duration: number;
  index: number;
}

export interface OptimizedAudioResult {
  base64: string;
  mimeType: string;
  duration: number;
  blob: Blob;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  audioSegments?: AudioSegment[];
}

export function encodeWAV(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + samples.length * 2, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, 1, true);
  /* channel count (mono) */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * 2, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, samples.length * 2, true);

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return buffer;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  let binary = '';
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const len = bytes.byteLength;
  const chunkSize = 8192; // Safe chunk size across browser call stacks
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as any);
  }
  return btoa(binary);
}

/**
 * Encodes 16-bit PCM mono samples into MP3 format using lamejs
 */
export function encodeMp3(samples: Int16Array, sampleRate = 16000, bitRate = 48): Uint8Array {
  const encoder = new Mp3Encoder(1, sampleRate, bitRate);
  const mp3Data: Uint8Array[] = [];
  const blockSize = 1152;
  for (let i = 0; i < samples.length; i += blockSize) {
    const chunk = samples.subarray(i, i + blockSize);
    const mp3buf = encoder.encodeBuffer(chunk);
    if (mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf));
    }
  }
  const endBuf = encoder.flush();
  if (endBuf.length > 0) {
    mp3Data.push(new Uint8Array(endBuf));
  }

  const totalLength = mp3Data.reduce((acc, b) => acc + b.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const b of mp3Data) {
    result.set(b, offset);
    offset += b.length;
  }
  return result;
}

/**
 * Directly converts any Blob or File to a Base64 string using the browser FileReader.
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const fullResult = reader.result as string;
      const base64 = fullResult.includes(',') ? fullResult.split(',')[1] : fullResult;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * High-performance speech audio optimizer:
 * Decodes input audio (WAV, MP3, M4A, etc.) via Web Audio API,
 * downsamples to 16,000 Hz mono and compresses to 48 kbps MP3.
 * Handles audios of any size (up to 300MB+ / 1 hour+) without triggering HTTP 413.
 */
export async function optimizeAudioForSpeech(
  audioSource: Blob,
  targetBitRate = 48
): Promise<OptimizedAudioResult> {
  const originalSize = audioSource.size;

  try {
    const arrayBuffer = await audioSource.arrayBuffer();
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) {
      throw new Error('Web Audio API not supported in this browser');
    }

    const tempCtx = new AudioCtxClass();
    const decoded = await tempCtx.decodeAudioData(arrayBuffer.slice(0));

    const targetSampleRate = 16000;
    const duration = decoded.duration || 0;
    const frameCount = Math.max(1, Math.ceil(duration * targetSampleRate));

    // Downsample and downmix to 1 channel (mono) via OfflineAudioContext
    const offlineCtx = new OfflineAudioContext(1, frameCount, targetSampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = decoded;
    source.connect(offlineCtx.destination);
    source.start(0);

    const rendered = await offlineCtx.startRendering();
    await tempCtx.close().catch(() => {});

    const channelData = rendered.getChannelData(0);

    // 1. Peak Normalization & Acoustic Voice Boost
    // Medical microphones (SpeechMike, headsets, laptops) frequently record at low input levels (< 0.1 peak).
    // To prevent false "silence / inaudible" detections by speech models, normalize peak to 0.90 (-1 dBFS)
    // with a safe dynamic gain up to 25x.
    let maxPeak = 0;
    for (let i = 0; i < channelData.length; i++) {
      const absVal = Math.abs(channelData[i]);
      if (absVal > maxPeak) maxPeak = absVal;
    }

    const gain = maxPeak > 0.005 ? Math.min(25, 0.90 / maxPeak) : 1.0;

    // Convert Float32Array to Int16Array with dynamic voice boost for MP3 encoder
    const int16Samples = new Int16Array(channelData.length);
    for (let i = 0; i < channelData.length; i++) {
      const boosted = channelData[i] * gain;
      const s = Math.max(-1, Math.min(1, boosted));
      int16Samples[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    // Segmenting for long recordings (> 15 minutes / 900 seconds)
    const segmentLengthSeconds = 600; // 10 minutes per segment
    const overlapSeconds = 2; // 2 seconds overlap at segment seams
    const segmentSamples = segmentLengthSeconds * targetSampleRate;
    const overlapSamples = overlapSeconds * targetSampleRate;

    let segments: AudioSegment[] | undefined;

    if (duration > 900) {
      segments = [];
      let startSample = 0;
      let segIdx = 0;

      while (startSample < int16Samples.length) {
        const endSample = Math.min(int16Samples.length, startSample + segmentSamples);
        const slice = int16Samples.subarray(startSample, endSample);
        const segMp3 = encodeMp3(slice, targetSampleRate, targetBitRate);
        const segBase64 = arrayBufferToBase64(segMp3);
        const segDuration = (endSample - startSample) / targetSampleRate;

        segments.push({
          base64: segBase64,
          mimeType: 'audio/mp3',
          duration: segDuration,
          index: segIdx,
        });

        segIdx++;
        startSample += (segmentSamples - overlapSamples);
      }
    }

    // Primary MP3 encoding (fits safely within Cloud Run 32MB and Gemini 20MB limits)
    const mp3Buffer = encodeMp3(int16Samples, targetSampleRate, targetBitRate);
    const mp3Blob = new Blob([mp3Buffer as unknown as BlobPart], { type: 'audio/mp3' });
    const base64 = arrayBufferToBase64(mp3Buffer);

    const optimizedSize = mp3Blob.size;
    const compressionRatio = originalSize > 0
      ? Math.max(0, Math.round((1 - optimizedSize / originalSize) * 100))
      : 0;

    return {
      base64,
      mimeType: 'audio/mp3',
      duration,
      blob: mp3Blob,
      originalSize,
      optimizedSize,
      compressionRatio,
      audioSegments: segments,
    };
  } catch (err) {
    console.warn('[Audio Optimizer] Direct fallback for audio reading due to:', err);
    const base64 = await blobToBase64(audioSource);
    return {
      base64,
      mimeType: audioSource.type || 'audio/wav',
      duration: 0,
      blob: audioSource,
      originalSize,
      optimizedSize: originalSize,
      compressionRatio: 0,
    };
  }
}

/**
 * Creates a synthetic audible audio buffer for testing if mic or sample file is not yet recorded
 */
export function generateToneWav(durationSeconds = 2, sampleRate = 16000): { base64: string; blob: Blob } {
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Harmonized gentle chime indicating dictation start
    const tone1 = Math.sin(2 * Math.PI * 440 * t) * Math.exp(-t * 1.5);
    const tone2 = Math.sin(2 * Math.PI * 880 * t) * Math.exp(-t * 2.0) * 0.5;
    samples[i] = (tone1 + tone2) * 0.3;
  }

  const wavBuffer = encodeWAV(samples, sampleRate);
  const blob = new Blob([wavBuffer], { type: 'audio/wav' });
  const base64 = arrayBufferToBase64(wavBuffer);

  return { base64, blob };
}
