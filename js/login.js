(function () {
  const s = RDN.session();
  if (s) { location.href = s.rol === "admin" ? "admin.html" : "catalogo.html"; return; }
  const form = document.getElementById("login-form");
  const err = document.getElementById("login-err");
  document.querySelectorAll("[data-user]").forEach((btn) => btn.addEventListener("click", () => {
    document.getElementById("usuario").value = btn.dataset.user;
    document.getElementById("password").value = "demo";
    err.textContent = "";
    form.querySelector("button[type=submit]").focus();
  }));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const u = document.getElementById("usuario").value.trim().toLowerCase();
    const p = document.getElementById("password").value;
    if (!u || !p) { err.textContent = "Completá usuario y contraseña."; return; }
    const sess = RDN.login(u, p);
    if (!sess) { err.textContent = "El usuario o la contraseña no coinciden. Probá con taller, mayorista o admin y la contraseña demo."; return; }
    location.href = sess.rol === "admin" ? "admin.html" : "catalogo.html";
  });
  const sku = (window.RDN_PRODUCTS || []).find((p) => p.codigo === "FIL-ACE-160");
  if (sku) {
    const r = RDN.rates();
    document.getElementById("cmp-name").textContent = sku.nombre;
    document.getElementById("cmp-code").textContent = sku.codigo + " · " + sku.marca;
    document.getElementById("cmp-c").textContent = RDN.money(RDN.priceFor(sku, "mostrador"));
    document.getElementById("cmp-t").textContent = RDN.money(RDN.priceFor(sku, "taller"));
    document.getElementById("cmp-m").textContent = RDN.money(RDN.priceFor(sku, "mayorista"));
  }
})();
