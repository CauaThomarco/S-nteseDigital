/* =========================================================
   PixelLab — interações
   Tema, menu mobile, reveal on scroll, nav ativa, contadores,
   formulário (mailto).
   ========================================================= */
(function () {
  "use strict";

  const html = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Tema ----------
     Padrão: segue a preferência do sistema do visitante (claro ou escuro).
     Se ele usar o botão, a escolha manual passa a valer e fica salva.
     O tema inicial já foi aplicado pelo script inline no <head>. */
  const THEME_KEY = "pixellab-theme";
  const themeBtn = document.getElementById("theme-toggle");
  const systemLight = window.matchMedia("(prefers-color-scheme: light)");

  const readStored = () => {
    try {
      const v = localStorage.getItem(THEME_KEY);
      return v === "light" || v === "dark" ? v : null;
    } catch (e) { return null; }
  };

  const applyTheme = (theme) => {
    html.setAttribute("data-theme", theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#f5f6fb" : "#05060f");
    if (themeBtn) {
      themeBtn.setAttribute("aria-label",
        theme === "light" ? "Ativar tema escuro" : "Ativar tema claro");
      themeBtn.setAttribute("title",
        theme === "light" ? "Ativar tema escuro" : "Ativar tema claro");
    }
  };

  applyTheme(readStored() || (systemLight.matches ? "light" : "dark"));

  themeBtn?.addEventListener("click", () => {
    const next = html.getAttribute("data-theme") === "light" ? "dark" : "light";
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* ignora */ }
  });

  // Cliente trocou o tema do sistema: acompanha, desde que não haja escolha manual
  const onSystemChange = (e) => {
    if (!readStored()) applyTheme(e.matches ? "light" : "dark");
  };
  if (systemLight.addEventListener) systemLight.addEventListener("change", onSystemChange);
  else if (systemLight.addListener) systemLight.addListener(onSystemChange); // Safari antigo

  /* ---------- 2. Menu mobile ---------- */
  const burger = document.getElementById("burger");
  const navLinks = document.getElementById("nav-links");

  const closeMenu = () => {
    navLinks?.classList.remove("open");
    burger?.setAttribute("aria-expanded", "false");
    burger?.setAttribute("aria-label", "Abrir menu");
  };

  burger?.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
  });

  navLinks?.addEventListener("click", (e) => {
    if (e.target.closest("a")) closeMenu();
  });

  document.addEventListener("click", (e) => {
    if (!navLinks?.classList.contains("open")) return;
    if (!e.target.closest(".nav")) closeMenu();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  /* ---------- 3. Sombra da nav + botão flutuante de WhatsApp ---------- */
  const navWrap = document.getElementById("nav");
  const waFloat = document.getElementById("wa-float");
  let ticking = false;
  const onScroll = () => {
    const y = window.scrollY;
    navWrap?.classList.toggle("scrolled", y > 24);
    // aparece só depois do hero, onde o CTA principal já saiu da tela
    waFloat?.classList.toggle("show", y > window.innerHeight * 0.7);
    ticking = false;
  };
  window.addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------- 4. Reveal on scroll ---------- */
  const revealables = document.querySelectorAll(".reveal");

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealables.forEach((el) => el.classList.add("visible"));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    revealables.forEach((el) => io.observe(el));
  }

  /* ---------- 5. Link ativo na navegação ---------- */
  const sections = Array.from(document.querySelectorAll("main section[id]"));
  const linkFor = new Map();
  document.querySelectorAll('.nav-links a[href^="#"]').forEach((a) => {
    linkFor.set(a.getAttribute("href").slice(1), a);
  });

  if ("IntersectionObserver" in window && sections.length) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        linkFor.forEach((a) => a.classList.remove("active"));
        linkFor.get(entry.target.id)?.classList.add("active");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });

    sections.forEach((s) => spy.observe(s));
  }

  /* ---------- 6. Contadores ---------- */
  const counters = document.querySelectorAll(".counter");
  const runCounter = (el) => {
    const target = Number(el.dataset.to || 0);
    if (reduceMotion) { el.textContent = String(target); return; }
    const duration = 1100;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  if ("IntersectionObserver" in window) {
    const co = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { runCounter(entry.target); co.unobserve(entry.target); }
      });
    }, { threshold: 0.5 });
    counters.forEach((c) => co.observe(c));
  } else {
    counters.forEach(runCounter);
  }

  /* ---------- 7. Ano no footer ---------- */
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------- 8. Formulário de contato ----------
     Sem backend: o envio principal abre o WhatsApp com a mensagem escrita.
     O link secundário monta um mailto com os mesmos dados.
     Para receber direto na caixa de entrada, troque por um endpoint
     (Formspree, EmailJS ou API própria). */
  const WHATSAPP = "5531999082523";
  const DESTINO = "cauathomarco@gmail.com";
  const form = document.getElementById("contact-form");
  const note = document.getElementById("form-note");
  const emailBtn = document.getElementById("send-email");

  // Valida e devolve os dados, ou null se algo estiver faltando
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
    ].forEach(([field, valid]) => {
      field.classList.toggle("invalid", !valid);
      if (!valid) ok = false;
    });

    if (!ok) {
      note.textContent = "Preencha nome, um e-mail válido e uma descrição do projeto.";
      note.classList.remove("ok");
      return null;
    }
    return dados;
  };

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const d = coletar();
    if (!d) return;

    const texto =
      `Olá, Cauã! Quero um orçamento com a PixelLab.\n\n` +
      `Nome: ${d.nome}\n` +
      `E-mail: ${d.email}\n` +
      `Tipo de projeto: ${d.tipo}\n\n` +
      `Sobre o projeto:\n${d.msg}`;

    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`, "_blank", "noopener");

    note.textContent = "Abrindo o WhatsApp com a sua mensagem...";
    note.classList.add("ok");
  });

  emailBtn?.addEventListener("click", () => {
    const d = coletar();
    if (!d) return;

    const subject = `[PixelLab] Orçamento — ${d.tipo} — ${d.nome}`;
    const body =
      `Nome: ${d.nome}\n` +
      `E-mail: ${d.email}\n` +
      `Tipo de projeto: ${d.tipo}\n\n` +
      `Sobre o projeto:\n${d.msg}\n`;

    window.location.href =
      `mailto:${DESTINO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    note.textContent = "Abrindo seu app de e-mail com a mensagem pronta...";
    note.classList.add("ok");
  });

  form?.addEventListener("input", (e) => {
    e.target.classList?.remove("invalid");
  });
})();
