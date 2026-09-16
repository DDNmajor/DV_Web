/* ============================================================
   contact.js - Kiểm tra dữ liệu form bằng JavaScript
   Lưu ý: đây là web tĩnh nên form KHÔNG gửi dữ liệu đi đâu cả,
   chỉ hiển thị thông báo thành công để minh hoạ luồng xử lý.
   ============================================================ */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.querySelector("#contactForm");
    if (!form) return;

    var alertBox = form.querySelector(".form__alert");
    var counter = form.querySelector("[data-counter]");
    var message = form.querySelector("#message");
    var MAX = 500;

    /* ---------- Quy tắc kiểm tra từng trường ---------- */
    var rules = {
      fullname: function (v) {
        if (!v) return "Vui lòng nhập họ tên.";
        if (v.length < 3) return "Họ tên phải có ít nhất 3 ký tự.";
        return "";
      },
      email: function (v) {
        if (!v) return "Vui lòng nhập email.";
        // Biểu thức chính quy kiểm tra định dạng email cơ bản
        if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(v))
          return "Email không đúng định dạng (ví dụ: ten@gmail.com).";
        return "";
      },
      phone: function (v) {
        if (!v) return ""; // không bắt buộc
        if (!/^0\d{9}$/.test(v))
          return "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.";
        return "";
      },
      topic: function (v) {
        if (!v) return "Vui lòng chọn chủ đề.";
        return "";
      },
      message: function (v) {
        if (!v) return "Vui lòng nhập nội dung.";
        if (v.length < 10) return "Nội dung phải có ít nhất 10 ký tự.";
        if (v.length > MAX) return "Nội dung không vượt quá " + MAX + " ký tự.";
        return "";
      }
    };

    function setError(input, msg) {
      var field = input.closest(".field");
      var box = field.querySelector(".field__error");
      if (msg) {
        field.classList.add("has-error");
        box.textContent = msg;
        input.setAttribute("aria-invalid", "true");
      } else {
        field.classList.remove("has-error");
        box.textContent = "";
        input.removeAttribute("aria-invalid");
      }
      return !msg;
    }

    function validateField(input) {
      var rule = rules[input.name];
      if (!rule) return true;
      return setError(input, rule(input.value.trim()));
    }

    /* ---------- Kiểm tra lại ngay khi người dùng sửa ---------- */
    Object.keys(rules).forEach(function (name) {
      var input = form.elements[name];
      if (!input) return;

      input.addEventListener("blur", function () {
        validateField(input);
      });

      input.addEventListener("input", function () {
        if (input.closest(".field").classList.contains("has-error")) {
          validateField(input);
        }
      });
    });

    /* ---------- Đếm ký tự ô nội dung ---------- */
    if (message && counter) {
      var updateCount = function () {
        counter.textContent = message.value.length + "/" + MAX;
      };
      message.addEventListener("input", updateCount);
      updateCount();
    }

    /* ---------- Bấm "Nhập lại": xoá luôn lỗi và thông báo ---------- */
    form.addEventListener("reset", function () {
      form.querySelectorAll(".field.has-error").forEach(function (field) {
        field.classList.remove("has-error");
        field.querySelector(".field__error").textContent = "";
      });
      alertBox.classList.remove("is-visible");
      if (counter) counter.textContent = "0/" + MAX;
    });

    /* ---------- Xử lý khi bấm Gửi ---------- */
    form.addEventListener("submit", function (e) {
      e.preventDefault(); // web tĩnh: chặn gửi đi

      var ok = true;
      var firstInvalid = null;

      Object.keys(rules).forEach(function (name) {
        var input = form.elements[name];
        if (!input) return;
        if (!validateField(input)) {
          ok = false;
          if (!firstInvalid) firstInvalid = input;
        }
      });

      if (!ok) {
        alertBox.classList.remove("is-visible");
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      var data = {
        fullname: form.elements.fullname.value.trim(),
        email: form.elements.email.value.trim(),
        phone: form.elements.phone.value.trim(),
        topic: form.elements.topic.value,
        message: form.elements.message.value.trim()
      };

      // Ghi ra console để tiện minh hoạ khi báo cáo bài tập
      console.log("Dữ liệu form:", data);

      // Xoá form trước, rồi mới hiện thông báo
      // (form.reset() kích hoạt sự kiện "reset" ở trên và sẽ ẩn thông báo)
      form.reset();

      alertBox.textContent =
        "Cảm ơn " + data.fullname + "! Tin nhắn đã được ghi nhận. " +
        "(Trang tĩnh nên dữ liệu chỉ hiển thị, không gửi tới máy chủ.)";
      alertBox.classList.add("is-visible");
      alertBox.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
})();
