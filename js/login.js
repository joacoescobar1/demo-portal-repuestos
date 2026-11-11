(function () {
  const s = RDN.session();
  if (s) {
    location.href = s.rol === "admin" ? "admin.html" : "catalogo.html";
    return;
  }
  const form = document.getElementById("login");
  const err = document.getElementById("login-err");
  document.querySelectorAll("[data-user]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById("usuario").value = btn.dataset.user;
      document.getElementById("password").value = "demo";
      err.textContent = "";
    });
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const u = document.getElementById("usuario").value.trim();
    const p = document.getElementById("password").value;
    const sess = RDN.login(u, p);
    if (!sess) {
      err.textContent = "Usuario o contraseña no coinciden. Probá taller, mayorista o admin, todos con contraseña demo.";
      return;
    }
    location.href = sess.rol === "admin" ? "admin.html" : "catalogo.html";
  });

  // Live comparison of one SKU
  const sku = (window.RDN_PRODUCTS || []).find((p) => p.codigo === "PAS-DEL-GOL") || (window.RDN_PRODUCTS || [])[0];
  if (sku) {
    document.getElementById("cmp-name").textContent = sku.nombre + " · " + sku.codigo;
    document.getElementById("cmp-c").textContent = RDN.money(RDN.priceFor(sku, "mostrador"));
    document.getElementById("cmp-t").textContent = RDN.money(RDN.priceFor(sku, "taller"));
    document.getElementById("cmp-m").textContent = RDN.money(RDN.priceFor(sku, "mayorista"));
  }
})();
