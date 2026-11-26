import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';
import { GoogleGenAI, Type } from '@google/genai';
import type { ExamMask } from './src/data/radiologyMasks.js';
import { RADIOLOGY_MASKS } from './src/data/radiologyMasks.js';
import {
  formatCodeBlackReport,
  matchMask,
  expandNumbersFromMask,
  normalizeSpokenPunctuation,
  parseSpeechDictation,
  cleanExamTitle,
  detectPatientGender,
  formatTransitionalVertebrae,
  formatAnatomicalSegments,
  expandAnatomicalShortcuts,
  expandNumbersInFindings,
  isNumberDictation,
  capitalizeSentences,
  cleanDictationMetaSpeech,
  stripMaskPhrasesAfterPontoFinal,
} from './src/utils/codeBlackFormatter.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware for audio base64 uploads (up to 100mb)
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Safe error handler for body-parser to prevent HTML error responses
app.use((err: any, req: Request, res: Response, next: any) => {
  if (err) {
    console.error('[Express Middleware Error]', err);
    const is413 = err.status === 413 || err.type === 'entity.too.large';
    return res.status(is413 ? 413 : 400).json({
      error: is413
        ? 'O arquivo de áudio excede o limite de tamanho (HTTP 413). O áudio é otimizado automaticamente no navegador para 16kHz mono.'
        : `Erro ao receber arquivo de áudio: ${err.message || 'Payload inválido'}`,
      isPayloadError: true,
    });
  }
  next();
});

// Setup Google Gen AI client with server-side header
const getAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
  });
};

// Mask summaries for Gemini prompt context
const masksContextText = RADIOLOGY_MASKS.map(mask => {
  return `=== MÁSCARA: ${mask.title} (${mask.contrastStatus}) ===
ID: ${mask.id}
TÉCNICA PADRÃO: ${mask.technique}
FRASES NUMERADAS:
${mask.phrases.map(p => `${p.number}- ${p.text}`).join('\n')}
OPINIÃO PADRÃO:
- ${mask.defaultOpinion}
`;
}).join('\n\n');

function buildMasksCatalogPrompt(): string {
  return `CATÁLOGO DAS ${RADIOLOGY_MASKS.length} MÁSCARAS OFICIAIS DO PDF DE LAUDOS (Consulte APENAS se o médico citar números como "conjunto 1 e 2" ou "frases 1 e 3"):
${RADIOLOGY_MASKS.map(m => `=== MÁSCARA: ${m.title} (${m.contrastStatus}) [ID: ${m.id}] ===
Técnica Padrão: ${m.technique}
Frases Numeradas:
${m.phrases.map(p => `  ${p.number}- ${p.text}`).join('\n')}
Opinião Padrão: ${m.defaultOpinion}`).join('\n\n')}`;
}

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    masksCount: RADIOLOGY_MASKS.length,
    timestamp: new Date().toISOString(),
  });
});

// Endpoint to get all radiology masks
app.get('/api/masks', (req: Request, res: Response) => {
  res.json(RADIOLOGY_MASKS);
});

const BACKUP_SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.vite', '.cache', '.vercel']);
const BACKUP_SKIP_FILES = new Set(['.env', '.env.local', '.env.production', '.DS_Store']);

function addDirectoryToZip(zipFolder: JSZip, currentDir: string, rootDir: string) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      if (BACKUP_SKIP_DIRS.has(entry.name)) continue;
      const subFolder = zipFolder.folder(entry.name);
      if (subFolder) {
        addDirectoryToZip(subFolder, fullPath, rootDir);
      }
    } else if (entry.isFile()) {
      if (BACKUP_SKIP_FILES.has(entry.name) || entry.name.endsWith('.zip') || entry.name.endsWith('.log')) {
        continue;
      }
      const data = fs.readFileSync(fullPath);
      zipFolder.file(entry.name, data);
    }
  }
}

