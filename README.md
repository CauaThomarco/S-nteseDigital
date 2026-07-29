# Síntese Digital

Site institucional da **Síntese Digital** — desenvolvimento de software sob medida
(e-commerce, sistemas para hotelaria/pousadas, websites e sistemas customizados).

Site estático: HTML5 + CSS3 + JavaScript puro, sem build e sem dependências.

## Arquivos

| Arquivo      | Conteúdo                                                        |
|--------------|-----------------------------------------------------------------|
| `index.html`  | Estrutura, conteúdo e meta tags (SEO / Open Graph / JSON-LD)    |
| `styles.css`  | Tema (tokens em `:root`), layout, animações e responsividade    |
| `script.js`   | Tema claro/escuro, menu mobile, reveal on scroll, formulário    |
| `404.html`    | Página de erro, com CTA de volta e de WhatsApp                  |
| `_headers`    | Cabeçalhos do Cloudflare Pages (segurança + cache)              |
| `robots.txt`  | Libera indexação e aponta o sitemap                             |
| `sitemap.xml` | Sitemap de uma URL                                              |

Seções: hero, faixa de compromissos, sobre, portfólio (6 projetos), serviços, stack,
processo, valores, FAQ, contato e footer.

## Portfólio

| Projeto | O que é | Link do card |
|---|---|---|
| Chalés Ponta da Represa | Site de hospedagem (Guapé/MG) | `pontadarepresa.com.br` — selo "No ar" |
| Jardim Magnólia | E-commerce de floricultura | repo `jardim-magnolia` |
| StayHub | Gestão hoteleira (Spring Boot) | WhatsApp "Quero algo assim" |
| Hotel Descanso Garantido | Gerenciamento de hotel (C++) | repo `Hotel-Descanso-Garantido` |
| SLEM | Logística de entrega de mercadorias (C++) | WhatsApp "Quero algo assim" |
| FireShield | Site de denúncia de queimadas | repo `FireShield` |

## Rodar localmente

Basta abrir `index.html` no navegador. Para servir por HTTP:

```bash
python -m http.server 8000
# http://localhost:8000
```

## Conversão: tudo aponta para o WhatsApp

O número **(31) 99908-2523** (`5531999082523`) é o canal principal. Levam direto para ele,
cada um com uma mensagem já escrita:

- CTA "Vamos Conversar" do menu e do hero
- Botão flutuante que aparece depois do hero (`#wa-float`)
- "Quero algo assim" em cada projeto (mencionando o projeto na mensagem)
- "Solicitar orçamento" das três faixas de valores (mencionando a faixa)
- Cartão de destaque e envio do formulário na seção Contato

Para trocar o número, buscar `5531999082523` no `index.html` e a constante `WHATSAPP`
no `script.js`. O `(31) 99908-2523` também aparece como texto no hero, no cartão de
contato e no footer.

## Tema claro / escuro

O site **segue a configuração da máquina do cliente** (`prefers-color-scheme`): quem usa
Windows/macOS/Android no modo claro vê o site claro; no modo escuro, vê escuro. Se o
cliente mudar o tema do sistema com o site aberto, a página acompanha na hora.

O botão na barra de navegação sobrepõe essa detecção e a escolha fica salva em
`localStorage` (chave `sintese-theme`) — daí em diante vale a preferência manual.
Um script inline no `<head>` aplica o tema antes da primeira pintura, então não há
flash de tema errado.

## Antes de publicar — pontos abertos

Marcados com `<!-- TODO: ... -->` no `index.html`:

1. **SLEM** — se existir repositório público, trocar o CTA (hoje vai para o WhatsApp).
2. **Jardim Magnólia** — o link aponta para `github.com/CauaThomarco/jardim-magnolia`;
   se a loja estiver no ar, trocar pela URL do site publicado.
3. **Domínio** — atualizar `<link rel="canonical">` e `og:url` quando existir.
4. **C3T Agência de Viagens** — removido do portfólio por ainda estar em produção;
   adicionar de volta quando o site estiver pronto.
5. **Depoimentos** — o site não tem depoimentos porque não invento nenhum. Assim que
   tiver 2 ou 3 frases reais de clientes (com nome e negócio), vale criar a seção:
   é o elemento de confiança que mais falta.

## Personalização

- **Cores:** blocos `:root` (escuro) e `[data-theme="light"]` (claro) no topo do `styles.css`.
- **Formulário:** o botão principal abre o WhatsApp com os dados preenchidos; o link
  secundário monta um `mailto:` para `cauathomarco@gmail.com` (constante `DESTINO` no
  `script.js`). Para receber direto na caixa de entrada, trocar por um endpoint
  (Formspree, EmailJS ou API própria).

## Deploy — Cloudflare Pages (conectado ao GitHub)

Cada `git push` na `main` publica sozinho. Configuração no painel, uma única vez:

1. <https://dash.cloudflare.com> → **Workers & Pages** → **Create** → aba **Pages**
   → **Connect to Git** (autorizar o GitHub, escolher `CauaThomarco/PixelLab`).
2. Preencher:
   - **Project name:** `sintese-digital` (define o domínio `sintese-digital.pages.dev`)
   - **Production branch:** `main`
   - **Framework preset:** `None`
   - **Build command:** deixar **vazio** (site estático, não tem build)
   - **Build output directory:** `/`
3. **Save and Deploy**. Em ~1 minuto o site está em `sintese-digital.pages.dev`.

O `_headers` é aplicado automaticamente pelo Pages, e o `404.html` passa a ser servido
em qualquer rota inexistente. Cada branch/PR ganha uma URL de preview própria.

## Domínio .com.br

`sintesedigital.com.br` e `sintese-digital.com.br` **já estão registrados por terceiros**
(consulta feita no RDAP do registro.br). Passos depois de escolher um nome livre:

1. Comprar em <https://registro.br> (precisa de CPF/CNPJ; ~R$ 40/ano).
2. Na Cloudflare: **Add a domain** → informar o domínio → o painel mostra dois
   nameservers (algo como `xxx.ns.cloudflare.com`).
3. No registro.br: painel do domínio → **DNS** → **Usar outros servidores DNS**
   → colar os dois nameservers da Cloudflare. A propagação leva de minutos a algumas horas.
4. No projeto do Pages: **Custom domains** → **Set up a custom domain** → digitar o
   domínio (e repetir para `www`). O certificado SSL é emitido automaticamente.
5. Trocar o domínio provisório nos 3 arquivos:

   ```bash
   # ajuste o domínio e rode na raiz do projeto
   sed -i 's|sintese-digital.pages.dev|SEU-DOMINIO.com.br|g' index.html robots.txt sitemap.xml
   ```

   Isso atualiza `canonical`, `og:url`, `robots.txt` e `sitemap.xml` de uma vez.
6. Enviar o sitemap no <https://search.google.com/search-console> para indexar.

> `.idea/` (config do IntelliJ) está no `.gitignore`, mas ainda é rastreado por commits
> anteriores. Para parar de versionar: `git rm -r --cached .idea`.

---

Desenvolvido por [Cauã Thomarco](https://github.com/CauaThomarco).
