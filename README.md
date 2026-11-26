# Laudo.wav

Transcrição e padronização de laudos radiológicos (padrão "Code Black") a partir de áudio, com 19 máscaras oficiais.
Frontend React + Vite + Tailwind; backend Express (`server.ts`) com Gemini, servido na Vercel pela função `api/[...path].ts`.

## Rodar localmente
1. Node 20+
2. `cp .env.example .env` e preencha `GEMINI_API_KEY`
3. `npm install` e `npm run dev` → http://localhost:3000

## GitHub → Vercel
1. Crie o repositório e suba tudo (`.env` já está no `.gitignore`).
2. Na Vercel: **Add New → Project** e importe o repositório (preset Vite é detectado).
3. Em **Settings → Environment Variables** adicione `GEMINI_API_KEY` e faça **Redeploy**.
4. Teste `/api/health`: deve retornar `hasApiKey: true`.

## Limite importante da Vercel
Funções aceitam corpo de requisição de até ~4,5 MB. Hoje o app envia o áudio em base64 numa única chamada,
então áudios longos (aprox. acima de 5–6 min) podem falhar com erro 413 em produção. Ver "Próximos passos".

## Estrutura
- `src/` interface, máscaras (`data/`) e motor Code Black (`utils/`)
- `server.ts` rotas `/api/*` (health, masks, format-dictation, transcribe-audio, backup)
- `backup/` regras de correção personalizadas exportadas (importe na aba Correções)
