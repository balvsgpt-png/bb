import { RADIOLOGY_MASKS, ExamMask } from '../data/radiologyMasks.js';

export interface FormattedReport {
  patientName?: string;
  examTitle: string;
  technique: string;
  findings: string[];
  opinionTitle?: string;
  opinionFindings: string[];
  plainText: string;
  htmlText: string;
  matchedMask?: ExamMask;
  sourceNumbersMatched?: number[];
  transcribedText?: string;
  numbersDetected?: number[];
  aiGenerated?: boolean;
  modelUsed?: string;
  notice?: string;
}

/**
 * Cleans the exam title so it contains ONLY the official exam name:
 * e.g., "TOMOGRAFIA DE TÓRAX", "TOMOGRAFIA DE ABDOME TOTAL", "TOMOGRAFIA DE PELVE",
 * "TOMOGRAFIA DE COLUNA LOMBAR", "TOMOGRAFIA DE CRÂNIO", "TOMOGRAFIA DE MASTÓIDES".
 * Strips "ESTUDO", "EXAME", "(SEM CONTRASTE)", "(COM CONTRASTE)", etc.
 */
export function cleanExamTitle(title: string): string {
  if (!title) return '';
  let cleaned = title
    // Strip contrast designations in parentheses, with dashes, or as standalone words
    .replace(/\s*\((?:SEM|COM|SEM\s+E\s+COM)\s+CONTRASTE\)/gi, '')
    .replace(/\s*[-–—]\s*(?:SEM|COM|SEM\s+E\s+COM)\s+CONTRASTE/gi, '')
    .replace(/\b(?:SEM|COM|SEM\s+E\s+COM)\s+CONTRASTE\b/gi, '')
    // Replace "ESTUDO TOMOGRÁFICO DE..." -> "TOMOGRAFIA DE..."
    .replace(/\bestudo\s+tomogr[aá]fico\s+(?:de\s+|do\s+|da\s+|dos\s+|das\s+)?/gi, 'TOMOGRAFIA DE ')
    // Strip standalone "ESTUDO DE", "ESTUDO DA", "ESTUDO DO", "ESTUDO"
    .replace(/\bestudo\s+(?:de\s+|da\s+|do\s+|dos\s+|das\s+)?/gi, '')
    .replace(/\b(?:de\s+|da\s+|do\s+|dos\s+|das\s+)?estudo\b/gi, '')
    // Strip "EXAME DE", "EXAME DA", "EXAME DO", "EXAME"
    .replace(/\bexame\s+(?:de\s+|da\s+|do\s+|dos\s+|das\s+)?/gi, '')
    .replace(/\b(?:de\s+|da\s+|do\s+|dos\s+|das\s+)?exame\b/gi, '')
    // Strip "LAUDO DE", "LAUDO DA", "LAUDO"
    .replace(/\blaudo\s+(?:de\s+|da\s+|do\s+|dos\s+|das\s+)?/gi, '')
    // Normalize punctuation and whitespace
    .replace(/^[\s,\.\-–—:]+/, '')
    .replace(/[\s,\.\-–—:]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

  // If user said "DE TÓRAX", prepend "TOMOGRAFIA "
  if (/^DE\s+/i.test(cleaned)) {
    cleaned = `TOMOGRAFIA ${cleaned}`;
  }

  return cleaned;
}

/**
 * Detects patient gender from name or context (Rule 6 / Item 2)
 */
export function detectPatientGender(patientName?: string, fullText?: string): 'F' | 'M' | 'UNKNOWN' {
  let effectiveName = (patientName || '').trim();
  if (!effectiveName && fullText) {
    const m = fullText.match(/\bpaciente[\s:]+([^\,\.\n<]+?)(?:,?\s*exame|,?\s*tomografia|\.|\n|$)/i);
    if (m) {
      effectiveName = m[1].trim();
    }
  }

  const combined = `${effectiveName} ${fullText || ''}`.toLowerCase();

  if (/\b(dona|sra\.?|senhora|paciente\s+(?:do\s+sexo\s+)?feminin[oa]|sexo\s+feminino|mulher|a\s+paciente)\b/i.test(combined)) {
    return 'F';
  }
  if (/\b(sr\.?|senhor|paciente\s+(?:do\s+sexo\s+)?masculin[oa]|sexo\s+masculino|homem|o\s+paciente)\b/i.test(combined)) {
    return 'M';
  }

  if (effectiveName) {
    const firstName = effectiveName
      .trim()
      .split(/\s+/)[0]
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z]/g, '');

    const femaleNames = new Set([
      'maria', 'ana', 'luzia', 'lucia', 'juliana', 'fernanda', 'patricia', 'camila', 'bruna', 'claudia',
      'aline', 'amanda', 'beatriz', 'carolina', 'caroline', 'daniela', 'debora', 'eliane', 'fatima',
      'gabriela', 'helena', 'isabela', 'isabella', 'larissa', 'leticia', 'luana', 'marcela', 'mariana',
      'monica', 'natalia', 'paula', 'renata', 'sabrina', 'tatiana', 'vanessa', 'solange', 'silvia',
      'sueli', 'suelen', 'teresa', 'tereza', 'valeria', 'sonia', 'regina', 'rosana', 'rose', 'sandra', 'vera',
      'marcia', 'luciana', 'andreia', 'adriana', 'cristina', 'cristiane', 'elisabete', 'elizabeth', 'francisca',
      'rita', 'joana', 'laura', 'marta', 'neuza', 'neusa', 'cleusa', 'lourdes', 'simone', 'monique',
      'michele', 'michelle', 'jaqueline', 'taise', 'thais', 'denise', 'nicole', 'alice', 'jessica',
      'julia', 'vitoria', 'carla', 'andressa', 'sofia', 'valentina', 'manuela', 'lorena', 'yasmin',
      'cecilia', 'clara', 'bianca', 'priscila', 'kelly', 'marlene', 'rosangela', 'elizangela', 'roseli',
      'silvana', 'aparecida', 'socorro', 'conceicao', 'ines', 'irene', 'ivanete', 'ivone', 'isabel',
      'alessandra', 'elaine', 'fabiana', 'flavia', 'giovana', 'giovanna', 'ingrid', 'karina', 'karine',
      'karen', 'katia', 'lilian', 'viviane', 'vivian', 'mirian', 'miriam', 'helen', 'ellen', 'carmen',
      'ester', 'ruth', 'noemi', 'naomi', 'sarah', 'sara', 'rebeca', 'rebecca', 'tamires', 'talita',
      'giulia', 'stefany', 'paloma', 'amelia', 'celia', 'leila', 'sheila', 'daiane', 'dayane', 'janaina',
      'poliana', 'mayara', 'naiara', 'rayssa', 'eduarda', 'luiza', 'luisa', 'heloisa', 'eloa', 'alicia',
      'lara', 'melissa', 'mirela', 'livia', 'claudete', 'odete', 'ivete', 'elisangela', 'neide', 'marli',
      'marilda', 'norma', 'nadir', 'cleide', 'dirce', 'dulce', 'eunice', 'gloria', 'graca', 'ilda', 'ilza',
      'leia', 'lidia', 'lucrecia', 'madalena', 'margarida', 'nair', 'olga', 'otilia', 'penha', 'raquel',
      'rosa', 'salete', 'selma', 'tania', 'zilda', 'zulmira', 'josefa', 'antonia'
    ]);

    const maleNames = new Set([
      'joao', 'roberto', 'carlos', 'pedro', 'lucas', 'bruno', 'marcelo', 'paulo', 'marcos', 'marcus',
      'jose', 'antonio', 'francisco', 'luiz', 'luis', 'fernando', 'ricardo', 'eduardo', 'marcio',
      'rodrigo', 'andre', 'felipe', 'rafael', 'daniel', 'alexandre', 'guilherme', 'gabriel', 'gustavo',
      'leonardo', 'tiago', 'thiago', 'vitor', 'victor', 'claudio', 'sergio', 'cesar', 'fabio', 'walter',
      'otavio', 'everton', 'wellington', 'washington', 'robson', 'nilton', 'milton', 'ayrton', 'ailton',
      'cleiton', 'clayton', 'edilson', 'edson', 'alison', 'alisson', 'anderson', 'jefferson', 'emerson',
      'jackson', 'nelson', 'wilson', 'maycon', 'maicon', 'vinicius', 'mateus', 'matheus', 'arthur', 'artur',
      'davi', 'david', 'samuel', 'henrique', 'bernardo', 'igor', 'yuri', 'caio', 'breno', 'danilo',
      'douglas', 'elias', 'fabiano', 'gilberto', 'jorge', 'leandro', 'mauro', 'murilo', 'raul', 'sidney',
      'valdir', 'waldir', 'rogerio', 'julio', 'humberto', 'alex', 'ivan', 'diego', 'diogo', 'adriano',
      'juliano', 'luciano', 'cristiano', 'mariano', 'sebastiao', 'damiao', 'tadeu', 'romeu', 'irineu',
      'eliseu', 'rui', 'levi', 'caua', 'enzo', 'gael', 'theo', 'noah', 'ravi', 'benjamin', 'joaquim',
      'martim', 'valentim', 'antony', 'anthony', 'henry', 'erick', 'eric', 'patrick', 'yago', 'iago',
      'hiago', 'hugo', 'caue', 'lorenzo', 'pietro', 'camilo', 'emilio', 'saul', 'abner', 'wagner', 'vagner',
      'fagner', 'magno', 'agnaldo', 'gerson', 'jailson', 'denilson', 'jadson', 'hudson', 'gilson', 'nilson',
      'ademir', 'almir', 'claudemir', 'claudinei', 'valdecir', 'osmar', 'odair', 'altair', 'jair', 'joel',
      'noel', 'israel', 'ismael', 'emanuel', 'miguel', 'manoel', 'manuel', 'natanael', 'michael', 'geraldo',
      'osvaldo', 'ronaldo', 'reinaldo', 'reginaldo', 'arildo', 'aldo', 'evaldo', 'edvaldo', 'ednaldo',
      'clodoaldo', 'flavio', 'silvio', 'lucio', 'mario', 'dario', 'mauricio', 'fabricio', 'jonas', 'tobias',
      'isaias', 'josias', 'messias', 'ozias', 'jesse', 'josue', 'kauan', 'luan', 'renan', 'ryan', 'bryan',
      'allan', 'alan', 'jean', 'juan', 'kleber', 'cleber', 'heitor', 'helio', 'elio', 'celio', 'valerio',
      'erivaldo', 'genivaldo', 'renato'
    ]);

    if (femaleNames.has(firstName)) return 'F';
    if (maleNames.has(firstName)) return 'M';
    if (firstName.endsWith('a') && !['lucas', 'alexandre', 'luca'].includes(firstName)) return 'F';
    if (
      firstName.endsWith('o') ||
      firstName.endsWith('or') ||
      firstName.endsWith('el') ||
      firstName.endsWith('on') ||
      firstName.endsWith('an') ||
      firstName.endsWith('er') ||
      firstName.endsWith('us') ||
      firstName.endsWith('as') ||
      firstName.endsWith('es') ||
      firstName.endsWith('ir') ||
      firstName.endsWith('ur') ||
      firstName.endsWith('im') ||
      firstName.endsWith('am') ||
      firstName.endsWith('eu')
    ) {
      if (!['carmen', 'helen', 'mirian', 'lilian', 'vivian', 'ester'].includes(firstName)) {
        return 'M';
      }
    }
  }

  return 'UNKNOWN';
}

