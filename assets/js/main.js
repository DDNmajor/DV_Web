/* ============================================================
   main.js - Script dùng chung cho mọi trang
   - Menu hamburger
   - Hiệu ứng reveal khi cuộn
   - Nút back-to-top
   - Tự điền năm ở footer
   - Ảnh lỗi -> thay bằng placeholder
   ============================================================ */

(function () {
  "use strict";

  /* ---------- 1. Menu hamburger ---------- */
  function initNav() {
    var toggle = document.querySelector(".nav__toggle");
    var list = document.querySelector(".nav__list");
    if (!toggle || !list) return;

    toggle.addEventListener("click", function () {
      var open = list.classList.toggle("is-open");
      toggle.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    // Bấm vào 1 mục thì đóng menu (hữu ích với link neo #)
    list.addEventListener("click", function (e) {
      if (e.target.closest(".nav__link")) {
        list.classList.remove("is-open");
        toggle.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });

    // Nhấn Esc để đóng menu
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && list.classList.contains("is-open")) {
        list.classList.remove("is-open");
        toggle.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- 2. Reveal khi cuộn tới ---------- */
  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    // Trình duyệt cũ không có IntersectionObserver -> hiện luôn
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    items.forEach(function (el, i) {
      el.style.transitionDelay = (i % 3) * 90 + "ms";
      observer.observe(el);
    });
  }

  /* ---------- 3. Nút back-to-top ---------- */
  function initToTop() {
    var btn = document.querySelector(".to-top");
    if (!btn) return;

    function onScroll() {
      btn.classList.toggle("is-visible", window.scrollY > 400);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------- 4. Năm hiện tại ở footer ---------- */
  function initYear() {
    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  /* ---------- 5. Ảnh chưa có -> dùng placeholder ---------- */
  function initImageFallback() {
    var FALLBACK = "assets/img/placeholder.svg";

    document.querySelectorAll("img").forEach(function (img) {
      if (img.getAttribute("src") === FALLBACK) return;

      function useFallback() {
        img.removeEventListener("error", useFallback); // tránh lặp vô hạn
        img.src = FALLBACK;
      }

      img.addEventListener("error", useFallback);

      // Ảnh có thể đã tải xong (hoặc đã lỗi) trước khi script chạy:
      // complete = true nhưng naturalWidth = 0 nghĩa là tải thất bại.
      if (img.complete && img.naturalWidth === 0) useFallback();
    });
  }

  /* ---------- Khởi chạy ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    initNav();
    initReveal();
    initToTop();
    initYear();
    initImageFallback();
  });
})();
