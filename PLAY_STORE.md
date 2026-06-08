# Publicação na Google Play — AuthentiScan Pro

Guia de submissão do app à Google Play Store. Todos os assets já estão prontos no repo.

## ⚠️ Antes de tudo — 2 pontos que pegam todo mundo

1. **Conta de desenvolvedor ($25, uma vez só)** em [play.google.com/console](https://play.google.com/console). Exige verificação de identidade (horas a dias).
2. **Regra dos 12 testers (contas pessoais):** contas pessoais criadas recentemente precisam rodar um **teste fechado com 12+ testers por 14 dias** antes de liberar produção. Contas de **organização** não precisam. Por isso recomenda-se começar pelo **teste interno/fechado**.

---

## Passo 1 — Criar o app
Console → **Create app**:
- Nome: **AuthentiScan Pro**
- Idioma padrão: English (US) ou pt-BR
- Tipo: **App** · **Free**
- Aceitar as declarações (Developer Program Policies, US export laws)

## Passo 2 — Ficha da loja (Main store listing)
**Grow → Store presence → Main store listing**:

- **App name:** `AuthentiScan Pro`
- **Short description** (máx 80):
  > Detect misinformation & AI voice fraud in text, links and audio — instantly.
- **Full description:**
  > AuthentiScan Pro helps you spot misinformation, phishing and AI-generated voice fraud in seconds.
  >
  > Paste any text, link, or record audio — our AI analyzes it and returns a clear risk score with a full breakdown of why it's safe or suspicious.
  >
  > • Text scanning — check news, messages and social posts
  > • URL analysis — detect phishing and fake login pages
  > • AI voice detection — flag synthetic / cloned voices
  > • Risk scoring — instant 0–100 score with reasoning
  > • Scan history — every check saved
  > • Go Pro for unlimited scans
  >
  > Stay one step ahead of scams and fake content.
- **App icon:** `store-assets/play-icon-512.png`
- **Feature graphic:** `store-assets/feature-graphic-1024x500.png`
- **Phone screenshots:** as 7 de `store-assets/marketing/` (mín. 2, máx. 8)

## Passo 3 — Upload do app (release)
Recomendado começar pelo teste interno: **Test and release → Testing → Internal testing → Create new release**.
- **Play App Signing:** aceitar (recomendado) — o keystore local vira a *upload key*.
- Upload do AAB assinado:
  ```
  android/app/build/outputs/bundle/release/app-release.aab
  ```
- **Release name:** `1.0 (1)` · **Release notes:** "Primeira versão."
- Adicionar testers (lista de emails) → salvar e rolar o release.
- Depois de validado, promover o mesmo release para **Production** (ou rodar o teste fechado de 14 dias, se a regra dos 12 testers se aplicar).

## Passo 4 — Declarações obrigatórias (Policy → App content)
Todas precisam ficar verdes:

- **Privacy policy:** `https://www.authentiscanapp.com/privacypolicy`
- **App access:** o app **exige login** → fornecer a **conta de teste** pro revisor (ver `store-assets/REVIEWER_ACCOUNT.txt`). ⚠️ Sem isso, reprova.
- **Ads:** declarar se tem anúncios (provavelmente Não).
- **Data safety:** declarar coleta/compartilhamento:
  - Email, Nome, Foto (login Google)
  - Áudio/Microfone (scan de voz — enviado ao servidor pra análise)
  - Histórico de scans (conteúdo do app)
  - Criptografado em trânsito (HTTPS ✓); usuário pode pedir exclusão
- **Content rating:** questionário (utilitário, sem conteúdo sensível → classificação livre)
- **Target audience:** faixa etária; **não** direcionado a crianças
- **Government / Financial / Health:** responder conforme (provável "não")

## Passo 5 — Enviar pra revisão
Com o release criado e o **App content 100% verde** → **Send for review**.
Revisão: de algumas horas até ~7 dias (a primeira costuma demorar mais).

---

## Assets prontos (no repo)
| Item | Caminho |
|---|---|
| AAB assinado | `android/app/build/outputs/bundle/release/app-release.aab` |
| Ícone 512×512 | `store-assets/play-icon-512.png` |
| Feature graphic 1024×500 | `store-assets/feature-graphic-1024x500.png` |
| Screenshots (7) | `store-assets/marketing/` |
| Conta de teste (revisor) | `store-assets/REVIEWER_ACCOUNT.txt` (gitignored) |
| Política de privacidade | https://www.authentiscanapp.com/privacypolicy |

## Como regerar o build (após mudanças no código web)
```bash
npm run build
npx cap sync android
cd android && ./gradlew bundleRelease   # gera o .aab assinado
# ou assembleDebug para um APK de teste
```

## Lembretes críticos
- 🔑 **Backup do keystore** `android/app/authentiscan-release.jks` + senha (em `android/keystore.properties`). Perder = nunca mais atualizar o app na Play.
- 📈 Incrementar `versionCode` em `android/app/build.gradle` a cada novo upload.