/**
 * Replaces transitional vertebrae pairs with a hyphen (Rule 11)
 * Example: C6 C7 -> C6-C7, L5 S1 -> L5-S1, T12 L1 -> T12-L1, D12 L1 -> D12-L1
 */
export function formatTransitionalVertebrae(text: string): string {
  return text.replace(/\b([CcTtDdLlSs]\d{1,2})\s+([CcTtDdLlSs]\d{1,2})\b/g, (match, v1, v2) => {
    return `${v1.toUpperCase()}-${v2.toUpperCase()}`;
  });
}

/**
 * Formats anatomical liver segments into Roman numerals (Rule 12)
 * Example: no segmento 4 B -> no segmento IV B, segmento 7 -> segmento VII
 */
export function formatAnatomicalSegments(text: string): string {
  const romanMap: Record<string, string> = {
    '1': 'I', 'um': 'I', 'uma': 'I',
    '2': 'II', 'dois': 'II', 'duas': 'II',
    '3': 'III', 'três': 'III', 'tres': 'III',
    '4': 'IV', 'quatro': 'IV',
    '5': 'V', 'cinco': 'V',
    '6': 'VI', 'seis': 'VI', 'meia': 'VI',
    '7': 'VII', 'sete': 'VII',
    '8': 'VIII', 'oito': 'VIII',
  };

  let formatted = text;

  // Multi-segment cases: "segmentos 2 e 3" -> "segmentos II e III"
  formatted = formatted.replace(
    /\b(segmentos?|no\s+segmento|nos\s+segmentos)\s+(\d|um|dois|tr[êe]s|quatro|cinco|seis|meia|sete|oito)\s*(e|\/|-)\s*(\d|um|dois|tr[êe]s|quatro|cinco|seis|meia|sete|oito)\b/gi,
    (m, prefix, s1, conj, s2) => {
      const r1 = romanMap[s1.toLowerCase()] || s1.toUpperCase();
      const r2 = romanMap[s2.toLowerCase()] || s2.toUpperCase();
      return `${prefix} ${r1} ${conj} ${r2}`;
    }
  );

  // Single segment with subsegment letter: "segmento 4 B" / "segmento 4B" / "segmento 4 A" -> "segmento IV B"
  formatted = formatted.replace(
    /\b(segmentos?|no\s+segmento|nos\s+segmentos)\s+(\d|um|dois|tr[êe]s|quatro|cinco|seis|meia|sete|oito)\s*[- ]?\s*([ABab])\b/gi,
    (m, prefix, num, letter) => {
      const r = romanMap[num.toLowerCase()] || num.toUpperCase();
      return `${prefix} ${r} ${letter.toUpperCase()}`;
    }
  );

  // Single segment number: "segmento 7" -> "segmento VII"
  formatted = formatted.replace(
    /\b(segmentos?|no\s+segmento|nos\s+segmentos)\s+(\d|um|dois|tr[êe]s|quatro|cinco|seis|meia|sete|oito)\b/gi,
    (m, prefix, num) => {
      const r = romanMap[num.toLowerCase()] || num.toUpperCase();
      return `${prefix} ${r}`;
    }
  );

  return formatted;
}

/**
 * Expands standalone "Mediastino." to full mask phrase (Rule 2)
 */
export function expandMediastinoFinding(finding: string): string {
  const clean = finding.trim().replace(/^[-*•\s\.,;:]+/, '').replace(/[.\s,;:]+$/, '').toLowerCase();
  if (clean === 'mediastino' || clean === 'mediastino normal' || clean === 'mediastino sem alterações') {
    return 'Mediastino centrado não se identificando lesão tumoral ou cística.';
  }
  return finding;
}

/**
 * Expands standalone "Ventrículos." to full mask phrase: "Ventrículos e cisternas sem alterações."
 */
export function expandVentriculosFinding(finding: string): string {
  const clean = finding.trim().replace(/^[-*•\s\.,;:]+/, '').replace(/[.\s,;:]+$/, '').toLowerCase();
  if (
    clean === 'ventrículos' ||
    clean === 'ventriculos' ||
    clean === 'ventrículo' ||
    clean === 'ventriculo' ||
    clean === 'ventrículos normal' ||
    clean === 'ventriculos normal' ||
    clean === 'ventrículos normais' ||
    clean === 'ventriculos normais' ||
    clean === 'ventrículos sem alterações' ||
    clean === 'ventriculos sem alteracoes' ||
    clean === 'ventrículos e cisternas' ||
    clean === 'ventriculos e cisternas'
  ) {
    return 'Ventrículos e cisternas sem alterações.';
  }
  return finding;
}

/**
 * Expands standalone "Aorta" / "A aorta" to full mask phrase (Item 3)
 */
export function expandAortaFinding(finding: string, mask?: ExamMask): string {
  const clean = finding
    .trim()
    .replace(/^[-*•\s\.,;:]+/, '')
    .replace(/[.\s,;:]+$/, '')
    .toLowerCase();

  if (
    clean === 'aorta' ||
    clean === 'a aorta' ||
    clean === 'aorta normal' ||
    clean === 'a aorta normal' ||
    clean === 'aorta sem alterações' ||
    clean === 'aorta sem alteracoes' ||
    clean === 'aorta torácica' ||
    clean === 'aorta toracica' ||
    clean === 'aorta torácica normal' ||
    clean === 'aorta toracica normal'
  ) {
    if (mask?.id === 'angio-aorta-abdominal') {
      return 'Aorta abdominal, artérias ilíacas e porção proximal das femorais com calibre, contornos e trajetos normais.';
    }
    return 'Aorta torácica normal.';
  }
  return finding;
}