async function handleBackupDownload(req: Request, res: Response) {
  try {
    const zip = new JSZip();
    const projectRootFolder = zip.folder('Laudo_wav_Backup');
    if (!projectRootFolder) {
      throw new Error('Falha ao criar diretório raiz no arquivo ZIP.');
    }

    addDirectoryToZip(projectRootFolder, __dirname, __dirname);

    const customCorrections = Array.isArray(req.body?.customCorrections) ? req.body.customCorrections : null;
    if (customCorrections) {
      projectRootFolder.file('backup_regras_personalizadas.json', JSON.stringify(customCorrections, null, 2));
      const txtLines = customCorrections
        .map((r: any) => `${r.from || ''} -> ${r.to || ''}`)
        .filter((line: string) => line.trim() !== '->')
        .join('\n');
      projectRootFolder.file('backup_regras_personalizadas.txt', txtLines);
    }

    const now = new Date();
    const dateSlug = now.toISOString().slice(0, 10);
    const readmeText = [
      '========================================================================',
      'LAUDO.WAV - BACKUP COMPLETO DO SOFTWARE',
      `Gerado em: ${now.toLocaleString('pt-BR')}`,
      `Total de máscaras radiológicas oficiais incluídas: ${RADIOLOGY_MASKS.length}`,
      '========================================================================',
      '',
      'CONTEÚDO DESTE BACKUP:',
      '- src/                     -> Código-fonte completo da interface, máscaras e regras Code Black',
      '- api/[...path].ts         -> Adaptador Serverless para rodar o backend /api/* na Vercel',
      '- vercel.json              -> Configuração de rotas SPA + API para deploy GitHub/Vercel',
      '- public/assets/           -> PDFs oficiais de máscaras e recursos visuais',
      '- server.ts                -> Servidor Express + integração Gemini API + motor de laudos',
      '- package.json / bun.lock  -> Lista exata de dependências do projeto',
      '- metadata.json            -> Permissões de microfone e configuração do aplicativo',
      '- backup_regras_personalizadas.json/.txt -> Suas regras de correção fonética salvas',
      '',
      'COMO RESTAURAR OU RODAR NO SEU COMPUTADOR:',
      '1. Extraia este arquivo ZIP em uma pasta no seu PC.',
      '2. Instale o Node.js (v20 ou superior).',
      '3. Renomeie ".env.example" para ".env" e adicione sua GEMINI_API_KEY.',
      '4. No terminal dentro da pasta extraída, execute:',
      '     npm install',
      '     npm run dev',
      '5. Acesse http://localhost:3000 no navegador.',
      '',
      'COMO HOSPEDAR NA VERCEL (GITHUB -> VERCEL):',
      '1. Suba todos os arquivos (incluindo a pasta "api/" e o arquivo "vercel.json") para o GitHub.',
      '2. No painel do projeto na Vercel: Settings -> Environment Variables.',
      '3. Adicione a variável GEMINI_API_KEY com sua chave da API Gemini e faça Redeploy.',
      '',
      'Para restaurar regras de correção na aba "Correções", basta importar o arquivo',
      '"backup_regras_personalizadas.txt" usando o botão "Carregar Arquivo (.txt)".',
    ].join('\n');

    projectRootFolder.file('LEIA-ME_BACKUP.txt', readmeText);

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const filename = `Laudo_wav_Backup_Completo_${dateSlug}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', zipBuffer.length);
    return res.send(zipBuffer);
  } catch (err: any) {
    console.error('[Backup Error]', err);
    return res.status(500).json({ error: err?.message || 'Falha ao gerar arquivo de backup.' });
  }
}

app.get('/api/backup', handleBackupDownload);
app.post('/api/backup', handleBackupDownload);

/**
 * Extracts text from Gemini responses, properly handling both standard .text
 * and audioTranscription parts returned by gemini-3.5-transcribe
 */
function extractGeminiText(response: any): string {
  if (!response) return '';
  if (typeof response.text === 'string' && response.text.trim()) {
    return response.text.trim();
  }
  const candidateParts = response.candidates?.[0]?.content?.parts;
  if (Array.isArray(candidateParts) && candidateParts.length > 0) {
    const textPieces: string[] = [];
    for (const part of candidateParts) {
      if (typeof part.text === 'string' && part.text.trim()) {
        textPieces.push(part.text.trim());
      } else if (typeof part.audioTranscription?.text === 'string' && part.audioTranscription.text.trim()) {
        textPieces.push(part.audioTranscription.text.trim());
      }
    }
    if (textPieces.length > 0) {
      return textPieces.join(' ');
    }
  }
  return '';
}

/**
 * Normalizes browser audio mime types to clean IANA standard MIME strings
 */
function normalizeAudioMimeType(mime?: string): string {
  if (!mime) return 'audio/wav';
  const clean = mime.split(';')[0].trim().toLowerCase();
  if (clean === 'audio/x-wav' || clean === 'audio/wave') return 'audio/wav';
  if (clean === 'audio/mpeg' || clean === 'audio/mp3') return 'audio/mp3';
  if (clean === 'audio/m4a' || clean === 'audio/x-m4a') return 'audio/m4a';
  return clean || 'audio/wav';
}

let lastGeminiError = '';

/**
 * Robust helper to call Gemini with timeout, retry, and candidate model fallback
 */
async function callGeminiWithFallback(
  ai: GoogleGenAI,
  contents: any,
  options?: {
    models?: string[];
    maxRetries?: number;
    systemInstruction?: string;
    timeoutMs?: number;
  }
): Promise<{ text: string; modelUsed: string } | null> {
  const envModels = process.env.GEMINI_MODELS?.split(',').map(m => m.trim()).filter(Boolean);
  const candidateModels = envModels?.length ? envModels : (options?.models || ['gemini-3.1-flash-lite', 'gemini-3.8-flash']);
  const maxRetries = options?.maxRetries ?? 1;
  const timeoutMs = options?.timeoutMs ?? 15000;
  lastGeminiError = '';

  for (const model of candidateModels) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Gemini Request] Attempt ${attempt}/${maxRetries} using model: ${model} (timeout: ${timeoutMs}ms)`);

        const config: any = {
          safetySettings: [
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' },
          ],
        };
        if (options?.systemInstruction) {
          config.systemInstruction = options.systemInstruction;
        }

        let timeoutHandle: any;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutHandle = setTimeout(() => reject(new Error(`Timeout de resposta da API (${model} - ${timeoutMs}ms)`)), timeoutMs);
        });

        const apiPromise = ai.models.generateContent({
          model,
          contents,
          config,
        });

        const response: any = await Promise.race([
          apiPromise,
          timeoutPromise,
        ]).finally(() => {
          if (timeoutHandle) clearTimeout(timeoutHandle);
        });

        const extracted = extractGeminiText(response);
        if (extracted) {
          console.log(`[Gemini Success] Response received from model: ${model} (${extracted.length} chars)`);
          return { text: extracted, modelUsed: model };
        }
      } catch (err: any) {
        const errorMsg = err?.message || String(err);
        lastGeminiError = errorMsg;
        console.warn(`[Gemini Fast-Fallback] Model ${model} failed on attempt ${attempt}: ${errorMsg.slice(0, 150)}`);
        break;
      }
    }
  }

  return null;
}

/**
 * Parses Gemini markdown or raw text output into structured Code Black report components
 */
