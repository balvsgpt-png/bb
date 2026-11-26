/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CorrectionRule {
  id: string;
  from: string;
  to: string;
  enabled: boolean;
  category?: 'anatomia' | 'termo_tecnico' | 'pontuacao' | 'geral';
}

export const DEFAULT_RADIOLOGY_CORRECTIONS: Omit<CorrectionRule, 'id'>[] = [
  { from: 'nucapsular', to: 'nucleocapsular', enabled: true, category: 'anatomia' },
  { from: 'podenso', to: 'hipodenso', enabled: true, category: 'termo_tecnico' },
  { from: '{abre parênteses}', to: '(', enabled: true, category: 'pontuacao' },
  { from: '{fecha parênteses}', to: ')', enabled: true, category: 'pontuacao' },
  { from: 'abre parênteses', to: '(', enabled: true, category: 'pontuacao' },
  { from: 'fecha parênteses', to: ')', enabled: true, category: 'pontuacao' },
  { from: 'abre parenteses', to: '(', enabled: true, category: 'pontuacao' },
  { from: 'fecha parenteses', to: ')', enabled: true, category: 'pontuacao' },
  { from: 'calcaneo', to: 'calcâneo', enabled: true, category: 'anatomia' },
  { from: 'calcaneos', to: 'calcâneos', enabled: true, category: 'anatomia' },
  { from: 'perihilar', to: 'peri-hilar', enabled: true, category: 'anatomia' },
  { from: 'perihilares', to: 'peri-hilares', enabled: true, category: 'anatomia' },
  { from: 'ileo', to: 'íleo', enabled: true, category: 'anatomia' },
  { from: 'ileo terminal', to: 'íleo terminal', enabled: true, category: 'anatomia' },
  { from: 'derrame pleura', to: 'derrame pleural', enabled: true, category: 'termo_tecnico' },
  { from: 'derrame pericardo', to: 'derrame pericárdico', enabled: true, category: 'termo_tecnico' },
  { from: 'linfonodomegalia', to: 'linfonodomegalias', enabled: true, category: 'termo_tecnico' },
  { from: 'coledoco', to: 'colédoco', enabled: true, category: 'anatomia' },
  { from: 'osteofito', to: 'osteófitos', enabled: true, category: 'termo_tecnico' },
  { from: 'osteofitos marginais', to: 'osteófitos marginais', enabled: true, category: 'termo_tecnico' },
  { from: 'atelectasia laminar', to: 'atelectasias laminares', enabled: true, category: 'termo_tecnico' },
  { from: 'enfisema centro lobular', to: 'enfisema centrolobular', enabled: true, category: 'termo_tecnico' },
  { from: 'espondilodiscoartrose', to: 'espondilodiscoartrose', enabled: true, category: 'termo_tecnico' },
  { from: 'colateral porto sistemica', to: 'colaterais portossistêmicas', enabled: true, category: 'anatomia' },
  { from: 'aorto iliaco', to: 'aorto-ilíaco', enabled: true, category: 'anatomia' },
  { from: 'sub segmentar', to: 'subsegmentar', enabled: true, category: 'termo_tecnico' },
  { from: 'baco', to: 'baço', enabled: true, category: 'anatomia' },
  { from: 'figado', to: 'fígado', enabled: true, category: 'anatomia' },
];

const STORAGE_KEY = 'laudo_wav_corrections_v1';

/**
 * Loads stored correction rules or initializes with default radiology rules
 */
export function getStoredCorrections(): CorrectionRule[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure new mandatory default rules are merged in if not present
        const existingFroms = new Set(parsed.map((r: CorrectionRule) => r.from.toLowerCase().trim()));
        let merged = false;
        for (let i = 0; i < DEFAULT_RADIOLOGY_CORRECTIONS.length; i++) {
          const def = DEFAULT_RADIOLOGY_CORRECTIONS[i];
          if (!existingFroms.has(def.from.toLowerCase().trim())) {
            parsed.unshift({
              ...def,
              id: `rule_default_${i}_${Date.now()}`,
            });
            merged = true;
          }
        }
        if (merged) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          } catch {}
        }
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load correction rules from localStorage:', e);
  }

  // Initialize with default radiology corrections
  const initial = DEFAULT_RADIOLOGY_CORRECTIONS.map((c, index) => ({
    ...c,
    id: `rule_default_${index}_${Date.now()}`,
  }));

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  } catch {}

  return initial;
}

