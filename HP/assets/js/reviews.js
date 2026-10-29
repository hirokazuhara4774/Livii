/* 口コミデータ（assets/data/reviews.js）を横スライドのカルーセルとして表示する */
(function () {
  var data = window.LIVII_REVIEWS || { reviews: [] };
  var box = document.querySelector("[data-reviews]");
  if (!box) return;
  var list = data.reviews || [];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function stars(n) {
    var full = Math.round(n);
    return "★★★★★".slice(0, full) + "☆☆☆☆☆".slice(0, 5 - full);
  }

  if (!list.length) {
    box.innerHTML = '<p class="empty">口コミはまだありません。</p>';
    return;
  }

  var avg = list.reduce(function (s, r) { return s + (r.rating || 0); }, 0) / list.length;
  var maps = data.mapsUrl
    ? '<a class="rv-link" href="' + esc(data.mapsUrl) + '" target="_blank" rel="noopener">Googleマップで口コミを見る・書く</a>'
    : "";

  var cards = list.map(function (r, i) {
    return '<figure class="rv-card" role="group" aria-roledescription="スライド" aria-label="' + (i + 1) + ' / ' + list.length + '">' +
      '<div class="rv-top"><span class="rv-avatar" aria-hidden="true">' + esc((r.name || "?").charAt(0)) + "</span>" +
      '<div><cite>' + esc(r.name) + ' 様</cite><span class="rv-stars" aria-label="5点満点中' + r.rating + '点">' + stars(r.rating) + "</span></div>" +
      '<span class="rv-g" aria-label="Googleの口コミ">G</span></div>' +
      (r.tag ? '<span class="tag">' + esc(r.tag) + "</span>" : "") +
      "<blockquote>" + esc(r.text) + "</blockquote></figure>";
  }).join("");

  box.innerHTML =
    '<div class="rv-summary"><span class="rv-score">' + avg.toFixed(1) + '</span><span class="rv-stars big">' + stars(avg) +
      '</span><span class="rv-count">Googleの口コミ ' + list.length + "件</span>" + maps + "</div>" +
    '<div class="rv-carousel" role="region" aria-roledescription="カルーセル" aria-label="お客様の口コミ">' +
      '<button class="rv-btn prev" type="button" aria-label="前の口コミ">‹</button>' +
      '<div class="rv-track" tabindex="0">' + cards + "</div>" +
      '<button class="rv-btn next" type="button" aria-label="次の口コミ">›</button>' +
    "</div>" +
    '<div class="rv-dots" aria-hidden="true">' + list.map(function () { return "<span></span>"; }).join("") + "</div>";

  var track = box.querySelector(".rv-track");
  var dots = box.querySelectorAll(".rv-dots span");
  var prev = box.querySelector(".prev");
  var next = box.querySelector(".next");

  function step() {
    var card = track.querySelector(".rv-card");
    return card ? card.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0) : track.clientWidth;
  }
  function update() {
    var i = Math.round(track.scrollLeft / step());
    dots.forEach(function (d, k) { d.classList.toggle("on", k === i); });
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
  }
  prev.addEventListener("click", function () { track.scrollBy({ left: -step(), behavior: "smooth" }); });
  next.addEventListener("click", function () { track.scrollBy({ left: step(), behavior: "smooth" }); });
  track.addEventListener("scroll", function () { window.requestAnimationFrame(update); }, { passive: true });
  window.addEventListener("resize", update);
  update();
})();
