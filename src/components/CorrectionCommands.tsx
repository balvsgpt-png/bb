/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  SpellCheck,
  Plus,
  Trash2,
  Upload,
  Download,
  RotateCcw,
  Search,
  CheckCircle2,
  FileText,
  AlertCircle,
  HelpCircle,
  Sliders,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import {
  CorrectionRule,
  parseRulesFromText,
  exportRulesToText,
  DEFAULT_RADIOLOGY_CORRECTIONS,
  applyCorrectionRules
} from '../utils/correctionDictionary';

interface CorrectionCommandsProps {
  rules: CorrectionRule[];
  onUpdateRules: (newRules: CorrectionRule[]) => void;
  theme?: 'light' | 'dark';
}

export const CorrectionCommands: React.FC<CorrectionCommandsProps> = ({
  rules,
  onUpdateRules,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';

  // State for single rule addition
  const [newFrom, setNewFrom] = useState('');
  const [newTo, setNewTo] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  // Bulk input state
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);

  // Live test state
  const [testInput, setTestInput] = useState('tc com calcaneo perihilar e ileo com derrame pleura');
  const [testResult, setTestResult] = useState('');

  // Run live test
  React.useEffect(() => {
    const { correctedText, replacementsCount } = applyCorrectionRules(testInput, rules);
    setTestResult(correctedText);
  }, [testInput, rules]);

  // Handle single rule addition
  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFrom.trim() || !newTo.trim()) return;

    const fromTrimmed = newFrom.trim();
    const toTrimmed = newTo.trim();

    // Check if rule already exists
    const exists = rules.some((r) => r.from.toLowerCase() === fromTrimmed.toLowerCase());
    if (exists) {
      // Update existing
      const updated = rules.map((r) =>
        r.from.toLowerCase() === fromTrimmed.toLowerCase()
          ? { ...r, to: toTrimmed, enabled: true }
          : r
      );
      onUpdateRules(updated);
    } else {
      const newRule: CorrectionRule = {
        id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        from: fromTrimmed,
        to: toTrimmed,
        enabled: true,
        category: 'geral',
      };
      onUpdateRules([newRule, ...rules]);
    }

    setNewFrom('');
    setNewTo('');
  };

  // Toggle single rule
  const handleToggleRule = (id: string) => {
    const updated = rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    onUpdateRules(updated);
  };

  // Delete rule
  const handleDeleteRule = (id: string) => {
    const updated = rules.filter((r) => r.id !== id);
    onUpdateRules(updated);
  };

  // Clear all rules
  const handleClearAll = () => {
    if (window.confirm('Tem certeza que deseja apagar todas as regras de correção cadastradas?')) {
      onUpdateRules([]);
    }
  };

  // Restore defaults
  const handleRestoreDefaults = () => {
    const defaultRules: CorrectionRule[] = DEFAULT_RADIOLOGY_CORRECTIONS.map((c, i) => ({
      ...c,
      id: `default_${i}_${Date.now()}`,
    }));
    // Merge without duplicates
    const existingFroms = new Set(rules.map((r) => r.from.toLowerCase()));
    const toAdd = defaultRules.filter((r) => !existingFroms.has(r.from.toLowerCase()));
    onUpdateRules([...rules, ...toAdd]);
  };

  // Bulk import from pasted text
  const handleBulkImport = () => {
    if (!bulkText.trim()) return;
    const parsed = parseRulesFromText(bulkText);
    if (parsed.length === 0) {
      setBulkFeedback('Nenhuma regra válida detectada. Use o formato: "palavra_errada -> palavra_certa".');
      return;
    }

    // Merge with existing
    const existingMap = new Map(rules.map((r) => [r.from.toLowerCase(), r]));
    for (const rule of parsed) {
      existingMap.set(rule.from.toLowerCase(), rule);
    }

    const updated = Array.from(existingMap.values());
    onUpdateRules(updated);
    setBulkFeedback(`${parsed.length} regras importadas com sucesso!`);
    setTimeout(() => {
      setBulkText('');
      setBulkFeedback(null);
      setIsBulkOpen(false);
    }, 1500);
  };

  // File upload (.txt, .doc, .csv, etc.)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const parsed = parseRulesFromText(content);
        if (parsed.length > 0) {
          const existingMap = new Map(rules.map((r) => [r.from.toLowerCase(), r]));
          for (const rule of parsed) {
            existingMap.set(rule.from.toLowerCase(), rule);
          }
          onUpdateRules(Array.from(existingMap.values()));
          alert(`${parsed.length} regras carregadas a partir do arquivo "${file.name}"!`);
        } else {
          alert('Não foi possível identificar regras no arquivo. Verifique o formato: [palavra_errada -> correcao].');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Export to TXT download
  const handleExportTxt = () => {
    const textContent = exportRulesToText(rules);
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comandos_correcao_laudos_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filtered rules
  const filteredRules = rules.filter(
    (r) =>
      r.from.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.to.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div
        className={`border rounded-2xl p-5 shadow-xl transition-colors duration-200 ${
          isDark
            ? 'bg-[#030a1c] border-cyan-500/30 text-slate-100 shadow-[0_0_25px_rgba(4,18,48,0.7)]'
            : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
                  isDark
                    ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300 shadow-[0_0_12px_rgba(56,189,248,0.4)]'
                    : 'bg-cyan-100 border-cyan-300 text-cyan-700'
                }`}
              >
                <SpellCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold flex items-center gap-2 font-mono">
                  <span>Comandos & Dicionário de Correção Fonética</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono border ${
                      isDark
                        ? 'bg-cyan-950/80 text-cyan-300 border-cyan-800'
                        : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                    }`}
                  >
                    {rules.filter((r) => r.enabled).length} ativas de {rules.length}
                  </span>
                </h2>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Insira arquivos ou termos com as palavras entendidas incorretamente e suas correções na frente.
                  O sistema aplicará as substituições automaticamente em todo áudio e laudo gerado!
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons: Upload File, Export, Bulk Paste, Defaults */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="cursor-pointer">
              <span
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                  isDark
                    ? 'bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 border-cyan-700/60 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                    : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border-cyan-200'
                }`}
                title="Carregar arquivo TXT/DOC de regras de substituição"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Carregar Arquivo (.txt)</span>
              </span>
              <input
                type="file"
                accept=".txt,.doc,.docx,.csv,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              onClick={() => setIsBulkOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                isDark
                  ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              }`}
              title="Colar bloco de texto com múltiplas correções"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Colar em Lote</span>
            </button>

            <button
              onClick={handleExportTxt}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                isDark
                  ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm'
              }`}
              title="Baixar lista de correções em arquivo .txt"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Exportar</span>
            </button>

            <button
              onClick={handleRestoreDefaults}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer ${
                isDark
                  ? 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800'
                  : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
              }`}
              title="Restaurar correções radiológicas recomendadas"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Padrões</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Paste Area (Collapsible) */}
      {isBulkOpen && (
        <div
          className={`border rounded-2xl p-5 shadow-lg space-y-3 transition-all ${
            isDark
              ? 'bg-[#040f26] border-amber-500/40 text-slate-100 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
              : 'bg-amber-50/50 border-amber-200 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold font-mono">
                Colar Documento de Correções em Lote
              </h3>
            </div>
            <button
              onClick={() => setIsBulkOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              Fechar
            </button>
          </div>

          <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Cole aqui o conteúdo de seu documento (formato linha a linha: <code className="text-amber-400 font-mono">palavra entendida errada -&gt; palavra certa</code>):
          </p>

          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={5}
            placeholder={`calcaneo -> calcâneo\nperihilar -> peri-hilar\nderrame pleura -> derrame pleural\nileo terminal -> íleo terminal\nlinfonodomegalia -> linfonodomegalias`}
            className={`w-full p-3 rounded-xl text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-amber-500 ${
              isDark
                ? 'bg-[#020612] border-slate-700 text-slate-200 placeholder:text-slate-600'
                : 'bg-white border-amber-200 text-slate-800 placeholder:text-slate-400'
            }`}
          />

          <div className="flex items-center justify-between pt-1">
            <span className={`text-[11px] ${bulkFeedback ? 'text-green-400 font-bold' : isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {bulkFeedback || 'Suporta separadores: "->", "=", ":", tabulação ou vírgula'}
            </span>
            <button
              onClick={handleBulkImport}
              disabled={!bulkText.trim()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition disabled:opacity-50 cursor-pointer shadow-md"
            >
              Processar e Adicionar Regras
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Form & List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 cols): Add New Rule + Live Interactive Tester */}
        <div className="lg:col-span-5 space-y-5">
          {/* Add Single Rule Card */}
          <div
            className={`border rounded-2xl p-5 shadow-lg space-y-4 transition-colors ${
              isDark ? 'bg-[#030919] border-cyan-900/50' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-2 border-b pb-3 border-slate-800/60 dark:border-slate-800">
              <Plus className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider font-mono">
                Adicionar Nova Correção
              </h3>
            </div>

            <form onSubmit={handleAddRule} className="space-y-3">
              <div>
                <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Palavra ou termo entendido incorretamente:
                </label>
                <input
                  type="text"
                  value={newFrom}
                  onChange={(e) => setNewFrom(e.target.value)}
                  placeholder="Ex: calcaneo, perihilar, ileo..."
                  className={`w-full px-3 py-2 rounded-xl text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                    isDark
                      ? 'bg-[#020611] border-slate-800 text-slate-100 placeholder:text-slate-600'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
                  }`}
                />
              </div>

              <div className="flex items-center justify-center py-0.5">
                <ArrowRight className="w-4 h-4 text-cyan-500" />
              </div>

              <div>
                <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Substituir pela grafia médica correta:
                </label>
                <input
                  type="text"
                  value={newTo}
                  onChange={(e) => setNewTo(e.target.value)}
                  placeholder="Ex: calcâneo, peri-hilar, íleo..."
                  className={`w-full px-3 py-2 rounded-xl text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                    isDark
                      ? 'bg-[#020611] border-slate-800 text-slate-100 placeholder:text-slate-600'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
                  }`}
                />
              </div>

              <button
                type="submit"
                disabled={!newFrom.trim() || !newTo.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition disabled:opacity-50 cursor-pointer shadow-md shadow-cyan-600/30"
              >
                <Plus className="w-4 h-4" />
                <span>Salvar Comando de Correção</span>
              </button>
            </form>
          </div>

          {/* Interactive Live Tester Card */}
          <div
            className={`border rounded-2xl p-5 shadow-lg space-y-3 transition-colors ${
              isDark ? 'bg-[#030919] border-cyan-900/50' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-2 border-slate-800/60 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold font-mono">
                  Testar Substituição em Tempo Real
                </h3>
              </div>
              <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Simulação ao vivo
              </span>
            </div>

            <div>
              <label className={`block text-[11px] font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Digite ou cole um texto com termos a corrigir:
              </label>
              <textarea
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                rows={2}
                className={`w-full p-2.5 rounded-xl text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                  isDark
                    ? 'bg-[#020611] border-slate-800 text-slate-200'
                    : 'bg-slate-50 border-slate-300 text-slate-800'
                }`}
              />
            </div>

            <div>
              <label className={`block text-[11px] font-semibold mb-1 text-cyan-400`}>
                Resultado após aplicação automática dos comandos:
              </label>
              <div
                className={`p-3 rounded-xl border text-xs font-mono leading-relaxed min-h-[50px] ${
                  isDark
                    ? 'bg-[#020716] border-cyan-950 text-cyan-200'
                    : 'bg-cyan-50/50 border-cyan-200 text-cyan-900'
                }`}
              >
                {testResult || <span className="opacity-40 italic">O resultado aparecerá aqui...</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Active Rules List */}
        <div className="lg:col-span-7 space-y-4">
          <div
            className={`border rounded-2xl p-5 shadow-lg space-y-4 transition-colors ${
              isDark ? 'bg-[#030919] border-cyan-900/50' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            {/* Search and count header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Buscar termo ou correção cadastrada..."
                  className={`w-full pl-9 pr-3 py-1.5 rounded-xl text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                    isDark
                      ? 'bg-[#020611] border-slate-800 text-slate-200 placeholder:text-slate-600'
                      : 'bg-slate-50 border-slate-300 text-slate-800 placeholder:text-slate-400'
                  }`}
                />
              </div>

              {rules.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className={`text-xs text-red-500 hover:text-red-400 flex items-center gap-1 transition cursor-pointer px-2 py-1 rounded hover:bg-red-500/10`}
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Limpar Tudo</span>
                </button>
              )}
            </div>

            {/* List */}
            {filteredRules.length === 0 ? (
              <div className={`text-center py-10 border border-dashed rounded-xl ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
                <SpellCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-medium">Nenhum comando de correção encontrado.</p>
                <p className="text-[11px] mt-1">
                  Adicione termos acima ou clique em "Padrões" para carregar as correções anatômicas recomendadas.
                </p>
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1">
                {filteredRules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                      rule.enabled
                        ? isDark
                          ? 'bg-[#020612] border-slate-800/90 hover:border-cyan-500/40'
                          : 'bg-slate-50/80 border-slate-200 hover:border-cyan-300'
                        : isDark
                        ? 'bg-[#01040a] border-slate-900 opacity-50'
                        : 'bg-slate-100 border-slate-200 opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={() => handleToggleRule(rule.id)}
                        className="rounded border-slate-700 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                        title={rule.enabled ? 'Regra ativa (clique para desativar)' : 'Regra inativa (clique para ativar)'}
                      />

                      {/* Rule definition */}
                      <div className="flex flex-wrap items-center gap-2 font-mono text-xs flex-1">
                        <span className={`px-2 py-0.5 rounded border line-through-none ${
                          isDark ? 'bg-red-950/40 text-red-300 border-red-900/50' : 'bg-red-50 text-red-800 border-red-200'
                        }`}>
                          "{rule.from}"
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                        <span className={`px-2 py-0.5 rounded border font-bold ${
                          isDark ? 'bg-cyan-950/60 text-cyan-300 border-cyan-800/80' : 'bg-cyan-50 text-cyan-900 border-cyan-300'
                        }`}>
                          "{rule.to}"
                        </span>
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                      title="Excluir regra"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card: 12 Comandos e Regras Oficiais de Ditação e Formatação do PDF */}
          <div
            className={`border rounded-2xl p-5 shadow-lg space-y-3 transition-colors ${
              isDark ? 'bg-[#030919] border-cyan-900/50 text-slate-200' : 'bg-white border-slate-200 text-slate-800 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-2 border-b pb-2.5 border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-cyan-400">
                12 Comandos & Regras Oficiais de Ditação (Documento Anexo)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] leading-relaxed">
              <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-950/40 space-y-1">
                <span className="font-bold text-cyan-300">1. Interrogação:</span>
                <p>Quando for dito <code className="text-amber-300">"interroga"</code>, coloca automaticamente <code className="font-bold text-cyan-300">"?"</code>.</p>
              </div>

              <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-950/40 space-y-1">
                <span className="font-bold text-cyan-300">2. Expansão de Mediastino & Ventrículos:</span>
                <p>Quando dito só <code className="text-amber-300">"Mediastino."</code> $\rightarrow$ <em>"Mediastino centrado não se identificando lesão tumoral ou cística."</em>; e quando dito só <code className="text-amber-300">"Ventrículos."</code> $\rightarrow$ <em>"Ventrículos e cisternas sem alterações."</em></p>
              </div>

              <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-950/40 space-y-1">
                <span className="font-bold text-cyan-300">3. Opinião & Ponto Final:</span>
                <p>Se o médico ditar uma opinião/achados e finalizar com <code className="text-amber-300">"e ponto final"</code>, o texto ditado é rigorosamente preservado no laudo final. Apenas quando for dito <code className="text-amber-300">"ponto final"</code> isolado sem ditar opinião, a opinião padrão da máscara é omitida.</p>
              </div>

              <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-950/40 space-y-1">
                <span className="font-bold text-cyan-300">4. Técnica com Contraste:</span>
                <p>Exames contrastados terminam rigorosamente em <code className="text-cyan-300 font-mono">( Omnipaque 300/100 ml ).</code></p>
              </div>

              <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-950/40 space-y-1">
                <span className="font-bold text-cyan-300">5. Título Limpo (Sem "ESTUDO" ou Contraste):</span>
                <p>O título fica só o nome do exame (ex: <code className="font-bold text-cyan-300">TOMOGRAFIA DE TÓRAX</code> / <code className="font-bold text-cyan-300">TOMOGRAFIA DE ABDOME TOTAL</code>), sem "ESTUDO" e sem indicação de contraste.</p>
              </div>

              <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-950/40 space-y-1">
                <span className="font-bold text-cyan-300">6. Número 8 em TC de Abdome:</span>
                <p>Se paciente mulher $\rightarrow$ <em>"- Bexiga, útero e anexos sem alterações."</em>; se homem (ex: Everton, Wellington, etc.) $\rightarrow$ <em>"- Bexiga e próstata sem alterações."</em></p>
              </div>

              <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-950/40 space-y-1">
                <span className="font-bold text-cyan-300">7. Observação e Achado(s) Adicional(is):</span>
                <p>Configurados exatamente igual a <code className="text-cyan-300">Opinião:</code>, colocando dois pontos no final (<code className="text-cyan-300">Observação:</code>, <code className="text-cyan-300">Achado adicional:</code> ou <code className="text-cyan-300">Achados adicionais:</code>), sem traço antes do título, pulando 2 linhas para baixo antes de continuar os achados.</p>
              </div>

              <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-950/40 space-y-1">
                <span className="font-bold text-cyan-300">8. Números sem Contexto & Extenso:</span>
                <p>Busca e cola a frase equivalente ao número diretamente na máscara oficial do exame (ex: <code className="text-amber-300">"Três e quatro."</code> ou <code className="text-amber-300">"3 e 4"</code> em crânio $\rightarrow$ insere frases 3 e 4 da máscara em linhas separadas).</p>
              </div>

              <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-950/40 space-y-1">
                <span className="font-bold text-cyan-300">9 & 10. Parênteses:</span>
                <p><code className="text-amber-300">"{'{abre parênteses}'}"</code> $\rightarrow$ <code className="text-cyan-300 font-bold">(</code> e <code className="text-amber-300">"{'{fecha parênteses}'}"</code> $\rightarrow$ <code className="text-cyan-300 font-bold">)</code>.</p>
              </div>

              <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-950/40 space-y-1">
                <span className="font-bold text-cyan-300">11. Vértebras de Transição:</span>
                <p>Usa traço em vez de espaço para quaisquer vértebras de transição (ex: <code className="font-mono text-cyan-300">C6-C7</code>, <code className="font-mono text-cyan-300">L5-S1</code>, <code className="font-mono text-cyan-300">T12-L1</code>).</p>
              </div>

              <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-950/40 space-y-1 md:col-span-2">
                <span className="font-bold text-cyan-300">12. Segmentos em Algarismos Romanos:</span>
                <p>Converte números de segmentos para algarismos romanos (ex: <em>"no segmento 4 B"</em> $\rightarrow$ <code className="font-mono text-cyan-300">no segmento IV B</code>, <em>"segmento 7"</em> $\rightarrow$ <code className="font-mono text-cyan-300">segmento VII</code>).</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
