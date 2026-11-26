import React from 'react';
import { Shield, CheckCircle2, FileText, AlertTriangle, BookOpen, Volume2, Mic } from 'lucide-react';

interface GuidelinesModalProps {
  onOpenPdf: () => void;
  theme?: 'light' | 'dark';
}

export const GuidelinesModal: React.FC<GuidelinesModalProps> = ({ onOpenPdf, theme = 'light' }) => {
  const isDark = theme === 'dark';

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div
        className={`border rounded-2xl p-6 shadow-md transition-colors duration-200 ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                isDark
                  ? 'bg-cyan-950/80 border-cyan-800 text-cyan-400'
                  : 'bg-cyan-50 border-cyan-200 text-cyan-600'
              }`}
            >
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>Diretrizes e Padrão Obrigatório "Code Black"</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-mono border ${
                    isDark
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                      : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                  }`}
                >
                  Manual Radiológico
                </span>
              </h2>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Regras obrigatórias de formatação, layout, terminologia e cruzamento numérico com o PDF de laudos.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenPdf}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              isDark
                ? 'bg-amber-950/70 hover:bg-amber-900/80 text-amber-300 border-amber-800/80'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200 shadow-sm'
            }`}
          >
            <FileText className="w-4 h-4 text-amber-500" />
            <span>Consultar PDF Original de Laudos</span>
          </button>
        </div>
      </div>

      {/* Grid of Rules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Rule 1: Estrutura Obrigatória */}
        <div
          className={`border rounded-2xl p-5 space-y-4 shadow-sm transition-colors duration-200 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
          }`}
        >
          <div className={`flex items-center gap-2 pb-2 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <CheckCircle2 className="w-4 h-4 text-cyan-500" />
            <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
              1. Estrutura Obrigatória do Laudo
            </h3>
          </div>

          <ul className="space-y-3 text-xs">
            <li className="flex items-start gap-2">
              <span className="font-mono text-cyan-500 font-bold shrink-0">I.</span>
              <div>
                <strong className={isDark ? 'text-white' : 'text-slate-900'}>TÍTULO DO EXAME:</strong> Centralizado em letras maiúsculas e em negrito (ex: <code className="font-mono font-bold text-cyan-600 dark:text-cyan-400">TOMOGRAFIA DE ABDOME TOTAL</code>).
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono text-cyan-500 font-bold shrink-0">II.</span>
              <div>
                <strong className={isDark ? 'text-white' : 'text-slate-900'}>ESTUDO REALIZADO:</strong> Texto técnico justificado, sem negrito, informando o tomógrafo multislice de 128 detectores e administração de contraste.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono text-cyan-500 font-bold shrink-0">III.</span>
              <div>
                <strong className={isDark ? 'text-white' : 'text-slate-900'}>O CONJUNTO:</strong> A frase exata <code className="font-mono font-bold text-cyan-600 dark:text-cyan-400">"O conjunto de imagens demonstra:"</code> em negrito, justificado, sem traço antes.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono text-cyan-500 font-bold shrink-0">IV.</span>
              <div>
                <strong className={isDark ? 'text-white' : 'text-slate-900'}>CORPO DO LAUDO:</strong> Frases justificadas. Todo momento após "ponto parágrafo" pula 2 linhas e inicia a frase com traço <code className="font-mono font-bold text-cyan-600 dark:text-cyan-400">"-"</code>. Exatamente 1 traço por frase.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono text-cyan-500 font-bold shrink-0">V.</span>
              <div>
                <strong className={isDark ? 'text-white' : 'text-slate-900'}>OPINIÃO:</strong> A palavra <code className="font-mono font-bold text-cyan-600 dark:text-cyan-400">"Opinião:"</code> em negrito, justificada, sem presença de traços antes. Pula 2 linhas e lista os diagnósticos com <code className="font-mono font-bold text-cyan-600 dark:text-cyan-400">"- "</code>.
              </div>
            </li>
          </ul>
        </div>

        {/* Rule 2: Consulta ao PDF & Regra de Números */}
        <div
          className={`border rounded-2xl p-5 space-y-4 shadow-sm transition-colors duration-200 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
          }`}
        >
          <div className={`flex items-center gap-2 pb-2 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <BookOpen className="w-4 h-4 text-cyan-500" />
            <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
              2. Consulta ao PDF & Ditação Numérica
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <p className="leading-relaxed">
              <strong className={isDark ? 'text-white' : 'text-slate-900'}>Gatilho de Acionamento:</strong> Quando o médico ditar números isolados ou sequências (ex: <span className="font-mono text-cyan-600 dark:text-cyan-400">"o conjunto 1 2 3 4 5"</span> ou <span className="font-mono text-cyan-600 dark:text-cyan-400">"1 2 ponto parágrafo 4"</span>), o sistema consulta a máscara oficial do PDF.
            </p>

            <div
              className={`p-3 rounded-xl border space-y-2 ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className={`text-[11px] font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                Exemplo Prático:
              </div>
              <div className="text-[11px] font-mono text-amber-600 dark:text-amber-300">
                Fala: "Tomografia de abdome com contraste... o conjunto 1 2 3 ponto parágrafo"
              </div>
              <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300">
                Resultado no laudo:
                <br />- Fígado, baço e pâncreas com forma, contornos e coeficiente de atenuação e dimensões normais.
                <br />- Não há dilatação da árvore biliar e do sistema porta.
                <br />- Vesícula biliar de aspecto normal.
              </div>
            </div>

            <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              O número é apagado e substituído integralmente pela frase exata da máscara, preservando o layout médico rigoroso.
            </p>
          </div>
        </div>

        {/* Rule 3: Dicionário de Comandos de Voz */}
        <div
          className={`border rounded-2xl p-5 space-y-4 shadow-sm transition-colors duration-200 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
          }`}
        >
          <div className={`flex items-center gap-2 pb-2 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <Mic className="w-4 h-4 text-cyan-500" />
            <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
              3. Comandos de Ditação Reconhecidos
            </h3>
          </div>

          <div className="space-y-2 text-xs">
            <div
              className={`flex justify-between items-center p-2 rounded-lg border ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className="font-mono text-cyan-600 dark:text-cyan-400 font-semibold">"ponto parágrafo"</span>
              <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>Pula 2 linhas e insere traço "-"</span>
            </div>
            <div
              className={`flex justify-between items-center p-2 rounded-lg border ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className="font-mono text-cyan-600 dark:text-cyan-400 font-semibold">"opinião"</span>
              <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>Remove traço, cria título <strong>Opinião:</strong> em negrito</span>
            </div>
            <div
              className={`flex justify-between items-center p-2 rounded-lg border ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className="font-mono text-cyan-600 dark:text-cyan-400 font-semibold">"observação"</span>
              <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>Aplica a mesma regra de "Opinião:"</span>
            </div>
            <div
              className={`flex justify-between items-center p-2 rounded-lg border ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className="font-mono text-cyan-600 dark:text-cyan-400 font-semibold">"como achados adicionais"</span>
              <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>Aplica a mesma regra de "Opinião:"</span>
            </div>
            <div
              className={`flex justify-between items-center p-2 rounded-lg border ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className="font-mono text-cyan-600 dark:text-cyan-400 font-semibold">"ponto final"</span>
              <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>Encerra a frase com ponto (.)</span>
            </div>
          </div>
        </div>

        {/* Rule 4: Política No-Cite & Terminologia Rigorosa */}
        <div
          className={`border rounded-2xl p-5 space-y-4 shadow-sm transition-colors duration-200 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
          }`}
        >
          <div className={`flex items-center gap-2 pb-2 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
              4. Política No-Cite & Terminologia Médica
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <strong className={isDark ? 'text-white' : 'text-slate-900'}>Política Estrita "No-Cite":</strong>
              <p className={`mt-1 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                É terminantemente proibido incluir qualquer tag de citação, números entre colchetes como <code className="text-red-500">[1]</code>, links, metadados ou menções de fontes no texto final. O laudo é emitido limpo para uso médico imediato no prontuário.
              </p>
            </div>

            <div>
              <strong className={isDark ? 'text-white' : 'text-slate-900'}>Terminologia Anatômica Rigorosa:</strong>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['perihilar', 'lobo', 'íleo terminal', 'linfonodomegalias', 'osteófitos', 'parênquima', 'retroperitôneo', 'óstio-meatais', 'ateromatose'].map((term) => (
                  <span
                    key={term}
                    className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                      isDark
                        ? 'bg-slate-950 text-emerald-400 border-slate-800'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {term}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