/**
 * Combined anatomical shortcut expander for spoken findings (Mediastino, Ventrículos, Aorta)
 */
export function expandAnatomicalShortcuts(finding: string, mask?: ExamMask): string {
  let expanded = expandMediastinoFinding(finding);
  expanded = expandVentriculosFinding(expanded);
  expanded = expandAortaFinding(expanded, mask);
  return expanded;
}

/**
 * Capitalizes the first character of the text and the first letter after any sentence-ending period/!/?
 * while preserving abbreviations like C.A.E., C.A.I. (Item 10)
 */
export function capitalizeSentences(text: string): string {
  if (!text) return text;
  let result = text.charAt(0).toUpperCase() + text.slice(1);
  result = result.replace(/([.!?]\s+)([a-záéíóúàâêôãõç])/g, (match, punctAndSpace, letter, offset, fullStr) => {
    const before = fullStr.slice(0, offset + 1);
    if (/(?:^|\s)(?:[A-Za-z]\.){2,}$/.test(before)) {
      return match; // Preserve C.A.E. normais / C.A.I. normais
    }
    if (/\b(?:dr|dra|sr|sra|prof|etc|obs|p\.ex)\.$/i.test(before)) {
      return match;
    }
    return punctAndSpace + letter.toUpperCase();
  });
  return result;
}

/**
 * Removes conversational meta-speech/self-corrections and leftover ".final" commands (Items 5, 6, 9, 12)
 */
export function cleanDictationMetaSpeech(text: string): string {
  if (!text) return '';
  let cleaned = text.trim();

  // Item 9: "o demonstra" -> "O exame demonstra"
  cleaned = cleaned.replace(/(?<![a-zA-ZÀ-ú0-9_])o\s+demonstra\b[,\s]*/gi, 'O exame demonstra ');

  // Item 5 & 12: Remove ".final" / ". final" / standalone "final." / trailing "final" command artifacts
  cleaned = cleaned.replace(/\.final\b\.?/gi, '.');
  cleaned = cleaned.replace(/^(?:final[.,;!\s]+)+/gi, '');
  cleaned = cleaned.replace(/(?:(?<=[.!?]\s+)|(?<=\n\s*))final[.,;!]*(?=\s|$)/gi, '');
  cleaned = cleaned.replace(/(?:^|[.,;]\s*|\s+)(?:e\s+)?final[.,;\s]*$/gi, (m, offset, str) => {
    const before = str.slice(0, offset).toLowerCase();
    if (/(?:por[çc][aã]o|parte|segmento|resultado|laudo|diagn[oó]stico|aspecto|exame|trecho|ter[çc]o)\s*$/i.test(before)) {
      return m;
    }
    return m.startsWith('.') ? '.' : '';
  });

  // Remove conversational self-correction prefixes AFTER stripping leading "final." (Item 12: "final.\n\n- Não, antes do material de síntese...")
  cleaned = cleaned.replace(
    /^(?:n[aã]o\s*,?\s*antes\s+(?:d[eoa]s?\s+)?|n[aã]o\s*,?\s*espera\s*,?\s*|quer\s+dizer\s*,?\s*|ou\s+melhor\s*,?\s*|digo\s*,?\s*|desculp[ae]\s*,?\s*)/i,
    ''
  );

  // Remove hesitations anywhere (Item 3 & 7) using Unicode-safe boundaries
  cleaned = cleaned.replace(/(?<![A-Za-zÀ-ú0-9_])(?:h[aã]+n?s?|[aã]+h+n?|ahn+|ehn+|uhm+|eh+|ah+|[ée]h+|humm+)(?![A-Za-zÀ-ú0-9_])/gi, '');

  cleaned = cleaned.replace(/\b(O\s+exame\s+demonstra)\s*,\s*/gi, '$1 ');
  cleaned = cleaned.replace(/\s+([.,;:?])/g, '$1');
  cleaned = cleaned.replace(/,\s*,+/g, ',');
  cleaned = cleaned.replace(/\(\s*,+/g, '(');
  cleaned = cleaned.replace(/^[\s\.,;:]+/, '');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

/**
 * Item 11: Strips any normal mask text / default opinion remaining after "ponto final".
 * Preserves explicit Opinião/Observação/Achados adicionais if dictated after "ponto final",
 * while still stripping trailing mask phrases that appear after a subsequent "ponto final".
 */
export function stripMaskPhrasesAfterPontoFinal(
  rawDictation: string,
  mask?: ExamMask | null
): string {
  if (!rawDictation) return rawDictation;
  const pfRegex = /(?:\{?(?:e\s+)?ponto\s+final\}?)/gi;
  const matches = [...rawDictation.matchAll(pfRegex)];
  if (matches.length === 0) return rawDictation;

  // Check from the last occurrence backward so an opinion between two "ponto final" markers is preserved
  let currentText = rawDictation;
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];
    if (typeof m.index !== 'number') continue;
    const endIdx = m.index + m[0].length;
    if (endIdx > currentText.length) continue;

    const afterPf = currentText.slice(endIdx).trim();
    if (!afterPf) continue;

    // If an explicit Opinion/Observação/Achados adicionais header immediately follows, keep that opinion
    if (/^(?:[,.\s]*(?:<<PONTO_PARAGRAFO>>|par[aá]grafo)?[,.\s]*)*(?:[-*•]\s*)?(?:opini[aã]o|observa[çc][aã]o|como\s+achados?\s+adiciona(?:l|is)|achados?\s+adiciona(?:l|is)|conclus[aã]o|impress[aã]o)/i.test(afterPf)) {
      continue;
    }

    const normAfter = afterPf
      .toLowerCase()
      .replace(/^[-*•\s.,;:]+/, '')
      .trim();

    const looksLikeGenericNormalMask =
      /\b(?:sem\s+altera[çc][oõ]es|aspecto\s+(?:normal|conservado|preservado)|calibre\s+conservado|forma\s+e\s+contornos\s+normais|coeficientes?\s+de\s+atenua[çc][aã]o\s+(?:normais|preservados)|dentro\s+d[ao]s?\s+(?:limites|padr[oõ]es|normalidade)|fontes\s+livres|não\s+há\s+evidências?\s+de)\b/i.test(normAfter);

    const matchesMaskPhrase = mask
      ? mask.phrases.some(p => {
          const prefix = p.text.toLowerCase().slice(0, 18);
          return normAfter.includes(prefix);
        }) ||
        normAfter.includes(mask.defaultOpinion.toLowerCase().slice(0, 18)) ||
        /^(?:tomografia\s+de\s+.+?(?:sem\s+altera[çc][oõ]es|dentro\s+d[ao]s?\s+(?:limites|padr[oõ]es|normalidade)))/i.test(normAfter)
      : false;

    if (matchesMaskPhrase || looksLikeGenericNormalMask) {
      currentText = currentText.slice(0, endIdx).trim();
    }
  }

  return currentText;
}

/**
 * Detects the best matching mask from spoken/written examination and contrast cues
 */
