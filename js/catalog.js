(function () {
  const s = RDN.requireSession("index.html");
  if (!s) return;

  const $ = (id) => document.getElementById(id);
  $("who-name").textContent = s.nombre;
  $("who-list").textContent = "Lista " + s.lista;
  const adminLink = $("admin-link");
  if (adminLink) {
    const show = s.rol === "admin";
    adminLink.hidden = !show;
    adminLink.style.display = show ? "" : "none";
  }

  let q = "", rubro = "", marca = "";

  function list() {
    return RDN.products().filter((p) => {
      if (rubro && p.rubro !== rubro) return false;
      if (marca && p.marca !== marca) return false;
      if (q) {
        const hay = (p.codigo + " " + p.nombre + " " + p.marca).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function fillFilters() {
    const prods = RDN.products();
    const rubros = [...new Set(prods.map((p) => p.rubro))].sort();
    const marcas = [...new Set(prods.map((p) => p.marca))].sort();
    $("filtro-rubro").innerHTML = '<option value="">Todos los rubros</option>' + rubros.map((r) => `<option>${r}</option>`).join("");
    $("filtro-marca").innerHTML = '<option value="">Todas las marcas</option>' + marcas.map((r) => `<option>${r}</option>`).join("");
  }

  function render() {
    const items = list();
    $("count").textContent = items.length + " productos";
    $("grid").innerHTML = items.map((p) => {
      const price = RDN.priceFor(p, s.lista);
      const st = RDN.stockLabel(p.stock);
      const disabled = p.stock <= 0 ? "disabled" : "";
      return `<article class="card" data-code="${p.codigo}">
        <div class="pic"><img src="${p.imagen}" alt=""></div>
        <div class="body">
          <div class="sku">${p.codigo}</div>
          <h3>${p.nombre}</h3>
          <div class="meta">${p.marca} · ${p.rubro} · ${p.unidad}</div>
          <div class="price">${RDN.money(price)}</div>
          <div class="stock ${st.cls}">${st.text}</div>
          <div class="qtyrow">
            <input type="number" min="1" max="${Math.max(1, p.stock)}" value="1" aria-label="Cantidad" ${disabled}>
            <button class="btn btn-primary btn-sm" type="button" data-add="${p.codigo}" ${disabled}>Agregar</button>
          </div>
        </div>
      </article>`;
    }).join("") || "<p>No hay productos con ese filtro.</p>";
    paintCartCount();
  }

  function paintCartCount() {
    const n = RDN.cart(s.usuario).reduce((a, i) => a + i.qty, 0);
    $("cart-count").textContent = n;
    $("cart-count").hidden = n === 0;
  }

  function add(code, qty) {
    const p = RDN.products().find((x) => x.codigo === code);
    if (!p || p.stock <= 0) return;
    const items = RDN.cart(s.usuario);
    const found = items.find((i) => i.codigo === code);
    const nextQty = Math.min(p.stock, (found ? found.qty : 0) + qty);
    const price = RDN.priceFor(p, s.lista);
    if (found) { found.qty = nextQty; found.precio = price; found.nombre = p.nombre; found.unidad = p.unidad; }
    else items.push({ codigo: code, nombre: p.nombre, qty: nextQty, precio: price, unidad: p.unidad });
    RDN.setCart(s.usuario, items);
    paintCartCount();
    renderCart();
  }

  function renderCart() {
    const items = RDN.cart(s.usuario);
    const box = $("cart-items");
    if (!items.length) {
      box.innerHTML = "<p class='hint'>El pedido está vacío.</p>";
      $("cart-total").textContent = RDN.money(0);
      return;
    }
    box.innerHTML = items.map((i) => `<div class="cart-item">
      <div>
        <div class="sku">${i.codigo}</div>
        <strong>${i.nombre}</strong>
        <div class="meta">${i.qty} ${i.unidad} × ${RDN.money(i.precio)}</div>
      </div>
      <div>
        <div class="amt">${RDN.money(i.qty * i.precio)}</div>
        <button class="btn btn-ghost btn-sm" type="button" data-del="${i.codigo}">Quitar</button>
      </div>
    </div>`).join("");
    const total = items.reduce((a, i) => a + i.qty * i.precio, 0);
    $("cart-total").textContent = RDN.money(total);
  }

  function orderText() {
    const items = RDN.cart(s.usuario);
    const total = items.reduce((a, i) => a + i.qty * i.precio, 0);
    const lines = [
      "Pedido demo — Repuestos del Norte",
      "Cliente: " + s.nombre,
      "Lista: " + s.lista,
      "",
      ...items.map((i) => `• ${i.qty} ${i.unidad} ${i.codigo} ${i.nombre} — ${RDN.money(i.qty * i.precio)}`),
      "",
      "Total: " + RDN.money(total),
      "(Este mensaje es de demostración y no se envía.)"
    ];
    return lines.join("\n");
  }

  $("q").addEventListener("input", (e) => { q = e.target.value.trim().toLowerCase(); render(); });
  $("filtro-rubro").addEventListener("change", (e) => { rubro = e.target.value; render(); });
  $("filtro-marca").addEventListener("change", (e) => { marca = e.target.value; render(); });
  $("grid").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add]");
    if (!btn) return;
    const card = btn.closest(".card");
    const qty = Number(card.querySelector("input").value) || 1;
    add(btn.getAttribute("data-add"), qty);
  });
  $("btn-cart").addEventListener("click", () => {
    renderCart();
    $("drawer").hidden = false;
  });
  $("cart-items").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-del]");
    if (!btn) return;
    RDN.setCart(s.usuario, RDN.cart(s.usuario).filter((i) => i.codigo !== btn.getAttribute("data-del")));
    paintCartCount();
    renderCart();
  });
  document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => {
    $("drawer").hidden = true;
    $("modal").hidden = true;
  }));
  $("drawer").addEventListener("click", (e) => { if (e.target.id === "drawer") $("drawer").hidden = true; });
  $("modal").addEventListener("click", (e) => { if (e.target.id === "modal") $("modal").hidden = true; });

  function openDemo(titulo, intro) {
    if (!RDN.cart(s.usuario).length) return;
    $("modal-title").textContent = titulo;
    $("modal-intro").textContent = intro;
    $("modal-preview").textContent = orderText();
    $("modal").hidden = false;
  }
  $("btn-wa").addEventListener("click", () => openDemo(
    "Pedido por WhatsApp (demo)",
    "En un portal real, este botón abre WhatsApp del negocio con el pedido armado. Acá no se envía nada."
  ));
  $("btn-mail").addEventListener("click", () => openDemo(
    "Pedido por mail (demo)",
    "En un portal real, este botón arma un mail al negocio con el detalle. Acá no se envía nada."
  ));
  $("btn-salir").addEventListener("click", () => { RDN.logout(); location.href = "index.html"; });

  fillFilters();
  render();
})();
