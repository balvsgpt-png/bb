import React, { useState } from 'react';
import {
  Copy,
  Check,
  Printer,
  Download,
  Edit3,
  Eye,
  FileCheck2,
  Share2,
  ShieldCheck,
  Sparkles,
  Info,
  Maximize2,
  PlusCircle,
  RotateCcw
} from 'lucide-react';
import { FormattedReport } from '../utils/codeBlackFormatter';
import { ExamMask } from '../data/radiologyMasks';

interface ReportViewerProps {
  report: FormattedReport | null;
  onUpdateReport?: (updated: FormattedReport) => void;
  onViewMask?: (mask: ExamMask) => void;
  onSwitchMask?: (newMaskId: string) => void;
  onNextReport?: () => void;
  isProcessing?: boolean;
  theme?: 'light' | 'dark';
}

export const ReportViewer: React.FC<ReportViewerProps> = ({
  report,
  onUpdateReport,
  onViewMask,
  onSwitchMask,
  onNextReport,
  isProcessing,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';
  const [copiedType, setCopiedType] = useState<'plain' | 'rich' | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'edit' | 'raw'>('preview');
  const [editablePlainText, setEditablePlainText] = useState('');

  // Sync editable text when report changes
  React.useEffect(() => {
    if (report) {
      setEditablePlainText(report.plainText);
    }
  }, [report]);

  if (isProcessing) {
    return (
      <div
        className={`border rounded-2xl p-8 flex flex-col items-center justify-center min-h-[460px] text-center shadow-lg transition-colors ${
          isDark
            ? 'bg-slate-900/90 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="relative w-14 h-14 mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 animate-ping" />
          <div className="w-14 h-14 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin flex items-center justify-center text-cyan-500">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
        </div>
        <h3 className="text-sm font-bold tracking-tight mb-1">
          Transcrevendo e Formatando Laudo
        </h3>
        <p className={`text-xs max-w-md leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Processando áudio com terminologia médica e cruzando sequências com o banco de máscaras oficiais...
        </p>
      </div>
    );
  }

  if (!report) {
    return (
      <div
        className={`border rounded-2xl p-10 flex flex-col items-center justify-center min-h-[460px] text-center transition-colors shadow-sm ${
          isDark
            ? 'bg-slate-900/80 border-slate-800 text-slate-400'
            : 'bg-white border-slate-200 text-slate-500'
        }`}
      >
        <div
          className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-3 ${
            isDark
              ? 'bg-slate-800/80 border-slate-700 text-cyan-400'
              : 'bg-slate-50 border-slate-200 text-cyan-600'
          }`}
        >
          <FileCheck2 className="w-7 h-7" />
        </div>
        <h3 className={`text-sm font-bold mb-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
          Nenhum laudo gerado no momento
        </h3>
        <p className={`text-xs max-w-sm mb-4 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Grave um áudio WAV pelo microfone, envie um arquivo ou selecione uma amostra para emitir o laudo no padrão Code Black.
        </p>
        <div
          className={`text-[11px] border px-3 py-2 rounded-xl flex items-center gap-2 ${
            isDark
              ? 'bg-slate-950 border-slate-800 text-slate-400'
              : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}
        >
          <Info className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
          <span>Após a transcrição, você poderá copiar o laudo diretamente para o PACS ou iniciar o próximo.</span>
        </div>
      </div>
    );
  }

  // Copy plain text to clipboard for PACS
  const handleCopyPlainText = async () => {
    try {
      await navigator.clipboard.writeText(editablePlainText || report.plainText);
      setCopiedType('plain');
      setTimeout(() => setCopiedType(null), 2500);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  // Copy rich HTML to clipboard for Word
  const handleCopyRichHtml = async () => {
    try {
      const blobHtml = new Blob([report.htmlText], { type: 'text/html' });
      const blobText = new Blob([editablePlainText || report.plainText], { type: 'text/plain' });
      const data = [new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText })];
      await navigator.clipboard.write(data);
      setCopiedType('rich');
      setTimeout(() => setCopiedType(null), 2500);
    } catch {
      handleCopyPlainText();
    }
  };

  // Print document
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${report.examTitle} - Laudo Radiológico</title>
          <style>
            @page { margin: 20mm; size: A4; }
            body {
              font-family: Arial, Helvetica, sans-serif;
              color: #111;
              line-height: 1.6;
              padding: 20px;
              max-width: 800px;
              margin: 0 auto;
            }
            .header-title {
              text-align: center;
              font-weight: bold;
              font-size: 16px;
              margin-bottom: 22px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .technique {
              text-align: justify;
              margin-bottom: 22px;
              font-size: 13.5px;
            }
            .section-bold {
              font-weight: bold;
              text-align: justify;
              margin-bottom: 14px;
              font-size: 13.5px;
            }
            .finding-item {
              text-align: justify;
              margin-bottom: 14px;
              font-size: 13.5px;
            }
            .patient-box {
              border-bottom: 2px solid #222;
              padding-bottom: 6px;
              margin-bottom: 20px;
              font-size: 13px;
              font-weight: bold;
              text-transform: uppercase;
            }
          </style>
        </head>
          <div class="header-title">${report.examTitle}</div>
          <div class="technique">${report.technique}</div>
          <div class="section-bold">O conjunto de imagens demonstra:</div>
          <div>
            ${report.findings.map(f => `<div class="finding-item">${f}</div>`).join('')}
          </div>
          ${report.opinionFindings && report.opinionFindings.length > 0 && report.opinionTitle ? `
          <div class="section-bold" style="margin-top: 20px;">${report.opinionTitle}</div>
          <div>
            ${report.opinionFindings.map(o => `<div class="finding-item">${o}</div>`).join('')}
          </div>
          ` : ''}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // Download plain TXT
  const handleDownloadTxt = () => {
    const element = document.createElement('a');
    const file = new Blob([editablePlainText || report.plainText], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `Laudo_${report.examTitle.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleSaveEdits = () => {
    if (onUpdateReport) {
      onUpdateReport({
        ...report,
        plainText: editablePlainText,
      });
    }
    setViewMode('preview');
  };

  return (
    <div
      className={`border rounded-2xl shadow-xl flex flex-col overflow-hidden transition-colors duration-200 relative ${
        isDark
          ? 'bg-[#030b1b] border-cyan-900/60 text-slate-100 shadow-[0_8px_30px_rgba(2,6,23,0.9)]'
          : 'bg-white border-slate-200 text-slate-900'
      }`}
    >
      {/* Top Film Cassette Clip */}
      <div className="h-1 bg-gradient-to-r from-slate-600 via-cyan-400 to-slate-600 rounded-b shadow-sm" />

      {/* Top action header */}
      <div
        className={`px-5 py-3 border-b flex flex-wrap items-center justify-between gap-3 ${
          isDark ? 'bg-[#041228] border-cyan-900/40' : 'bg-slate-50/80 border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(56,189,248,0.9)]" />
          <h2 className="text-xs font-bold uppercase tracking-wider font-mono">
            Laudo Estruturado • Filme Radiológico
          </h2>
          <div className="flex items-center gap-1.5">
            <span className={`text-[11px] font-mono hidden sm:inline ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Máscara:
            </span>
            <select
              value={report.matchedMask?.id || ''}
              onChange={(e) => onSwitchMask && onSwitchMask(e.target.value)}
              className={`text-[11px] font-mono px-2 py-0.5 rounded transition border focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer ${
                isDark
                  ? 'bg-slate-800 text-cyan-300 hover:bg-slate-700 border-slate-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
              }`}
              title="Trocar máscara do exame para reformatar o laudo com outra anatomia/contraste"
            >
              <optgroup label="COM CONTRASTE">
                <option value="crânio-com">CRÂNIO (COM CONTRASTE)</option>
                <option value="tórax-com">TÓRAX (COM CONTRASTE)</option>
                <option value="abdome-total-com">ABDOME TOTAL (COM CONTRASTE)</option>
                <option value="pescoço-com">PESCOÇO (COM CONTRASTE)</option>
              </optgroup>
              <optgroup label="SEM CONTRASTE">
                <option value="tórax-sem">TÓRAX (SEM CONTRASTE)</option>
                <option value="crânio-sem">CRÂNIO (SEM CONTRASTE)</option>
                <option value="coluna-cervical-sem">COLUNA CERVICAL (SEM CONTRASTE)</option>
                <option value="coluna-dorsal-sem">COLUNA DORSAL (SEM CONTRASTE)</option>
                <option value="coluna-lombar-sem">COLUNA LOMBAR (SEM CONTRASTE)</option>
                <option value="seios-da-face-sem">SEIOS DA FACE (SEM CONTRASTE)</option>
                <option value="pescoço-sem">PESCOÇO (SEM CONTRASTE)</option>
                <option value="pelve-bacia-sem">PELVE E BACIA (SEM CONTRASTE)</option>
                <option value="abdome-total-sem">ABDOME TOTAL (SEM CONTRASTE)</option>
                <option value="mastóides-sem">MASTÓIDES (SEM CONTRASTE)</option>
                <option value="membros-sem">ARTICULAÇÃO / MEMBRO (SEM CONTRASTE)</option>
              </optgroup>
              <optgroup label="ANGIOTOMOGRAFIAS">
                <option value="angio-carotidas-vertebrais">ANGIO CARÓTIDAS E VERTEBRAIS</option>
                <option value="angio-arterias-cerebrais">ANGIO ARTÉRIAS CEREBRAIS</option>
                <option value="angio-cerebral">ANGIO CEREBRAL</option>
                <option value="angio-aorta-abdominal">ANGIO AORTA ABDOMINAL</option>
              </optgroup>
            </select>
          </div>
        </div>

        {/* View toggles */}
        <div
          className={`flex items-center gap-1 p-0.5 rounded-lg border ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}
        >
          <button
            onClick={() => setViewMode('preview')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
              viewMode === 'preview'
                ? isDark
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-white text-slate-900 shadow-sm font-semibold'
                : isDark
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Formatado</span>
          </button>
          <button
            onClick={() => setViewMode('edit')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
              viewMode === 'edit'
                ? isDark
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-white text-slate-900 shadow-sm font-semibold'
                : isDark
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Editar</span>
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
              viewMode === 'raw'
                ? isDark
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-white text-slate-900 shadow-sm font-semibold'
                : isDark
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Texto Puro</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        className={`p-6 overflow-y-auto max-h-[580px] ${
          isDark ? 'bg-slate-950/50' : 'bg-slate-50/50'
        }`}
      >
        {viewMode === 'edit' ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Edite o texto do laudo livremente:</span>
              <button
                onClick={handleSaveEdits}
                className="px-3 py-1 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition cursor-pointer shadow-sm"
              >
                Concluir Edição
              </button>
            </div>
            <textarea
              value={editablePlainText}
              onChange={(e) => setEditablePlainText(e.target.value)}
              rows={18}
              className={`w-full rounded-xl p-4 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500 leading-relaxed resize-y border ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-slate-100'
                  : 'bg-white border-slate-300 text-slate-900 shadow-inner'
              }`}
            />
          </div>
        ) : viewMode === 'raw' ? (
          <pre
            className={`text-xs font-mono p-5 rounded-xl border whitespace-pre-wrap leading-relaxed select-all ${
              isDark
                ? 'bg-slate-900 text-slate-200 border-slate-800'
                : 'bg-white text-slate-800 border-slate-200 shadow-sm'
            }`}
          >
            {editablePlainText || report.plainText}
          </pre>
        ) : (
          /* Rendered Official Medical Sheet */
          <div
            className={`rounded-xl p-8 sm:p-10 border max-w-2xl mx-auto selection:bg-cyan-100 transition-colors ${
              isDark
                ? 'bg-slate-900 text-slate-100 border-slate-800 shadow-2xl'
                : 'bg-white text-slate-950 border-slate-200 shadow-md'
            }`}
          >
            {/* 1. TÍTULO DO EXAME: Centralizado em negrito */}
            <div className="text-center font-bold text-sm sm:text-base mb-6 tracking-wide uppercase">
              {report.examTitle}
            </div>

            {/* 2. TÉCNICA: Justificada, regular */}
            <div
              className={`text-justify text-xs mb-6 leading-relaxed ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}
            >
              {report.technique}
            </div>

            {/* 3. FRASE DO CONJUNTO: Em negrito, justificado */}
            <div className="font-bold text-xs mb-3 text-justify">
              O conjunto de imagens demonstra:
            </div>

            {/* 4. CORPO DO LAUDO: Achados com traço "- " e 2 linhas de intervalo */}
            <div className="space-y-3 mb-6">
              {report.findings.map((finding, idx) => (
                <div
                  key={idx}
                  className={`text-justify text-xs leading-relaxed ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  {finding}
                </div>
              ))}
            </div>

            {/* 5. OPINIÃO / OBSERVAÇÃO: Apenas exibido se houver achados na seção */}
            {report.opinionFindings && report.opinionFindings.length > 0 && report.opinionTitle && (
              <>
                <div className="font-bold text-xs mb-3 text-justify">
                  {report.opinionTitle}
                </div>

                <div className="space-y-2 mb-4">
                  {report.opinionFindings.map((opinion, idx) => (
                    <div
                      key={idx}
                      className={`text-justify text-xs leading-relaxed ${
                        isDark ? 'text-slate-300' : 'text-slate-700'
                      }`}
                    >
                      {opinion}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Code Black Standards Compliance Bar */}
      <div
        className={`px-5 py-2 border-t flex flex-wrap items-center justify-between gap-2 text-[11px] ${
          isDark
            ? 'bg-slate-950 border-slate-800 text-slate-400'
            : 'bg-slate-50 border-slate-200 text-slate-500'
        }`}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span className="font-medium text-emerald-600 dark:text-emerald-400">Padrão Code Black</span>
          <span className="hidden sm:inline">• Centralizado</span>
          <span className="hidden sm:inline">• Traço Único</span>
          <span className="hidden sm:inline">• Opinião sem Traço</span>
        </div>

        {report.sourceNumbersMatched && report.sourceNumbersMatched.length > 0 && (
          <span
            className={`font-mono text-[10px] px-2 py-0.5 rounded border ${
              isDark
                ? 'bg-slate-900 text-cyan-400 border-slate-800'
                : 'bg-cyan-50 text-cyan-700 border-cyan-200'
            }`}
          >
            Máscara: {report.sourceNumbersMatched.join(', ')}
          </span>
        )}
      </div>

      {/* Bottom Action Buttons: Copiar, Próximo Laudo, Print, Download */}
      <div
        className={`px-5 py-3 border-t flex flex-wrap items-center justify-between gap-3 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        {/* Left Action Buttons: Copiar PACS + Próximo Laudo (EXACT USER REQUEST) */}
        <div className="flex items-center gap-2">
          {/* 1-Click Copy Plain Text for PACS / RIS */}
          <button
            onClick={handleCopyPlainText}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/25 transition cursor-pointer"
            title="Copiar texto puro padronizado para colar no PACS / MV / Tasy"
          >
            {copiedType === 'plain' ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Copiado para o PACS!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copiar texto PACS/RIS</span>
              </>
            )}
          </button>

          {/* NOVO BOTÃO: "Próximo laudo" (EXPLICIT USER REQUEST) */}
          {onNextReport && (
            <button
              onClick={onNextReport}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-emerald-900/40 hover:border-emerald-600/60 shadow-sm'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 hover:border-emerald-300 shadow-sm'
              }`}
              title="Apagar áudio e texto para iniciar o próximo laudo do zero"
            >
              <PlusCircle className="w-4 h-4 text-emerald-500" />
              <span>Próximo laudo</span>
            </button>
          )}

          {/* Copy formatted HTML for Word */}
          <button
            onClick={handleCopyRichHtml}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition cursor-pointer ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
            title="Copiar com formatação rica para Word"
          >
            {copiedType === 'rich' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Word</span>
              </>
            )}
          </button>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition cursor-pointer ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
            title="Imprimir laudo ou salvar PDF"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>Imprimir</span>
          </button>

          <button
            onClick={handleDownloadTxt}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition cursor-pointer ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
            title="Baixar arquivo TXT"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>TXT</span>
          </button>
        </div>
      </div>
    </div>
  );
};