export function matchMask(
  examHint?: string,
  contrastHint?: string,
  fullText?: string
): ExamMask {
  // 1. Direct ID match if user or system passed a valid mask ID
  if (examHint) {
    const directMask = RADIOLOGY_MASKS.find(m => m.id === examHint.trim());
    if (directMask) return directMask;
  }

  const rawCombined = `${examHint || ''} ${contrastHint || ''} ${fullText || ''}`.toLowerCase();

  // 2. Exact Title + Contrast match
  if (examHint) {
    const hintClean = cleanExamTitle(examHint).toLowerCase();
    for (const mask of RADIOLOGY_MASKS) {
      if (cleanExamTitle(mask.title).toLowerCase() === hintClean) {
        if (contrastHint && mask.contrastStatus.toLowerCase().includes(contrastHint.toLowerCase())) {
          return mask;
        }
      }
    }
  }

  // 3. Contrast state detection
  const isSemContraste = 
    /\b(sem\s+(?:o\s+)?(?:uso\s+de\s+)?contraste|sem\s+inje[çc][aã]o|n[aã]o\s+contrastad[oa]|sem\s+administra[çc][aã]o|sem\s+infus[aã]o|sem\s+meio\s+de\s+contraste|sem\s+contraste\s+endovenoso|sem\s+contraste\s+venoso|tc\s+simples|fase\s+simples|estudo\s+simples|fase\s+sem\s+contraste|aus[êe]ncia\s+de\s+contraste)\b/i.test(rawCombined);

  const isComContraste = 
    /\b(com\s+(?:o\s+)?(?:uso\s+de\s+)?contraste|ap[oó]s\s+(?:a\s+administra[çc][aã]o\s+de\s+)?contraste|com\s+infus[aã]o|fase\s+contrastada|com\s+inje[çc][aã]o|contraste\s+endovenoso|contraste\s+venoso|omnipaque|fase\s+arterial|fase\s+venosa|fase\s+portal|refor[çc]o\s+patol[oó]gico|excre[çc][aã]o\s+pelos\s+rins)\b/i.test(rawCombined) && !isSemContraste;

  // 4. Clinical Anatomy Disambiguation & Safeguards
  const safeSearch = rawCombined
    .replace(/\b(dec[uú]bito\s+dorsal|posi[çc][aã]o\s+dorsal|segmento\s+dorsal|face\s+dorsal)\b/gi, ' __posicao_dorsal__ ')
    .replace(/\b(coluna\s+a[ée]rea)\b/gi, ' __via_aerea__ ');

  type AnatomyType = 
    | 'torax'
    | 'cranio'
    | 'mastoides'
    | 'coluna_cervical'
    | 'coluna_dorsal'
    | 'coluna_lombar'
    | 'abdome'
    | 'pescoco'
    | 'seios_face'
    | 'pelve_bacia'
    | 'membros'
    | 'angio_carotidas'
    | 'angio_cerebral'
    | 'angio_aorta';

  const scores: Record<AnatomyType, number> = {
    torax: 0,
    cranio: 0,
    mastoides: 0,
    coluna_cervical: 0,
    coluna_dorsal: 0,
    coluna_lombar: 0,
    abdome: 0,
    pescoco: 0,
    seios_face: 0,
    pelve_bacia: 0,
    membros: 0,
    angio_carotidas: 0,
    angio_cerebral: 0,
    angio_aorta: 0,
  };

  // Angiotomografias
  if (/\b(angiotomografia|angio[- ]tc|pol[ií]gono\s+de\s+willis|art[ée]rias?\s+cerebrais?|art[ée]rias?\s+car[oó]tidas?|art[ée]rias?\s+vertebrais?|car[oó]tidas?\s+e\s+vertebrais?)\b/i.test(safeSearch)) {
    if (/\b(car[oó]tidas?|art[ée]rias?\s+vertebrais?|car[oó]tidas?\s+e\s+vertebrais?)\b/i.test(safeSearch)) scores.angio_carotidas += 60;
    if (/\b(art[ée]rias?\s+cerebrais?|willis)\b/i.test(safeSearch)) scores.angio_cerebral += 60;
    if (/\b(aorta\s+abdominal|art[ée]rias?\s+il[ií]acas|femorais)\b/i.test(safeSearch)) scores.angio_aorta += 60;
    if (/\bangio\s+cerebral\b/i.test(safeSearch)) scores.angio_cerebral += 50;
  }

  // Mastóides Scoring (New Mask)
  if (/\b(mast[oó]ides?|osso\s+temporal|ossos\s+temporais|caixa\s+timp[aâ]nica|cadeia\s+ossicular|canais\s+semi[- ]?circulares|paredes\s+cocleares|c\.?a\.?[ie]\.?)\b/i.test(safeSearch)) {
    scores.mastoides += 50;
  }

  // Tórax Scoring (Item 4: prioritize explicit thorax exam cues strongly over incidental limb words)
  if (/\b(tomografia\s+(?:computadorizada\s+)?(?:de|do)\s+t[oó]rax|tc\s+(?:de|do)?\s*t[oó]rax|laudo\s+de\s+t[oó]rax|exame[,\s]+(?:tomografia\s+de\s+)?t[oó]rax)\b/i.test(safeSearch)) {
    scores.torax += 90;
  }
  if (/\b(t[oó]rax|pulm[aã]o|pulm[oõ]es|pulmonar|pulmonares|mediastino|campos\s+pleuropulmonares|br[oô]nquios|traqueia|aorta\s+tor[aá]cica|par[eê]nquima\s+pulmonar)\b/i.test(safeSearch)) {
    scores.torax += 25;
  }

  // Crânio Scoring
  if (/\b(tomografia\s+(?:computadorizada\s+)?(?:de|do)\s+cr[aâ]nio|tc\s+(?:de|do)?\s*cr[aâ]nio|laudo\s+de\s+cr[aâ]nio|cranioencef[aá]lica)\b/i.test(safeSearch)) {
    scores.cranio += 90;
  }
  if (/\b(cr[aâ]nio|enc[eé]falo|cerebral|cerebrais|par[eê]nquima\s+cerebral|ventr[ií]culos|cisternas|fossa\s+posterior|calota\s+craniana|pineal|plexos\s+coroides|linha\s+m[eé]dia)\b/i.test(safeSearch)) {
    scores.cranio += 25;
  }

  // Coluna Scoring
  const hasSpineContext = /\b(coluna|v[eé]rtebra|v[eé]rtebras|vertebral|vertebrais|corpos\s+vertebrais|arcos\s+neurais|canal\s+vertebral|espondilo|disco\s+intervertebral|h[eé]rnia\s+de\s+disco)\b/i.test(safeSearch);
  if (hasSpineContext) {
    if (/\b(cervical|c1|c2|c3|c4|c5|c6|c7)\b/i.test(safeSearch)) scores.coluna_cervical += 60;
    if (/\b(dorsal|tor[aá]cica|t1|t2|t3|t4|t5|t6|t7|t8|t9|t10|t11|t12)\b/i.test(safeSearch)) scores.coluna_dorsal += 60;
    if (/\b(lombar|lombossacra|lombo\s+sacra|l1|l2|l3|l4|l5|s1)\b/i.test(safeSearch)) scores.coluna_lombar += 60;
  }

  // Abdome Scoring
  if (/\b(tomografia\s+(?:computadorizada\s+)?(?:de|do)\s+abd[oô]me[mn]?|tc\s+(?:de|do)?\s*abd[oô]me[mn]?|abdome\s+total|abd[oô]men\s+total)\b/i.test(safeSearch)) {
    scores.abdome += 90;
  }
  if (/\b(abdome|abd[oô]men|f[ií]gado|ba[çc]o|p[aâ]ncreas|retroperit[oô]neo|adrenais|[aá]rvore\s+biliar|sistema\s+porta|rins)\b/i.test(safeSearch)) {
    scores.abdome += 25;
  }

  // Pescoço Scoring
  if (/\b(tomografia\s+(?:computadorizada\s+)?(?:de|do)\s+pesco[çc]o|tc\s+(?:de|do)?\s*pesco[çc]o|cervicofacial)\b/i.test(safeSearch)) {
    scores.pescoco += 90;
  }
  if (/\b(pesco[çc]o|gl[aâ]ndulas\s+par[oó]tidas|submandibulares|sub\s+mandibulares|tireoide|laringe|orofaringe|rino)\b/i.test(safeSearch)) {
    scores.pescoco += 20;
  }

  // Seios da Face Scoring
  if (/\b(tomografia\s+(?:de|dos)\s+seios\s+da\s+face|seios\s+da\s+face|seios\s+paranasais|complexos\s+[oó]stio-meatais)\b/i.test(safeSearch)) {
    scores.seios_face += 90;
  }

  // Pelve e Bacia Scoring
  if (/\b(tomografia\s+(?:de|da)\s+(?:pelve|bacia)|pelve\s+e\s+bacia)\b/i.test(safeSearch)) {
    scores.pelve_bacia += 90;
  } else if (/\b(pelve|bacia)\b/i.test(safeSearch)) {
    scores.pelve_bacia += 35;
  }

  // Articulação / Membros Scoring (only strong if explicitly requested as exam title, never override chest/abdomen/head)
  if (/\b(tomografia\s+(?:de|do|da)\s+(?:joelho|tornozelo|ombro|punho|cotovelo|membro|articula[çc][aã]o|coxa|perna|p[eé]|m[aã]o))\b/i.test(safeSearch)) {
    scores.membros += 90;
  } else if (/\b(joelho|tornozelo|ombro|punho|cotovelo|membro|articula[çc][aã]o|coxa|perna|p[eé]|m[aã]o)\b/i.test(safeSearch)) {
    scores.membros += 15;
  }

  // Find anatomy with highest score
  let bestAnatomy: AnatomyType | null = null;
  let maxScore = 0;
  for (const [anatomy, score] of Object.entries(scores) as [AnatomyType, number][]) {
    if (score > maxScore) {
      maxScore = score;
      bestAnatomy = anatomy;
    }
  }

  let resolvedId = 'abdome-total-com';

  if (bestAnatomy === 'mastoides') {
    resolvedId = 'mastóides-sem';
  } else if (bestAnatomy === 'torax') {
    resolvedId = isComContraste ? 'tórax-com' : 'tórax-sem';
  } else if (bestAnatomy === 'cranio') {
    resolvedId = isComContraste ? 'crânio-com' : 'crânio-sem';
  } else if (bestAnatomy === 'coluna_dorsal') {
    resolvedId = 'coluna-dorsal-sem';
  } else if (bestAnatomy === 'coluna_cervical') {
    resolvedId = 'coluna-cervical-sem';
  } else if (bestAnatomy === 'coluna_lombar') {
    resolvedId = 'coluna-lombar-sem';
  } else if (bestAnatomy === 'abdome') {
    resolvedId = isSemContraste ? 'abdome-total-sem' : 'abdome-total-com';
  } else if (bestAnatomy === 'pescoco') {
    resolvedId = isComContraste ? 'pescoço-com' : 'pescoço-sem';
  } else if (bestAnatomy === 'seios_face') {
    resolvedId = 'seios-da-face-sem';
  } else if (bestAnatomy === 'pelve_bacia') {
    resolvedId = 'pelve-bacia-sem';
  } else if (bestAnatomy === 'membros') {
    resolvedId = 'membros-sem';
  } else if (bestAnatomy === 'angio_carotidas') {
    resolvedId = 'angio-carotidas-vertebrais';
  } else if (bestAnatomy === 'angio_cerebral') {
    resolvedId = 'angio-arterias-cerebrais';
  } else if (bestAnatomy === 'angio_aorta') {
    resolvedId = 'angio-aorta-abdominal';
  } else {
    for (const mask of RADIOLOGY_MASKS) {
      if (mask.contrastStatus === 'SEM CONTRASTE' && isComContraste) continue;
      if (mask.contrastStatus === 'COM CONTRASTE' && isSemContraste) continue;
      for (const kw of mask.keywords) {
        if (rawCombined.includes(kw.toLowerCase())) {
          return mask;
        }
      }
    }
  }

  const found = RADIOLOGY_MASKS.find(m => m.id === resolvedId);
  return found || RADIOLOGY_MASKS[2];
}

