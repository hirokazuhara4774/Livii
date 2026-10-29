/* 物件データ（assets/data/properties.js）を一覧カードとして表示する */
(function () {
  var data = window.LIVII_PROPERTIES || { sale: [], rent: [] };
  var LINE = "https://line.me/ti/p/kCJGlQU2Ja";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function spec(label, value) {
    return value ? "<div><dt>" + label + "</dt><dd>" + esc(value) + "</dd></div>" : "";
  }

  function card(p, kind) {
    var closed = p.status === "成約済";
    var img = p.image
      ? '<img src="' + esc(document.body.dataset.imgBase + p.image) + '" alt="' + esc(p.title) + 'の写真" loading="lazy">'
      : "";
    var price = kind === "sale"
      ? '<p class="price">' + esc(p.price) + "</p>"
      : '<p class="price">' + esc(p.rent) + (p.fee ? "<small>" + esc(p.fee) + "</small>" : "") + "</p>";
    var specs = kind === "sale"
      ? spec("所在地", p.address) + spec("交通", p.access) + spec("間取り", p.layout) +
        spec("土地面積", p.land) + spec("建物面積", p.building) + spec("築年月", p.built)
      : spec("所在地", p.address) + spec("交通", p.access) + spec("間取り", p.layout) +
        spec("専有面積", p.area) + spec("敷金・礼金", p.deposit) + spec("築年月", p.built);
    var tags = (p.features || []).map(function (f) { return "<span>" + esc(f) + "</span>"; }).join("");
    var subject = encodeURIComponent("物件のお問い合わせ（" + p.id + " " + p.title + "）");

    return '<article class="listing' + (closed ? " closed" : "") + '">' +
      '<div class="listing-img">' + img +
        '<span class="status">' + esc(p.status) + "</span>" +
        (p.sample ? '<span class="sample">掲載例</span>' : "") +
      "</div>" +
      '<div class="listing-body">' +
        '<p class="type">' + esc(p.type) + "<span>No." + esc(p.id) + "</span></p>" +
        "<h3>" + esc(p.title) + "</h3>" + price +
        "<dl>" + specs + "</dl>" +
        (tags ? '<div class="tags">' + tags + "</div>" : "") +
        (p.note ? '<p class="note">' + esc(p.note) + "</p>" : "") +
        (closed ? "" :
          '<div class="listing-cta">' +
            '<a href="mailto:info@livii.jp?subject=' + subject + '">メールで問い合わせ</a>' +
            '<a class="line" href="' + LINE + '" target="_blank" rel="noopener">LINEで問い合わせ</a>' +
          "</div>") +
      "</div></article>";
  }

  function render(kind) {
    var box = document.querySelector('[data-listings="' + kind + '"]');
    if (!box) return;
    var list = (data[kind] || []).slice().sort(function (a, b) {
      return (a.status === "成約済") - (b.status === "成約済");
    });
    box.innerHTML = list.length
      ? list.map(function (p) { return card(p, kind); }).join("")
      : '<p class="empty">現在掲載中の物件はありません。ご希望の条件をお気軽にご相談ください。</p>';
  }

  render("sale");
  render("rent");
})();
