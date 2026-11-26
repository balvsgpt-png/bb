import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Upload,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  FileAudio,
  Sparkles,
  AlertCircle,
  Clock,
  Gauge,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Layers
} from 'lucide-react';
import { SAMPLE_DICTATIONS, SampleDictation } from '../data/sampleDictations';
import { generateToneWav, arrayBufferToBase64, optimizeAudioForSpeech, blobToBase64 } from '../utils/audioSynthesis';

export interface AudioReadyData {
  base64: string;
  mimeType: string;
  name: string;
  duration: number;
  liveTranscript?: string;
  originalSize?: number;
  optimizedSize?: number;
  compressionRatio?: number;
  audioSegments?: Array<{
    base64: string;
    mimeType: string;
    duration: number;
    index: number;
  }>;
}

interface AudioRecorderProps {
  onAudioReady: (audioData: AudioReadyData) => void;
  onSelectSampleText?: (sample: SampleDictation) => void;
  isProcessing: boolean;
  theme?: 'light' | 'dark';
  resetTrigger?: number;
  selectedExamId?: string;
  onSelectExamId?: (id: string) => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onAudioReady,
  onSelectSampleText,
  isProcessing,
  theme = 'light',
  resetTrigger = 0,
  selectedExamId = 'auto',
  onSelectExamId,
}) => {
  const isDark = theme === 'dark';
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<{ name: string; size: number; mimeType: string } | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [dragActive, setDragActive] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationInfo, setOptimizationInfo] = useState<{
    originalSize: number;
    optimizedSize: number;
    ratio: number;
  } | null>(null);
  const [selectedSample, setSelectedSample] = useState<SampleDictation | null>(null);
  const [isSamplesMinimized, setIsSamplesMinimized] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('laudo_wav_samples_minimized') === 'true';
    }
    return false;
  });

  const toggleSamplesMinimized = () => {
    setIsSamplesMinimized((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('laudo_wav_samples_minimized', String(next));
      } catch {}
      return next;
    });
  };

  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const liveTranscriptRef = useRef<string>('');
  const speechRecognitionRef = useRef<any>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Reset when Next Report is clicked
  useEffect(() => {
    if (resetTrigger > 0) {
      setAudioUrl(null);
      setCurrentFile(null);
      setSelectedSample(null);
      setLiveTranscript('');
      liveTranscriptRef.current = '';
      setRecordingError(null);
      setCurrentTime(0);
      setAudioDuration(0);
    }
  }, [resetTrigger]);

  // Visualizer loop during recording
  const startVisualizer = (stream: MediaStream) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        animationFrameRef.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 1.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height;
          // Gradient from cyan to blue
          const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
          gradient.addColorStop(0, '#06b6d4');
          gradient.addColorStop(1, '#3b82f6');

          ctx.fillStyle = gradient;
          ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
          x += barWidth;
        }
      };

      draw();
    } catch (e) {
      console.warn('Audio visualizer error:', e);
    }
  };

  const stopVisualizer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  // Start live microphone recording
  const startRecording = async () => {
    setRecordingError(null);
    setSelectedSample(null);
    setLiveTranscript('');
    liveTranscriptRef.current = '';

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setRecordingError(
        'Seu navegador ou esta janela não disponibilizou a API de microfone (mediaDevices). Certifique-se de usar HTTPS e navegador atualizado (Chrome/Edge).'
      );
      return;
    }

    let acquiredStream: MediaStream | null = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      acquiredStream = stream;
      streamRef.current = stream;

      // Start Web Speech Recognition if supported
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.lang = 'pt-BR';
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.onresult = (event: any) => {
            let current = '';
            for (let i = 0; i < event.results.length; i++) {
              current += event.results[i][0].transcript + ' ';
            }
            const clean = current.trim();
            setLiveTranscript(clean);
            liveTranscriptRef.current = clean;
          };
          recognition.onerror = () => {};
          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch (e) {
          console.warn('Speech recognition start failed:', e);
        }
      }

      // Determine best supported mime type
      const mimeType = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/ogg')
        ? 'audio/ogg'
        : '';

      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
      } catch {
        mediaRecorder = new MediaRecorder(stream);
      }

      const effectiveMimeType = mediaRecorder.mimeType || mimeType || 'audio/webm';
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: effectiveMimeType });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        try {
          // Always optimize speech audio with peak normalization, acoustic boost (up to 25x), and 16kHz MP3 compression
          setIsOptimizing(true);
          try {
            const optimized = await optimizeAudioForSpeech(audioBlob);
            setCurrentFile({
              name: `ditacao_ao_vivo_${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.mp3`,
              size: optimized.optimizedSize,
              mimeType: optimized.mimeType,
            });
            setOptimizationInfo({
              originalSize: optimized.originalSize,
              optimizedSize: optimized.optimizedSize,
              ratio: optimized.compressionRatio,
            });
            onAudioReady({
              base64: optimized.base64,
              mimeType: optimized.mimeType,
              name: `Gravação ao Vivo (${formatTime(recordingTime)})`,
              duration: recordingTime,
              liveTranscript: liveTranscriptRef.current || undefined,
              originalSize: optimized.originalSize,
              optimizedSize: optimized.optimizedSize,
              compressionRatio: optimized.compressionRatio,
              audioSegments: optimized.audioSegments,
            });
            return;
          } catch (optErr) {
            console.warn('[AudioRecorder] Audio optimization fallback to direct upload:', optErr);
          } finally {
            setIsOptimizing(false);
          }

          const base64String = await blobToBase64(audioBlob);
          const ext = effectiveMimeType.includes('webm')
            ? 'webm'
            : effectiveMimeType.includes('mp4')
            ? 'mp4'
            : effectiveMimeType.includes('ogg')
            ? 'ogg'
            : 'wav';
          setCurrentFile({
            name: `ditacao_radiologica_${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.${ext}`,
            size: audioBlob.size,
            mimeType: effectiveMimeType,
          });
          onAudioReady({
            base64: base64String,
            mimeType: effectiveMimeType,
            name: `Gravação ao Vivo (${formatTime(recordingTime)})`,
            duration: recordingTime,
            liveTranscript: liveTranscriptRef.current || undefined,
            originalSize: audioBlob.size,
            optimizedSize: audioBlob.size,
            compressionRatio: 0,
          });
        } catch (err) {
          console.error('[AudioRecorder] Direct read error for live recording:', err);
          setRecordingError('Falha ao processar gravação do microfone. Tente novamente.');
        }

        stopVisualizer();
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingTime(0);
      startVisualizer(stream);

      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      if (acquiredStream) {
        acquiredStream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      const errName = err?.name || '';
      const errMsg = String(err?.message || '').toLowerCase();

      if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setRecordingError('Nenhum microfone foi encontrado neste computador. Conecte um microfone ou selecione um arquivo de áudio WAV.');
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        setRecordingError('O microfone está sendo usado por outro programa no momento (ou bloqueado pelo sistema operacional). Feche outros apps de áudio e tente novamente.');
      } else if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError' || errName === 'SecurityError') {
        if (errMsg.includes('permissions policy') || errMsg.includes('feature policy') || errMsg.includes('disallowed')) {
          setRecordingError('Permissão de microfone bloqueada pela política do frame do navegador. Recarregue a página ou abra o app diretamente em uma nova guia pelo link de visualização.');
        } else {
          setRecordingError('Acesso ao microfone negado. Recarregue a página, clique no cadeado ao lado da URL para permitir o microfone e verifique as permissões de privacidade do Windows/Mac.');
        }
      } else {
        setRecordingError(`Não foi possível acessar o microfone (${errName || 'erro de dispositivo'}). Verifique as permissões de áudio do seu navegador.`);
      }
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
      speechRecognitionRef.current = null;
    }

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // File upload handler
  const handleFile = async (file: File) => {
    setRecordingError(null);
    setSelectedSample(null);
    setLiveTranscript('');
    liveTranscriptRef.current = '';
    setOptimizationInfo(null);
    
    // Accept audio or .wav files
    if (!file.type.startsWith('audio/') && !file.name.toLowerCase().endsWith('.wav')) {
      setRecordingError('Formato inválido. Por favor, envie um arquivo de áudio (.WAV, .MP3, .WebM ou .M4A).');
      return;
    }

    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    // Read audio duration from audio element
    const audioTest = new Audio();
    audioTest.src = url;
    audioTest.onloadedmetadata = () => {
      if (audioTest.duration && isFinite(audioTest.duration)) {
        setAudioDuration(audioTest.duration);
      }
    };

    setIsOptimizing(true);

    try {
      // High-performance speech optimization to 16kHz MP3:
      // Supports large audio files (50MB, 100MB, 300MB+ uncompressed WAVs from PACS/SpeechMikes)
      // by downsampling and compressing into compact speech MP3 (~85%-97% size reduction)
      // with zero vocal distortion.
      const optimized = await optimizeAudioForSpeech(file);

      setOptimizationInfo({
        originalSize: optimized.originalSize,
        optimizedSize: optimized.optimizedSize,
        ratio: optimized.compressionRatio,
      });

      setCurrentFile({
        name: file.name,
        size: optimized.optimizedSize,
        mimeType: optimized.mimeType,
      });

      if (optimized.duration && optimized.duration > 0) {
        setAudioDuration(optimized.duration);
      }

      onAudioReady({
        base64: optimized.base64,
        mimeType: optimized.mimeType,
        name: file.name,
        duration: optimized.duration || audioTest.duration || 0,
        originalSize: optimized.originalSize,
        optimizedSize: optimized.optimizedSize,
        compressionRatio: optimized.compressionRatio,
        audioSegments: optimized.audioSegments,
      });
    } catch (err: any) {
      console.error('[AudioRecorder] Error optimizing audio file:', err);
      try {
        const base64String = await blobToBase64(file);
        const mimeType = file.type || (file.name.toLowerCase().endsWith('.wav') ? 'audio/wav' : 'audio/mp3');

        setCurrentFile({
          name: file.name,
          size: file.size,
          mimeType,
        });

        onAudioReady({
          base64: base64String,
          mimeType,
          name: file.name,
          duration: audioTest.duration || 0,
          originalSize: file.size,
          optimizedSize: file.size,
          compressionRatio: 0,
        });
      } catch (fallbackErr) {
        setRecordingError('Falha ao processar o arquivo de áudio. Tente novamente.');
      }
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Load sample dictation
  const handleLoadSample = (sample: SampleDictation) => {
    setSelectedSample(sample);
    if (onSelectSampleText) {
      onSelectSampleText(sample);
    }

    // Generate in-memory tone WAV for full pipeline test
    const { base64, blob } = generateToneWav(3.5, 16000);
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
    setCurrentFile({
      name: `Amostra_${sample.id}.wav`,
      size: blob.size,
      mimeType: 'audio/wav',
    });
    setAudioDuration(3.5);

    onAudioReady({
      base64,
      mimeType: 'audio/wav',
      name: `Amostra: ${sample.label}`,
      duration: 3.5,
      liveTranscript: sample.spokenText, // Always attach sample text so pipeline transcribes flawlessly
    });
  };

  // Toggle playback
  const togglePlay = () => {
    if (!audioPlayerRef.current) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.playbackRate = playbackRate;
      audioPlayerRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    if (audioPlayerRef.current) {
      setCurrentTime(audioPlayerRef.current.currentTime);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.currentTime = time;
    }
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.playbackRate = rate;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Recording & Upload Card */}
      <div
        className={`border rounded-2xl p-5 shadow-lg relative overflow-hidden transition-colors duration-200 ${
          isDark
            ? 'bg-[#030b1b] border-cyan-900/60 text-slate-100 shadow-[0_8px_30px_rgba(2,6,23,0.9)]'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Top Film Cassette Clip */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-slate-600 via-cyan-400 to-slate-600 rounded-b shadow-sm" />

        <div className="flex items-center justify-between mb-4 pt-1">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                isDark
                  ? 'bg-slate-950 border-cyan-800/80 text-cyan-400'
                  : 'bg-slate-100 border-slate-200 text-cyan-600'
              }`}
            >
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">Entrada de Áudio WAV / Ditafone</h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Grave diretamente ou envie seu arquivo de ditação .WAV
              </p>
            </div>
          </div>

          {currentFile && (
            <span
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border ${
                isDark
                  ? 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Áudio Carregado</span>
            </span>
          )}
        </div>

        {/* Seletor de Máscara / Exame Clínico */}
        <div className="mb-3.5">
          <div className="flex items-center justify-between mb-1.5">
            <label className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              isDark ? 'text-cyan-400' : 'text-slate-700'
            }`}>
              <Layers className="w-3.5 h-3.5 text-cyan-500" />
              <span>Máscara do Exame:</span>
            </label>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
              selectedExamId === 'auto'
                ? isDark
                  ? 'bg-cyan-950/70 border-cyan-800/60 text-cyan-300'
                  : 'bg-cyan-50 border-cyan-200 text-cyan-700'
                : isDark
                ? 'bg-emerald-950/70 border-emerald-800/60 text-emerald-300'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}>
              {selectedExamId === 'auto' ? '⚡ Detecção Automática Ativa' : '✓ Exame Fixado'}
            </span>
          </div>
          <select
            value={selectedExamId || 'auto'}
            onChange={(e) => onSelectExamId && onSelectExamId(e.target.value)}
            className={`w-full text-xs rounded-xl p-2.5 font-medium border focus:outline-none focus:ring-2 focus:ring-cyan-500 transition cursor-pointer ${
              isDark
                ? 'bg-slate-900 border-cyan-900/60 text-slate-100 hover:border-cyan-500/50'
                : 'bg-white border-slate-300 text-slate-900 shadow-xs hover:border-cyan-500'
            }`}
            title="Escolha o exame para fixar a máscara ou deixe em detecção automática inteligente"
          >
            <option value="auto">⚡ Detecção Automática Inteligente por IA (Tórax, Crânio, Abdome, Coluna...)</option>
            <optgroup label="COM CONTRASTE">
              <option value="tórax-com">TOMOGRAFIA DE TÓRAX (COM CONTRASTE)</option>
              <option value="crânio-com">TOMOGRAFIA DE CRÂNIO (COM CONTRASTE)</option>
              <option value="abdome-total-com">TOMOGRAFIA DE ABDOME TOTAL (COM CONTRASTE)</option>
              <option value="pescoço-com">TOMOGRAFIA DE PESCOÇO (COM CONTRASTE)</option>
            </optgroup>
            <optgroup label="SEM CONTRASTE">
              <option value="tórax-sem">TOMOGRAFIA DE TÓRAX (SEM CONTRASTE)</option>
              <option value="crânio-sem">TOMOGRAFIA DE CRÂNIO (SEM CONTRASTE)</option>
              <option value="coluna-cervical-sem">TOMOGRAFIA DE COLUNA CERVICAL (SEM CONTRASTE)</option>
              <option value="coluna-dorsal-sem">TOMOGRAFIA DE COLUNA DORSAL (SEM CONTRASTE)</option>
              <option value="coluna-lombar-sem">TOMOGRAFIA DE COLUNA LOMBAR (SEM CONTRASTE)</option>
              <option value="seios-da-face-sem">TOMOGRAFIA DE SEIOS DA FACE (SEM CONTRASTE)</option>
              <option value="pescoço-sem">TOMOGRAFIA DE PESCOÇO (SEM CONTRASTE)</option>
              <option value="pelve-bacia-sem">PELVE E BACIA (SEM CONTRASTE)</option>
              <option value="abdome-total-sem">ABDOME TOTAL (SEM CONTRASTE)</option>
              <option value="membros-sem">ARTICULAÇÃO / MEMBRO (SEM CONTRASTE)</option>
            </optgroup>
            <optgroup label="ANGIOTOMOGRAFIAS">
              <option value="angio-carotidas-vertebrais">ANGIOTOMOGRAFIA DE CARÓTIDAS E VERTEBRAIS</option>
              <option value="angio-arterias-cerebrais">ANGIOTOMOGRAFIA DE ARTÉRIAS CEREBRAIS</option>
              <option value="angio-cerebral">ANGIOTOMOGRAFIA CEREBRAL</option>
              <option value="angio-aorta-abdominal">ANGIOTOMOGRAFIA DE AORTA ABDOMINAL</option>
            </optgroup>
          </select>
        </div>

        {/* Live Visualizer or Wave Canvas */}
        <div
          className={`relative rounded-xl border p-4 mb-4 flex flex-col items-center justify-center min-h-[140px] overflow-hidden transition-colors ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          {isOptimizing ? (
            <div className="w-full flex flex-col items-center justify-center gap-2.5 py-4">
              <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                </span>
                <span className="text-xs font-bold font-mono uppercase tracking-wider">
                  Otimizando Áudio de Alta Capacidade...
                </span>
              </div>
              <p className={`text-xs text-center max-w-md ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Compactando fala para 16kHz sem perda acústica para transmissão sem limite de tamanho (evita erros de upload).
              </p>
            </div>
          ) : isRecording ? (
            <div className="w-full flex flex-col items-center gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <span className="text-sm font-mono font-bold text-red-500 uppercase tracking-wider">
                  Gravando Ditação
                </span>
                <span
                  className={`text-base font-mono font-bold px-3 py-0.5 rounded-lg border ${
                    isDark
                      ? 'bg-slate-900 border-slate-800 text-white'
                      : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                  }`}
                >
                  {formatTime(recordingTime)}
                </span>
              </div>
              <canvas ref={canvasRef} width={400} height={48} className="w-full max-w-md h-12" />
              {liveTranscript ? (
                <div
                  className={`w-full max-w-md rounded-lg p-2.5 text-[11px] font-mono italic max-h-16 overflow-y-auto border ${
                    isDark
                      ? 'bg-slate-900/90 border-cyan-800/60 text-cyan-300'
                      : 'bg-white border-cyan-200 text-cyan-800 shadow-sm'
                  }`}
                >
                  "{liveTranscript}"
                </div>
              ) : (
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Fale os achados e use comandos como <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">"ponto parágrafo"</span>, números das frases e <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">"opinião"</span>.
                </p>
              )}
            </div>
          ) : currentFile ? (
            <div className="w-full flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-2 rounded-lg border ${
                      isDark
                        ? 'bg-cyan-950/80 border-cyan-800/50 text-cyan-400'
                        : 'bg-cyan-50 border-cyan-200 text-cyan-700'
                    }`}
                  >
                    <FileAudio className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold truncate max-w-xs sm:max-w-md">
                      {currentFile.name}
                    </p>
                    <p className={`text-[11px] font-mono flex items-center gap-2 flex-wrap ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      <span>{(currentFile.size / 1024).toFixed(1)} KB • {currentFile.mimeType}</span>
                      {optimizationInfo && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/30">
                          ✓ Otimizado ({optimizationInfo.ratio}% menor)
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {audioDuration > 0 && (
                  <span
                    className={`text-xs font-mono px-2 py-1 rounded border flex items-center gap-1 ${
                      isDark
                        ? 'text-cyan-400 bg-slate-900 border-slate-800'
                        : 'text-slate-700 bg-white border-slate-200'
                    }`}
                  >
                    <Clock className="w-3 h-3 text-cyan-500" />
                    {formatTime(audioDuration)}
                  </span>
                )}
              </div>

              {/* Mini Audio Player with speed */}
              {audioUrl && (
                <div
                  className={`rounded-lg p-2.5 border flex flex-col gap-2 ${
                    isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <audio
                    ref={audioPlayerRef}
                    src={audioUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                  />

                  <div className="flex items-center gap-3">
                    <button
                      onClick={togglePlay}
                      className="w-8 h-8 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center transition shadow-sm cursor-pointer"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 translate-x-0.5" />}
                    </button>

                    <div className="flex-1 flex items-center gap-2">
                      <span className={`text-[11px] font-mono w-9 text-right ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {formatTime(currentTime)}
                      </span>
                      <input
                        type="range"
                        min="0"
                        max={audioDuration || 100}
                        step="0.1"
                        value={currentTime}
                        onChange={handleSeek}
                        className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer accent-cyan-600"
                      />
                      <span className={`text-[11px] font-mono w-9 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {formatTime(audioDuration)}
                      </span>
                    </div>

                    {/* Speed options */}
                    <div
                      className={`flex items-center gap-1 p-0.5 rounded-md border ${
                        isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                      }`}
                    >
                      {[1.0, 1.25, 1.5, 2.0].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => handleRateChange(rate)}
                          className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded transition cursor-pointer ${
                            playbackRate === rate
                              ? 'bg-cyan-600 text-white shadow-xs'
                              : isDark
                              ? 'text-slate-400 hover:text-white'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`w-full text-center py-6 border-2 border-dashed rounded-xl transition-all ${
                dragActive
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : isDark
                  ? 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
                  : 'border-slate-300 hover:border-slate-400 bg-white/60'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-full border flex items-center justify-center ${
                    isDark ? 'bg-slate-900 border-slate-800 text-cyan-400' : 'bg-slate-100 border-slate-200 text-cyan-600'
                  }`}
                >
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium">
                    Arraste seu arquivo <span className="text-cyan-600 dark:text-cyan-400 font-bold">.WAV</span> aqui ou selecione
                  </p>
                  <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Suporta arquivos grandes de ditafone WAV, MP3, M4A ou WebM com compressão inteligente
                  </p>
                </div>
                <label className="cursor-pointer mt-1">
                  <span
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border inline-block transition cursor-pointer ${
                      isDark
                        ? 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-slate-700'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-sm'
                    }`}
                  >
                    Escolher Arquivo de Áudio
                  </span>
                  <input
                    type="file"
                    accept=".wav,audio/wav,audio/x-wav,audio/mp3,audio/mpeg,audio/webm,audio/m4a,audio/*"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls: Mic button + Reset */}
        <div
          className={`flex flex-wrap items-center justify-between gap-3 pt-2 border-t ${
            isDark ? 'border-slate-800/80' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {!isRecording ? (
              <button
                onClick={startRecording}
                disabled={isProcessing || isOptimizing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-md shadow-red-600/20 transition disabled:opacity-50 cursor-pointer"
              >
                <Mic className="w-4 h-4 animate-pulse" />
                <span>Gravar Ditafone ao Vivo</span>
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 transition cursor-pointer"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>Parar Gravação ({formatTime(recordingTime)})</span>
              </button>
            )}

            {currentFile && (
              <label className="cursor-pointer">
                <span
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Trocar Arquivo</span>
                </span>
                <input
                  type="file"
                  accept=".wav,audio/wav,audio/x-wav,audio/mp3,audio/mpeg,audio/webm,audio/m4a,audio/*"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {currentFile && (
            <button
              onClick={() => {
                setAudioUrl(null);
                setCurrentFile(null);
                setSelectedSample(null);
                setLiveTranscript('');
                liveTranscriptRef.current = '';
              }}
              className={`flex items-center gap-1 text-xs transition cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar</span>
            </button>
          )}
        </div>

        {/* Error notice */}
        {recordingError && (
          <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{recordingError}</span>
          </div>
        )}
      </div>

      {/* Amostras Rápidas de Teste Médicas (Minimizável) */}
      <div
        className={`border rounded-2xl p-4 transition-colors duration-200 ${
          isDark
            ? 'bg-slate-900/80 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}
      >
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={toggleSamplesMinimized}
            className="flex items-center gap-2 text-left group cursor-pointer"
            title={isSamplesMinimized ? 'Expandir amostras rápidas' : 'Minimizar amostras rápidas'}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold tracking-tight group-hover:text-cyan-500 transition-colors">
              Amostras Rápidas de Ditação para Teste
            </h3>
            {isSamplesMinimized && (
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                Minimizado
              </span>
            )}
          </button>

          <div className="flex items-center gap-2">
            {!isSamplesMinimized && (
              <span className={`text-[11px] hidden sm:inline ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Clique para carregar e testar
              </span>
            )}
            <button
              type="button"
              onClick={toggleSamplesMinimized}
              className={`p-1 rounded-lg border transition cursor-pointer flex items-center gap-1 text-[11px] font-mono ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title={isSamplesMinimized ? 'Expandir' : 'Minimizar'}
            >
              {isSamplesMinimized ? (
                <>
                  <span className="text-[10px]">Expandir</span>
                  <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
                </>
              ) : (
                <>
                  <span className="text-[10px]">Minimizar</span>
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                </>
              )}
            </button>
          </div>
        </div>

        {!isSamplesMinimized && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3 pt-3 border-t border-slate-800/40 dark:border-slate-800">
            {SAMPLE_DICTATIONS.map((sample) => (
              <button
                key={sample.id}
                onClick={() => handleLoadSample(sample)}
                className={`text-left p-3 rounded-xl border transition-all text-xs flex flex-col gap-1.5 cursor-pointer ${
                  selectedSample?.id === sample.id
                    ? isDark
                      ? 'bg-cyan-950/60 border-cyan-500/80 ring-1 ring-cyan-500/50'
                      : 'bg-cyan-50 border-cyan-400 ring-1 ring-cyan-400'
                    : isDark
                    ? 'bg-slate-950/60 hover:bg-slate-800/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    : 'bg-slate-50 hover:bg-slate-100/90 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className="font-bold truncate">{sample.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 ${
                      isDark ? 'bg-slate-800 text-cyan-300' : 'bg-white border border-slate-200 text-cyan-700'
                    }`}
                  >
                    {sample.category}
                  </span>
                </div>
                <p className={`text-[11px] line-clamp-2 italic ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  "{sample.spokenText}"
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
