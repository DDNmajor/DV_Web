/* ============================================================
   music.js - Trình phát mô phỏng cho danh sách bài hát
   Trang tĩnh không kèm file nhạc thật, nút play chỉ chạy
   thanh tiến trình bằng setInterval để minh hoạ giao diện.
   ============================================================ */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var tracks = Array.prototype.slice.call(document.querySelectorAll(".track"));
    if (!tracks.length) return;

    var timer = null;
    var playing = null; // phần tử .track đang phát

    function parseDuration(text) {
      // "04:12" -> 252 (giây)
      var parts = String(text).split(":");
      var m = parseInt(parts[0], 10) || 0;
      var s = parseInt(parts[1], 10) || 0;
      return m * 60 + s;
    }

    function format(seconds) {
      var m = Math.floor(seconds / 60);
      var s = Math.floor(seconds % 60);
      return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
    }

    function stop(track) {
      clearInterval(timer);
      timer = null;
      track.classList.remove("is-playing");
      track.querySelector(".track__play").textContent = "▶";
      track.querySelector(".track__play").setAttribute("aria-label", "Phát");
      playing = null;
    }

    function reset(track) {
      track.dataset.elapsed = "0";
      track.querySelector(".track__fill").style.width = "0%";
      track.querySelector(".track__time").textContent =
        track.dataset.duration;
    }

    function play(track) {
      if (playing) stop(playing); // mỗi lúc chỉ phát 1 bài

      playing = track;
      track.classList.add("is-playing");

      var btn = track.querySelector(".track__play");
      btn.textContent = "❚❚";
      btn.setAttribute("aria-label", "Tạm dừng");

      var total = parseDuration(track.dataset.duration);
      var fill = track.querySelector(".track__fill");
      var time = track.querySelector(".track__time");

      timer = setInterval(function () {
        var elapsed = (parseFloat(track.dataset.elapsed) || 0) + 1;

        if (elapsed >= total) {
          stop(track);
          reset(track);
          return;
        }

        track.dataset.elapsed = elapsed;
        fill.style.width = ((elapsed / total) * 100).toFixed(2) + "%";
        time.textContent = format(elapsed) + " / " + track.dataset.duration;
      }, 1000);
    }

    tracks.forEach(function (track) {
      reset(track);
      track.querySelector(".track__play").addEventListener("click", function () {
        if (playing === track) {
          stop(track); // đang phát -> tạm dừng, giữ nguyên tiến trình
        } else {
          play(track);
        }
      });
    });
  });
})();
