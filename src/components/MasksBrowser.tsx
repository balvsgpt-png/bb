import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Filter,
  Check,
  ChevronRight,
  ExternalLink,
  FileText,
  Sparkles,
  Layers
} from 'lucide-react';
import { RADIOLOGY_MASKS, ExamMask } from '../data/radiologyMasks';
import { formatCodeBlackReport } from '../utils/codeBlackFormatter';
import { FormattedReport } from '../utils/codeBlackFormatter';

interface MasksBrowserProps {
  onSelectMaskForReport: (report: FormattedReport) => void;
  onOpenPdf: () => void;
  theme?: 'light' | 'dark';
}

export const MasksBrowser: React.FC<MasksBrowserProps> = ({
  onSelectMaskForReport,
  onOpenPdf,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'com_contraste' | 'sem_contraste' | 'angiotomografia'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMaskId, setActiveMaskId] = useState<string>('abdome-total-com');
  const [selectedNumberIds, setSelectedNumberIds] = useState<number[]>([1, 2, 3, 4, 5, 7, 8]);

  const filteredMasks = RADIOLOGY_MASKS.filter((mask) => {
    const matchesCategory = selectedCategory === 'all' || mask.category === selectedCategory;
    const matchesQuery =
      mask.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mask.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesQuery;
  });

  const activeMask = RADIOLOGY_MASKS.find((m) => m.id === activeMaskId) || RADIOLOGY_MASKS[0];

  // Handle number click in mask
  const toggleNumber = (num: number) => {
    setSelectedNumberIds((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num].sort((a, b) => a - b)
    );
  };

  // Generate report from selected numbers
  const handleGenerateFromNumbers = () => {
    const findings = selectedNumberIds
      .map((num) => activeMask.phrases.find((p) => p.number === num)?.text)
      .filter(Boolean) as string[];

    const finalReport = formatCodeBlackReport({
      examTitle: activeMask.title,
      technique: activeMask.technique,
      findings: findings.length > 0 ? findings : activeMask.phrases.map((p) => p.text),
      opinionTitle: 'Opinião:',
      opinionFindings: [activeMask.defaultOpinion],
      mask: activeMask,
    });

    finalReport.sourceNumbersMatched = selectedNumberIds;
    onSelectMaskForReport(finalReport);
  };

  // Generate complete normal report
  const handleGenerateFullNormal = () => {
    const allNumbers = activeMask.phrases.map((p) => p.number);
    setSelectedNumberIds(allNumbers);
    const finalReport = formatCodeBlackReport({
      examTitle: activeMask.title,
      technique: activeMask.technique,
      findings: activeMask.phrases.map((p) => p.text),
      opinionTitle: 'Opinião:',
      opinionFindings: [activeMask.defaultOpinion],
      mask: activeMask,
    });
    finalReport.sourceNumbersMatched = allNumbers;
    onSelectMaskForReport(finalReport);
  };

  return (
    <div className="space-y-6">
      {/* Header with Search and Category filters */}
      <div
        className={`border rounded-2xl p-5 shadow-lg transition-colors duration-200 ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-500" />
              <span>Banco de Máscaras Oficiais</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-mono border ${
                  isDark ? 'bg-cyan-950 text-cyan-400 border-cyan-800' : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                }`}
              >
                14 Máscaras
              </span>
            </h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Máscaras de tomografia e angiografia integradas para cruzamento numérico automático.
            </p>
          </div>

          <button
            onClick={onOpenPdf}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              isDark
                ? 'bg-amber-950/70 hover:bg-amber-900/80 text-amber-300 border-amber-800/80'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
            }`}
          >
            <FileText className="w-4 h-4 text-amber-500" />
            <span>Ver PDF Original</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar máscara (ex: abdome, crânio, tórax, coluna, carótidas)..."
              className={`w-full rounded-xl pl-10 pr-4 py-2 text-xs border focus:outline-none focus:ring-2 focus:ring-cyan-500 transition ${
                isDark
                  ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          {/* Category buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'Todas' },
              { id: 'com_contraste', label: 'Com Contraste' },
              { id: 'sem_contraste', label: 'Sem Contraste' },
              { id: 'angiotomografia', label: 'Angiotomografias' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : isDark
                    ? 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                    : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Two columns: Masks List & Active Mask Detail with Interactive Number Picker */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Masks List */}
        <div className="lg:col-span-5 space-y-2 max-h-[680px] overflow-y-auto pr-1">
          {filteredMasks.map((mask) => {
            const isActive = mask.id === activeMaskId;
            return (
              <div
                key={mask.id}
                onClick={() => {
                  setActiveMaskId(mask.id);
                  setSelectedNumberIds(mask.phrases.map((p) => p.number));
                }}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                  isActive
                    ? isDark
                      ? 'bg-cyan-950/70 border-cyan-500 shadow-md ring-1 ring-cyan-500/50'
                      : 'bg-cyan-50 border-cyan-500 shadow-sm ring-1 ring-cyan-400'
                    : isDark
                    ? 'bg-slate-900/80 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700'
                    : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-medium ${
                      mask.category === 'com_contraste'
                        ? 'bg-blue-950 text-blue-300 border border-blue-800/60'
                        : mask.category === 'sem_contraste'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                        : 'bg-purple-950 text-purple-300 border border-purple-800/60'
                    }`}
                  >
                    {mask.categoryLabel}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {mask.phrases.length} frases
                  </span>
                </div>

                <h3 className="text-xs font-bold text-white mb-1">{mask.title}</h3>
                <p className="text-[11px] text-slate-400 line-clamp-1 italic">
                  {mask.technique}
                </p>
              </div>
            );
          })}
        </div>

        {/* Right: Selected Mask Detail & Interactive Simulator */}
        <div
          className={`lg:col-span-7 border rounded-2xl p-6 shadow-xl flex flex-col justify-between transition-colors duration-200 ${
            isDark
              ? 'bg-slate-900 border-slate-800 text-slate-100'
              : 'bg-white border-slate-200 text-slate-900 shadow-md'
          }`}
        >
          <div className="space-y-5">
            {/* Mask header */}
            <div className={`border-b pb-4 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`text-xs font-mono px-2.5 py-0.5 rounded-full uppercase font-medium ${
                    activeMask.category === 'com_contraste'
                      ? 'bg-blue-950 text-blue-300 border border-blue-800/60'
                      : activeMask.category === 'sem_contraste'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                      : 'bg-purple-950 text-purple-300 border border-purple-800/60'
                  }`}
                >
                  {activeMask.categoryLabel} • {activeMask.contrastStatus}
                </span>
              </div>
              <h3 className="text-base font-bold tracking-wide">{activeMask.title}</h3>
              <p className={`text-xs mt-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>Técnica padrão: </span>
                {activeMask.technique}
              </p>
            </div>

            {/* Interactive Number Selector for Dictation Simulation */}
            <div
              className={`rounded-xl p-4 border ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-500" />
                  <span className="text-xs font-bold">
                    Simulador de Ditação Numérica (Regra de Abdome & PDF)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedNumberIds(activeMask.phrases.map((p) => p.number))}
                    className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline transition cursor-pointer"
                  >
                    Marcar Todas
                  </button>
                  <span className={isDark ? 'text-slate-700' : 'text-slate-300'}>|</span>
                  <button
                    onClick={() => setSelectedNumberIds([])}
                    className={`text-[11px] transition cursor-pointer ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                  >
                    Desmarcar
                  </button>
                </div>
              </div>

              <p className={`text-[11px] mb-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Quando o médico dita números no áudio (ex: <span className="font-mono font-semibold text-cyan-600 dark:text-cyan-400">"o conjunto 1 2 3 4 5"</span>), o sistema seleciona exatamente estas frases:
              </p>

              {/* Number pills */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {activeMask.phrases.map((phrase) => {
                  const isSelected = selectedNumberIds.includes(phrase.number);
                  return (
                    <button
                      key={phrase.number}
                      onClick={() => toggleNumber(phrase.number)}
                      className={`w-8 h-8 rounded-lg font-mono text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-600 text-white shadow-sm ring-1 ring-cyan-400'
                          : isDark
                          ? 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
                      }`}
                    >
                      {phrase.number}
                    </button>
                  );
                })}
              </div>

              {/* Selected numbers string preview */}
              <div
                className={`text-[11px] font-mono p-2.5 rounded-lg border flex items-center justify-between ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-300'
                    : 'bg-white border-slate-200 text-slate-700 shadow-xs'
                }`}
              >
                <span>Ditação simulada: <span className="font-semibold text-cyan-600 dark:text-cyan-400">"o conjunto {selectedNumberIds.join(' ')} ponto parágrafo"</span></span>
                <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>({selectedNumberIds.length} frases)</span>
              </div>
            </div>

            {/* List of phrases */}
            <div>
              <div className={`text-xs font-bold mb-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                Frases Oficiais da Máscara:
              </div>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2">
                {activeMask.phrases.map((phrase) => {
                  const isSelected = selectedNumberIds.includes(phrase.number);
                  return (
                    <div
                      key={phrase.number}
                      onClick={() => toggleNumber(phrase.number)}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer transition flex items-start gap-2.5 ${
                        isSelected
                          ? isDark
                            ? 'bg-cyan-950/40 border-cyan-800/80 text-slate-200'
                            : 'bg-cyan-50 border-cyan-200 text-slate-900'
                          : isDark
                          ? 'bg-slate-950/50 border-slate-800 text-slate-500'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      <span
                        className={`font-mono text-xs font-bold shrink-0 w-6 h-6 rounded flex items-center justify-center ${
                          isSelected
                            ? 'bg-cyan-600 text-white'
                            : isDark
                            ? 'bg-slate-900 text-slate-500'
                            : 'bg-white border border-slate-200 text-slate-500'
                        }`}
                      >
                        {phrase.number}
                      </span>
                      <span className="leading-relaxed">{phrase.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Default opinion */}
            <div
              className={`p-3 rounded-xl border text-xs ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className={`font-bold block mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Opinião Padrão:</span>
              <span className={`italic ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{activeMask.defaultOpinion}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className={`mt-6 pt-4 border-t flex flex-wrap items-center justify-between gap-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <button
              onClick={handleGenerateFullNormal}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
              }`}
            >
              Usar Máscara Normal Completa
            </button>

            <button
              onClick={handleGenerateFromNumbers}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/30 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Gerar Laudo com Números Selecionados ({selectedNumberIds.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