function parseGeminiReportText(
  aiText: string,
  rawDictation: string,
  fallbackMask?: ExamMask
): {
  patientName?: string;
  matchedMaskId?: string;
  examTitle: string;
  technique: string;
  findings: string[];
  opinionTitle: string;
  opinionFindings: string[];
  numbersDetected: number[];
  transcribedText?: string;
} {
  const sanitizedRaw = stripMaskPhrasesAfterPontoFinal(rawDictation, fallbackMask);
  const strippedTail = rawDictation.length > sanitizedRaw.length
    ? rawDictation.slice(sanitizedRaw.length).toLowerCase()
    : '';
  const speechHelper = parseSpeechDictation(sanitizedRaw, fallbackMask);
  const hasExplicitPontoFinal = speechHelper.hasExplicitPontoFinal || /ponto\s+final/i.test(sanitizedRaw) || /ponto\s+final/i.test(aiText);

  // If AI outputted JSON, try parsing it
  try {
    const jsonMatch = aiText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, aiText];
    const candidateJson = jsonMatch[1] || aiText;
    const parsed = JSON.parse(candidateJson);
    if (parsed.findings && Array.isArray(parsed.findings) && parsed.findings.length > 0) {
      let findingsList = parsed.findings.map((f: any) => String(f).trim());

      // If AI returned a single finding that contains speech formatting commands or patient header, unpack it!
      if (findingsList.length === 1 && (
        findingsList[0].includes('parágrafo') || 
        findingsList[0].includes('{ponto}') || 
        /^(?:paciente|exame|laudo)/i.test(findingsList[0])
      )) {
        const speech = parseSpeechDictation(findingsList[0]);
        if (speech.findings.length > 0) {
          findingsList = speech.findings;
        }
        if (!parsed.patientName && speech.patientName) {
          parsed.patientName = speech.patientName;
        }
        if (!parsed.examTitle && speech.examTitle) {
          parsed.examTitle = speech.examTitle;
        }
        if ((!parsed.opinionFindings || parsed.opinionFindings.length === 0) && speech.opinionText) {
          parsed.opinionFindings = [speech.opinionText];
        }
      }

      const foundMask = parsed.matchedMaskId ? RADIOLOGY_MASKS.find(m => m.id === parsed.matchedMaskId) : null;
      const effectiveMask = foundMask || fallbackMask;

      // Item 8: Check if AI accidentally put an "Opinião..." / "Observação..." / "Achados adicionais..." item inside findingsList
      let extractedOpTitleFromFindings: string | undefined;
      const extractedOpFromFindings: string[] = [];
      const filteredFindings: string[] = [];
      let insideInlineOpinion = false;

      for (const rawItem of findingsList) {
        const opHeaderMatch = rawItem.match(/^(?:[-*•\s]*)(observa[çc][aã]o|como\s+achados\s+adicionais|achados\s+adicionais|como\s+achado\s+adicional|achado\s+adicional|opini[aã]o|conclus[aã]o|impress[aã]o)(?:[\s,:;\.]+)(.*)$/i);
        if (opHeaderMatch) {
          const hdr = opHeaderMatch[1].toLowerCase();
          if (hdr.includes('observa')) extractedOpTitleFromFindings = 'Observação:';
          else if (hdr.includes('adicional') && !hdr.includes('adicionais')) extractedOpTitleFromFindings = 'Achado adicional:';
          else if (hdr.includes('adicionais')) extractedOpTitleFromFindings = 'Achados adicionais:';
          else if (hdr.includes('conclus')) extractedOpTitleFromFindings = 'Conclusão:';
          else extractedOpTitleFromFindings = 'Opinião:';

          insideInlineOpinion = true;
          if (opHeaderMatch[2] && opHeaderMatch[2].trim()) {
            extractedOpFromFindings.push(opHeaderMatch[2].trim());
          }
          continue;
        }

        if (insideInlineOpinion) {
          extractedOpFromFindings.push(rawItem);
        } else {
          filteredFindings.push(rawItem);
        }
      }

      // Clean leftover speech tokens, braces, hesitations, ".final", "o conjunto", meta-speech, and format shortcuts
      findingsList = filteredFindings
        .map((f: string) => {
          let cleaned = normalizeSpokenPunctuation(f)
            .replace(/<<PONTO_PARAGRAFO>>/g, ' ')
            .replace(/<<PONTO_FINAL>>/g, '')
            .replace(/\s+([.,;:?])/g, '$1')
            .replace(/\s+/g, ' ')
            .trim();
          cleaned = cleanDictationMetaSpeech(cleaned);
          cleaned = expandAnatomicalShortcuts(cleaned, effectiveMask);
          cleaned = formatTransitionalVertebrae(cleaned);
          cleaned = formatAnatomicalSegments(cleaned);
          if (cleaned.length > 0) {
            cleaned = capitalizeSentences(cleaned);
          }
          return cleaned;
        })
        .filter((f: string) => {
          if (!f) return false;
          // Allow single/double digit number strings like "1", "1, 2" so expandNumbersInFindings can expand them!
          if (isNumberDictation(f)) return true;
          if (f.length <= 2) return false;
          if (/^(?:paciente|laudo|o\s+conjunto|conjunto|final|ponto\s+final)$/i.test(f)) return false;
          // Item 11: Drop finding if it only existed inside stripped normal mask tail after "ponto final"
          if (strippedTail && f.length >= 12) {
            const normF = f.toLowerCase().replace(/[.\s]+$/, '');
            if (strippedTail.includes(normF.slice(0, 22)) && !sanitizedRaw.toLowerCase().includes(normF.slice(0, 22))) {
              return false;
            }
          }
          return true;
        });

      // Clean title according to Rule 5 (no contrast in title)
      const rawTitle = parsed.examTitle || foundMask?.title || fallbackMask?.title || 'TOMOGRAFIA COMPUTADORIZADA';
      const cleanTitle = cleanExamTitle(rawTitle);

      // Handle opinion: Item 8, Rule 3, Rule 7
      let finalOpinionFindings: string[] = [];
      if (Array.isArray(parsed.opinionFindings) && parsed.opinionFindings.length > 0) {
        finalOpinionFindings = parsed.opinionFindings
          .map((o: any) => {
            let op = normalizeSpokenPunctuation(String(o))
              .replace(/<<PONTO_PARAGRAFO>>/g, ' ')
              .replace(/<<PONTO_FINAL>>/g, '')
              .replace(/\s+([.,;:?])/g, '$1')
              .trim();
            op = cleanDictationMetaSpeech(op);
            op = formatTransitionalVertebrae(op);
            op = formatAnatomicalSegments(op);
            if (op && !/[.!?]$/.test(op)) op += '.';
            return op ? capitalizeSentences(op) : '';
          })
          .filter((o: string) => o.length > 2);
      } else if (typeof parsed.opinionFindings === 'string' && parsed.opinionFindings.trim()) {
        const op = capitalizeSentences(cleanDictationMetaSpeech(normalizeSpokenPunctuation(parsed.opinionFindings.trim())));
        if (op.length > 2) finalOpinionFindings = [op];
      }

      if (finalOpinionFindings.length === 0 && extractedOpFromFindings.length > 0) {
        finalOpinionFindings = extractedOpFromFindings
          .map((o: string) => {
            let op = normalizeSpokenPunctuation(o)
              .replace(/<<PONTO_PARAGRAFO>>/g, ' ')
              .replace(/<<PONTO_FINAL>>/g, '')
              .trim();
            op = cleanDictationMetaSpeech(op);
            op = formatTransitionalVertebrae(op);
            op = formatAnatomicalSegments(op);
            if (op && !/[.!?]$/.test(op)) op += '.';
            return op ? capitalizeSentences(op) : '';
          })
          .filter((o: string) => o.length > 2);
      }

      // If AI returned empty opinion findings, but the speech transcript contains an explicit opinion/observação/achados adicionais, NEVER omit it!
      if (finalOpinionFindings.length === 0 && (speechHelper.opinionFindings?.length || speechHelper.opinionText)) {
        finalOpinionFindings = speechHelper.opinionFindings && speechHelper.opinionFindings.length > 0
          ? speechHelper.opinionFindings
          : [speechHelper.opinionText!];
      }

      // Rule 3 & Item 11: Only default opinion if NO ponto final and NO explicit opinion was uttered
      if (finalOpinionFindings.length === 0 && !hasExplicitPontoFinal && !speechHelper.opinionText) {
        finalOpinionFindings = [foundMask?.defaultOpinion || fallbackMask?.defaultOpinion || 'Exame sem alterações tomográficas significativas.'];
      }

      let finalOpTitle = parsed.opinionTitle || extractedOpTitleFromFindings || speechHelper.opinionTitle || 'Opinião:';
      if (!finalOpTitle.endsWith(':')) finalOpTitle += ':';

      return {
        patientName: parsed.patientName || speechHelper.patientName || '',
        matchedMaskId: parsed.matchedMaskId || '',
        examTitle: cleanTitle,
        technique: foundMask?.technique || fallbackMask?.technique || parsed.technique || 'Estudo realizado em tomógrafo computadorizado multislice de 128 detectores.',
        findings: findingsList,
        opinionTitle: finalOpTitle,
        opinionFindings: finalOpinionFindings,
        numbersDetected: parsed.numbersDetected || [],
        transcribedText: parsed.transcribedText || sanitizedRaw || '',
      };
    }
  } catch {
    // Continue with markdown / text extraction
  }

  // Extract from Markdown / Text
  const lines = aiText.split('\n').map(l => l.trim()).filter(Boolean);

  let patientName = speechHelper.patientName || '';
  let examTitle = fallbackMask?.title || '';
  let technique = fallbackMask?.technique || '';
  const findings: string[] = [];
  let opinionTitle = 'Opinião:';
  const opinionFindings: string[] = [];

  let currentSection: 'header' | 'technique' | 'findings' | 'opinion' = 'header';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check patient line
    const patientMatch = line.match(/(?:paciente|nome)[\s:]+(.*?)$/i);
    if (patientMatch && !patientName) {
      patientName = patientMatch[1].replace(/[*#]/g, '').trim();
      continue;
    }

    // Check title (TOMOGRAFIA DE... / ANGIOTOMOGRAFIA... / RX...)
    if (/(?:TOMOGRAFIA|ANGIOTOMOGRAFIA|RESSONANCIA|RADIOGRAFIA|RX)/i.test(line) && !line.includes('realizado') && !line.includes('demonstra')) {
      examTitle = cleanExamTitle(line.replace(/[*#]/g, '').trim());
      continue;
    }

    // Check technique line
    if (line.toLowerCase().startsWith('estudo realizado') || line.toLowerCase().startsWith('foram realizados') || line.toLowerCase().startsWith('exame realizado')) {
      technique = line.replace(/[*#]/g, '').trim();
      currentSection = 'technique';
      continue;
    }

    // Check group phrase "O conjunto de imagens demonstra"
    if (line.toLowerCase().includes('o conjunto de imagens demonstra') || line.toLowerCase().includes('o conjunto de imagem demonstra') || /^[-*•\s]*o\s+conjunto[\s.:]*$/i.test(line)) {
      currentSection = 'findings';
      continue;
    }

    // Check opinion section (Rule 7 & Item 8: handle inline "Opinião, ..." or "- Opinião, ..." as well as standalone header)
    const opLineMatch = line.match(/^(?:[*#\-\s•]*)(observa[çc][aã]o|como\s+achados\s+adicionais|achados\s+adicionais|como\s+achado\s+adicional|achado\s+adicional|opini[aã]o|impress[aã]o\s+diagn[oó]stica|conclus[aã]o)(?:[\s,:;\.]*)(.*)$/i);
    if (opLineMatch) {
      const hdr = opLineMatch[1].toLowerCase();
      if (hdr.includes('observa')) opinionTitle = 'Observação:';
      else if (hdr.includes('adicional') && !hdr.includes('adicionais')) opinionTitle = 'Achado adicional:';
      else if (hdr.includes('adicionais')) opinionTitle = 'Achados adicionais:';
      else if (hdr.includes('conclus')) opinionTitle = 'Conclusão:';
      else opinionTitle = 'Opinião:';

      currentSection = 'opinion';
      const inlineBody = cleanDictationMetaSpeech(normalizeSpokenPunctuation(opLineMatch[2] || ''));
      if (inlineBody.length > 2) {
        opinionFindings.push(capitalizeSentences(inlineBody));
      }
      continue;
    }

    // Collect findings vs opinion
    if (currentSection === 'findings') {
      let cleanLine = line.replace(/^[*\-•\s]+/, '').trim();
      cleanLine = cleanDictationMetaSpeech(normalizeSpokenPunctuation(cleanLine));
      cleanLine = expandAnatomicalShortcuts(cleanLine, fallbackMask);
      cleanLine = formatTransitionalVertebrae(cleanLine);
      cleanLine = formatAnatomicalSegments(cleanLine);
      if (isNumberDictation(cleanLine) || cleanLine.length > 2) {
        findings.push(capitalizeSentences(cleanLine));
      }
    } else if (currentSection === 'opinion') {
      let cleanLine = line.replace(/^[*\-•\s\d\.]+/, '').trim();
      cleanLine = cleanDictationMetaSpeech(normalizeSpokenPunctuation(cleanLine));
      cleanLine = formatTransitionalVertebrae(cleanLine);
      cleanLine = formatAnatomicalSegments(cleanLine);
      if (cleanLine.length > 2) {
        opinionFindings.push(capitalizeSentences(cleanLine));
      }
    }
  }

  // If section parsing was sparse or input was conversational/speech, use parseSpeechDictation
  if (findings.length === 0) {
    const speechComponents = parseSpeechDictation(sanitizedRaw);
    if (speechComponents.findings.length > 0) {
      findings.push(...speechComponents.findings);
    } else if (sanitizedRaw.trim()) {
      findings.push(sanitizedRaw.trim());
    }
    if (!patientName && speechComponents.patientName) {
      patientName = speechComponents.patientName;
    }
    if (!examTitle && speechComponents.examTitle) {
      examTitle = speechComponents.examTitle;
    }
    if (opinionFindings.length === 0 && speechComponents.opinionFindings?.length) {
      opinionFindings.push(...speechComponents.opinionFindings);
    } else if (opinionFindings.length === 0 && speechComponents.opinionText) {
      opinionFindings.push(speechComponents.opinionText);
    }
    if (speechComponents.opinionTitle) {
      opinionTitle = speechComponents.opinionTitle;
    }
  }

  // Rule 3 & Item 11: Only default opinion if no explicit ponto final was uttered
  if (opinionFindings.length === 0 && !hasExplicitPontoFinal && !speechHelper.opinionText) {
    opinionFindings.push(fallbackMask?.defaultOpinion || 'Exame sem alterações tomográficas significativas.');
  }

  if (!examTitle) {
    examTitle = fallbackMask?.title || 'TOMOGRAFIA COMPUTADORIZADA';
  }
  examTitle = cleanExamTitle(examTitle);

  if (fallbackMask?.technique) {
    technique = fallbackMask.technique;
  } else if (!technique) {
    technique = 'Estudo realizado em tomógrafo computadorizado multislice de 128 detectores.';
  }

  return {
    patientName,
    examTitle,
    technique,
    findings,
    opinionTitle,
    opinionFindings,
    numbersDetected: [],
    transcribedText: sanitizedRaw || '',
  };
}

// Endpoint to format text dictations
app.post('/api/format-dictation', async (req: Request, res: Response) => {
  try {
    const { rawText, patientName, examId, customTitle } = req.body;

    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ error: 'Texto da ditação é obrigatório' });
    }

    const userMask = examId && examId !== 'auto' ? RADIOLOGY_MASKS.find(m => m.id === examId) : null;
    const matchedMask = userMask || matchMask(customTitle, undefined, rawText);
    const targetMask = matchedMask || RADIOLOGY_MASKS[2]; // abdome-total-com

    const ai = getAIClient();

    if (ai) {
      const prompt = `Você é um radiologista sênior e digitador médico no padrão rigoroso "Code Black".
Estruture a seguinte ditação médica no laudo oficial sem omitir NENHUM detalhe e SEM CRIAR NADA.

MANDATO SUPREMO ANTI-ALUCINAÇÃO (NUNCA CRIE LAUDO):
1. É TERMINANTEMENTE PROIBIDO inventar, deduzir ou adicionar achados que o médico NÃO pronunciou na ditação.
2. Cada item em 'findings' DEVE corresponder estritamente ao que foi falado.
3. Fidelidade anatômica total: se o médico falou de mastóides, o laudo é de mastóides; se falou de crânio, é crânio; se falou de tórax, NUNCA mencione coluna ou abdome.
4. Se o médico ditou números de frases (ex: "conjunto 1, 2 e 3", "frases 1 e 4" ou números isolados), consulte o catálogo abaixo da mesma anatomia e puxe as frases correspondentes.
5. Se o médico ditou os achados por extenso (frases faladas livres, normais ou anormais como fratura, derrame, nódulo, medição em mm/cm), transcreva CADA FRASE com rigor terminológico e fidelidade palavra por palavra.

ORDENS E REGRAS MÉDICAS CORRETIVAS OBRIGATÓRIAS:
- REGRA 1 (Interrogação): Quando for dito "interroga", "ponto de interrogação" ou aparecer "{?}", coloque "?".
- REGRA 2 (Mediastino / Ventrículos / Aorta):
  * "Mediastino." -> "Mediastino centrado não se identificando lesão tumoral ou cística."
  * "Ventrículos." -> "Ventrículos e cisternas sem alterações."
  * "Aorta." / "A aorta." -> no tórax, "Aorta torácica normal."
- REGRA NÚMERO 1 E NÚMEROS POR EXTENSO OU DÍGITOS: Quando forem falados números isolados (ex: "1", "um", "hum", "3 4", "Três e quatro."), SEMPRE consulte a máscara oficial do exame e inclua CADA frase correspondente em linhas separadas (NUNCA ignore ou apague o número 1!).
- REGRA 3 (Opinião, Observação e Achados Adicionais - NUNCA COLOQUE EM 'findings' E NUNCA OMITA O QUE FOI DITADO):
  * SE O MÉDICO DITOU Opinião, Observação ou Achados Adicionais (ex: "Opinião, ...", "Opinião: ...", "Observação: ...", "Achados adicionais: ..."), coloque o título em 'opinionTitle' ("Opinião:", "Observação:", "Achado adicional:", "Achados adicionais:") e TODAS as frases em 'opinionFindings'. NUNCA coloque a palavra "Opinião" dentro de 'findings'!
  * Se na fala aparecer "o demonstra ...", corrija SEMPRE para "O exame demonstra ...".
  * O comando "ponto final" (ou ".final") deve ser IGNORADO/removido do texto final e impede que frases normais restantes da máscara ou opinião padrão sejam inventadas após ele. Mas se o médico DITOU uma opinião antes de dizer "ponto final", mantenha a opinião ditada em 'opinionFindings'.
- REGRA 4 (Técnica Oficial da Máscara): Use EXATAMENTE a 'Técnica Padrão' da máscara oficial correspondente ao exame (ex: no tórax sem contraste, "Estudo realizado com tomografo multislice de 128 detectores que geraram imagens multiplanares, sem a administração de contraste venoso."; com contraste termina em "( Omnipaque 300/100 ml ).").
- REGRA 5 (Título do Exame Estritamente sem ESTUDO e sem Contraste): O título deve ser EXCLUSIVAMENTE o nome do exame em maiúsculas (ex: "TOMOGRAFIA DE TÓRAX", "TOMOGRAFIA DE ABDOME TOTAL", "TOMOGRAFIA DE PELVE", "TOMOGRAFIA DE COLUNA LOMBAR", "TOMOGRAFIA DE CRÂNIO", "TOMOGRAFIA DE MASTÓIDES"). É ESTRITAMENTE PROIBIDO incluir "ESTUDO", "EXAME", "(SEM CONTRASTE)" ou "(COM CONTRASTE)".
- REGRA DE IDENTIFICAÇÃO DO PACIENTE: O nome do paciente NÃO deve aparecer no laudo final (mas retorne-o no campo JSON 'patientName' para que o sexo seja identificado corretamente).
- REGRA 6 (Número 8 no Abdome): Na tomografia de abdome, ao ditar o número 8: se paciente mulher -> "Bexiga, útero e anexos normais."; se paciente homem -> "Bexiga e próstata sem alterações.".
- REGRA 7 (O Conjunto): Qualquer fala isolada de "o conjunto" ou "o conjunto de imagens demonstra" NÃO deve entrar em 'findings'.
- REGRA 9 & 10 (Parênteses): "{abre parênteses}" / "abre parênteses" / "abrir parênteses" -> "(" e "{fecha parênteses}" / "fecha parênteses" / "fechar parênteses" -> ")".
- REGRA 11 (Vértebras de Transição): Use hífen em vez de espaço (ex: "C6-C7", "L5-S1", "T12-L1", "D12-L1").
- REGRA 12 (Segmentos Hepáticos/Anatômicos): Use algarismos romanos para segmentos (ex: "segmento IV B", "segmento VII", "segmentos II e III").
- CAPITALIZAÇÃO: Após todo ponto final de frase, a próxima letra deve ser maiúscula.
- CORREÇÕES DE VOCABULÁRIO E LIMPEZA: "nucapsular" -> "nucleocapsular", "podenso" -> "hipodenso". Elimine TODAS as hesitações ("hã", "ãh", "hãn", "ãhn", "eh", "ah", "hum", "da da" -> "da") e autocorrreções conversacionais ("Não, antes do material..." -> "Material...").

${buildMasksCatalogPrompt()}

Retorne EXCLUSIVAMENTE no formato JSON com as propriedades:
- matchedMaskId: string (o ID oficial exato da lista se aplicável, ex: "tórax-sem", "tórax-com", "mastóides-sem", "crânio-sem", etc.)
- patientName: string
- examTitle: string (LIMPO, sem indicação de contraste)
- technique: string
- findings: string[] (cada frase sem o traço inicial)
- numbersDetected: number[]
- opinionTitle: string (ex: "Opinião:", "Observação:" ou "Achados adicionais:")
- opinionFindings: string[]

TEXTO DITADO PELO MÉDICO:
"""
${rawText}
"""
`;

      const aiResult = await callGeminiWithFallback(ai, prompt, {
        models: ['gemini-3.1-flash-lite', 'gemini-3.8-flash'],
        maxRetries: 1,
        timeoutMs: 15000,
      });

      if (aiResult) {
        const parsed = parseGeminiReportText(aiResult.text, rawText, targetMask);
        const resolvedMask = 
          userMask ||
          (parsed.matchedMaskId ? RADIOLOGY_MASKS.find(m => m.id === parsed.matchedMaskId) : null) ||
          targetMask;

        const effectivePatientName = parsed.patientName || patientName;
        const patientGender = detectPatientGender(effectivePatientName, rawText);

        let findings = parsed.findings && parsed.findings.length > 0 ? parsed.findings : [];
        const speech = parseSpeechDictation(rawText);
        if (findings.length === 0) {
          if (speech.findings.length > 0) {
            findings = speech.findings;
          } else {
            const expanded = expandNumbersFromMask(rawText, resolvedMask, patientGender);
            findings = expanded.expandedFindings.length > 0 ? expanded.expandedFindings : [normalizeSpokenPunctuation(rawText)];
          }
        }

        let opinionFindings = parsed.opinionFindings;
        if ((!opinionFindings || opinionFindings.length === 0) && (speech.opinionFindings?.length || speech.opinionText)) {
          opinionFindings = speech.opinionFindings && speech.opinionFindings.length > 0
            ? speech.opinionFindings
            : [speech.opinionText!];
        }

        let opinionTitle = parsed.opinionTitle || speech.opinionTitle || 'Opinião:';
        if (!opinionTitle.endsWith(':')) opinionTitle += ':';

        const structured = formatCodeBlackReport({
          patientName: effectivePatientName,
          examTitle: cleanExamTitle(parsed.examTitle || resolvedMask.title),
          technique: resolvedMask.technique || parsed.technique,
          findings,
          opinionTitle,
          opinionFindings,
          mask: resolvedMask,
          patientGender,
          rawText,
        });

        return res.json({
          ...structured,
          transcribedText: rawText,
          numbersDetected: parsed.numbersDetected,
          aiGenerated: true,
          modelUsed: aiResult.modelUsed,
        });
      }
    }

    // Local deterministic fallback (0ms, 100% reliable)
    // Never inject phantom mask phrases!
    const preliminarySpeech = parseSpeechDictation(rawText);
    const resolvedMask = userMask || matchMask(preliminarySpeech.examTitle || customTitle, undefined, rawText) || targetMask;
    const speech = parseSpeechDictation(rawText, resolvedMask);
    const effectivePatientName = speech.patientName || patientName || '';
    const patientGender = detectPatientGender(effectivePatientName, rawText);
    
    let fallbackFindings = speech.findings.length > 0 ? speech.findings : [];
    if (fallbackFindings.length === 0) {
      const expanded = expandNumbersFromMask(stripMaskPhrasesAfterPontoFinal(rawText, resolvedMask), resolvedMask, patientGender);
      fallbackFindings = expanded.expandedFindings.length > 0 ? expanded.expandedFindings : [normalizeSpokenPunctuation(rawText)];
    }

    const fallbackOpinion = speech.opinionFindings && speech.opinionFindings.length > 0
      ? speech.opinionFindings
      : (speech.opinionText
          ? [speech.opinionText]
          : (speech.hasExplicitPontoFinal ? [] : [resolvedMask.defaultOpinion]));

    let fallbackOpTitle = speech.opinionTitle || 'Opinião:';
    if (!fallbackOpTitle.endsWith(':')) fallbackOpTitle += ':';

    const fallbackReport = formatCodeBlackReport({
      patientName: effectivePatientName,
      examTitle: cleanExamTitle(speech.examTitle || customTitle || resolvedMask.title),
      technique: resolvedMask.technique,
      findings: fallbackFindings,
      opinionTitle: fallbackOpTitle,
      opinionFindings: fallbackOpinion,
      mask: resolvedMask,
      patientGender,
      rawText,
    });

    return res.json({
      ...fallbackReport,
      transcribedText: rawText,
      numbersDetected: [],
      aiGenerated: false,
      notice: 'Formatado com o motor Code Black oficial.',
    });
  } catch (error: any) {
    console.error('Error in format-dictation:', error);
    res.status(500).json({ error: error?.message || 'Erro ao formatar ditação' });
  }
});

// Endpoint to transcribe and structure audio (WAV, MP3, WebM)
app.post('/api/transcribe-audio', async (req: Request, res: Response) => {
  try {
    const { audioBase64, mimeType = 'audio/wav', patientName, liveTranscript, examId, audioSegments } = req.body;

    if (!audioBase64 && !liveTranscript && (!Array.isArray(audioSegments) || audioSegments.length === 0)) {
      return res.status(400).json({ error: 'Áudio não fornecido (audioBase64, audioSegments ou ditação é obrigatório)' });
    }

    const ai = getAIClient();
    if (!ai) {
      return res.status(500).json({
        error: 'Chave de API Gemini (GEMINI_API_KEY) não encontrada no servidor. Configure a chave no painel Secrets.'
      });
    }

    const normalizedMime = normalizeAudioMimeType(mimeType);
    console.log(`[Audio Transcribe] Ingesting audio: ${normalizedMime}, payload: ${audioBase64 ? Math.round(audioBase64.length * 0.75 / 1024) : 0} KB, segments: ${Array.isArray(audioSegments) ? audioSegments.length : 0}`);

    let rawTranscribedText = '';
    let transcriptionModelUsed = '';

    const transcribePrompt = `Transcreva este áudio médico de laudo radiológico de forma 100% EXATA, LITERAL e COMPLETA em português brasileiro.
NÃO resuma, NÃO omita nenhuma palavra ou número falado.
ATENÇÃO ESPECIAL NA TRANSCRIÇÃO DE ÁUDIO:
- Transcreva com máxima atenção todos os números ditados pelo médico (inclusive o número "1" / "um", "2", "3", "4", etc., isolados ou em sequência como "1, 2, 3, 4", "conjunto 1 e 2", "frases 3 e 4"). NUNCA transcreva o número "um" como "hum".
- NÃO inclua ruídos ou hesitações de pensamento como "hã", "ãh", "hãn", "eh", "ah", "uhm".
- Se o médico corrigir uma fala durante a ditação (ex: "não, antes do material de síntese..."), transcreva a frase médica limpa sem deixar comandos perdidos como ".final".
- Transcreva fielmente todos os achados normais e patológicos, medições em mm/cm, termos anatômicos ("a aorta", "mediastino", "ventrículos", etc.), o nome do paciente e a seção de Opinião/Observação/Achados adicionais.
- Quando o médico ditar "abre parênteses", "fecha parênteses", "interroga", "ponto e vírgula", "parágrafo", "ponto final", transcreva esses comandos claramente (ou já com "(", ")", "?" diretamente, nunca "{?}").

Retorne estritamente o texto transcrito da fala, sem comentários.`;

    // Step 1: Transcribe audio speech (supports multi-segment for long recordings or single audio)
    if (Array.isArray(audioSegments) && audioSegments.length > 0) {
      console.log(`[Audio Transcribe] Processing ${audioSegments.length} audio segments sequentially...`);
      const segmentTexts: string[] = [];

      for (let i = 0; i < audioSegments.length; i++) {
        const seg = audioSegments[i];
        if (!seg || !seg.base64) continue;

        const segAudioPart = {
          inlineData: {
            mimeType: normalizeAudioMimeType(seg.mimeType || 'audio/mp3'),
            data: seg.base64,
          },
        };

        const segPrompt = `${transcribePrompt}\n[Nota: Este é o segmento ${i + 1} de ${audioSegments.length} da ditação médica contínua]`;

        const segResult = await callGeminiWithFallback(
          ai,
          {
            parts: [
              segAudioPart,
              { text: segPrompt },
            ],
          },
          {
            models: ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-3.5-transcribe'],
            maxRetries: 2,
            timeoutMs: 90000,
          }
        );

        if (segResult && segResult.text) {
          segmentTexts.push(segResult.text.trim());
          transcriptionModelUsed = segResult.modelUsed || 'gemini-segments';
        }
      }

      rawTranscribedText = segmentTexts.filter(Boolean).join(' ');
      console.log(`[Audio Transcribe] Segments combined total words: ${rawTranscribedText.split(/\s+/).length}`);
    } else if (audioBase64) {
      const audioPart = {
        inlineData: {
          mimeType: normalizedMime,
          data: audioBase64,
        },
      };

      const transcriptionResult = await callGeminiWithFallback(
        ai,
        {
          parts: [
            audioPart,
            { text: transcribePrompt },
          ],
        },
        {
          models: ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-3.5-transcribe'],
          maxRetries: 2,
          timeoutMs: 90000,
        }
      );

      if (transcriptionResult && transcriptionResult.text) {
        rawTranscribedText = transcriptionResult.text;
        transcriptionModelUsed = transcriptionResult.modelUsed;
        console.log(`[Audio Transcribe] Speech recognized: "${rawTranscribedText.slice(0, 100)}..."`);
      }
    }

    // Fallback to client-provided speech recognition transcript if audio had low audio or model was silent
    if (!rawTranscribedText && liveTranscript && liveTranscript.trim()) {
      console.log('[Audio Transcribe] Utilizing live speech fallback transcript...');
      rawTranscribedText = liveTranscript.trim();
      transcriptionModelUsed = 'live-recognition-fallback';
    }

    // Check if output is just a silence / inaudible marker
    const isSilenceMarker = /^(?:\[?(?:silence|silêncio|inaudible|ruído|sem áudio|música|som ambiente|ruído de fundo)\]?|\.+)$/i.test(rawTranscribedText.trim());
    if (isSilenceMarker) {
      if (liveTranscript && liveTranscript.trim()) {
        rawTranscribedText = liveTranscript.trim();
        transcriptionModelUsed = 'live-recognition-fallback';
      } else {
        rawTranscribedText = '';
      }
    }

    if (!rawTranscribedText || !rawTranscribedText.trim()) {
      const isQuota = lastGeminiError.includes('429') || lastGeminiError.includes('quota') || lastGeminiError.includes('RESOURCE_EXHAUSTED');
      const is503 = lastGeminiError.includes('503') || lastGeminiError.includes('UNAVAILABLE') || lastGeminiError.includes('high demand') || lastGeminiError.includes('Timeout');

      if (isQuota) {
        return res.status(429).json({
          error: 'Limite de requisições de áudio atingido temporariamente no servidor de IA. Você pode prosseguir na aba "Ditação em Texto", onde o laudo é estruturado imediatamente.',
          isQuota: true,
        });
      }

      if (is503) {
        return res.status(503).json({
          error: 'Serviço de áudio sob alta demanda temporária. Tente novamente em alguns segundos ou utilize a aba "Ditação em Texto".',
          isTemporary503: true,
        });
      }

      return res.status(422).json({
        error: 'Nenhuma fala audível foi detectada no áudio enviado. Verifique o microfone ou certifique-se de que o arquivo contém voz gravada.',
        suggestion: 'Você também pode usar a aba "Ditação em Texto" para digitar ou colar o laudo diretamente.'
      });
    }

    // Step 2: Structure transcribed text into Code Black standard
    const userMask = examId && examId !== 'auto' ? RADIOLOGY_MASKS.find(m => m.id === examId) : null;
    const matchedMask = userMask || matchMask(undefined, undefined, rawTranscribedText);
    const targetMask = matchedMask || RADIOLOGY_MASKS[2]; // fallback reference

    const formatPrompt = `Você é um radiologista sênior e digitador médico no padrão rigoroso "Code Black".
Estruture a seguinte transcrição médica de laudo no formato oficial sem omitir NENHUM detalhe e SEM CRIAR NADA.

MANDATO SUPREMO ANTI-ALUCINAÇÃO (NUNCA CRIE LAUDO):
1. É TERMINANTEMENTE PROIBIDO inventar, deduzir ou adicionar achados que o médico NÃO pronunciou no áudio.
2. Cada item em 'findings' DEVE corresponder estritamente ao que foi falado no áudio.
3. Fidelidade anatômica total: se o médico falou de mastóides, o laudo é de mastóides; se falou de crânio, é crânio; se falou de tórax, NUNCA mencione coluna ou abdome.
4. Se o médico ditou números de frases (ex: "conjunto 1, 2 e 3", "frases 1 e 4" ou números isolados), consulte o catálogo abaixo da mesma anatomia e puxe as frases correspondentes.
5. Se o médico ditou os achados por extenso (frases faladas livres, normais ou anormais como fratura, derrame, nódulo, medição em mm/cm), transcreva CADA FRASE com rigor terminológico e fidelidade palavra por palavra.

ORDENS E REGRAS MÉDICAS CORRETIVAS OBRIGATÓRIAS:
- REGRA 1 (Interrogação): Quando for dito "interroga", "ponto de interrogação" ou aparecer "{?}", coloque "?".
- REGRA 2 (Mediastino / Ventrículos / Aorta):
  * "Mediastino." -> "Mediastino centrado não se identificando lesão tumoral ou cística."
  * "Ventrículos." -> "Ventrículos e cisternas sem alterações."
  * "Aorta." / "A aorta." -> no tórax, "Aorta torácica normal."
- REGRA NÚMERO 1 E NÚMEROS POR EXTENSO OU DÍGITOS: Quando forem falados números isolados (ex: "1", "um", "hum", "3 4", "Três e quatro."), SEMPRE consulte a máscara oficial do exame e inclua CADA frase correspondente em linhas separadas (NUNCA ignore ou apague o número 1!).
- REGRA 3 (Opinião, Observação e Achados Adicionais - NUNCA COLOQUE EM 'findings' E NUNCA OMITA O QUE FOI DITADO):
  * SE O MÉDICO DITOU Opinião, Observação ou Achados Adicionais (ex: "Opinião, ...", "Opinião: ...", "Observação: ...", "Achados adicionais: ..."), coloque o título em 'opinionTitle' ("Opinião:", "Observação:", "Achado adicional:", "Achados adicionais:") e TODAS as frases em 'opinionFindings'. NUNCA coloque a palavra "Opinião" dentro de 'findings'!
  * Se na fala aparecer "o demonstra ...", corrija SEMPRE para "O exame demonstra ...".
  * O comando "ponto final" (ou ".final") deve ser IGNORADO/removido do texto final e impede que frases normais restantes da máscara ou opinião padrão sejam inventadas após ele. Mas se o médico DITOU uma opinião antes de dizer "ponto final", mantenha a opinião ditada em 'opinionFindings'.
- REGRA 4 (Técnica Oficial da Máscara): Use EXATAMENTE a 'Técnica Padrão' da máscara oficial correspondente ao exame (ex: no tórax sem contraste, "Estudo realizado com tomografo multislice de 128 detectores que geraram imagens multiplanares, sem a administração de contraste venoso."; com contraste termina em "( Omnipaque 300/100 ml ).").
- REGRA 5 (Título do Exame Estritamente sem ESTUDO e sem Contraste): O título deve ser EXCLUSIVAMENTE o nome do exame em maiúsculas (ex: "TOMOGRAFIA DE TÓRAX", "TOMOGRAFIA DE ABDOME TOTAL", "TOMOGRAFIA DE PELVE", "TOMOGRAFIA DE COLUNA LOMBAR", "TOMOGRAFIA DE CRÂNIO", "TOMOGRAFIA DE MASTÓIDES"). É ESTRITAMENTE PROIBIDO incluir "ESTUDO", "EXAME", "(SEM CONTRASTE)" ou "(COM CONTRASTE)".
- REGRA DE IDENTIFICAÇÃO DO PACIENTE: O nome do paciente NÃO deve aparecer no laudo final (mas retorne-o no campo JSON 'patientName' para que o sexo seja identificado corretamente).
- REGRA 6 (Número 8 no Abdome): Na tomografia de abdome, ao ditar o número 8: se paciente mulher -> "Bexiga, útero e anexos normais."; se paciente homem -> "Bexiga e próstata sem alterações.".
- REGRA 7 (O Conjunto): Qualquer fala isolada de "o conjunto" ou "o conjunto de imagens demonstra" NÃO deve entrar em 'findings'.
- REGRA 9 & 10 (Parênteses): "{abre parênteses}" / "abre parênteses" / "abrir parênteses" -> "(" e "{fecha parênteses}" / "fecha parênteses" / "fechar parênteses" -> ")".
- REGRA 11 (Vértebras de Transição): Use hífen em vez de espaço (ex: "C6-C7", "L5-S1", "T12-L1", "D12-L1").
- REGRA 12 (Segmentos Hepáticos/Anatômicos): Use algarismos romanos para segmentos (ex: "segmento IV B", "segmento VII", "segmentos II e III").
- CAPITALIZAÇÃO: Após todo ponto final de frase, a próxima letra deve ser maiúscula.
- CORREÇÕES DE VOCABULÁRIO E LIMPEZA: "nucapsular" -> "nucleocapsular", "podenso" -> "hipodenso". Elimine TODAS as hesitações ("hã", "ãh", "hãn", "ãhn", "eh", "ah", "hum", "da da" -> "da") e autocorreções conversacionais ("Não, antes do material..." -> "Material...").

${buildMasksCatalogPrompt()}

Retorne EXCLUSIVAMENTE no formato JSON com as propriedades:
- matchedMaskId: string (o ID oficial exato da lista se aplicável, ex: "tórax-sem", "tórax-com", "mastóides-sem", "crânio-sem", etc.)
- patientName: string
- examTitle: string (LIMPO, sem indicação de contraste)
- technique: string
- findings: string[] (cada frase sem o traço inicial)
- numbersDetected: number[]
- opinionTitle: string (ex: "Opinião:", "Observação:" ou "Achados adicionais:")
- opinionFindings: string[]

TEXTO DITADO PELO MÉDICO:
"""
${rawTranscribedText}
"""
`;

    // Fast formatting using gemini-3.1-flash-lite / gemini-3.8-flash
    const formatResult = await callGeminiWithFallback(
      ai,
      formatPrompt,
      {
        models: ['gemini-3.1-flash-lite', 'gemini-3.8-flash'],
        maxRetries: 1,
        timeoutMs: 20000,
      }
    );

    if (formatResult) {
      const parsed = parseGeminiReportText(formatResult.text, rawTranscribedText, targetMask);
      const resolvedMask = 
        userMask ||
        (parsed.matchedMaskId ? RADIOLOGY_MASKS.find(m => m.id === parsed.matchedMaskId) : null) ||
        targetMask;

      const effectivePatientName = parsed.patientName || patientName || '';
      const patientGender = detectPatientGender(effectivePatientName, rawTranscribedText);

      let findings = parsed.findings && parsed.findings.length > 0 ? parsed.findings : [];
      const speech = parseSpeechDictation(rawTranscribedText, resolvedMask);
      if (findings.length === 0) {
        if (speech.findings.length > 0) {
          findings = speech.findings;
        } else {
          const expanded = expandNumbersFromMask(stripMaskPhrasesAfterPontoFinal(rawTranscribedText, resolvedMask), resolvedMask, patientGender);
          findings = expanded.expandedFindings.length > 0 ? expanded.expandedFindings : [normalizeSpokenPunctuation(rawTranscribedText)];
        }
      }

      let opinionFindings = parsed.opinionFindings;
      if ((!opinionFindings || opinionFindings.length === 0) && (speech.opinionFindings?.length || speech.opinionText)) {
        opinionFindings = speech.opinionFindings && speech.opinionFindings.length > 0
          ? speech.opinionFindings
          : [speech.opinionText!];
      }

      let opinionTitle = parsed.opinionTitle || speech.opinionTitle || 'Opinião:';
      if (!opinionTitle.endsWith(':')) opinionTitle += ':';

      const structured = formatCodeBlackReport({
        patientName: effectivePatientName,
        examTitle: cleanExamTitle(parsed.examTitle || resolvedMask.title),
        technique: resolvedMask.technique || parsed.technique,
        findings,
        opinionTitle,
        opinionFindings,
        mask: resolvedMask,
        patientGender,
        rawText: rawTranscribedText,
      });

      return res.json({
        ...structured,
        transcribedText: rawTranscribedText,
        numbersDetected: parsed.numbersDetected,
        aiGenerated: true,
        modelUsed: `${transcriptionModelUsed} + ${formatResult.modelUsed}`,
      });
    }

    // Local deterministic fallback (0ms, 100% reliable)
    // Never inject phantom mask phrases!
    const preliminarySpeech = parseSpeechDictation(rawTranscribedText);
    const resolvedMask = userMask || matchMask(preliminarySpeech.examTitle, undefined, rawTranscribedText) || targetMask;
    const speech = parseSpeechDictation(rawTranscribedText, resolvedMask);
    const effectivePatientName = speech.patientName || patientName || '';
    const patientGender = detectPatientGender(effectivePatientName, rawTranscribedText);
    
    let fallbackFindings = speech.findings.length > 0 ? speech.findings : [];
    if (fallbackFindings.length === 0) {
      const expanded = expandNumbersFromMask(stripMaskPhrasesAfterPontoFinal(rawTranscribedText, resolvedMask), resolvedMask, patientGender);
      fallbackFindings = expanded.expandedFindings.length > 0 ? expanded.expandedFindings : [normalizeSpokenPunctuation(rawTranscribedText)];
    }

    const fallbackOpinion = speech.opinionFindings && speech.opinionFindings.length > 0
      ? speech.opinionFindings
      : (speech.opinionText
          ? [speech.opinionText]
          : (speech.hasExplicitPontoFinal ? [] : [resolvedMask.defaultOpinion]));

    let fallbackOpTitle = speech.opinionTitle || 'Opinião:';
    if (!fallbackOpTitle.endsWith(':')) fallbackOpTitle += ':';

    const fallbackReport = formatCodeBlackReport({
      patientName: effectivePatientName,
      examTitle: cleanExamTitle(speech.examTitle || resolvedMask.title),
      technique: resolvedMask.technique,
      findings: fallbackFindings,
      opinionTitle: fallbackOpTitle,
      opinionFindings: fallbackOpinion,
      mask: resolvedMask,
      patientGender,
      rawText: rawTranscribedText,
    });

    return res.json({
      ...fallbackReport,
      transcribedText: rawTranscribedText,
      numbersDetected: [],
      aiGenerated: true,
      modelUsed: `${transcriptionModelUsed} + local-code-black-engine`,
    });

  } catch (error: any) {
    console.error('Error in transcribe-audio:', error);
    const is503 = error?.message?.includes('503') || error?.message?.includes('high demand') || error?.message?.includes('Timeout');
    res.status(is503 ? 503 : 500).json({
      error: is503 
        ? 'Serviço Gemini temporariamente sobrecarregado (503). Tente novamente em instantes.'
        : (error?.message || 'Falha ao processar áudio no Gemini'),
      isTemporary503: is503,
    });
  }
});

// Guard: Ensure any unrecognized /api/* route ALWAYS returns JSON, never HTML
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ error: `Endpoint de API não encontrado: ${req.method} ${req.originalUrl}` });
});

// Global API error handler ensuring JSON response
app.use('/api', (err: any, req: Request, res: Response, next: any) => {
  console.error('[API Error Caught]', err);
  res.status(500).json({ error: err?.message || 'Erro interno no servidor de radiologia' });
});

let viteMiddleware: any = null;
let viteInitPromise: Promise<void> | null = null;

if (process.env.NODE_ENV !== 'production') {
  app.use(async (req: Request, res: Response, next: any) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    if (viteMiddleware) {
      return viteMiddleware(req, res, next);
    }
    if (viteInitPromise) {
      await viteInitPromise;
      if (viteMiddleware) {
        return viteMiddleware(req, res, next);
      }
    }
    next();
  });
}

// Start server: listen on PORT 3000 immediately so health checks succeed instantly
async function startServer() {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Code Black Medical Server] Listening on http://0.0.0.0:${PORT}`);
  });

  if (process.env.NODE_ENV !== 'production') {
    viteInitPromise = (async () => {
      try {
        const { createServer: createViteServer } = await import('vite');
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: 'spa',
        });
        viteMiddleware = vite.middlewares;
        console.log('[Code Black Medical Server] Vite middleware initialized successfully');
      } catch (err) {
        console.error('[Code Black Medical Server] Failed to initialize Vite:', err);
      }
    })();
    await viteInitPromise;
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }
}

if (!process.env.VERCEL) {
  startServer();
}

export { app };
export default app;
