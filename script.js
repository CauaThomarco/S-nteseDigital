/* =========================================================
   Síntese Digital — interações

   Organização: um núcleo pequeno que só orquestra, e módulos
   independentes com uma responsabilidade cada.

   - Cada módulo é { nome, iniciar(ctx) } e não conhece os outros.
   - Para adicionar um comportamento novo, basta escrever o módulo e
     incluí-lo na lista MODULOS lá embaixo — o núcleo não muda.
   - Nenhum módulo fala com window/document direto: tudo o que precisam
     (rolagem, visibilidade, aparelho) chega pelo contexto, o que mantém
     um único listener de scroll na página inteira.
   ========================================================= */
(function () {
  "use strict";

  /* =======================================================
     INFRAESTRUTURA
     ======================================================= */

  /* ---------- Preferências do aparelho ---------- */
  const criarAparelho = () => {
    const semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)");
    return {
      /* lido na hora do uso: o visitante pode mudar a preferência com a
         página aberta */
      get reduzMovimento() { return semMovimento.matches; },
      temIntersectionObserver: "IntersectionObserver" in window,
    };
  };

  /* ---------- Rolagem ----------
     Um único listener para a página toda. Cada assinante recebe a posição
     já calculada, dentro de um requestAnimationFrame — sem isso, cada
     módulo com seu próprio listener multiplicaria o trabalho por frame. */
  const criarRolagem = () => {
    const assinantes = [];
    let agendado = false;
    let alturaTela = window.innerHeight;

    const notificar = () => {
      agendado = false;
      const estado = { y: window.scrollY, alturaTela };
      for (const assinante of assinantes) assinante(estado);
    };

    const agendar = () => {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(notificar);
    };

    window.addEventListener("scroll", agendar, { passive: true });
    window.addEventListener("resize", () => {
      alturaTela = window.innerHeight;
      agendar();
    }, { passive: true });

    return {
      /* devolve uma função para cancelar, caso algum dia seja preciso */
      assinar(fn) {
        assinantes.push(fn);
        fn({ y: window.scrollY, alturaTela });
        return () => {
          const i = assinantes.indexOf(fn);
          if (i > -1) assinantes.splice(i, 1);
        };
      },
    };
  };

  /* ---------- Visibilidade ----------
     Abstrai o IntersectionObserver. Quem usa não precisa saber se ele
     existe no navegador: sem suporte, o retorno de emergência é chamar o
     callback na hora, deixando o conteúdo visível. */
  const criarVisibilidade = (aparelho) => ({
    aoAparecer(elementos, callback, opcoes) {
      const lista = Array.from(elementos);
      if (!lista.length) return;

      if (!aparelho.temIntersectionObserver) {
        lista.forEach(callback);
        return;
      }

      const observador = new IntersectionObserver((entradas) => {
        for (const entrada of entradas) {
          if (!entrada.isIntersecting) continue;
          callback(entrada.target);
          /* uma vez só: parar de observar evita trabalho a cada rolagem */
          observador.unobserve(entrada.target);
        }
      }, opcoes);

      lista.forEach((el) => observador.observe(el));
    },

    /* variante que continua observando (usada pela navegação ativa) */
    aoEntrarESair(elementos, callback, opcoes) {
      const lista = Array.from(elementos);
      if (!lista.length || !aparelho.temIntersectionObserver) return;

      const observador = new IntersectionObserver((entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) callback(entrada.target);
        }
      }, opcoes);

      lista.forEach((el) => observador.observe(el));
    },
  });

  /* =======================================================
     MÓDULOS — uma responsabilidade cada
     ======================================================= */

  /* ---------- Tema claro / escuro ----------
     Padrão: segue a preferência do sistema do visitante. Se ele usar o
     botão, a escolha manual passa a valer e fica salva.
     O tema inicial já foi aplicado pelo script inline no <head>. */
  const moduloTema = {
    nome: "tema",
    iniciar() {
      const CHAVE = "sintese-theme";
      const raiz = document.documentElement;
      const botao = document.getElementById("theme-toggle");
      const sistemaClaro = window.matchMedia("(prefers-color-scheme: light)");

      const lerSalvo = () => {
        try {
          const v = localStorage.getItem(CHAVE);
          return v === "light" || v === "dark" ? v : null;
        } catch (e) { return null; }
      };

      const aplicar = (tema) => {
        raiz.setAttribute("data-theme", tema);

        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute("content", tema === "light" ? "#f5f6fb" : "#05060f");

        if (botao) {
          const rotulo = tema === "light" ? "Ativar tema escuro" : "Ativar tema claro";
          botao.setAttribute("aria-label", rotulo);
          botao.setAttribute("title", rotulo);
        }
      };

      /* A transição de cores repinta a página inteira, então ela só é ligada
         durante a troca manual — deixá-la sempre ativa fazia toda rolagem
         com mudança de cor custar mais caro. */
      let limpar;
      const aplicarComTransicao = (tema) => {
        document.body.classList.add("theme-anim");
        aplicar(tema);
        clearTimeout(limpar);
        limpar = setTimeout(() => document.body.classList.remove("theme-anim"), 450);
      };

      aplicar(lerSalvo() || (sistemaClaro.matches ? "light" : "dark"));

      botao?.addEventListener("click", () => {
        const proximo = raiz.getAttribute("data-theme") === "light" ? "dark" : "light";
        aplicarComTransicao(proximo);
        try { localStorage.setItem(CHAVE, proximo); } catch (e) { /* modo privado */ }
      });

      /* Visitante trocou o tema do sistema: acompanha, desde que não haja
         escolha manual salva. */
      const aoMudarSistema = (e) => {
        if (!lerSalvo()) aplicarComTransicao(e.matches ? "light" : "dark");
      };
      if (sistemaClaro.addEventListener) sistemaClaro.addEventListener("change", aoMudarSistema);
      else if (sistemaClaro.addListener) sistemaClaro.addListener(aoMudarSistema); // Safari antigo
    },
  };

  /* ---------- Menu mobile ---------- */
  const moduloMenu = {
    nome: "menu",
    iniciar() {
      const botao = document.getElementById("burger");
      const links = document.getElementById("nav-links");
      if (!botao || !links) return;

      const definir = (aberto) => {
        links.classList.toggle("open", aberto);
        botao.setAttribute("aria-expanded", String(aberto));
        botao.setAttribute("aria-label", aberto ? "Fechar menu" : "Abrir menu");
      };

      const fechar = () => definir(false);

      botao.addEventListener("click", () => {
        definir(!links.classList.contains("open"));
      });

      /* fecha ao escolher um destino */
      links.addEventListener("click", (e) => {
        if (e.target.closest("a")) fechar();
      });

      /* fecha ao tocar fora */
      document.addEventListener("click", (e) => {
        if (!links.classList.contains("open")) return;
        if (!e.target.closest(".nav")) fechar();
      });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") fechar();
      });

      /* girar o aparelho para paisagem pode passar da largura do menu
         mobile: sem isso o menu fica aberto e desalinhado */
      const larguraMobile = window.matchMedia("(max-width: 860px)");
      const aoSair = (e) => { if (!e.matches) fechar(); };
      if (larguraMobile.addEventListener) larguraMobile.addEventListener("change", aoSair);
      else if (larguraMobile.addListener) larguraMobile.addListener(aoSair);
    },
  };

  /* ---------- Sombra da nav + botão flutuante de WhatsApp ---------- */
  const moduloBarra = {
    nome: "barra",
    iniciar({ rolagem }) {
      const nav = document.getElementById("nav");
      const flutuante = document.getElementById("wa-float");

      /* guarda o último estado para não mexer no DOM quando nada mudou:
         classList.toggle a cada frame invalida estilo à toa */
      let rolou = null;
      let mostrando = null;

      rolagem.assinar(({ y, alturaTela }) => {
        const rolouAgora = y > 24;
        if (rolouAgora !== rolou) {
          rolou = rolouAgora;
          nav?.classList.toggle("scrolled", rolouAgora);
        }

        /* o flutuante só aparece depois do hero, onde o CTA principal
           já saiu da tela */
        const mostrarAgora = y > alturaTela * 0.7;
        if (mostrarAgora !== mostrando) {
          mostrando = mostrarAgora;
          flutuante?.classList.toggle("show", mostrarAgora);
        }
      });
    },
  };

  /* ---------- Reveal on scroll ---------- */
  const moduloReveal = {
    nome: "reveal",
    iniciar({ aparelho, visibilidade }) {
      const elementos = document.querySelectorAll(".reveal");

      if (aparelho.reduzMovimento) {
        elementos.forEach((el) => el.classList.add("visible"));
        return;
      }

      visibilidade.aoAparecer(
        elementos,
        (el) => el.classList.add("visible"),
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
      );
    },
  };

  /* ---------- Link ativo na navegação ---------- */
  const moduloNavegacaoAtiva = {
    nome: "navegacao-ativa",
    iniciar({ visibilidade }) {
      const secoes = document.querySelectorAll("main section[id]");
      const linkPorId = new Map();

      document.querySelectorAll('.nav-links a[href^="#"]').forEach((a) => {
        linkPorId.set(a.getAttribute("href").slice(1), a);
      });
      if (!linkPorId.size) return;

      visibilidade.aoEntrarESair(secoes, (secao) => {
        linkPorId.forEach((a) => a.classList.remove("active"));
        linkPorId.get(secao.id)?.classList.add("active");
      }, { rootMargin: "-45% 0px -50% 0px" });
    },
  };

  /* ---------- Contadores ---------- */
  const moduloContadores = {
    nome: "contadores",
    iniciar({ aparelho, visibilidade }) {
      const contadores = document.querySelectorAll(".counter");

      const contar = (el) => {
        const alvo = Number(el.dataset.to || 0);

        if (aparelho.reduzMovimento) {
          el.textContent = String(alvo);
          return;
        }

        const duracao = 1100;
        const inicio = performance.now();

        const passo = (agora) => {
          const p = Math.min((agora - inicio) / duracao, 1);
          el.textContent = String(Math.round(alvo * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(passo);
        };

        requestAnimationFrame(passo);
      };

      visibilidade.aoAparecer(contadores, contar, { threshold: 0.5 });
    },
  };

  /* ---------- Formulário de contato ----------
     Sem backend: o envio principal abre o WhatsApp com a mensagem escrita.
     O link secundário monta um mailto com os mesmos dados.
     Para receber direto na caixa de entrada, trocar por um endpoint
     (Formspree, EmailJS ou API própria). */
  const moduloFormulario = {
    nome: "formulario",
    iniciar() {
      const WHATSAPP = "5531999082523";
      const DESTINO = "cauathomarco@gmail.com";

      const form = document.getElementById("contact-form");
      const aviso = document.getElementById("form-note");
      const botaoEmail = document.getElementById("send-email");
      if (!form) return;

      /* Valida e devolve os dados, ou null se algo estiver faltando */
      const coletar = () => {
        const dados = {
          nome: form.nome.value.trim(),
          email: form.email.value.trim(),
          tipo: form.tipo.value,
          msg: form.msg.value.trim(),
        };

        let ok = true;
        [
          [form.nome, dados.nome.length >= 2],
          [form.email, /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(dados.email)],
          [form.msg, dados.msg.length >= 10],
        ].forEach(([campo, valido]) => {
          campo.classList.toggle("invalid", !valido);
          if (!valido) ok = false;
        });

        if (!ok) {
          aviso.textContent = "Preencha nome, um e-mail válido e uma descrição do projeto.";
          aviso.classList.remove("ok");
          return null;
        }
        return dados;
      };

      const resumo = (d) =>
        `Nome: ${d.nome}\n` +
        `E-mail: ${d.email}\n` +
        `Tipo de projeto: ${d.tipo}\n\n` +
        `Sobre o projeto:\n${d.msg}`;

      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const d = coletar();
        if (!d) return;

        const texto = `Olá, Cauã! Quero um orçamento com a Síntese Digital.\n\n${resumo(d)}`;
        window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`, "_blank", "noopener");

        aviso.textContent = "Abrindo o WhatsApp com a sua mensagem...";
        aviso.classList.add("ok");
      });

      botaoEmail?.addEventListener("click", () => {
        const d = coletar();
        if (!d) return;

        const assunto = `[Síntese Digital] Orçamento — ${d.tipo} — ${d.nome}`;
        window.location.href =
          `mailto:${DESTINO}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(resumo(d) + "\n")}`;

        aviso.textContent = "Abrindo seu app de e-mail com a mensagem pronta...";
        aviso.classList.add("ok");
      });

      /* tirar o vermelho assim que o visitante começa a corrigir */
      form.addEventListener("input", (e) => {
        e.target.classList?.remove("invalid");
      });
    },
  };

  /* ---------- Voltar ao topo ----------
     Aparece quando o rodapé entra no campo de visão (com margem inferior
     de 20% da tela, para dar tempo do visitante escolher clicar antes de
     chegar no fim). Ao clicar, sobe suave — ou instantâneo, se a
     preferência do sistema for reduzir movimento. */
  const moduloTopo = {
    nome: "topo",
    iniciar({ aparelho }) {
      const botao = document.getElementById("to-top");
      const rodape = document.querySelector(".footer");
      if (!botao || !rodape) return;

      botao.addEventListener("click", () => {
        window.scrollTo({
          top: 0,
          behavior: aparelho.reduzMovimento ? "auto" : "smooth",
        });
      });

      /* sem IntersectionObserver o botão fica sempre acessível — deixá-lo
         visível é preferível a esconder e nunca mostrar */
      if (!aparelho.temIntersectionObserver) {
        botao.classList.add("show");
        return;
      }

      const observador = new IntersectionObserver((entradas) => {
        for (const entrada of entradas) {
          botao.classList.toggle("show", entrada.isIntersecting);
        }
      }, { threshold: 0, rootMargin: "0px 0px 20% 0px" });
      observador.observe(rodape);
    },
  };

  /* ---------- Carrossel de especialidades ----------
     A rolagem em si é do navegador (scroll-snap no CSS). O módulo liga botões,
     dots e um autoplay independente — pausado em hover, foco, toque, aba
     escondida e quando o carrossel sai da tela, para não ficar rodando à toa. */
  const moduloCarrossel = {
    nome: "carrossel",
    iniciar({ aparelho }) {
      const INTERVALO = 4500; // ms entre trocas automáticas
      const carrosseis = document.querySelectorAll("[data-carrossel]");

      carrosseis.forEach((raiz) => {
        const viewport = raiz.querySelector("[data-carrossel-viewport]");
        const track = raiz.querySelector("[data-carrossel-track]");
        const btnPrev = raiz.querySelector("[data-carrossel-prev]");
        const btnNext = raiz.querySelector("[data-carrossel-next]");
        const dotsWrap = raiz.querySelector("[data-carrossel-dots]");
        if (!viewport || !track) return;

        const cards = Array.from(track.children);
        if (!cards.length) return;

        const dots = cards.map((_, i) => {
          const d = document.createElement("button");
          d.type = "button";
          d.className = "carrossel-dot";
          d.setAttribute("role", "tab");
          d.setAttribute("aria-label", `Ir para especialidade ${i + 1}`);
          d.addEventListener("click", () => { pausarPor(6000); irPara(i); });
          dotsWrap?.appendChild(d);
          return d;
        });

        const irPara = (i) => {
          const alvo = cards[Math.max(0, Math.min(i, cards.length - 1))];
          if (!alvo) return;
          viewport.scrollTo({
            left: alvo.offsetLeft - track.offsetLeft,
            behavior: aparelho.reduzMovimento ? "auto" : "smooth",
          });
        };

        const cardVisivel = () => {
          const x = viewport.scrollLeft;
          let melhor = 0;
          let menorDist = Infinity;
          cards.forEach((c, i) => {
            const dist = Math.abs(c.offsetLeft - track.offsetLeft - x);
            if (dist < menorDist) { menorDist = dist; melhor = i; }
          });
          return melhor;
        };

        const atualizarControles = () => {
          const atual = cardVisivel();
          dots.forEach((d, i) => {
            d.setAttribute("aria-current", i === atual ? "true" : "false");
          });
          /* no autoplay não faz sentido desabilitar prev/next: eles dão a volta */
          if (btnPrev) btnPrev.disabled = false;
          if (btnNext) btnNext.disabled = false;
        };

        /* Passo do autoplay: vai pro próximo, e se estava no fim volta pro
           começo — o loop é o que dá sensação de vida sem a barra travar. */
        const proximo = () => {
          const noFim = viewport.scrollLeft + viewport.clientWidth >= viewport.scrollWidth - 2;
          if (noFim) irPara(0);
          else irPara(cardVisivel() + 1);
        };

        const anterior = () => {
          const noInicio = viewport.scrollLeft <= 1;
          if (noInicio) irPara(cards.length - 1);
          else irPara(cardVisivel() - 1);
        };

        /* ---------- Autoplay ----------
           Vários motivos podem pausar (hover, foco, toque, aba escondida,
           fora da tela). Cada um vira uma "trava"; só volta a rodar quando
           todas soltam. Simples e sem estados intermediários bugados. */
        const travas = new Set();
        let timer = null;
        let retomarTimer = null;

        const podeRodar = () =>
          !aparelho.reduzMovimento
          && !travas.size
          && viewport.scrollWidth > viewport.clientWidth + 1;

        const parar = () => {
          if (timer) { clearInterval(timer); timer = null; }
        };

        const tocar = () => {
          parar();
          if (!podeRodar()) return;
          timer = setInterval(proximo, INTERVALO);
        };

        const travar = (chave) => { travas.add(chave); parar(); };
        const soltar = (chave) => { travas.delete(chave); tocar(); };

        /* Pausa temporária após interação — evita competir com a próxima
           ação do visitante logo em seguida */
        const pausarPor = (ms) => {
          travar("temporaria");
          clearTimeout(retomarTimer);
          retomarTimer = setTimeout(() => soltar("temporaria"), ms);
        };

        /* hover / foco */
        raiz.addEventListener("mouseenter", () => travar("hover"));
        raiz.addEventListener("mouseleave", () => soltar("hover"));
        raiz.addEventListener("focusin", () => travar("foco"));
        raiz.addEventListener("focusout", () => soltar("foco"));

        /* toque no mobile: pausa por alguns segundos após soltar o dedo */
        viewport.addEventListener("touchstart", () => travar("toque"), { passive: true });
        viewport.addEventListener("touchend", () => {
          soltar("toque");
          pausarPor(6000);
        }, { passive: true });

        /* rolagem manual com trackpad/roda pausa também */
        viewport.addEventListener("wheel", () => pausarPor(6000), { passive: true });

        btnPrev?.addEventListener("click", () => { pausarPor(6000); anterior(); });
        btnNext?.addEventListener("click", () => { pausarPor(6000); proximo(); });

        /* aba escondida (Ctrl+Tab, minimizou): não gasta timer nem bateria */
        document.addEventListener("visibilitychange", () => {
          if (document.hidden) travar("aba");
          else soltar("aba");
        });

        /* só roda quando o carrossel está de fato na tela */
        if (aparelho.temIntersectionObserver) {
          travar("fora");
          const obs = new IntersectionObserver((entradas) => {
            for (const e of entradas) {
              if (e.isIntersecting) soltar("fora");
              else travar("fora");
            }
          }, { threshold: 0.25 });
          obs.observe(raiz);
        }

        /* rAF para não recalcular a cada evento de scroll */
        let agendado = false;
        viewport.addEventListener("scroll", () => {
          if (agendado) return;
          agendado = true;
          requestAnimationFrame(() => {
            agendado = false;
            atualizarControles();
          });
        }, { passive: true });

        window.addEventListener("resize", atualizarControles, { passive: true });

        atualizarControles();
        tocar();
      });
    },
  };

  /* ---------- Ano no rodapé ---------- */
  const moduloAno = {
    nome: "ano",
    iniciar() {
      const ano = document.getElementById("year");
      if (ano) ano.textContent = String(new Date().getFullYear());
    },
  };

  /* =======================================================
     NÚCLEO
     ======================================================= */

  const MODULOS = [
    moduloTema,
    moduloMenu,
    moduloBarra,
    moduloReveal,
    moduloNavegacaoAtiva,
    moduloContadores,
    moduloFormulario,
    moduloTopo,
    moduloCarrossel,
    moduloAno,
  ];

  const aparelho = criarAparelho();
  const contexto = {
    aparelho,
    rolagem: criarRolagem(),
    visibilidade: criarVisibilidade(aparelho),
  };

  for (const modulo of MODULOS) {
    /* um módulo que quebre não pode derrubar os outros — sem isso, um erro
       no formulário deixaria o menu do celular sem funcionar */
    try {
      modulo.iniciar(contexto);
    } catch (erro) {
      console.error(`[Síntese Digital] falha no módulo "${modulo.nome}":`, erro);
    }
  }
})();
