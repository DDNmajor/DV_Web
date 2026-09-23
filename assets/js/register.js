/* ============================================================
   register.js - Kiểm tra dữ liệu form đăng ký nhận tin
   Cùng khuôn với contact.js, nhưng form này có thêm nhóm radio
   và checkbox nên phần đọc giá trị phải xử lý riêng.
   Lưu ý: web tĩnh nên form KHÔNG gửi dữ liệu đi đâu cả.
   ============================================================ */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.querySelector("#registerForm");
    if (!form) return;

    var alertBox = form.querySelector(".form__alert");
    var counter = form.querySelector("[data-counter]");
    var message = form.querySelector("#message");
    var MAX = 500;

    /* ---------- Lấy phần tử đại diện của một trường ----------
       Nhiều ô cùng name (nhóm radio, nhóm checkbox) thì
       form.elements[name] trả về RadioNodeList chứ không phải một
       phần tử, nên không có .closest(). Dấu hiệu nhận biết: không
       có thuộc tính tagName. Khi đó lấy phần tử đầu tiên để dò
       lên .field bao ngoài. */
    function getControl(name) {
      var el = form.elements[name];
      if (!el) return null;
      if (!el.tagName) return el[0];
      return el;
    }

    /* ---------- Đọc giá trị của một trường ----------
       Trả về chuỗi rỗng khi "chưa nhập / chưa chọn / chưa tick",
       nhờ vậy mọi quy tắc bên dưới chỉ cần kiểm tra !v. */
    function readValue(name) {
      var el = form.elements[name];
      if (!el) return "";

      // RadioNodeList: .value là giá trị ô đang chọn, rỗng nếu chưa chọn ô nào
      if (!el.tagName) return el.value;

      // Checkbox đơn lẻ đọc .checked chứ không đọc .value
      if (el.type === "checkbox") return el.checked ? "1" : "";

      return el.value.trim();
    }

    /* ---------- Quy tắc kiểm tra từng trường ---------- */
    var rules = {
      fullname: function (v) {
        if (!v) return "Vui lòng nhập họ tên.";
        if (v.length < 3) return "Họ tên phải có ít nhất 3 ký tự.";
        return "";
      },
      email: function (v) {
        if (!v) return "Vui lòng nhập email.";
        // Biểu thức chính quy giống contact.js để hai trang nhất quán
        if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(v))
          return "Email không đúng định dạng (ví dụ: ten@gmail.com).";
        return "";
      },
      password: function (v) {
        if (!v) return "Vui lòng nhập mật khẩu.";
        if (v.length < 8) return "Mật khẩu phải có ít nhất 8 ký tự.";
        return "";
      },
      phone: function (v) {
        if (!v) return "Vui lòng nhập số điện thoại.";
        if (!/^0\d{9}$/.test(v))
          return "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.";
        return "";
      },
      birthdate: function (v) {
        if (!v) return "Vui lòng chọn ngày sinh.";

        var d = new Date(v);
        if (isNaN(d.getTime())) return "Ngày sinh không hợp lệ.";

        // So sánh theo mốc cuối ngày hôm nay để hôm nay vẫn được tính là hợp lệ
        var today = new Date();
        today.setHours(23, 59, 59, 999);
        if (d > today) return "Ngày sinh không thể ở tương lai.";

        if (d.getFullYear() < 1900) return "Ngày sinh không hợp lệ.";
        return "";
      },
      age: function (v) {
        if (!v) return "Vui lòng nhập độ tuổi.";
        if (!/^\d+$/.test(v)) return "Độ tuổi phải là số nguyên.";

        var n = parseInt(v, 10);
        if (n < 1 || n > 120) return "Độ tuổi phải nằm trong khoảng 1 - 120.";
        return "";
      },
      gender: function (v) {
        if (!v) return "Vui lòng chọn giới tính.";
        return "";
      },
      region: function (v) {
        if (!v) return "Vui lòng chọn khu vực.";
        return "";
      },
      message: function (v) {
        if (!v) return ""; // không bắt buộc
        if (v.length > MAX) return "Lời nhắn không vượt quá " + MAX + " ký tự.";
        return "";
      },
      agree: function (v) {
        if (!v) return "Bạn phải đồng ý với điều khoản sử dụng.";
        return "";
      }
    };

    function setError(name, msg) {
      var control = getControl(name);
      if (!control) return true;

      var field = control.closest(".field");
      if (!field) return true;

      var box = field.querySelector(".field__error");

      if (msg) {
        field.classList.add("has-error");
        if (box) box.textContent = msg;
        control.setAttribute("aria-invalid", "true");
      } else {
        field.classList.remove("has-error");
        if (box) box.textContent = "";
        control.removeAttribute("aria-invalid");
      }
      return !msg;
    }

    function validateField(name) {
      var rule = rules[name];
      if (!rule) return true;
      return setError(name, rule(readValue(name)));
    }

    /* ---------- Kiểm tra lại ngay khi người dùng sửa ---------- */
    Object.keys(rules).forEach(function (name) {
      var el = form.elements[name];
      if (!el) return;

      // Nhóm radio: gắn sự kiện cho từng ô trong nhóm
      var nodes = el.tagName ? [el] : Array.prototype.slice.call(el);

      nodes.forEach(function (node) {
        node.addEventListener("blur", function () {
          validateField(name);
        });

        // Radio, checkbox và select báo thay đổi qua "change";
        // ô nhập chữ thì kiểm tra lại khi đang có lỗi để lỗi biến mất sớm
        node.addEventListener("change", function () {
          validateField(name);
        });

        node.addEventListener("input", function () {
          var field = node.closest(".field");
          if (field && field.classList.contains("has-error")) {
            validateField(name);
          }
        });
      });
    });

    /* ---------- Đếm ký tự ô lời nhắn ---------- */
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
        var box = field.querySelector(".field__error");
        if (box) box.textContent = "";
      });
      form.querySelectorAll("[aria-invalid]").forEach(function (el) {
        el.removeAttribute("aria-invalid");
      });
      alertBox.classList.remove("is-visible");
      if (counter) counter.textContent = "0/" + MAX;
    });

    /* ---------- Xử lý khi bấm Đăng ký ---------- */
    form.addEventListener("submit", function (e) {
      e.preventDefault(); // web tĩnh: chặn gửi đi

      var ok = true;
      var firstInvalid = null;

      Object.keys(rules).forEach(function (name) {
        if (!validateField(name)) {
          ok = false;
          if (!firstInvalid) firstInvalid = getControl(name);
        }
      });

      if (!ok) {
        alertBox.classList.remove("is-visible");
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // Nhóm checkbox nhiều lựa chọn: gom tất cả ô đang tick
      var topics = [];
      form.querySelectorAll('input[name="topics"]:checked').forEach(function (cb) {
        topics.push(cb.value);
      });

      var data = {
        fullname: readValue("fullname"),
        email: readValue("email"),
        password: "(đã ẩn - " + readValue("password").length + " ký tự)",
        phone: readValue("phone"),
        birthdate: readValue("birthdate"),
        age: readValue("age"),
        gender: readValue("gender"),
        topics: topics,
        region: readValue("region"),
        message: readValue("message"),
        agree: true
      };

      // Ghi ra console để tiện minh hoạ khi báo cáo bài tập
      console.log("Dữ liệu đăng ký:", data);

      // Xoá form trước, rồi mới hiện thông báo
      // (form.reset() kích hoạt sự kiện "reset" ở trên và sẽ ẩn thông báo)
      var name = data.fullname;
      form.reset();

      alertBox.textContent =
        "Cảm ơn " + name + "! Đăng ký đã được ghi nhận. " +
        "(Trang tĩnh nên dữ liệu chỉ hiển thị, không gửi tới máy chủ.)";
      alertBox.classList.add("is-visible");
      alertBox.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
})();
