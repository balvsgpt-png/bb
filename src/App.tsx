import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AudioRecorder } from './components/AudioRecorder';
import { ReportViewer } from './components/ReportViewer';
import { MasksBrowser } from './components/MasksBrowser';
import { GuidelinesModal } from './components/GuidelinesModal';
import { TextDictationView } from './components/TextDictationView';
import { PdfViewerModal } from './components/PdfViewerModal';
import { CorrectionCommands } from './components/CorrectionCommands';
import {
  FormattedReport,
  formatCodeBlackReport,
  expandNumbersFromMask,
  detectPatientGender,
  cleanExamTitle,
} from './utils/codeBlackFormatter';
import { ExamMask, RADIOLOGY_MASKS } from './data/radiologyMasks';
import { SampleDictation } from './data/sampleDictations';
import {
  CorrectionRule,
  getStoredCorrections,
  saveStoredCorrections,
  applyCorrectionRules
} from './utils/correctionDictionary';
import {
  Sparkles,
  AlertCircle,
  FileText,
  Volume2,
  Zap,
  Activity,
  Layers,
  SunMedium
} from 'lucide-react';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('laudo_wav_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'dark'; // Dark theme is the signature X-ray aesthetic
  });

  const [activeTab, setActiveTab] = useState<'transcribe' | 'text-dictate' | 'masks' | 'corrections' | 'guidelines'>('transcribe');
  const [isProcessing, setIsProcessing] = useState(false);
  const [report, setReport] = useState<FormattedReport | null>(null);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastTranscribedText, setLastTranscribedText] = useState<string | null>(null);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [selectedExamId, setSelectedExamId] = useState<string>('auto');
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Correction dictionary rules state
  const [rules, setRules] = useState<CorrectionRule[]>(() => getStoredCorrections());

  const handleDownloadBackup = async () => {
    if (isBackingUp) return;
    setIsBackingUp(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customCorrections: rules }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Falha ao gerar backup (HTTP ${response.status})`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateSlug = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `Laudo_wav_Backup_Completo_${dateSlug}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Não foi possível baixar o arquivo de backup.');
    } finally {
      setIsBackingUp(false);
    }
  };

  // Negatoscope background brightness intensity
  const [negatoscopeBrightness, setNegatoscopeBrightness] = useState<'100' | '80' | '55'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('laudo_wav_negatoscope_bright') as any) || '100';
    }
    return '100';
  });

  const handleUpdateBrightness = (bright: '100' | '80' | '55') => {
    setNegatoscopeBrightness(bright);
    try {
      localStorage.setItem('laudo_wav_negatoscope_bright', bright);
    } catch {}
  };

  // Audio state
  const [currentAudio, setCurrentAudio] = useState<{
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
  } | null>(null);

  // Sync theme with HTML class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('laudo_wav_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Check health and Gemini API key availability on mount
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setHasApiKey(data.hasApiKey);
      })
      .catch((err) => {
        console.warn('Health check failed:', err);
      });
  }, []);

  // Handle ready audio from microphone or upload
  const handleAudioReady = (audioData: {
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
  }) => {
    setCurrentAudio(audioData);
    setErrorMessage(null);
  };

  // "Próximo laudo": apaga o texto e o áudio anteriores para começarmos do 0
  const handleNextReport = () => {
    setReport(null);
    setCurrentAudio(null);
    setLastTranscribedText(null);
    setErrorMessage(null);
    setResetTrigger((prev) => prev + 1);
  };

  // Allows instant switching of the active report to another mask (e.g. from Coluna to Tórax or Crânio)
  const handleSwitchReportMask = (newMaskId: string) => {
    if (!report) return;
    const newMask = RADIOLOGY_MASKS.find((m) => m.id === newMaskId);
    if (!newMask) return;

    // If original dictation contained numbers, re-expand them using the new mask's phrases
    let newFindings = [...report.findings];
    const textToAnalyze = report.transcribedText || lastTranscribedText || '';
    const patientGender = detectPatientGender(report.patientName, textToAnalyze);
    if (textToAnalyze) {
      const { expandedFindings, usedNumbers } = expandNumbersFromMask(textToAnalyze, newMask, patientGender);
      if (usedNumbers.length > 0 && expandedFindings.length > 0) {
        newFindings = expandedFindings;
      }
    }

    const updated = formatCodeBlackReport({
      patientName: report.patientName,
      examTitle: cleanExamTitle(newMask.title),
      technique: newMask.technique,
      findings: newFindings,
      opinionTitle: report.opinionTitle || 'Opinião:',
      opinionFindings: report.opinionFindings.length > 0 ? report.opinionFindings : [newMask.defaultOpinion],
      mask: newMask,
      patientGender,
      rawText: textToAnalyze,
    });

    setReport({
      ...updated,
      transcribedText: textToAnalyze,
      sourceNumbersMatched: report.sourceNumbersMatched,
    });
  };

  // Trigger audio transcription with Gemini
  const handleTranscribeAudio = async () => {
    if (!currentAudio) return;

    setIsProcessing(true);
    setErrorMessage(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s client guard for large audios

    try {
      const response = await fetch('/api/transcribe-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: currentAudio.base64,
          mimeType: currentAudio.mimeType,
          liveTranscript: currentAudio.liveTranscript,
          examId: selectedExamId !== 'auto' ? selectedExamId : undefined,
          audioSegments: currentAudio.audioSegments,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Safely read response text to prevent "Unexpected token '<', <!doctype..." crash
      const responseText = await response.text();
      let data: any = null;
      try {
        data = JSON.parse(responseText);
      } catch (jsonErr) {
        console.error('Non-JSON server response:', responseText.slice(0, 300));
        // If live transcript exists from mic, smoothly fall back to it
        if (currentAudio.liveTranscript) {
          console.log('[Failover] Non-JSON response, falling back to speech recognition transcript...');
          await handleProcessText(currentAudio.liveTranscript);
          return;
        }
        throw new Error(
          response.status === 404
            ? 'Servidor da API não encontrado (HTTP 404). Na Vercel, confirme que a pasta "api/" e o arquivo "vercel.json" estão no GitHub e que a variável GEMINI_API_KEY foi configurada.'
            : response.status === 413
            ? 'O arquivo de áudio excedeu o limite de envio do servidor (HTTP 413). Tente gravar um áudio mais curto ou use a aba "Ditação em Texto".'
            : response.status >= 500
            ? 'O servidor demorou para responder ao áudio extenso. Tente novamente em alguns segundos ou use a Ditação em Texto.'
            : `Resposta inesperada do servidor (${response.status}).`
        );
      }

      if (!response.ok) {
        // If Gemini has high demand (503), quota (429), or audio was quiet (422),
        // and we have speech transcribed by the browser during recording, fail over seamlessly!
        if (currentAudio.liveTranscript && currentAudio.liveTranscript.trim()) {
          console.log('[Failover] Non-ok audio response, seamlessly formatting live transcript with Code Black engine...');
          await handleProcessText(currentAudio.liveTranscript);
          return;
        }

        throw new Error(data?.error || 'Erro no processamento do áudio');
      }

      // Automatically apply active correction rules to transcribed speech and findings
      if (data) {
        if (data.transcribedText) {
          const { correctedText } = applyCorrectionRules(data.transcribedText, rules);
          data.transcribedText = correctedText;
        }
        if (Array.isArray(data.findings)) {
          data.findings = data.findings.map((f: string) => applyCorrectionRules(f, rules).correctedText);
        }
        if (Array.isArray(data.opinionFindings)) {
          data.opinionFindings = data.opinionFindings.map((o: string) => applyCorrectionRules(o, rules).correctedText);
        }
      }

      setReport(data);
      setLastTranscribedText(data.transcribedText || null);
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('Transcription error:', err);
      // If we have live transcript from the mic, process it directly
      if (currentAudio.liveTranscript) {
        console.log('[Failover catch] Falling back to live transcript formatting...');
        await handleProcessText(currentAudio.liveTranscript);
      } else {
        const isAbort = err.name === 'AbortError' || err?.message?.includes('aborted');
        const is503 = err?.message?.includes('503') || err?.message?.includes('high demand') || err?.message?.includes('UNAVAILABLE') || err?.message?.includes('Timeout');
        setErrorMessage(
          isAbort
            ? 'A transcrição excedeu o tempo limite. Tente novamente ou use a aba "Ditação em Texto".'
            : is503
            ? 'O modelo está com alta demanda temporária. Tente novamente em instantes ou use a aba "Ditação em Texto".'
            : (err.message || 'Falha ao transcrever o áudio.')
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle direct text dictation processing
  const handleProcessText = async (rawText: string, patientName?: string, examId?: string) => {
    setIsProcessing(true);
    setErrorMessage(null);

    // Apply active correction rules to input text
    const { correctedText: sanitizedText } = applyCorrectionRules(rawText, rules);

    try {
      const response = await fetch('/api/format-dictation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: sanitizedText,
          patientName,
          examId,
        }),
      });

      const responseText = await response.text();
      let data: any = null;
      try {
        data = JSON.parse(responseText);
      } catch (jsonErr) {
        console.error('Non-JSON server response:', responseText.slice(0, 300));
        throw new Error(
          response.status === 404
            ? 'Servidor da API não encontrado (HTTP 404). Na Vercel, confirme que a pasta "api/" e o arquivo "vercel.json" estão no GitHub.'
            : `Falha ao processar texto no servidor (${response.status}). Tente novamente.`
        );
      }

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao formatar ditação');
      }

      if (data) {
        if (Array.isArray(data.findings)) {
          data.findings = data.findings.map((f: string) => applyCorrectionRules(f, rules).correctedText);
        }
        if (Array.isArray(data.opinionFindings)) {
          data.opinionFindings = data.opinionFindings.map((o: string) => applyCorrectionRules(o, rules).correctedText);
        }
      }

      setReport(data);
      setLastTranscribedText(data.transcribedText || sanitizedText);
    } catch (err: any) {
      console.error('Format dictation error:', err);
      setErrorMessage(err.message || 'Erro ao processar texto da ditação.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle sample selection
  const handleSelectSampleText = (sample: SampleDictation) => {
    handleProcessText(sample.spokenText, sample.patientName);
  };

  // Handle mask selection from browser
  const handleSelectMaskForReport = (generatedReport: FormattedReport) => {
    setReport(generatedReport);
    setLastTranscribedText(null);
    setActiveTab('transcribe');
  };

  const isDark = theme === 'dark';

  return (
    <div
      className={`min-h-screen relative flex flex-col font-sans transition-colors duration-300 ${
        isDark ? 'bg-[#020712] text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Authentic Radiograph X-Ray Grid Background (Vibrant Glowing Negatoscope) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <img
          src="/assets/image_307e4d69.png"
          alt="Matriz de Raios-X Negatoscópio de Fundo"
          className={`w-full h-full object-cover object-center transition-all duration-700 ${
            isDark
              ? negatoscopeBrightness === '100'
                ? 'opacity-[0.85] contrast-125 brightness-110 saturate-125'
                : negatoscopeBrightness === '80'
                ? 'opacity-[0.65] contrast-120 brightness-105 saturate-110'
                : 'opacity-[0.45] contrast-115 brightness-100'
              : negatoscopeBrightness === '100'
              ? 'opacity-[0.38] contrast-110 brightness-105'
              : negatoscopeBrightness === '80'
              ? 'opacity-[0.25] contrast-105'
              : 'opacity-[0.14] contrast-100'
          }`}
        />
        {/* Luminous Negatoscope Backlight & Ambient Edge Vignette (Keeps center cards comfortable and clear) */}
        <div
          className={`absolute inset-0 transition-colors duration-500 pointer-events-none ${
            isDark
              ? 'bg-[radial-gradient(ellipse_at_center,rgba(2,7,18,0.15)_25%,rgba(2,7,18,0.50)_75%,rgba(2,7,18,0.85)_100%)]'
              : 'bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.40)_30%,rgba(241,245,249,0.72)_80%,rgba(241,245,249,0.92)_100%)]'
          }`}
        />
      </div>

      {/* Foreground Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          hasApiKey={hasApiKey}
          onOpenPdf={() => setIsPdfModalOpen(true)}
          onDownloadBackup={handleDownloadBackup}
          isBackingUp={isBackingUp}
          theme={theme}
          onToggleTheme={toggleTheme}
          correctionsCount={rules.filter((r) => r.enabled).length}
        />

        {/* Diagnostic Status Kicker Bar */}
        <div
          className={`border-b text-[11px] font-mono select-none px-4 sm:px-6 py-1.5 transition-colors ${
            isDark
              ? 'bg-[#030917]/90 border-cyan-900/40 text-cyan-400/90'
              : 'bg-slate-100/80 border-slate-200 text-slate-600'
          }`}
        >
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(56,189,248,0.9)]" />
                <strong className="text-white dark:text-cyan-200">WORKSTATION PACS/RIS</strong>
              </span>
              <span className="hidden sm:inline opacity-40">|</span>
              <span className="hidden sm:inline">TOMÓGRAFO MULTISLICE 128 DETECTORES</span>
              <span className="hidden md:inline opacity-40">|</span>
              <span className="hidden md:inline">PADRÃO "CODE BLACK"</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Negatoscope Brightness Selector */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-cyan-800/40 bg-cyan-950/40">
                <SunMedium className="w-3 h-3 text-cyan-400" />
                <span className="hidden sm:inline text-[10px] text-slate-400">Negatoscópio:</span>
                {(['100', '80', '55'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => handleUpdateBrightness(lvl)}
                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono transition cursor-pointer ${
                      negatoscopeBrightness === lvl
                        ? 'bg-cyan-500 text-white font-bold shadow-xs'
                        : isDark
                        ? 'text-cyan-300 hover:text-white bg-slate-900/80'
                        : 'text-slate-600 hover:text-slate-900 bg-white'
                    }`}
                    title={`Brilho do Negatoscópio: ${lvl}%`}
                  >
                    {lvl}%
                  </button>
                ))}
              </div>

              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/50 text-cyan-300">
                {RADIOLOGY_MASKS.length} MÁSCARAS OFICIAIS
              </span>
            </div>
          </div>
        </div>

        {/* Main Workstation Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 space-y-5">
          {/* Error notification */}
          {errorMessage && (
            <div
              className={`p-4 rounded-xl border text-xs flex items-start justify-between gap-3 shadow-md ${
                isDark
                  ? 'bg-red-950/80 border-red-800 text-red-200'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Atenção ao processar ditação</p>
                  <p className={`mt-0.5 ${isDark ? 'text-red-300' : 'text-red-700'}`}>{errorMessage}</p>
                </div>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className={`text-xs font-mono font-medium hover:underline cursor-pointer ${
                  isDark ? 'text-red-400 hover:text-red-200' : 'text-red-600 hover:text-red-800'
                }`}
              >
                Fechar
              </button>
            </div>
          )}

          {/* Tab 1: Audio WAV Transcription */}
          {activeTab === 'transcribe' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Audio Input & Controls */}
              <div className="lg:col-span-5 space-y-5">
                <AudioRecorder
                  onAudioReady={handleAudioReady}
                  onSelectSampleText={handleSelectSampleText}
                  isProcessing={isProcessing}
                  theme={theme}
                  resetTrigger={resetTrigger}
                  selectedExamId={selectedExamId}
                  onSelectExamId={setSelectedExamId}
                />

                {/* Ready to Transcribe Action Card (Styled with authentic X-Ray glow) */}
                {currentAudio && (
                  <div
                    className={`border rounded-2xl p-5 shadow-xl space-y-3 transition-colors duration-200 relative overflow-hidden ${
                      isDark
                        ? 'bg-gradient-to-br from-[#061838] to-[#040f24] border-cyan-500/50 shadow-[0_0_20px_rgba(6,24,56,0.8)]'
                        : 'bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200'
                    }`}
                  >
                    {/* Cassette Clip */}
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-slate-500 via-cyan-400 to-slate-500" />

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                            isDark
                              ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 shadow-[0_0_10px_rgba(56,189,248,0.5)]'
                              : 'bg-cyan-100 border-cyan-300 text-cyan-700'
                          }`}
                        >
                          <Zap className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Áudio WAV Pronto para Transcrição
                          </h4>
                          <p className={`text-[11px] font-mono ${isDark ? 'text-cyan-300/80' : 'text-cyan-700'}`}>
                            {currentAudio.name}
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleTranscribeAudio}
                      disabled={isProcessing}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/30 transition disabled:opacity-50 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {isProcessing
                          ? 'Transcrevendo e Cruzando com o PDF de Laudos...'
                          : 'Transcrever Áudio e Gerar Laudo Code Black'}
                      </span>
                    </button>

                    <p className={`text-[11px] text-center leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      O áudio é processado, identificando termos médicos e cruzando sequências numéricas com o PDF oficial.
                    </p>
                  </div>
                )}

                {/* Transcribed text box if available */}
                {lastTranscribedText && (
                  <div
                    className={`border rounded-2xl p-4 space-y-2 shadow-sm transition-colors duration-200 ${
                      isDark ? 'bg-[#030b1b] border-cyan-900/40' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div
                      className={`flex items-center justify-between text-xs font-semibold ${
                        isDark ? 'text-slate-300' : 'text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Transcrição Fiel do Áudio Ditado:</span>
                      </div>
                    </div>
                    <p
                      className={`text-xs font-mono p-3 rounded-xl border leading-relaxed max-h-36 overflow-y-auto italic ${
                        isDark
                          ? 'bg-[#020611] border-cyan-950 text-slate-300'
                          : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      "{lastTranscribedText}"
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column: Structured Report Viewer */}
              <div className="lg:col-span-7">
                <ReportViewer
                  report={report}
                  onUpdateReport={(updated) => setReport(updated)}
                  onViewMask={() => {
                    setActiveTab('masks');
                  }}
                  onSwitchMask={handleSwitchReportMask}
                  onNextReport={handleNextReport}
                  isProcessing={isProcessing}
                  theme={theme}
                />
              </div>
            </div>
          )}

          {/* Tab 2: Text Dictation View */}
          {activeTab === 'text-dictate' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-6">
                <TextDictationView
                  onProcessText={handleProcessText}
                  isProcessing={isProcessing}
                  theme={theme}
                  resetTrigger={resetTrigger}
                />
              </div>
              <div className="lg:col-span-6">
                <ReportViewer
                  report={report}
                  onUpdateReport={(updated) => setReport(updated)}
                  onViewMask={() => setActiveTab('masks')}
                  onNextReport={handleNextReport}
                  isProcessing={isProcessing}
                  theme={theme}
                />
              </div>
            </div>
          )}

          {/* Tab 3: Masks Browser */}
          {activeTab === 'masks' && (
            <MasksBrowser
              onSelectMaskForReport={handleSelectMaskForReport}
              onOpenPdf={() => setIsPdfModalOpen(true)}
              theme={theme}
            />
          )}

          {/* Tab 4: Comandos & Correções (Dicionário Fonético) */}
          {activeTab === 'corrections' && (
            <CorrectionCommands
              rules={rules}
              onUpdateRules={(newRules) => {
                setRules(newRules);
                saveStoredCorrections(newRules);
              }}
              theme={theme}
            />
          )}

          {/* Tab 5: Guidelines Code Black */}
          {activeTab === 'guidelines' && (
            <GuidelinesModal
              onOpenPdf={() => setIsPdfModalOpen(true)}
              theme={theme}
            />
          )}
        </main>

        {/* PDF Modal */}
        <PdfViewerModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
        />

        {/* Footer */}
        <footer
          className={`border-t py-4 mt-auto transition-colors duration-200 ${
            isDark ? 'border-cyan-950 bg-[#020611]' : 'border-slate-200 bg-white/80'
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
            <div className="font-mono flex items-center gap-1.5">
              <span className="font-bold text-slate-700 dark:text-cyan-300">Laudo.wav</span>
              <span>•</span>
              <span>Transcrição Radiológica Inteligente (Padrão Code Black)</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsPdfModalOpen(true)}
                className="text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition cursor-pointer"
              >
                PDF de Laudos (14 Máscaras)
              </button>
              <span>•</span>
              <button
                onClick={() => setActiveTab('guidelines')}
                className="text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition cursor-pointer"
              >
                Diretrizes & Comandos
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
