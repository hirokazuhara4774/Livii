/* お問い合わせフォーム
   FORM_ENDPOINT にフォーム送信サービス（Formspree など）の送信先 URL を入れると、
   ページから直接送信されます。空のままのときは、入力内容を入れたメールを
   お客様のメールアプリで開いて送ってもらう形になります。 */
(function () {
  var FORM_ENDPOINT = ""; // TODO: 例 "https://formspree.io/f/xxxxxxxx"
  var MAIL_TO = "info@livii.jp";

  var form = document.querySelector("[data-contact-form]");
  if (!form) return;
  var status = form.querySelector(".cf-status");

  function value(name) {
    var el = form.elements[name];
    if (!el) return "";
    if (el.length && !el.tagName) {
      return Array.prototype.filter.call(el, function (x) { return x.checked; })
        .map(function (x) { return x.value; }).join("、");
    }
    return el.value.trim();
  }

  function show(msg, ok) {
    status.textContent = msg;
    status.className = "cf-status " + (ok ? "ok" : "ng");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    if (!value("email") && !value("tel")) {
      show("メールアドレスか電話番号のどちらかをご入力ください。", false);
      return;
    }

    var subject = "【ホームページ】" + value("brand") + "のお問い合わせ（" + value("name") + " 様）";
    var body = [
      "ご相談先：" + value("brand"),
      "ご相談内容：" + value("topic"),
      "お名前：" + value("name"),
      "電話番号：" + value("tel"),
      "メール：" + value("email"),
      "ご希望の連絡方法：" + value("reply"),
      "",
      "【ご相談の詳細】",
      value("message")
    ].join("\n");

    if (!FORM_ENDPOINT) {
      window.location.href = "mailto:" + MAIL_TO + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
      show("メールアプリが開きます。内容を確認して送信してください。開かない場合は " + MAIL_TO + " へ直接お送りください。", true);
      return;
    }

    var btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ _subject: subject, message: body, email: value("email") })
    }).then(function (res) {
      if (!res.ok) throw new Error(res.status);
      form.reset();
      show("送信しました。内容を確認のうえ、ご連絡いたします。", true);
    }).catch(function () {
      show("送信できませんでした。お手数ですが、お電話（070-4386-0745）か LINE でご連絡ください。", false);
    }).then(function () { btn.disabled = false; });
  });
})();
