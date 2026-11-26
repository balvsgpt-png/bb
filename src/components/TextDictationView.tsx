import React, { useState, useEffect } from 'react';
import { FileText, Sparkles, Wand2, RotateCcw, Check, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { SAMPLE_DICTATIONS, SampleDictation } from '../data/sampleDictations';
import { RADIOLOGY_MASKS } from '../data/radiologyMasks';

interface TextDictationViewProps {
  onProcessText: (text: string, patientName?: string, examId?: string) => void;
  isProcessing: boolean;
  theme?: 'light' | 'dark';
  resetTrigger?: number;
}

export const TextDictationView: React.FC<TextDictationViewProps> = ({
  onProcessText,
  isProcessing,
  theme = 'light',
  resetTrigger = 0,
}) => {
  const isDark = theme === 'dark';
  const [dictationText, setDictationText] = useState('');
  const [patientName, setPatientName] = useState('');
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [isSamplesMinimized, setIsSamplesMinimized] = useState(false);

  useEffect(() => {
    if (resetTrigger > 0) {
      setDictationText('');
      setPatientName('');
      setSelectedExamId('');
    }
  }, [resetTrigger]);

  const handleProcess = () => {
    if (!dictationText.trim()) return;
    onProcessText(dictationText, patientName, selectedExamId || undefined);
  };

  const handleLoadSample = (sample: SampleDictation) => {
    setDictationText(sample.spokenText);
    setPatientName(sample.patientName);
    const matched = RADIOLOGY_MASKS.find(m => m.title.toLowerCase().includes(sample.examHint.toLowerCase()));
    if (matched) {
      setSelectedExamId(matched.id);
    }
  };

  return (
    <div
      className={`border rounded-2xl p-6 shadow-xl space-y-5 transition-colors duration-200 ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}
    >
      <div
        className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}
      >
        <div>
          <h2 className="text-sm font-bold flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-500" />
            <span>Ditação Rápida em Texto</span>
          </h2>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Digite ou cole o texto ditado (incluindo números e comandos "ponto parágrafo").
          </p>
        </div>

        {dictationText && (
          <button
            onClick={() => {
              setDictationText('');
              setPatientName('');
              setSelectedExamId('');
            }}
            className={`flex items-center gap-1 text-xs transition cursor-pointer ${
              isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpar</span>
          </button>
        )}
      </div>

      {/* Patient & Mask selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Nome do Paciente:
          </label>
          <input
            type="text"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            placeholder="Ex: João Carlos da Silva"
            className={`w-full rounded-xl px-3.5 py-2 text-xs border focus:outline-none focus:ring-2 focus:ring-cyan-500 transition ${
              isDark
                ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600'
                : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 shadow-xs'
            }`}
          />
        </div>

        <div>
          <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Máscara de Exame:
          </label>
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className={`w-full rounded-xl px-3.5 py-2 text-xs border focus:outline-none focus:ring-2 focus:ring-cyan-500 transition ${
              isDark
                ? 'bg-slate-950 border-slate-800 text-slate-100'
                : 'bg-white border-slate-300 text-slate-900 shadow-xs'
            }`}
          >
            <option value="">Auto-detectar pelo texto</option>
            {RADIOLOGY_MASKS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title} ({m.contrastStatus})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Text Area */}
      <div>
        <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          Texto Ditado:
        </label>
        <textarea
          value={dictationText}
          onChange={(e) => setDictationText(e.target.value)}
          rows={7}
          placeholder="Exemplo: Paciente João da Silva. Tomografia de abdome total com contraste. O conjunto. 1 2 3 4 5 7 8. Ponto parágrafo. Opinião. Tomografia de abdome sem alterações significativas. Ponto final."
          className={`w-full rounded-xl p-4 text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-cyan-500 leading-relaxed resize-y ${
            isDark
              ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600'
              : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 shadow-xs'
          }`}
        />
      </div>

      {/* Quick speech commands insertion pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`text-[11px] mr-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Comandos rápidos:</span>
        {[
          { label: 'ponto parágrafo', text: ' ponto parágrafo ' },
          { label: 'opinião', text: ' ponto parágrafo opinião ' },
          { label: 'ponto final', text: ' ponto final. ' },
          { label: '1 2 3 4 5', text: ' 1 2 3 4 5 ' },
          { label: 'O conjunto', text: ' O conjunto. ' },
        ].map((cmd) => (
          <button
            key={cmd.label}
            type="button"
            onClick={() => setDictationText((prev) => prev + cmd.text)}
            className={`px-2 py-1 rounded text-[11px] font-mono border transition cursor-pointer ${
              isDark
                ? 'bg-slate-950 hover:bg-slate-800 text-cyan-400 border-slate-800'
                : 'bg-slate-100 hover:bg-slate-200 text-cyan-700 border-slate-200'
            }`}
          >
            +{cmd.label}
          </button>
        ))}
      </div>

      {/* Samples Row (Minimizável) */}
      <div className="pt-1">
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => setIsSamplesMinimized((prev) => !prev)}
            className={`text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:text-cyan-500 transition-colors ${
              isDark ? 'text-slate-300' : 'text-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Casos modelo para teste:</span>
            {isSamplesMinimized && (
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                isDark ? 'bg-slate-950 text-slate-500 border-slate-800' : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                Minimizado
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsSamplesMinimized((prev) => !prev)}
            className={`text-[11px] font-mono p-1 rounded border transition cursor-pointer flex items-center gap-1 ${
              isDark
                ? 'bg-slate-950 hover:bg-slate-800 text-slate-400 border-slate-800'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
            }`}
          >
            {isSamplesMinimized ? (
              <>
                <span>Expandir</span>
                <ChevronDown className="w-3 h-3 text-cyan-400" />
              </>
            ) : (
              <>
                <span>Minimizar</span>
                <ChevronUp className="w-3 h-3 text-slate-400" />
              </>
            )}
          </button>
        </div>

        {!isSamplesMinimized && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SAMPLE_DICTATIONS.slice(0, 4).map((sample) => (
              <button
                key={sample.id}
                onClick={() => handleLoadSample(sample)}
                className={`text-left p-2.5 rounded-xl border transition text-xs flex flex-col gap-1 cursor-pointer ${
                  isDark
                    ? 'bg-slate-950 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <div className="font-bold truncate">{sample.label}</div>
                <div className={`text-[11px] truncate italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  "{sample.spokenText}"
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="pt-2 flex justify-end">
        <button
          onClick={handleProcess}
          disabled={!dictationText.trim() || isProcessing}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/25 transition disabled:opacity-50 cursor-pointer"
        >
          <Wand2 className="w-4 h-4" />
          <span>{isProcessing ? 'Formatando no Code Black...' : 'Formatar Laudo no Padrão Code Black'}</span>
        </button>
      </div>
    </div>
  );
};
