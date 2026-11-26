import { Mic, FileText, BookOpen, Shield, Sun, Moon, Sparkles, Activity, SpellCheck, Download, Loader2 } from 'lucide-react';
import { XRayLogo } from './XRayLogo';

interface HeaderProps {
  activeTab: 'transcribe' | 'text-dictate' | 'masks' | 'corrections' | 'guidelines';
  setActiveTab: (tab: 'transcribe' | 'text-dictate' | 'masks' | 'corrections' | 'guidelines') => void;
  hasApiKey: boolean;
  onOpenPdf: () => void;
  onDownloadBackup: () => void;
  isBackingUp?: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  correctionsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  hasApiKey,
  onOpenPdf,
  onDownloadBackup,
  isBackingUp = false,
  theme,
  onToggleTheme,
  correctionsCount = 0,
}) => {
  const isDark = theme === 'dark';

  return (
    <header
      className={`sticky top-0 z-40 transition-colors duration-200 border-b backdrop-blur-md ${
        isDark
          ? 'bg-[#030816]/95 border-cyan-900/40 text-slate-100 shadow-[0_4px_20px_rgba(3,8,22,0.8)]'
          : 'bg-white/95 border-slate-200 text-slate-900 shadow-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand Logo & Name: Authentic X-Ray Skeletal Logo */}
        <div className="flex items-center gap-3">
          <XRayLogo size={38} />

          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-tight font-mono flex items-center gap-1.5">
                <span className={isDark ? 'text-white' : 'text-slate-950'}>Laudo</span>
                <span className="text-cyan-500 font-black">.wav</span>
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold border ${
                  isDark
                    ? 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                Raio-X & Tomografia
              </span>
            </div>
            <p className={`text-[11px] font-medium leading-none mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Padrão Code Black • Radiologia & Tomografia
            </p>
          </div>
        </div>

        {/* Clean, Uncluttered Navigation Bar */}
        <nav
          className={`flex items-center gap-1 p-1 rounded-xl border transition-colors ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-100/90 border-slate-200'
          }`}
        >
          <button
            onClick={() => setActiveTab('transcribe')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'transcribe'
                ? 'bg-cyan-600 text-white shadow-sm'
                : isDark
                ? 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Áudio WAV</span>
          </button>

          <button
            onClick={() => setActiveTab('text-dictate')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'text-dictate'
                ? 'bg-cyan-600 text-white shadow-sm'
                : isDark
                ? 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Ditação em Texto</span>
          </button>

          <button
            onClick={() => setActiveTab('masks')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'masks'
                ? 'bg-cyan-600 text-white shadow-sm'
                : isDark
                ? 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Máscaras (PDF)</span>
          </button>

          {/* New Tab immediately to the left of Regras */}
          <button
            onClick={() => setActiveTab('corrections')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'corrections'
                ? 'bg-cyan-600 text-white shadow-sm'
                : isDark
                ? 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
            title="Inserir arquivos de texto e comandos de correção fonética de palavras"
          >
            <SpellCheck className="w-3.5 h-3.5" />
            <span>Correções</span>
            {correctionsCount > 0 && (
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  activeTab === 'corrections'
                    ? 'bg-cyan-800 text-white'
                    : isDark
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60'
                    : 'bg-cyan-100 text-cyan-800'
                }`}
              >
                {correctionsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('guidelines')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'guidelines'
                ? 'bg-cyan-600 text-white shadow-sm'
                : isDark
                ? 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Regras</span>
          </button>
        </nav>

        {/* Right Tools: Theme Switcher, PDF Button, Status */}
        <div className="flex items-center gap-2">
          {/* Light / Dark Mode Toggle */}
          <button
            onClick={onToggleTheme}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
              isDark
                ? 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-slate-800'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm'
            }`}
            title={isDark ? 'Mudar para Versão Branca (Clara)' : 'Mudar para Versão Escura (Preta)'}
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Branco</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-700" />
                <span className="hidden sm:inline">Escuro</span>
              </>
            )}
          </button>

          {/* PDF original viewer button */}
          <button
            onClick={onOpenPdf}
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer ${
              isDark
                ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm'
            }`}
            title="Consultar PDF original de máscaras de tomografia"
          >
            <FileText className="w-3.5 h-3.5 text-amber-500" />
            <span>PDF</span>
          </button>

          {/* Full Software Backup ZIP button */}
          <button
            onClick={onDownloadBackup}
            disabled={isBackingUp}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer disabled:opacity-60 ${
              isDark
                ? 'bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border-emerald-700/60 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200 shadow-sm'
            }`}
            title="Baixar arquivo completo do software (.zip) para backup no seu computador"
          >
            {isBackingUp ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            ) : (
              <Download className="w-3.5 h-3.5 text-emerald-500" />
            )}
            <span>{isBackingUp ? 'Gerando...' : 'Backup (.zip)'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