/**
 * Normalizes speech punctuation phrases, braces notation, and phonetic spelling
 */
export function normalizeSpokenPunctuation(rawText: string): string {
  let text = rawText;

  // Word corrections (from prompt)
  text = text.replace(/\bnucapsular\b/gi, 'nucleocapsular');
  text = text.replace(/\bpodenso\b/gi, 'hipodenso');

  // Item 9: "o demonstra" -> "O exame demonstra"
  text = text.replace(/(?<![a-zA-ZÀ-ú0-9_])o\s+demonstra\b[,\s]*/gi, 'O exame demonstra ');

  // Rule 9 & 10 & Item 7: Parentheses & braced punctuation ({?}, {abre parênteses}, etc.)
  text = text.replace(/\{?\s*(?:abre|abrir)\s+par[êe]ntes[ei]s?\s*\}?/gi, ' (');
  text = text.replace(/\{?\s*(?:fecha|fechar)\s+par[êe]ntes[ei]s?\s*\}?/gi, ') ');
  text = text.replace(/\{([?!.,;:])\}/g, '$1');

  // Rule 1 & Item 7: "interroga", "{?}", "ponto de interrogação" -> "?"
  text = text.replace(/\{?\s*(?:ponto\s+de\s+)?interroga(?:[çc][aã]o)?\s*\}?/gi, '?');
  text = text.replace(/\binterroga\b/gi, '?');

  // Handle all variations of "ponto parágrafo" and braces
  text = text.replace(/\{ponto\}\s*(?:e\s*)?par[aá]grafo/gi, ' <<PONTO_PARAGRAFO>> ');
  text = text.replace(/\bponto\s*(?:e\s*)?par[aá]grafo\b/gi, ' <<PONTO_PARAGRAFO>> ');
  text = text.replace(/\b(?:pr[oó]ximo|novo)\s+par[aá]grafo\b/gi, ' <<PONTO_PARAGRAFO>> ');
  text = text.replace(/\{par[aá]grafo\}/gi, ' <<PONTO_PARAGRAFO>> ');
  text = text.replace(/\bpar[aá]grafo\b/gi, ' <<PONTO_PARAGRAFO>> ');

  // Handle variations of "ponto final" and ASR ".final" / ". final" / standalone "final." (Item 5 & 12)
  text = text.replace(/\{?(?:e\s+)?ponto\s+final\}?/gi, ' <<PONTO_FINAL>> ');
  text = text.replace(/\b(?:e\s+)?ponto\s+final\b/gi, ' <<PONTO_FINAL>> ');
  text = text.replace(/\.final\b\.?/gi, ' <<PONTO_FINAL>> ');
  text = text.replace(/^(?:final[.,;!\s]+)+/gi, ' <<PONTO_FINAL>> ');
  text = text.replace(/(?:(?<=[.!?]\s+)|(?<=\n\s*))final[.,;!]*(?=\s|$)/gi, ' <<PONTO_FINAL>> ');
  text = text.replace(/(?:^|[.,;]\s*|\s+)(?:e\s+)?final(?=\s*(?:<<PONTO_PARAGRAFO>>|\n|$))/gi, (m, offset, str) => {
    const before = str.slice(0, offset).toLowerCase();
    if (/(?:por[çc][aã]o|parte|segmento|resultado|laudo|diagn[oó]stico|aspecto|exame|trecho|ter[çc]o)\s*$/i.test(before)) {
      return m;
    }
    return ' <<PONTO_FINAL>> ';
  });

  // Handle "ponto" (when not followed by parágrafo)
  text = text.replace(/\{ponto\}/gi, '.');
  text = text.replace(/\bponto\b(?!\s*par[aá]grafo)/gi, '.');

  // Handle "vírgula"
  text = text.replace(/\{v[ií]rgula\}/gi, ',');
  text = text.replace(/\bv[ií]rgula\b/gi, ',');

  // Handle "dois pontos"
  text = text.replace(/\{dois\s+pontos\}/gi, ':');
  text = text.replace(/\bdois\s+pontos\b/gi, ':');

  // Handle "ponto e vírgula"
  text = text.replace(/\{ponto\s+e\s+v[ií]rgula\}/gi, ';');
  text = text.replace(/\bponto\s+e\s+v[ií]rgula\b/gi, ';');

  // Item 1: Preserve "hum" when it's spoken as number "1" (standalone or with other numbers), otherwise clean hesitations
  text = text.replace(/(?<![A-Za-zÀ-ú0-9_])hum(?=\s*(?:[.,]?\s*(?:e|a|dois|duas|tr[êe]s|quatro|cinco|seis|meia|sete|oito|nove|2|3|4|5|6|7|8|9|<<PONTO_PARAGRAFO>>|$)))(?![A-Za-zÀ-ú0-9_])/gi, 'um');

  // Item 3 & 7: Clean speech filler hesitations (Unicode-safe boundaries so "hã", "ãh", "hãn" are ALWAYS removed)
  text = text.replace(/(?<![A-Za-zÀ-ú0-9_])(?:h[aã]+n?s?|[aã]+h+n?|ahn+|ehn+|uhm+|eh+|ah+|[ée]h+|humm+)(?![A-Za-zÀ-ú0-9_])/gi, '');
  text = text.replace(/(?<![A-Za-zÀ-ú0-9_])hum(?![A-Za-zÀ-ú0-9_])/gi, '');

  text = text.replace(/\bda\s+da\b/gi, 'da');
  text = text.replace(/\bde\s+de\b/gi, 'de');
  text = text.replace(/\bdo\s+do\b/gi, 'do');
  text = text.replace(/\bo\s+o\b/gi, 'o');
  text = text.replace(/\ba\s+a\b/gi, 'a');

  // Normalize horizontal spacing before and after punctuation marks while preserving newlines
  text = text.replace(/\b(O\s+exame\s+demonstra)\s*,\s*/gi, '$1 ');
  text = text.replace(/[ \t]+([.,;:?])/g, '$1');
  text = text.replace(/,\s*,+/g, ',');
  text = text.replace(/\(\s*,+/g, '(');
  text = text.replace(/\([ \t]+/g, '(');
  text = text.replace(/[ \t]+\)/g, ')');
  text = text.replace(/[ \t]+\?\)/g, '?)');
  text = text.replace(/[ \t]+/g, ' ').trim();

  return text;
}

