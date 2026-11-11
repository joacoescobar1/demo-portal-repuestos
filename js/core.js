/* Demo estático: la "autenticación" es solo de interfaz. No es un sistema real. */
(function (w) {
  const KEYS = {
    session: "rdn-session",
    products: "rdn-products-v2",
    clients: "rdn-clients",
    rates: "rdn-rates",
    cart: "rdn-cart"
  };

  const DEFAULT_RATES = {
    mostrador: 0,
    taller: -18,
    mayorista: -32
  };

  const DEFAULT_USERS = [
    { usuario: "taller", password: "demo", nombre: "Taller San Lorenzo", rol: "cliente", lista: "taller" },
    { usuario: "mayorista", password: "demo", nombre: "Distribuidora Pampa", rol: "cliente", lista: "mayorista" },
    { usuario: "admin", password: "demo", nombre: "Dueño · Repuestos del Norte", rol: "admin", lista: "mostrador" }
  ];

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }
  function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function clients() {
    const extra = load(KEYS.clients, []);
    const map = new Map(DEFAULT_USERS.map((u) => [u.usuario, { ...u }]));
    extra.forEach((c) => map.set(c.usuario, c));
    return [...map.values()];
  }
  function addClient(client) {
    const extra = load(KEYS.clients, []).filter((c) => c.usuario !== client.usuario);
    extra.push(client);
    save(KEYS.clients, extra);
  }

  function rates() {
    return { ...DEFAULT_RATES, ...load(KEYS.rates, {}) };
  }
  function setRates(next) {
    save(KEYS.rates, next);
  }

  function products() {
    const override = load(KEYS.products, null);
    return override || (w.RDN_PRODUCTS || []).map((p) => ({ ...p }));
  }
  function setProducts(list) {
    save(KEYS.products, list);
  }
  function resetProducts() {
    localStorage.removeItem(KEYS.products);
  }

  function priceFor(product, lista) {
    const r = rates()[lista] ?? 0;
    const base = Number(product.precio_mostrador) || 0;
    return Math.round(base * (1 + r / 100));
  }

  function money(n) {
    return "$" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  function stockLabel(n) {
    n = Number(n) || 0;
    if (n <= 0) return { text: "Sin stock", cls: "out" };
    if (n <= 8) return { text: "Pocas unidades", cls: "low" };
    if (n <= 25) return { text: "Stock medio", cls: "ok" };
    return { text: "Buen stock", cls: "ok" };
  }

  function session() {
    return load(KEYS.session, null);
  }
  function login(usuario, password) {
    const u = clients().find((c) => c.usuario === usuario && c.password === password);
    if (!u) return null;
    const s = { usuario: u.usuario, nombre: u.nombre, rol: u.rol, lista: u.lista };
    save(KEYS.session, s);
    return s;
  }
  function logout() {
    localStorage.removeItem(KEYS.session);
  }

  function cartKey(user) {
    return KEYS.cart + ":" + (user || "anon");
  }
  function cart(user) {
    return load(cartKey(user), []);
  }
  function setCart(user, items) {
    save(cartKey(user), items);
  }

  function requireSession(opts) {
    const s = session();
    if (!s) {
      location.href = opts || "index.html";
      return null;
    }
    return s;
  }

  /* CSV: codigo,nombre,marca,rubro,precio_mostrador,stock,unidad */
  function parseCSV(text) {
    const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
    if (!lines.length) return { error: "El archivo está vacío." };
    const headers = splitCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
    const need = ["codigo", "nombre", "marca", "rubro", "precio_mostrador", "stock"];
    const missing = need.filter((k) => !headers.includes(k));
    if (missing.length) return { error: "Faltan columnas: " + missing.join(", ") + "." };
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = splitCSVLine(lines[i]);
      const rec = {};
      headers.forEach((h, idx) => { rec[h] = (cols[idx] || "").trim(); });
      if (!rec.codigo) continue;
      rec.precio_mostrador = Number(String(rec.precio_mostrador).replace(/\./g, "").replace(",", ".")) || 0;
      rec.stock = Number(rec.stock) || 0;
      rec.unidad = rec.unidad || "unid.";
      rec.imagen = rec.imagen || "";
      rows.push(rec);
    }
    return { rows };
  }

  function splitCSVLine(line) {
    const out = [];
    let cur = "", q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (q && line[i + 1] === '"') { cur += '"'; i++; }
        else q = !q;
      } else if (ch === "," && !q) { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  }

  function mergeProducts(existing, incoming) {
    const map = new Map(existing.map((p) => [p.codigo, { ...p }]));
    const added = [];
    const updated = [];
    incoming.forEach((row) => {
      const prev = map.get(row.codigo);
      const imagen = (prev && prev.imagen) || row.imagen || "img/fotos/estanteria.webp";
      const next = { ...prev, ...row, imagen };
      map.set(row.codigo, next);
      if (prev) updated.push(row.codigo);
      else added.push(row.codigo);
    });
    return { list: [...map.values()], added, updated };
  }

  w.RDN = {
    KEYS, DEFAULT_RATES, DEFAULT_USERS,
    clients, addClient, rates, setRates,
    products, setProducts, resetProducts,
    priceFor, money, stockLabel,
    session, login, logout, requireSession,
    cart, setCart, parseCSV, mergeProducts
  };
})(window);
