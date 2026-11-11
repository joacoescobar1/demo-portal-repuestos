(function () {
  const s = RDN.requireSession("index.html");
  if (!s) return;
  const WA_NUMBER = "5491100000000"; // número de prueba de la demo
  const $ = (id) => document.getElementById(id);
  const LIST_LABEL = { mostrador: "Mostrador", taller: "Taller", mayorista: "Mayorista" };
  const listName = LIST_LABEL[s.lista] || s.lista;

  $("who-name").textContent = s.nombre;
  $("who-list").textContent = "Lista " + listName;
  $("who-list").classList.add("l-" + s.lista);
  if (s.rol === "admin") $("admin-link").hidden = false;

  let q = "", rubro = "", marca = "";
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function list() {
    return RDN.products().filter((p) => {
      if (rubro && p.rubro !== rubro) return false;
      if (marca && p.marca !== marca) return false;
      if (q && !(p.codigo + " " + p.nombre + " " + p.marca).toLowerCase().includes(q)) return false;
      return true;
    });
  }

  function fillFilters() {
    const prods = RDN.products();
    const rubros = [...new Set(prods.map((p) => p.rubro))];
    $("rubros").innerHTML = ['<button class="rubro-chip" type="button" data-rubro="" aria-pressed="true">Todo</button>']
      .concat(rubros.map((r) => `<button class="rubro-chip" type="button" data-rubro="${esc(r)}" aria-pressed="false">${esc(r)}</button>`)).join("");
    const marcas = [...new Set(prods.map((p) => p.marca))].sort();
    $("filtro-marca").innerHTML = '<option value="">Todas las marcas</option>' + marcas.map((m) => `<option>${esc(m)}</option>`).join("");
  }

  function render() {
    const items = list();
    const rate = RDN.rates()[s.lista] || 0;
    $("count").textContent = items.length + (items.length === 1 ? " producto" : " productos");
    $("grid").innerHTML = items.map((p) => {
      const price = RDN.priceFor(p, s.lista);
      const base = RDN.priceFor(p, "mostrador");
      const st = RDN.stockLabel(p.stock);
      const out = p.stock <= 0;
      return `<article class="card" data-code="${esc(p.codigo)}">
        <div class="pic"><img src="${esc(p.imagen)}" alt="${esc(p.nombre)}" loading="lazy" width="900" height="900">${rate < 0 ? `<span class="off">${rate}%</span>` : ""}</div>
        <div class="body">
          <div class="sku">${esc(p.codigo)}</div>
          <h3>${esc(p.nombre)}</h3>
          <div class="meta">${esc(p.marca)} · ${esc(p.unidad)}</div>
          <div class="price-row"><span class="price">${RDN.money(price)}</span>${price !== base ? `<span class="was">${RDN.money(base)}</span>` : ""}</div>
          <div class="stock ${st.cls}">${st.text}</div>
          <div class="qtyrow">
            <div class="stepper"><button type="button" data-step="-1" aria-label="Menos" ${out ? "disabled" : ""}>−</button><input type="number" min="1" max="${Math.max(1, p.stock)}" value="1" aria-label="Cantidad" ${out ? "disabled" : ""}><button type="button" data-step="1" aria-label="Más" ${out ? "disabled" : ""}>+</button></div>
            <button class="btn btn-primary" type="button" data-add="${esc(p.codigo)}" ${out ? "disabled" : ""}>${out ? "Sin stock" : "Agregar"}</button>
          </div>
        </div>
      </article>`;
    }).join("") || '<p class="empty">No hay productos con ese filtro. Probá con otra palabra o elegí “Todo”.</p>';
    paintCount();
  }

  function cartItems() { return RDN.cart(s.usuario); }
  function paintCount(bump) {
    const n = cartItems().reduce((a, i) => a + i.qty, 0);
    const el = $("cart-count");
    el.textContent = n; el.hidden = n === 0;
    if (bump) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
  }
  let toastT;
  function toast(msg) {
    const t = $("toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 1800);
  }

  function add(code, qty) {
    const p = RDN.products().find((x) => x.codigo === code);
    if (!p || p.stock <= 0) return;
    const items = cartItems();
    const found = items.find((i) => i.codigo === code);
    const nextQty = Math.min(p.stock, (found ? found.qty : 0) + qty);
    const price = RDN.priceFor(p, s.lista);
    if (found) Object.assign(found, { qty: nextQty, precio: price, nombre: p.nombre, unidad: p.unidad, imagen: p.imagen });
    else items.push({ codigo: code, nombre: p.nombre, qty: nextQty, precio: price, unidad: p.unidad, imagen: p.imagen });
    RDN.setCart(s.usuario, items);
    paintCount(true);
    toast(`Agregado: ${qty} × ${p.nombre}`);
  }

  function total(items) { return items.reduce((a, i) => a + i.qty * i.precio, 0); }
  function renderCart() {
    const items = cartItems();
    $("cart-sub").textContent = `Con los precios de tu lista ${listName.toLowerCase()}`;
    $("cart-items").innerHTML = items.length ? items.map((i) => `<div class="cart-item">
        <img src="${esc(i.imagen || "img/fotos/estanteria.webp")}" alt="">
        <div><strong>${esc(i.nombre)}</strong><div class="meta">${esc(i.codigo)} · ${i.qty} × ${RDN.money(i.precio)}</div></div>
        <div><div class="amt">${RDN.money(i.qty * i.precio)}</div><button class="del" type="button" data-del="${esc(i.codigo)}">Quitar</button></div>
      </div>`).join("") : '<p class="hint" style="padding:24px 0">Tu pedido está vacío. Agregá productos desde el catálogo.</p>';
    $("cart-total").textContent = RDN.money(total(items));
    $("btn-wa").disabled = !items.length; $("btn-mail").disabled = !items.length;
  }

  function orderNumber() {
    const k = "rdn-order-seq";
    const n = (Number(localStorage.getItem(k)) || 1041) + 1;
    localStorage.setItem(k, String(n));
    return "RN-" + n;
  }
  function orderText(num) {
    const items = cartItems();
    return [
      `*Pedido ${num}*`,
      `Cliente: ${s.nombre}`,
      `Lista: ${listName}`,
      "",
      ...items.map((i) => `${i.qty} × ${i.codigo} · ${i.nombre} · ${RDN.money(i.qty * i.precio)}`),
      "",
      `*Total: ${RDN.money(total(items))}*`,
      "Retiro por mostrador."
    ].join("\n");
  }
  const fmt = (t) => esc(t).replace(/\*([^*\n]+)\*/g, "<b>$1</b>");
  const now = () => new Date().toTimeString().slice(0, 5);

  let timers = [];
  function openWhatsApp() {
    const items = cartItems();
    if (!items.length) return;
    const num = orderNumber();
    const text = orderText(num);
    $("wa-open").href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
    const msgs = $("wa-msgs");
    msgs.innerHTML = `<div class="wa-day">Hoy</div><div class="wa-sys">Los mensajes y las llamadas están cifrados de extremo a extremo.</div>`;
    $("drawer").hidden = true;
    $("wa-screen").hidden = false;
    document.body.style.overflow = "hidden";
    $("wa-status").textContent = "en línea";
    timers.forEach(clearTimeout); timers = [];
    const out = document.createElement("div");
    out.className = "bubble out";
    out.innerHTML = `${fmt(text)}<time>${now()}<span class="tk" id="wa-tk">✓✓</span></time>`;
    timers.push(setTimeout(() => { msgs.appendChild(out); msgs.scrollTop = msgs.scrollHeight; }, 350));
    timers.push(setTimeout(() => {
      $("wa-tk").classList.add("read");
      $("wa-status").textContent = "escribiendo…";
      const ty = document.createElement("div"); ty.className = "typing"; ty.id = "wa-typing"; ty.innerHTML = "<i></i><i></i><i></i>";
      msgs.appendChild(ty); msgs.scrollTop = msgs.scrollHeight;
    }, 1500));
    timers.push(setTimeout(() => {
      $("wa-typing")?.remove();
      $("wa-status").textContent = "en línea";
      const first = s.nombre.split(" ")[0] === "Taller" || s.nombre.split(" ")[0] === "Distribuidora" ? s.nombre : s.nombre.split(" ")[0];
      const n = items.reduce((a, i) => a + i.qty, 0);
      const inc = document.createElement("div");
      inc.className = "bubble in";
      inc.innerHTML = `${fmt(`¡Gracias, ${first}! Recibimos el *pedido ${num}* (${n} ${n === 1 ? "unidad" : "unidades"}). Lo preparamos y te avisamos por acá cuando está listo para retirar.`)}<time>${now()}</time>`;
      msgs.appendChild(inc); msgs.scrollTop = msgs.scrollHeight;
    }, 3400));
  }
  function closeWhatsApp(clear) {
    timers.forEach(clearTimeout); timers = [];
    $("wa-screen").hidden = true;
    document.body.style.overflow = "";
    if (clear) { RDN.setCart(s.usuario, []); paintCount(); toast("Pedido enviado. Podés armar otro cuando quieras."); }
  }

  $("q").addEventListener("input", (e) => { q = e.target.value.trim().toLowerCase(); render(); });
  $("rubros").addEventListener("click", (e) => {
    const b = e.target.closest("[data-rubro]"); if (!b) return;
    rubro = b.dataset.rubro;
    document.querySelectorAll("[data-rubro]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    render();
  });
  $("filtro-marca").addEventListener("change", (e) => { marca = e.target.value; render(); });
  $("grid").addEventListener("click", (e) => {
    const step = e.target.closest("[data-step]");
    if (step) {
      const input = step.parentElement.querySelector("input");
      const v = Math.min(Number(input.max) || 99, Math.max(1, (Number(input.value) || 1) + Number(step.dataset.step)));
      input.value = v; return;
    }
    const btn = e.target.closest("[data-add]");
    if (!btn) return;
    const qty = Math.max(1, Number(btn.closest(".card").querySelector("input").value) || 1);
    add(btn.dataset.add, qty);
  });
  $("btn-cart").addEventListener("click", () => { $("toast").classList.remove("show"); renderCart(); $("drawer").hidden = false; document.body.style.overflow = "hidden"; });
  $("cart-items").addEventListener("click", (e) => {
    const b = e.target.closest("[data-del]"); if (!b) return;
    RDN.setCart(s.usuario, cartItems().filter((i) => i.codigo !== b.dataset.del));
    paintCount(); renderCart();
  });
  function closeLayers() { $("drawer").hidden = true; $("modal").hidden = true; document.body.style.overflow = ""; }
  document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeLayers));
  $("drawer").addEventListener("click", (e) => { if (e.target.id === "drawer") closeLayers(); });
  $("modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeLayers(); });
  $("wa-screen").addEventListener("click", (e) => { if (e.target.id === "wa-screen") closeWhatsApp(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeLayers(); if (!$("wa-screen").hidden) closeWhatsApp(false); } });

  $("btn-wa").addEventListener("click", openWhatsApp);
  $("wa-done").addEventListener("click", () => closeWhatsApp(true));
  $("btn-mail").addEventListener("click", () => {
    if (!cartItems().length) return;
    $("modal-preview").textContent = "Asunto: Pedido de " + s.nombre + "\n\n" + orderText(orderNumber()).replace(/\*/g, "");
    $("drawer").hidden = true; $("modal").hidden = false;
  });
  const salir = () => { RDN.logout(); location.href = "index.html"; };
  $("btn-salir").addEventListener("click", salir);
  $("btn-salir-2").addEventListener("click", salir);

  fillFilters();
  render();
})();