/**
 * Robustly parses a freeform speech dictation containing patient name, exam title,
 * paragraph commands and opinion into structured components.
 */
export function parseSpeechDictation(rawText: string, mask?: ExamMask): {
  patientName?: string;
  examTitle?: string;
  findings: string[];
  opinionTitle?: string;
  opinionText?: string;
  opinionFindings?: string[];
  hasExplicitPontoFinal?: boolean;
} {
  const effectiveRaw = stripMaskPhrasesAfterPontoFinal(rawText, mask);
  const hasExplicitPontoFinal = /ponto\s+final|\{ponto\s+final\}/i.test(effectiveRaw);
  const normalized = normalizeSpokenPunctuation(effectiveRaw);

  // Extract opinion or additional section (Rule 7 & Item 8: Observação / Achado adicional / Achados adicionais / Opinião)
  let opinionTitle: string | undefined = undefined;
  let opinionText = '';
  const opinionFindings: string[] = [];
  let findingsBody = normalized;

  const sectionRegex = /(?:<<PONTO_PARAGRAFO>>|\.|\s|^)(?:[-*•]\s*)?(observa[çc][aã]o|como\s+achados\s+adicionais|achados\s+adicionais|como\s+achado\s+adicional|achado\s+adicional|opini[aã]o|conclus[aã]o|impress[aã]o)(?:[\s,:;\.]+)(.*)$/i;
  const sectionMatch = normalized.match(sectionRegex);

  if (sectionMatch && typeof sectionMatch.index === 'number') {
    const matchedHeader = sectionMatch[1].toLowerCase();
    if (matchedHeader.includes('observa')) {
      opinionTitle = 'Observação:';
    } else if (matchedHeader.includes('adicional') && !matchedHeader.includes('adicionais')) {
      opinionTitle = 'Achado adicional:';
    } else if (matchedHeader.includes('adicionais')) {
      opinionTitle = 'Achados adicionais:';
    } else if (matchedHeader.includes('conclus')) {
      opinionTitle = 'Conclusão:';
    } else {
      opinionTitle = 'Opinião:';
    }

    // Strip trailing "e ponto final", "ponto final", ".final"
    let rawOpBody = sectionMatch[2]
      .replace(/(?:<<PONTO_FINAL>>|\b(?:e\s+)?ponto\s+final\b|\bfinal\b|\be\b)\s*$/gi, '')
      .replace(/\s+([.,;:?])/g, '$1')
      .trim();

    // Split opinion into separate paragraphs if dictated with parágrafo or <<PONTO_PARAGRAFO>> or newlines
    const rawOpParagraphs = rawOpBody.split(/<<PONTO_PARAGRAFO>>|\n/);
    for (const p of rawOpParagraphs) {
      let cleaned = p
        .replace(/<<PONTO_FINAL>>/g, ' ')
        .replace(/\b(?:e\s+)?ponto\s+final\b/gi, '')
        .replace(/(?:\s+e|\se\.)\s*$/i, '')
        .replace(/\s+([.,;:?])/g, '$1')
        .replace(/^[\s\.,;:]+/, '')
        .replace(/[\s\.,;:]+$/, '')
        .replace(/(?:\s+(?:e|eh|ah))\s*$/i, '')
        .trim();

      cleaned = cleanDictationMetaSpeech(cleaned);
      if (!cleaned) continue;
      cleaned = formatTransitionalVertebrae(cleaned);
      cleaned = formatAnatomicalSegments(cleaned);
      if (!/[.!?]$/.test(cleaned)) cleaned += '.';
      cleaned = capitalizeSentences(cleaned);
      opinionFindings.push(cleaned);
    }

    if (opinionFindings.length > 0) {
      opinionText = opinionFindings.join(' ');
    }
    findingsBody = normalized.slice(0, sectionMatch.index).trim();
  }

  // Extract patient name
  let patientName = '';
  const patientMatch = findingsBody.match(/paciente[\s:]+([^\,\.]+?)(?:,?\s*exame|,?\s*tomografia|\.|\<|$)/i);
  if (patientMatch) {
    patientName = patientMatch[1].trim();
    findingsBody = findingsBody.replace(/paciente[\s:]+[^\,\.]+?(?:,?\s*exame|,?\s*tomografia|\.|\<|$)/i, ' ');
  }

  // Extract exam title - cleaned of contrast indications (Rule 5)
  let examTitle = '';
  const examRegex = /(?:exame[\s,:]+)?((?:tomografia|angiotomografia|resson[aâ]ncia|rx)\s+(?:de\s+|das\s+)?[^,\.;<\n]+?)(?:\s*,?\s*estudo|\s*,|\.|\;|\:|\.?\s*o\s+conjunto|<<PONTO_PARAGRAFO>>|\n|$)/i;
  const examMatch = findingsBody.match(examRegex);
  if (examMatch) {
    let rawTitleChunk = examMatch[1];
    const cutConjunto = rawTitleChunk.search(/\.?\s*o\s+conjunto/i);
    if (cutConjunto !== -1) {
      rawTitleChunk = rawTitleChunk.slice(0, cutConjunto);
    }
    examTitle = cleanExamTitle(rawTitleChunk);
    findingsBody = findingsBody.replace(examMatch[0], ' ');
  }

  // Remove preamble residuals (contrast references, technique mentions, "o conjunto" - Item 6)
  findingsBody = findingsBody.replace(/(?:exame[,\s:]+)?(?:estudo\s+)?(?:sem|com|sem\s+e\s+com|com\s+e\s+sem)\s+contraste/gi, ' ');
  findingsBody = findingsBody.replace(/\b(?:exame|estudo)[,\s:]+/gi, ' ');
  findingsBody = findingsBody.replace(/\bo\s+conjunto(?:\s+de\s+imag(?:em|ens)(?:\s+demonstra)?)?[\s:.]*/gi, ' ');

  // Split findings primarily by <<PONTO_PARAGRAFO>> or newlines
  const initialChunks = findingsBody.split(/<<PONTO_PARAGRAFO>>|\n/);
  const rawFindings: string[] = [];

  for (const chunk of initialChunks) {
    const trimmedChunk = chunk.trim();
    if (!trimmedChunk) continue;

    // Only split on sentence boundaries if it's NOT a number dictation and contains multiple distinct sentences.
    // Do NOT split on commas or semicolons so complex medical phrases stay intact.
    let subParts: string[];
    if (isNumberDictation(trimmedChunk)) {
      subParts = [trimmedChunk];
    } else {
      subParts = trimmedChunk
        .replace(/<<PONTO_FINAL>>/g, ' ')
        .split(/(?<=[.!?])\s+(?=[-*•\s]*[A-Z0-9ÁÉÍÓÚÀÂÊÔÃÕ])/);
    }

    for (const part of subParts) {
      let cleaned = part
        .replace(/<<PONTO_FINAL>>/g, '')
        .replace(/\b(?:e\s+)?ponto\s+final\b/gi, '')
        .replace(/^[-*•\s]+/, '')
        .replace(/\s+([.,;:?])/g, '$1')
        .replace(/^[\s\.,;:]+/, '')
        .replace(/[\s\.,;:]+$/, '')
        .replace(/(?:\s+(?:e|eh|ah))\s*$/i, '')
        .trim();

      cleaned = cleanDictationMetaSpeech(cleaned);

      if (/^(?:exame|estudo)[,\s:]*/i.test(cleaned)) {
        cleaned = cleaned.replace(/^(?:exame|estudo)[,\s:]*/i, '').trim();
      }

      if (!cleaned) continue;
      if (/^(?:ponto\s+final|e\s+ponto\s+final|final|exame|estudo|paciente|o\s+conjunto|conjunto)$/i.test(cleaned)) continue;
      if (/^(?:estudo\s+)?(?:sem|com|sem\s+e\s+com|com\s+e\s+sem)\s+contraste/i.test(cleaned)) continue;

      // Item 1: If a finding begins with a dictated mask number (e.g. "1, Fígado...", "1. Fígado...", or "1 Fígado..."),
      // split out the leading number dictation so it expands to mask phrase #1 instead of getting dropped!
      const nonMaskCountNoun = /^(?:mm|cm|ml|mg|uh|anos?|m[êe]s|meses|dias?|horas?|vez(?:es)?|graus?|n[oó]dulos?|micron[oó]dulos?|cistos?|c[aá]lculos?|les[aã]o|les[oõ]es|l[oó]bulos?|grampos?|linfonodos?|focos?|[aá]reas?|massas?|fraturas?|protrus[aã]o|protrus[oõ]es|abaulamentos?|h[eé]rnias?|oste[oó]fitos?|segmentos?|detectores?|litro|litros)\b/i;
      const leadingNumMatch = cleaned.match(
        /^((?:\d{1,2}|um|uma|dois|duas|tr[êe]s|quatro|cinco|seis|meia|sete|oito|nove|dez|onze|doze)(?:[\s,;e]+(?:\d{1,2}|um|uma|dois|duas|tr[êe]s|quatro|cinco|seis|meia|sete|oito|nove|dez|onze|doze))*)\s*(?:[.,;:-]\s+|\s+(?=[A-ZÁÉÍÓÚÀÂÊÔÃÕ]))([A-ZÁÉÍÓÚÀÂÊÔÃÕa-záéíóúàâêôãõ]{3,}.*)$/
      );
      if (leadingNumMatch && !nonMaskCountNoun.test(leadingNumMatch[2])) {
        rawFindings.push(leadingNumMatch[1].trim());
        cleaned = leadingNumMatch[2].trim();
      }

      // Rule 2, Ventrículos & Aorta: expand anatomical shortcuts
      cleaned = expandAnatomicalShortcuts(cleaned);
      // Rule 11: transitional vertebrae (C6-C7)
      cleaned = formatTransitionalVertebrae(cleaned);
      // Rule 12: anatomical segments (IV B)
      cleaned = formatAnatomicalSegments(cleaned);

      cleaned = capitalizeSentences(cleaned);
      rawFindings.push(cleaned);
    }
  }

  return {
    patientName: patientName || undefined,
    examTitle: examTitle ? cleanExamTitle(examTitle) : undefined,
    findings: rawFindings,
    opinionTitle: opinionTitle || (opinionFindings.length > 0 ? 'Opinião:' : undefined),
    opinionText: opinionText || undefined,
    opinionFindings: opinionFindings.length > 0 ? opinionFindings : undefined,
    hasExplicitPontoFinal,
  };
}

