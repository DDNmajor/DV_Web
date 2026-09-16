/* ============================================================
   gallery.js - Lọc ảnh theo thẻ + lightbox tự viết
   Chỉ dùng cho gallery.html
   ============================================================ */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var gallery = document.querySelector(".gallery");
    if (!gallery) return;

    var items = Array.prototype.slice.call(
      gallery.querySelectorAll(".gallery__item")
    );
    var filterBtns = document.querySelectorAll(".filter-btn");
    var counter = document.querySelector("[data-gallery-count]");

    /* ---------- 1. Lọc theo thẻ ---------- */
    var visibleItems = items.slice(); // danh sách đang hiển thị (dùng cho lightbox)

    function applyFilter(tag) {
      visibleItems = [];
      items.forEach(function (item) {
        var match = tag === "all" || item.dataset.tag === tag;
        item.classList.toggle("is-hidden", !match);
        if (match) visibleItems.push(item);
      });
      if (counter) counter.textContent = visibleItems.length;
    }

    filterBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        filterBtns.forEach(function (b) {
          b.classList.remove("active");
          b.setAttribute("aria-pressed", "false");
        });
        btn.classList.add("active");
        btn.setAttribute("aria-pressed", "true");
        applyFilter(btn.dataset.filter);
      });
    });

    applyFilter("all");

    /* ---------- 2. Lightbox ---------- */
    var lightbox = document.querySelector(".lightbox");
    if (!lightbox) return;

    var lbImg = lightbox.querySelector(".lightbox__img");
    var lbCap = lightbox.querySelector(".lightbox__cap");
    var btnPrev = lightbox.querySelector(".lightbox__btn--prev");
    var btnNext = lightbox.querySelector(".lightbox__btn--next");
    var btnClose = lightbox.querySelector(".lightbox__close");
    var current = 0;
    var lastFocused = null;

    function show(index) {
      if (!visibleItems.length) return;
      // Cho phép cuộn vòng: quá cuối thì về đầu và ngược lại
      current = (index + visibleItems.length) % visibleItems.length;

      var item = visibleItems[current];
      var img = item.querySelector("img");
      var cap = item.querySelector(".gallery__caption");

      lbImg.src = img.getAttribute("src");
      lbImg.alt = img.getAttribute("alt") || "";
      lbCap.textContent = cap ? cap.textContent.trim() : "";
    }

    function open(index) {
      lastFocused = document.activeElement;
      show(index);
      lightbox.classList.add("is-open");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      btnClose.focus();
    }

    function close() {
      lightbox.classList.remove("is-open");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (lastFocused) lastFocused.focus();
    }

    items.forEach(function (item) {
      item.addEventListener("click", function () {
        var index = visibleItems.indexOf(item);
        if (index !== -1) open(index);
      });
    });

    btnPrev.addEventListener("click", function () {
      show(current - 1);
    });

    btnNext.addEventListener("click", function () {
      show(current + 1);
    });

    btnClose.addEventListener("click", close);

    // Bấm ra vùng nền tối thì đóng
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) close();
    });

    // Phím tắt: Esc đóng, mũi tên trái/phải chuyển ảnh
    document.addEventListener("keydown", function (e) {
      if (!lightbox.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(current - 1);
      if (e.key === "ArrowRight") show(current + 1);
    });
  });
})();
