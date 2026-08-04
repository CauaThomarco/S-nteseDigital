# CLAUDE.md — Síntese Digital

Site institucional da startup **Síntese Digital** (do Cauã). A documentação
técnica completa — estrutura, arquitetura, deploy, tema, responsividade —
está no `README.md`. **Leia o README antes de mexer em qualquer coisa.**

Este arquivo é a "memória de bordo" para conversas futuras (e entre máquinas):
convenções, decisões não-óbvias e pendências que não moram no código.

## Ao colaborar neste repo

- **Responder em PT-BR.** O usuário, o site e todos os comentários no código
  estão em português.
- **Não introduzir build/frameworks.** Site estático de propósito (HTML + CSS
  + JS puro, zero dependências). Não sugerir React, TypeScript, bundlers,
  Tailwind, etc.
- **A conversão gira em torno do WhatsApp.** Todo CTA leva para
  `wa.me/5531999082523` com uma mensagem já escrita. Ao mexer em UI ou copy,
  preservar essa hierarquia — o WhatsApp é o canal principal.
- **`script.js` é modular** (`{ nome, iniciar(ctx) }`, isolado em try/catch).
  Para adicionar comportamento novo: escrever o módulo e incluir na constante
  `MODULOS` no fim do arquivo. Nada de acessar `window`/`document` direto para
  rolagem ou visibilidade — usar `ctx.rolagem` e `ctx.visibilidade`.
- **Respostas curtas.** Sem preâmbulos, sem resumos redundantes de código.

## Canais oficiais

**Da empresa (Síntese Digital):**
- WhatsApp: (31) 99908-2523 → `5531999082523` (canal principal)
- Instagram: `@sintesedigitaldev` — https://www.instagram.com/sintesedigitaldev
- E-mail: `cauathomarco@gmail.com`

**Pessoais do Cauã** (também aparecem no site):
- LinkedIn: `linkedin.com/in/thomarco`
- GitHub: `github.com/CauaThomarco`

Ordem visual adotada em contato/footer: canais **da empresa** primeiro,
**pessoais** depois. Para trocar o número do WhatsApp, buscar `5531999082523`
no `index.html` e a constante `WHATSAPP` em `script.js`.

## Assets — pasta `img/`

- `logo-horizontal-escura.png` (2200×760, fundo navy embutido) — tema escuro
- `logo-horizontal-clara.png` (2200×760, fundo lavanda embutido) — tema claro

**Alternância entre variantes:** via CSS `[data-theme="light"]` alternando
`display: none/block` entre `.brand-logo-dark` e `.brand-logo-light`. **Não
usar** `<picture>` + `prefers-color-scheme` — o botão da nav sobrepõe
manualmente a preferência do sistema, e o `data-theme` do `<html>` é o único
que reflete a escolha efetiva.

**CSP em `_headers`** só permite `img-src 'self' data:` — imagens têm que vir
do próprio domínio (nada de CDN externa sem atualizar a CSP).

## Padrões da nav / burger (armadilhas conhecidas)

Bugs de layout mobile que já foram corrigidos — não introduzir de novo:

- **`.burger` precisa de `justify-content: center`.** Ele herda `.icon-btn`
  (`display: grid; place-items: center`) mas sobrescreve para `flex-direction:
  column`. No flex, `justify-items` é ignorado e sobra o `justify-content`
  default `flex-start` — as 3 listrinhas grudam no topo do botão.
- **`.nav-actions` precisa de `margin-left: auto` no `@media (max-width:
  860px)`.** Quando `.nav-links` vira `position: absolute` (menu mobile), ele
  sai do fluxo flex, e sem margin-auto o tema+burger colam no brand deixando
  o canto direito vazio.

## Botões flutuantes (bottom)

- `.wa-float` — canto **direito**, aparece após 70% do hero (via
  `moduloBarra`), pill com texto no desktop, redondo no mobile.
- `.to-top` — canto **esquerdo**, aparece quando o rodapé começa a entrar no
  viewport (`IntersectionObserver` com `rootMargin: "0px 0px 20% 0px"` em
  `moduloTopo`). Não colocar no lado direito — competiria com o CTA principal
  (WhatsApp).

## Deploy

Cloudflare Pages conectado ao GitHub. Cada `git push` na `main` publica sozinho
em `sintese-digital.pages.dev`. Sem CI, sem build step. `_headers` (segurança
+ cache) e `404.html` são servidos automaticamente.

## Pendências

Marcadas com `<!-- TODO -->` no `index.html` ou listadas no README (seção
"Antes de publicar"):

1. **Domínio próprio** — `sintesedigital.com.br` e `sintese-digital.com.br` já
   foram registrados por terceiros. Precisa escolher outro nome ou tentar
   contato com os titulares.
2. **URLs `sintese-digital.pages.dev`** — trocar em `index.html` (canonical,
   og:url, og:image, twitter:image, JSON-LD `url`/`image`/`logo`), `robots.txt`
   e `sitemap.xml` quando o domínio final existir. O README traz o `sed`
   pronto.
3. **Jardim Magnólia** (`index.html`) — link vai para GitHub; trocar por URL
   da loja quando estiver no ar.
4. **SLEM** (`index.html`) — se surgir repositório público, trocar o CTA
   (hoje vai para WhatsApp).
5. **C3T Agência de Viagens** — removido do portfólio por estar em produção;
   devolver quando estiver pronto.
6. **Depoimentos** — a seção não existe porque não há frases reais. 2-3
   depoimentos (com nome + negócio) seriam o maior ganho de confiança.
7. **`.idea/`** ainda rastreado por commits antigos apesar de estar no
   `.gitignore` — `git rm -r --cached .idea` limpa quando quiser.

## Trabalho em múltiplas máquinas

O Cauã trabalha em mais de um PC. Toda alteração precisa ser commitada e
pushada para `main` para chegar na outra máquina — não há sincronização
paralela. Este arquivo (`CLAUDE.md`) e o `README.md` são a única memória
que atravessa PCs; anotações locais do Claude Code (`~/.claude/projects/...`)
ficam presas na máquina onde foram escritas.