/**
 * Saves correction rules to localStorage
 */
export function saveStoredCorrections(rules: CorrectionRule[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  } catch (e) {
    console.error('Failed to save correction rules:', e);
  }
}

/**
 * Escape string for RegExp pattern matching
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Applies all active correction rules to given text
 */
export function applyCorrectionRules(
  text: string,
  rules: CorrectionRule[]
): {
  correctedText: string;
  replacementsCount: number;
  replacementsMade: { from: string; to: string }[];
} {
  if (!text || !rules || rules.length === 0) {
    return { correctedText: text || '', replacementsCount: 0, replacementsMade: [] };
  }

  let result = text;
  let count = 0;
  const replacementsMade: { from: string; to: string }[] = [];

  // Sort rules by length of target word descending so multi-word expressions match before single words
  const activeRules = rules
    .filter((r) => r.enabled && r.from.trim() && r.to.trim())
    .sort((a, b) => b.from.length - a.from.length);

  for (const rule of activeRules) {
    const fromPattern = escapeRegExp(rule.from.trim());
    // Match whole words or boundary expressions case-insensitively
    const regex = new RegExp(`(?<=^|\\s|[.,;()/-])${fromPattern}(?=$|\\s|[.,;()/-])`, 'gi');

    let matchedInThisRule = false;
    result = result.replace(regex, (match) => {
      count++;
      matchedInThisRule = true;
      return rule.to.trim();
    });

    if (matchedInThisRule) {
      replacementsMade.push({ from: rule.from, to: rule.to });
    }
  }

  return {
    correctedText: result,
    replacementsCount: count,
    replacementsMade,
  };
}

/**
 * Parses user text file or doc format into CorrectionRule items
 * Accepts syntax:
 *   errado -> correto
 *   errado = correto
 *   errado : correto
 *   errado => correto
 *   errado \t correto
 *   errado , correto
 */
export function parseRulesFromText(inputText: string): CorrectionRule[] {
  const lines = inputText.split(/\r?\n/);
  const parsedRules: CorrectionRule[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) continue;

    // Split on delimiters
    let from = '';
    let to = '';

    if (line.includes('->')) {
      const parts = line.split('->');
      from = parts[0];
      to = parts.slice(1).join('->');
    } else if (line.includes('=>')) {
      const parts = line.split('=>');
      from = parts[0];
      to = parts.slice(1).join('=>');
    } else if (line.includes('=')) {
      const parts = line.split('=');
      from = parts[0];
      to = parts.slice(1).join('=');
    } else if (line.includes(':')) {
      const parts = line.split(':');
      from = parts[0];
      to = parts.slice(1).join(':');
    } else if (line.includes('\t')) {
      const parts = line.split('\t');
      from = parts[0];
      to = parts.slice(1).join('\t');
    } else if (line.includes(';')) {
      const parts = line.split(';');
      from = parts[0];
      to = parts.slice(1).join(';');
    } else if (line.includes(',')) {
      const parts = line.split(',');
      from = parts[0];
      to = parts.slice(1).join(',');
    }

    from = from.trim().replace(/^["']|["']$/g, '');
    to = to.trim().replace(/^["']|["']$/g, '');

    if (from && to && from.toLowerCase() !== to.toLowerCase()) {
      parsedRules.push({
        id: `rule_user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        from,
        to,
        enabled: true,
        category: 'geral',
      });
    }
  }

  return parsedRules;
}

/**
 * Exports current rules as clean text format (errado -> correto)
 */
export function exportRulesToText(rules: CorrectionRule[]): string {
  const header = `# ARQUIVO DE REGRAS E COMANDOS DE CORREÇÃO RADIOLÓGICA (Laudo.wav)
# Formato: [palavra ou termo incorreto] -> [correção exata]
# Atualizado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}
\n`;

  const lines = rules.map((r) => `${r.from} -> ${r.to}`);
  return header + lines.join('\n');
}