/**
 * Checks if a finding line is pure number dictation (digits or words: "três e quatro", "1 e 2", "frases 3 e 4")
 */
export function isNumberDictation(text: string): boolean {
  const clean = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^[-*•\s]+/, '')
    .replace(/[.,;:?!()\-*•]/g, ' ')
    .replace(/\bhum\b/g, 'um')
    .trim();

  // Words that can appear in number dictation commands
  const allowedTokens = new Set([
    'e', 'a', 'o', 'as', 'os', 'de', 'da', 'do',
    'frase', 'frases', 'numero', 'numeros',
    'item', 'itens', 'conjunto', 'ponto', 'paragrafo',
    'um', 'uma', '1',
    'dois', 'duas', '2',
    'tres', '3',
    'quatro', '4',
    'cinco', '5',
    'seis', 'meia', '6',
    'sete', '7',
    'oito', '8',
    'nove', '9',
    'dez', '10',
    'onze', '11',
    'doze', '12',
  ]);

  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;

  const numberTokens = new Set([
    'um', 'uma', '1',
    'dois', 'duas', '2',
    'tres', '3',
    'quatro', '4',
    'cinco', '5',
    'seis', 'meia', '6',
    'sete', '7',
    'oito', '8',
    'nove', '9',
    'dez', '10',
    'onze', '11',
    'doze', '12',
  ]);

  const hasNumber = words.some(w => numberTokens.has(w));
  if (!hasNumber) return false;

  return words.every(w => allowedTokens.has(w));
}

/**
 * Expands standalone numbers without context in findings array using the chosen mask (Rule 8)
 * e.g., ["1 2 3 4 5"], ["1 2", "Aorta ectásica.", "4"], ["Três e quatro."], ["um e dois"]
 */
export function expandNumbersInFindings(
  findings: string[],
  mask?: ExamMask,
  patientGender?: 'F' | 'M' | 'UNKNOWN'
): string[] {
  if (!mask) return findings;
  const result: string[] = [];

  for (const item of findings) {
    const trimmed = item.trim();
    if (isNumberDictation(trimmed)) {
      const exp = expandNumbersFromMask(trimmed, mask, patientGender);
      if (exp.expandedFindings.length > 0) {
        result.push(...exp.expandedFindings);
        continue;
      }
    }
    result.push(item);
  }

  return result;
}

/**
 * Parses numbers dictated (e.g., "1 2 3 4 5", "1, 2, 3 e 4", "frases 1 2 3 4")
 * and extracts matching phrases from the chosen mask.
 * Rule 6: In abdome, if number 8 is said and patient is female -> "Bexiga, útero e anexos sem alterações."
 * If male -> "Bexiga e próstata sem alterações."
 */
export function expandNumbersFromMask(
  rawDictation: string,
  mask: ExamMask,
  patientGender?: 'F' | 'M' | 'UNKNOWN'
): { expandedFindings: string[]; usedNumbers: number[] } {
  const usedNumbers: number[] = [];
  const findings: string[] = [];

  const numberWordMap: Record<string, number> = {
    'um': 1, 'uma': 1, '1': 1,
    'dois': 2, 'duas': 2, '2': 2,
    'tres': 3, '3': 3,
    'quatro': 4, '4': 4,
    'cinco': 5, '5': 5,
    'seis': 6, 'meia': 6, '6': 6,
    'sete': 7, '7': 7,
    'oito': 8, '8': 8,
    'nove': 9, '9': 9,
    'dez': 10, '10': 10,
    'onze': 11, '11': 11,
    'doze': 12, '12': 12,
  };

  const tokens = rawDictation.split(/\s+/);
  const potentialNumbers: number[] = [];

  for (const token of tokens) {
    const cleaned = token
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
    if (numberWordMap[cleaned]) {
      potentialNumbers.push(numberWordMap[cleaned]);
    }
  }

  if (potentialNumbers.length > 0) {
    for (const num of potentialNumbers) {
      if (!usedNumbers.includes(num)) {
        usedNumbers.push(num);

        // Rule 6 & Item 2: Number 8 in Abdome
        if (num === 8 && mask.id.includes('abdome')) {
          if (patientGender === 'M') {
            findings.push('Bexiga e próstata sem alterações.');
          } else {
            findings.push('Bexiga, útero e anexos normais.');
          }
        } else {
          const phrase = mask.phrases.find(p => p.number === num);
          if (phrase) {
            findings.push(phrase.text);
          }
        }
      }
    }
  }

  return { expandedFindings: findings, usedNumbers };
}

/**
 * Builds the complete standardized "Code Black" report text
 */
