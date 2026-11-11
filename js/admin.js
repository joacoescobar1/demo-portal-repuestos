(function () {
  const s = RDN.requireSession("index.html");
  if (!s) return;
  if (s.rol !== "admin") {
    location.href = "catalogo.html";
    return;
  }
  const $ = (id) => document.getElementById(id);
  $("who-name").textContent = s.nombre;

  function showTab(id) {
    document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.id === id));
    document.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-selected", t.dataset.tab === id ? "true" : "false"));
  }
  document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => showTab(t.dataset.tab)));

  function renderClients() {
    const rows = RDN.clients().map((c) => `<tr>
      <td class="mono">${c.usuario}</td>
      <td>${c.nombre}</td>
      <td>${c.rol}</td>
      <td><span class="tag ${c.lista === "taller" ? "tag-t" : c.lista === "mayorista" ? "tag-m" : "tag-c"}">${c.lista}</span></td>
    </tr>`).join("");
    $("clientes-body").innerHTML = rows;
  }

  $("form-cliente").addEventListener("submit", (e) => {
    e.preventDefault();
    const usuario = $("c-usuario").value.trim().toLowerCase();
    const nombre = $("c-nombre").value.trim();
    const password = $("c-pass").value || "demo";
    const lista = $("c-lista").value;
    if (!usuario || !nombre) return;
    RDN.addClient({ usuario, password, nombre, rol: "cliente", lista });
    $("form-cliente").reset();
    $("c-msg").textContent = "Cliente guardado. En la demo la contraseña queda en este navegador.";
    renderClients();
  });

  function renderRates() {
    const r = RDN.rates();
    $("r-mostrador").value = r.mostrador;
    $("r-taller").value = r.taller;
    $("r-mayorista").value = r.mayorista;
    renderPreview();
  }
  $("btn-rates").addEventListener("click", () => {
    RDN.setRates({
      mostrador: Number($("r-mostrador").value) || 0,
      taller: Number($("r-taller").value) || 0,
      mayorista: Number($("r-mayorista").value) || 0
    });
    $("rates-msg").textContent = "Recargos y descuentos actualizados. Se ven al instante en el catálogo.";
    renderPreview();
  });

  function renderPreview() {
    const sample = RDN.products().slice(0, 6);
    $("preview-body").innerHTML = sample.map((p) => `<tr>
      <td class="mono">${p.codigo}</td>
      <td>${p.nombre}</td>
      <td>${RDN.money(RDN.priceFor(p, "mostrador"))}</td>
      <td>${RDN.money(RDN.priceFor(p, "taller"))}</td>
      <td>${RDN.money(RDN.priceFor(p, "mayorista"))}</td>
    </tr>`).join("");
  }

  let pending = null;
  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = RDN.parseCSV(String(reader.result));
      if (parsed.error) {
        $("import-msg").textContent = parsed.error;
        pending = null;
        return;
      }
      pending = parsed.rows;
      $("import-msg").textContent = `Listo para importar ${parsed.rows.length} filas. Revisá la vista previa y confirmá.`;
      $("import-preview").innerHTML = parsed.rows.slice(0, 8).map((r) =>
        `<tr><td class="mono">${r.codigo}</td><td>${r.nombre}</td><td>${r.marca}</td><td>${RDN.money(r.precio_mostrador)}</td><td>${r.stock}</td></tr>`
      ).join("");
      $("btn-apply").disabled = false;
    };
    reader.readAsText(file, "utf-8");
  }

  $("csv-file").addEventListener("change", (e) => handleFile(e.target.files[0]));
  const drop = $("drop");
  ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", (e) => handleFile(e.dataTransfer.files[0]));

  $("btn-apply").addEventListener("click", () => {
    if (!pending) return;
    const { list, added, updated } = RDN.mergeProducts(RDN.products(), pending);
    RDN.setProducts(list);
    $("import-msg").textContent = `Importación hecha en este navegador: ${added.length} nuevos, ${updated.length} actualizados. Total: ${list.length}.`;
    pending = null;
    $("btn-apply").disabled = true;
    renderPreview();
  });
  $("btn-reset").addEventListener("click", () => {
    RDN.resetProducts();
    $("import-msg").textContent = "Volviste a la lista de demostración original.";
    renderPreview();
  });

  $("btn-salir").addEventListener("click", () => { RDN.logout(); location.href = "index.html"; });

  renderClients();
  renderRates();
})();