export function formatCodeBlackReport(params: {
  patientName?: string;
  examTitle: string;
  technique?: string;
  findings: string[];
  opinionTitle?: string;
  opinionFindings: string[];
  mask?: ExamMask;
  patientGender?: 'F' | 'M' | 'UNKNOWN';
  rawText?: string;
}): FormattedReport {
  const {
    patientName,
    examTitle: rawExamTitle,
    technique: rawTechnique,
    findings,
    opinionTitle = 'Opinião:',
    opinionFindings,
    mask,
    patientGender: explicitGender,
    rawText,
  } = params;

  const technique = (rawTechnique || mask?.technique || '').trim();

  // Rule 5: Never show contrast designation in the title
  const finalExamTitle = cleanExamTitle(rawExamTitle || mask?.title || 'TOMOGRAFIA COMPUTADORIZADA');

  const resolvedGender =
    explicitGender && explicitGender !== 'UNKNOWN'
      ? explicitGender
      : detectPatientGender(patientName, rawText);

  // Item 1: Before expanding numbers, split any finding that starts with an isolated mask number + separator (e.g. "1, Fígado...", "1 Fígado...")
  // while avoiding duplicating if AI merely numbered an already-expanded mask phrase (e.g. "1. Parênquima pulmonar...")
  const nonMaskCountNoun = /^(?:mm|cm|ml|mg|uh|anos?|m[êe]s|meses|dias?|horas?|vez(?:es)?|graus?|n[oó]dulos?|micron[oó]dulos?|cistos?|c[aá]lculos?|les[aã]o|les[oõ]es|l[oó]bulos?|grampos?|linfonodos?|focos?|[aá]reas?|massas?|fraturas?|protrus[aã]o|protrus[oõ]es|abaulamentos?|h[eé]rnias?|oste[oó]fitos?|segmentos?|detectores?|litro|litros)\b/i;
  const preExpandedFindings: string[] = [];
  for (const f of findings) {
    const t = f.trim().replace(/^[-*•\s]+/, '').trim();
    const normalizedHum = t.replace(/^(hum)(?=\s*(?:[.,;:-]|\s|$))/i, 'um');
    const m = normalizedHum.match(
      /^((?:\d{1,2}|um|uma|dois|duas|tr[êe]s|quatro|cinco|seis|meia|sete|oito|nove|dez|onze|doze)(?:[\s,;e]+(?:\d{1,2}|um|uma|dois|duas|tr[êe]s|quatro|cinco|seis|meia|sete|oito|nove|dez|onze|doze))*)\s*(?:[.,;:-]\s+|\s+(?=[A-ZÁÉÍÓÚÀÂÊÔÃÕ]))([A-ZÁÉÍÓÚÀÂÊÔÃÕa-záéíóúàâêôãõ]{3,}.*)$/
    );
    if (m && !nonMaskCountNoun.test(m[2])) {
      const nums = expandNumbersFromMask(m[1], mask || RADIOLOGY_MASKS[0], resolvedGender);
      const restLower = m[2].trim().toLowerCase();
      const alreadyMatchesExpanded =
        nums.expandedFindings.length === 1 &&
        restLower.startsWith(nums.expandedFindings[0].toLowerCase().slice(0, 18));
      if (!alreadyMatchesExpanded) {
        preExpandedFindings.push(m[1].trim());
      }
      preExpandedFindings.push(m[2].trim());
    } else {
      preExpandedFindings.push(normalizedHum);
    }
  }

  const expandedFindingsList = expandNumbersInFindings(preExpandedFindings, mask, resolvedGender);

  // Clean findings: Ensure exactly one dash and space "- ", no multiple dashes, proper capitalization and period.
  const cleanFindings = expandedFindingsList
    .map(f => {
      let clean = f.trim();
      clean = clean.replace(/^(\d+[\s\-\.]*|[\-\*•\s]+)/, '').trim();

      // Clean leftover speech commands, hesitations, braces, ".final", "o conjunto"
      clean = normalizeSpokenPunctuation(clean)
        .replace(/<<PONTO_PARAGRAFO>>/g, ' ')
        .replace(/<<PONTO_FINAL>>/g, '')
        .trim();
      clean = cleanDictationMetaSpeech(clean);

      // Item 2: Enforce gender consistency on phrase #8 in Abdome
      if (mask?.id.includes('abdome')) {
        if (resolvedGender === 'M' && /^bexiga,\s*[uú]tero\s+e\s+anexos/i.test(clean)) {
          clean = 'Bexiga e próstata sem alterações';
        } else if (resolvedGender === 'F' && /^bexiga\s+e\s+pr[oó]stata/i.test(clean)) {
          clean = 'Bexiga, útero e anexos normais';
        }
      }

      // Rule 2, Ventrículos & Aorta: expand anatomical shortcuts
      clean = expandAnatomicalShortcuts(clean, mask);
      // Rule 11: transitional vertebrae
      clean = formatTransitionalVertebrae(clean);
      // Rule 12: anatomical segments
      clean = formatAnatomicalSegments(clean);

      clean = clean.replace(/(?:\s+(?:e|eh|ah))\s*$/i, '').trim();
      clean = clean.replace(/[\.\s]+$/, '').trim();

      if (!clean || /^(?:o\s+conjunto|conjunto|final|ponto\s+final)$/i.test(clean)) {
        return '';
      }

      clean = capitalizeSentences(clean);
      if (!clean.endsWith(':') && !clean.endsWith('?')) {
        clean += '.';
      }
      return `- ${clean}`;
    })
    .filter(f => f.length > 2);

  // Clean opinion findings
  const cleanOpinion = opinionFindings
    .map(o => {
      let clean = o.trim();
      clean = clean.replace(/^(\d+[\s\-\.]*|[\-\*•\s]+)/, '').trim();

      clean = normalizeSpokenPunctuation(clean)
        .replace(/<<PONTO_PARAGRAFO>>/g, ' ')
        .replace(/<<PONTO_FINAL>>/g, '')
        .trim();
      clean = cleanDictationMetaSpeech(clean);

      clean = formatTransitionalVertebrae(clean);
      clean = formatAnatomicalSegments(clean);
      clean = clean.replace(/(?:\s+(?:e|eh|ah))\s*$/i, '').trim();
      clean = clean.replace(/[\.\s]+$/, '').trim();

      if (!clean || /^(?:o\s+conjunto|conjunto|final|ponto\s+final)$/i.test(clean)) {
        return '';
      }

      clean = capitalizeSentences(clean);
      if (!clean.endsWith(':') && !clean.endsWith('?')) {
        clean += '.';
      }
      return `- ${clean}`;
    })
    .filter(o => o.length > 2);

  // User requirement: "Não quero que o nome do paciente saia no laudo final."
  // The report starts directly with the clean exam title.
  const plainTextParts: string[] = [];

  plainTextParts.push(finalExamTitle);
  plainTextParts.push(technique.trim());
  plainTextParts.push('O conjunto de imagens demonstra:');
  plainTextParts.push(cleanFindings.join('\n\n'));

  // Rule 3 & Rule 7: Only include opinion/observação/achados adicionais section if there are findings in it
  let formattedTitle = (opinionTitle || 'Opinião:').trim();
  if (!formattedTitle.endsWith(':')) formattedTitle += ':';

  if (cleanOpinion.length > 0) {
    plainTextParts.push(formattedTitle);
    plainTextParts.push(cleanOpinion.join('\n\n'));
  }

  const plainText = plainTextParts.join('\n\n');

  // Rich HTML formatted for medical printing / rich copy (without patient name)
  const htmlText = `
<div style="font-family: Arial, Helvetica, sans-serif; color: #111827; line-height: 1.6; max-width: 800px; margin: 0 auto; text-align: justify;">
  <div style="text-align: center; font-weight: bold; font-size: 16px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
    ${finalExamTitle}
  </div>

  <div style="margin-bottom: 20px; font-size: 14px; text-align: justify;">
    ${technique.trim()}
  </div>

  <div style="font-weight: bold; margin-bottom: 14px; font-size: 14px; text-align: justify;">
    O conjunto de imagens demonstra:
  </div>

  <div style="margin-bottom: 24px; font-size: 14px;">
    ${cleanFindings.map(f => `<div style="margin-bottom: 14px; text-align: justify;">${f}</div>`).join('')}
  </div>

  ${cleanOpinion.length > 0 ? `
  <div style="font-weight: bold; margin-top: 24px; margin-bottom: 20px; font-size: 14px; text-align: justify;">
    ${formattedTitle}
  </div>

  <div style="font-size: 14px;">
    ${cleanOpinion.map(o => `<div style="margin-bottom: 14px; text-align: justify;">${o}</div>`).join('')}
  </div>
  ` : ''}
</div>
  `.trim();

  return {
    patientName,
    examTitle: finalExamTitle,
    technique: technique.trim(),
    findings: cleanFindings,
    opinionTitle: cleanOpinion.length > 0 ? formattedTitle : undefined,
    opinionFindings: cleanOpinion,
    plainText,
    htmlText,
    matchedMask: mask,
  };
}
