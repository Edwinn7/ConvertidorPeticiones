let currentType = 'Producto';
let lines = [];

const typeTabs = document.getElementById('typeTabs');
typeTabs.querySelectorAll('.type-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    typeTabs.querySelectorAll('.type-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentType = tab.dataset.type;
    document.querySelectorAll('.field-group').forEach(g => g.classList.remove('active'));
    const grp = document.getElementById('grp-' + currentType);
    if (grp) grp.classList.add('active');
    document.getElementById('commonFields').style.display = (currentType === 'Observacion') ? 'none' : 'block';
    hideError();
  });
});
document.getElementById('commonFields').style.display = 'block';
document.getElementById('grp-Producto').classList.add('active');

function showError(msg) {
  const box = document.getElementById('errBox');
  box.textContent = msg;
  box.style.display = 'block';
}
function hideError() {
  document.getElementById('errBox').style.display = 'none';
}

function buildLine() {
  hideError();
  const itemNo = document.getElementById('itemNo').value.trim();

  if (currentType === 'Observacion') {
    const obs = document.getElementById('obsText').value.trim();
    if (obs === '') { showError('La observación no puede estar vacía.'); return null; }
    if (obs.length > 50) { showError('La observación supera 50 caracteres.'); return null; }
    // Observacion:Texto (resto de posiciones no aplica)
    return 'Observacion:' + obs;
  }

  const qty = document.getElementById('qty').value;
  const maintNo = document.getElementById('maintNo').value;
  const serviceType = document.getElementById('serviceType').value.trim();

  if (itemNo === '') { showError('El código (ItemNo) es obligatorio.'); return null; }
  if (qty === '') { showError('La cantidad es obligatoria.'); return null; }
  if (Number(qty) < 0) { showError('La cantidad no puede ser negativa.'); return null; }
  if (maintNo === '') { showError('El Nº de mantenimiento es obligatorio.'); return null; }
  if (serviceType === '') { showError('El tipo de servicio es obligatorio.'); return null; }

  // Posiciones 5..10 con default seguro (nunca vacías las numéricas)
  let tempario = '', workType = '', costAmt = '0', costDesc = '', discountPct = '0', samplePart = '0';

  if (currentType === 'Producto') {
    samplePart = document.getElementById('samplePart').value;
    tempario = document.getElementById('tempario') ? '' : ''; // no aplica
  }

  if (currentType === 'Recurso') {
    tempario = document.getElementById('tempario').value.trim();
    workType = document.getElementById('workType').value.trim();
    discountPct = document.getElementById('discountPct').value.trim() || '0';
    const resourceDesc = document.getElementById('resourceDesc').value.trim();

    if (tempario === '') { showError('Tempario es obligatorio para recursos.'); return null; }
    if (workType === '') { showError('Tipo de trabajo es obligatorio para recursos.'); return null; }
    if (Number(discountPct) < 0 || Number(discountPct) > 100) { showError('% de descuento fuera de rango (0-100).'); return null; }

    const isCodServStandard = ['MANO_DE_OBRA', 'MANO_DE_OBRA1', 'MANO_DE_OBRA2', 'MANO_DE_OBRA3', 'MANO_DE_OBRA4'].includes(itemNo);
    if (serviceType === 'MTTO_PREP' && isCodServStandard && resourceDesc === '') {
      showError('La descripción es obligatoria para ' + itemNo + ' en pedidos MTTO_PREP.'); return null;
    }
    if (resourceDesc.length > 50) { showError('La descripción del recurso supera 50 caracteres.'); return null; }
  }

  if (currentType === 'Coste') {
    costAmt = document.getElementById('costAmt').value.trim();
    costDesc = document.getElementById('costDesc').value.trim();
    if (costAmt === '') { showError('El monto (CostAmt) es obligatorio.'); return null; }
    if (costDesc.length > 50) { showError('La descripción del coste supera 50 caracteres.'); return null; }
    if (!['C3', 'S3'].includes(itemNo) && costDesc !== '') {
      showError('Solo los códigos C3 o S3 pueden tener descripción.'); return null;
    }
  }

  // Estructura posicional 0..11 según SetServiceLines
  // 0 LineType | 1 ItemNo | 2 Qty | 3 MaintNo | 4 ServiceType | 5 Tempario |
  // 6 WorkType | 7 CostAmt | 8 CostDescription | 9 DiscountPct | 10 SamplePart | 11 ResourceDescription
  let resourceDescField = '';
  if (currentType === 'Recurso') {
    resourceDescField = document.getElementById('resourceDesc').value.trim();
  }

  const parts = [
    currentType,
    itemNo,
    qty,
    maintNo,
    serviceType,
    tempario,
    workType,
    costAmt,
    costDesc,
    discountPct,
    samplePart,
    resourceDescField
  ];
  return parts.join(':');
}

document.getElementById('addLineBtn').addEventListener('click', () => {
  const line = buildLine();
  if (line === null) return;
  lines.push(line);
  renderLines();
  regenerateOutput();
});

function renderLines() {
  const container = document.getElementById('linesList');
  container.innerHTML = '';
  lines.forEach((l, idx) => {
    const div = document.createElement('div');
    div.className = 'line-item';
    const span = document.createElement('span');
    span.className = 'txt';
    span.textContent = l;
    const rm = document.createElement('button');
    rm.className = 'rm';
    rm.textContent = '×';
    rm.addEventListener('click', () => {
      lines.splice(idx, 1);
      renderLines();
      regenerateOutput();
    });
    div.appendChild(span);
    div.appendChild(rm);
    container.appendChild(div);
  });
}

function regenerateOutput() {
  const str = lines.join(',');
  document.getElementById('outString').value = str;

  const docNo = document.getElementById('docNo').value.trim() || 'PSER_XXXXXXX';
  const primaryFailurePart = esc(document.getElementById('primaryFailurePart').value.trim());
  const faultAreaCode = esc(document.getElementById('faultAreaCode').value.trim());
  const symptomCode = esc(document.getElementById('symptomCode').value.trim());
  const failureCode = esc(document.getElementById('failureCode').value.trim());

  // Validación no bloqueante: si alguna línea es GARANTIA, estos 4 campos son obligatorios
  // (según SetServiceLines: FaultAreaCodeRec.GET / SymptomCodeRec.GET / FailureCodeRec.GET)
  const warnBox = document.getElementById('warrantyErrBox');
  const hasGarantia = lines.some(l => l.split(':')[4] === 'GARANTIA');
  if (hasGarantia && (!primaryFailurePart || !faultAreaCode || !symptomCode || !failureCode)) {
    warnBox.textContent = 'Hay una línea GARANTIA: primaryFailurePart, faultAreaCode, symptomCode y failureCode son obligatorios.';
    warnBox.style.display = 'block';
  } else {
    warnBox.style.display = 'none';
  }

  const xml = `<Envelope
\txmlns="http://schemas.xmlsoap.org/soap/envelope/">
\t<Body>
\t\t<CreateServiceOrderLine
\t\t\txmlns="urn:microsoft-dynamics-schemas/codeunit/Csa218Integration">
\t\t\t<serviceOrderNo>${docNo}</serviceOrderNo>
\t\t\t<txtItemsAndQuantities>${str}</txtItemsAndQuantities>
\t\t\t<primaryFailurePart>${primaryFailurePart}</primaryFailurePart>
\t\t\t<faultAreaCode>${faultAreaCode}</faultAreaCode>
\t\t\t<symptomCode>${symptomCode}</symptomCode>
\t\t\t<failureCode>${failureCode}</failureCode>
\t\t</CreateServiceOrderLine>
\t</Body>
</Envelope>`;
  document.getElementById('outXml').value = xml;
}

document.getElementById('primaryFailurePart').addEventListener('input', regenerateOutput);
document.getElementById('faultAreaCode').addEventListener('input', regenerateOutput);
document.getElementById('symptomCode').addEventListener('input', regenerateOutput);
document.getElementById('failureCode').addEventListener('input', regenerateOutput);

document.getElementById('docNo').addEventListener('input', regenerateOutput);

function copyToClipboard(elId) {
  const el = document.getElementById(elId);
  el.select();
  document.execCommand('copy');
  const ok = document.getElementById('okBox');
  ok.style.display = 'block';
  setTimeout(() => ok.style.display = 'none', 1500);
}
document.getElementById('copyStringBtn').addEventListener('click', () => copyToClipboard('outString'));
document.getElementById('copyXmlBtn').addEventListener('click', () => copyToClipboard('outXml'));

// ---- Importación desde JSON ----
function showJsonError(msg) {
  const box = document.getElementById('jsonErrBox');
  box.textContent = msg;
  box.style.display = 'block';
  document.getElementById('jsonOkBox').style.display = 'none';
}
function showJsonOk(msg) {
  const box = document.getElementById('jsonOkBox');
  box.textContent = msg;
  box.style.display = 'block';
  document.getElementById('jsonErrBox').style.display = 'none';
}

// Construye una línea posicional a partir de un item de JSON, aplicando
// las mismas reglas de SetServiceLines (numéricos nunca vacíos, obligatorios por tipo).
function buildLineFromJsonItem(item, idx) {
  const type = (item.Type || '').trim();
  const validTypes = ['Producto', 'Recurso', 'Coste', 'Observacion'];
  if (!validTypes.includes(type)) {
    throw new Error('Línea ' + (idx + 1) + ': Type inválido ("' + type + '"). Debe ser Producto, Recurso, Coste u Observacion.');
  }

  if (type === 'Observacion') {
    const obs = (item.ItemNo || item.Observation || item.Text || '').toString().trim();
    if (obs === '') { throw new Error('Línea ' + (idx + 1) + ': la observación no puede estar vacía.'); }
    if (obs.length > 50) { throw new Error('Línea ' + (idx + 1) + ': observación supera 50 caracteres.'); }
    return 'Observacion:' + obs;
  }

  const itemNo = (item.ItemNo || '').toString().trim();
  const qty = (item.Quantity !== undefined && item.Quantity !== null) ? item.Quantity.toString().trim() : '';
  const maintNo = (item.MaintenanceNumber !== undefined && item.MaintenanceNumber !== null) ? item.MaintenanceNumber.toString().trim() : '';
  const serviceType = (item.ServiceType || '').toString().trim();

  if (itemNo === '') { throw new Error('Línea ' + (idx + 1) + ': ItemNo es obligatorio.'); }
  if (qty === '') { throw new Error('Línea ' + (idx + 1) + ': Quantity es obligatorio.'); }
  if (Number(qty) < 0) { throw new Error('Línea ' + (idx + 1) + ': la cantidad no puede ser negativa.'); }
  if (maintNo === '') { throw new Error('Línea ' + (idx + 1) + ': MaintenanceNumber es obligatorio.'); }
  if (serviceType === '') { throw new Error('Línea ' + (idx + 1) + ': ServiceType es obligatorio.'); }

  // Defaults seguros: numéricos nunca vacíos (evita NavNCLEvaluateException)
  let tempario = (item.Tempario || '').toString().trim();
  let workType = (item.WorkType || '').toString().trim();
  let costAmt = (item.CostAmount !== undefined && item.CostAmount !== null && item.CostAmount !== '') ? item.CostAmount.toString().trim() : '0';
  let costDesc = (item.CostDescription || '').toString().trim();
  let discountPct = (item.DiscountPct !== undefined && item.DiscountPct !== null && item.DiscountPct !== '') ? item.DiscountPct.toString().trim() : '0';
  let samplePart = (item.SamplePart !== undefined && item.SamplePart !== null && item.SamplePart !== '') ? item.SamplePart.toString().trim() : '0';
  let resourceDesc = (item.ResourceDescription || '').toString().trim();

  if (type === 'Recurso') {
    if (tempario === '') { throw new Error('Línea ' + (idx + 1) + ' (' + itemNo + '): Tempario es obligatorio para recursos.'); }
    if (workType === '') { throw new Error('Línea ' + (idx + 1) + ' (' + itemNo + '): WorkType es obligatorio para recursos.'); }
    if (Number(discountPct) < 0 || Number(discountPct) > 100) { throw new Error('Línea ' + (idx + 1) + ' (' + itemNo + '): DiscountPct fuera de rango (0-100).'); }
    const isCodServStandard = ['MANO_DE_OBRA', 'MANO_DE_OBRA1', 'MANO_DE_OBRA2', 'MANO_DE_OBRA3', 'MANO_DE_OBRA4'].includes(itemNo);
    if (serviceType === 'MTTO_PREP' && isCodServStandard && resourceDesc === '') {
      throw new Error('Línea ' + (idx + 1) + ' (' + itemNo + '): descripción obligatoria para código estándar en MTTO_PREP.');
    }
    if (resourceDesc.length > 50) { throw new Error('Línea ' + (idx + 1) + ' (' + itemNo + '): descripción de recurso supera 50 caracteres.'); }
  }

  if (type === 'Coste') {
    if (costAmt === '') { throw new Error('Línea ' + (idx + 1) + ' (' + itemNo + '): CostAmount es obligatorio.'); }
    if (costDesc.length > 50) { throw new Error('Línea ' + (idx + 1) + ' (' + itemNo + '): CostDescription supera 50 caracteres.'); }
    if (!['C3', 'S3'].includes(itemNo) && costDesc !== '') {
      throw new Error('Línea ' + (idx + 1) + ' (' + itemNo + '): solo C3 o S3 pueden llevar descripción.');
    }
  }

  const parts = [type, itemNo, qty, maintNo, serviceType, tempario, workType, costAmt, costDesc, discountPct, samplePart, resourceDesc];
  return parts.join(':');
}

document.getElementById('importJsonBtn').addEventListener('click', () => {
  const raw = document.getElementById('jsonInput').value.trim();
  if (raw === '') { showJsonError('Pega un JSON primero.'); return; }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    showJsonError('JSON inválido: ' + e.message);
    return;
  }

  const items = data.Items || data.items;
  if (!Array.isArray(items) || items.length === 0) {
    showJsonError('El JSON debe tener un arreglo "Items" con al menos una línea.');
    return;
  }

  const newLines = [];
  try {
    items.forEach((item, idx) => {
      newLines.push(buildLineFromJsonItem(item, idx));
    });
  } catch (e) {
    showJsonError(e.message);
    return;
  }

  // Todo válido: reemplaza las líneas actuales por las del JSON
  lines = newLines;
  renderLines();

  const docNo = data.ServiceOrderNo || data.serviceOrderNo || '';
  if (docNo) {
    document.getElementById('docNo').value = docNo;
  }

  // Campos de garantía a nivel de pedido (no van dentro de Items[])
  if (data.PrimaryFailurePart !== undefined && data.PrimaryFailurePart !== null) {
    document.getElementById('primaryFailurePart').value = data.PrimaryFailurePart;
  }
  if (data.FaultAreaCode !== undefined && data.FaultAreaCode !== null) {
    document.getElementById('faultAreaCode').value = data.FaultAreaCode;
  }
  if (data.SymptomCode !== undefined && data.SymptomCode !== null) {
    document.getElementById('symptomCode').value = data.SymptomCode;
  }
  if (data.FailureCode !== undefined && data.FailureCode !== null) {
    document.getElementById('failureCode').value = data.FailureCode;
  }

  regenerateOutput();
  showJsonOk(newLines.length + ' línea(s) importada(s) correctamente desde el JSON.');
});

regenerateOutput();

// =========================================================
// PESTAÑAS PRINCIPALES
// =========================================================
const mainTabs = document.getElementById('mainTabs');
mainTabs.querySelectorAll('.main-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    mainTabs.querySelectorAll('.main-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.main-tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-' + tab.dataset.maintab).classList.add('active');
  });
});

// =========================================================
// TAB 1: CREAR PEDIDO (CreateServiceOrderHeader)
// =========================================================
function esc(v) {
  // Escape básico para no romper el XML si el texto trae & < >
  return (v === undefined || v === null) ? '' : String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildHeaderXml() {
  const v = id => esc(document.getElementById(id).value.trim());
  const xml = `<Envelope
\txmlns="http://schemas.xmlsoap.org/soap/envelope/">
\t<Body>
\t\t<CreateServiceOrderHeader
\t\t\txmlns="urn:microsoft-dynamics-schemas/codeunit/Csa218Integration">
\t\t\t<billToCustomer>${v('h_billToCustomer')}</billToCustomer>
\t\t\t<shipToCode>${v('h_shipToCode')}</shipToCode>
\t\t\t<serviceItemNo>${v('h_serviceItemNo')}</serviceItemNo>
\t\t\t<resourceNo>${v('h_resourceNo')}</resourceNo>
\t\t\t<km>${v('h_km')}</km>
\t\t\t<observations>${v('h_observations')}</observations>
\t\t\t<licensePlate>${v('h_licensePlate')}</licensePlate>
\t\t\t<workshopEntryDate>${v('h_workshopEntryDate')}</workshopEntryDate>
\t\t\t<serviceOrderUser>${v('h_serviceOrderUser')}</serviceOrderUser>
\t\t\t<serviceOrderType>${v('h_serviceOrderType')}</serviceOrderType>
\t\t\t<sellToCustomer>${v('h_sellToCustomer')}</sellToCustomer>
\t\t\t<externalOrderNo>${v('h_externalOrderNo')}</externalOrderNo>
\t\t\t<contractNo>${v('h_contractNo')}</contractNo>
\t\t</CreateServiceOrderHeader>
\t</Body>
</Envelope>`;
  document.getElementById('headerOutXml').value = xml;
}
document.getElementById('genHeaderBtn').addEventListener('click', buildHeaderXml);

document.getElementById('importHeaderJsonBtn').addEventListener('click', () => {
  const errBox = document.getElementById('headerJsonErrBox');
  const okBox = document.getElementById('headerJsonOkBox');
  errBox.style.display = 'none'; okBox.style.display = 'none';

  const raw = document.getElementById('headerJsonInput').value.trim();
  if (raw === '') { errBox.textContent = 'Pega un JSON primero.'; errBox.style.display = 'block'; return; }

  let data;
  try { data = JSON.parse(raw); }
  catch (e) { errBox.textContent = 'JSON inválido: ' + e.message; errBox.style.display = 'block'; return; }

  // Mapeo JSON de creación -> campos del formulario
  const map = {
    h_km: data.Mileage,
    h_contractNo: data.ContractNo,
    h_billToCustomer: data.CustomerNo,
    h_resourceNo: data.ResourceNo,
    h_licensePlate: data.LicensePlate,
    h_observations: data.Observations,
    h_serviceItemNo: data.ServiceItemNo,
    h_sellToCustomer: data.SellToCustomer,
    h_externalOrderNo: data.ExternalOrderNo,
    h_serviceOrderType: data.ServiceOrderType,
    h_serviceOrderUser: data.ServiceOrderUser,
    h_shipToCode: data.ShipToAddressCode,
    h_workshopEntryDate: data.WorkshopEntryDate
  };
  Object.keys(map).forEach(id => {
    if (map[id] !== undefined && map[id] !== null) {
      document.getElementById(id).value = map[id];
    }
  });

  buildHeaderXml();
  okBox.textContent = 'Formulario y XML actualizados desde el JSON.';
  okBox.style.display = 'block';
});

function copyHeaderXml() {
  const el = document.getElementById('headerOutXml');
  el.select();
  document.execCommand('copy');
  const ok = document.getElementById('headerOkBox');
  ok.style.display = 'block';
  setTimeout(() => ok.style.display = 'none', 1500);
}
document.getElementById('copyHeaderXmlBtn').addEventListener('click', copyHeaderXml);

// =========================================================
// TAB 2: ACTUALIZAR PEDIDO (UpdateServiceOrder)
// =========================================================
function buildUpdateXml() {
  const v = id => esc(document.getElementById(id).value.trim());
  const xml = `<Envelope
\txmlns="http://schemas.xmlsoap.org/soap/envelope/">
\t<Body>
\t\t<UpdateServiceOrder
\t\t\txmlns="urn:microsoft-dynamics-schemas/codeunit/Csa218Integration">
\t\t\t<serviceOrderNo>${v('u_serviceOrderNo')}</serviceOrderNo>
\t\t\t<kilometers>${v('u_kilometers')}</kilometers>
\t\t\t<serviceOrderType>${v('u_serviceOrderType')}</serviceOrderType>
\t\t\t<ingressComment>${v('u_ingressComment')}</ingressComment>
\t\t\t<egressComment>${v('u_egressComment')}</egressComment>
\t\t\t<repairStatusCode>${v('u_repairStatusCode')}</repairStatusCode>
\t\t\t<resourceNo>${v('u_resourceNo')}</resourceNo>
\t\t\t<billToCustomer>${v('u_billToCustomer')}</billToCustomer>
\t\t\t<approverUserID>${v('u_approverUserID')}</approverUserID>
\t\t</UpdateServiceOrder>
\t</Body>
</Envelope>`;
  document.getElementById('updateOutXml').value = xml;
}
document.getElementById('genUpdateBtn').addEventListener('click', buildUpdateXml);

document.getElementById('importUpdateJsonBtn').addEventListener('click', () => {
  const errBox = document.getElementById('updateJsonErrBox');
  const okBox = document.getElementById('updateJsonOkBox');
  errBox.style.display = 'none'; okBox.style.display = 'none';

  const raw = document.getElementById('updateJsonInput').value.trim();
  if (raw === '') { errBox.textContent = 'Pega un JSON primero.'; errBox.style.display = 'block'; return; }

  let data;
  try { data = JSON.parse(raw); }
  catch (e) { errBox.textContent = 'JSON inválido: ' + e.message; errBox.style.display = 'block'; return; }

  // Mapeo JSON de actualización -> campos del formulario
  const map = {
    u_kilometers: data.Mileage,
    u_resourceNo: data.ResourceNo,
    u_egressComment: data.ExitComment,
    u_ingressComment: data.EntryComment,
    u_approverUserID: data.ApproverUserID,
    u_billToCustomer: data.SellToCustomer,
    u_serviceOrderNo: data.ServiceOrderNo,
    u_repairStatusCode: data.RepairStatusCode,
    u_serviceOrderType: data.ServiceOrderType
  };
  Object.keys(map).forEach(id => {
    if (map[id] !== undefined && map[id] !== null) {
      document.getElementById(id).value = map[id];
    }
  });

  buildUpdateXml();
  okBox.textContent = 'Formulario y XML actualizados desde el JSON.';
  okBox.style.display = 'block';
});

function copyUpdateXml() {
  const el = document.getElementById('updateOutXml');
  el.select();
  document.execCommand('copy');
  const ok = document.getElementById('updateOkBox');
  ok.style.display = 'block';
  setTimeout(() => ok.style.display = 'none', 1500);
}
document.getElementById('copyUpdateXmlBtn').addEventListener('click', copyUpdateXml);

// =========================================================
// GENERAR ONRUN (usa el mismo JSON/formulario ya cargado en cada tab)
// =========================================================

function navStr(v, maxLen) {
  maxLen = maxLen || 80;
  const raw = (v === undefined || v === null) ? '' : String(v);
  const escaped = raw.replace(/'/g, "''");

  if (escaped.length <= maxLen) {
    return "'" + escaped + "'";
  }

  const chunks = [];
  let i = 0;
  while (i < escaped.length) {
    let end = Math.min(i + maxLen, escaped.length);
    if (end < escaped.length && escaped[end - 1] === "'" && escaped[end] === "'") {
      end -= 1;
    }
    if (end <= i) end = i + maxLen;
    chunks.push(escaped.slice(i, end));
    i = end;
  }
  return chunks.map(c => "'" + c + "'").join(" +\n");
}

// Convierte una fecha (ISO "YYYY-MM-DD", como la envía <input type="date"> o el JSON)
// al literal de fecha NAV: DDMMYYYYD. Si viene vacía o no reconocida, cae a 0D (fecha en blanco).
function navDate(v) {
  const s = (v === undefined || v === null) ? '' : String(v).trim();
  if (s === '') return '0D';

  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); // 2026-07-16
  if (m) return m[3] + m[2] + m[1] + 'D';

  m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/); // 16/07/2026 o 16-07-2026
  if (m) return m[1].padStart(2, '0') + m[2].padStart(2, '0') + m[3] + 'D';

  return '0D';
}
// ---------- Header ----------
function showHeaderOnRunError(msg) {
  document.getElementById('headerOnRunOkBox').style.display = 'none';
  const box = document.getElementById('headerOnRunErrBox');
  box.textContent = msg;
  box.style.display = 'block';
}

document.getElementById('genHeaderOnRunBtn').addEventListener('click', () => {
  document.getElementById('headerOnRunErrBox').style.display = 'none';
  document.getElementById('headerOnRunOkBox').style.display = 'none';

  // Si hay JSON pegado en la sección 3, se usa; si no, se toma del formulario ya diligenciado
  const raw = document.getElementById('headerJsonInput').value.trim();
  let d = {};
  if (raw !== '') {
    try { d = JSON.parse(raw); }
    catch (e) { showHeaderOnRunError('JSON inválido: ' + e.message); return; }
  }
  const val = id => document.getElementById(id).value.trim();

  const mileageRaw = (d.Mileage !== undefined && d.Mileage !== null && d.Mileage !== '') ? d.Mileage : val('h_km');
  const mileage = (mileageRaw === '' || mileageRaw === undefined) ? 0 : mileageRaw;

  const params = [
    navStr(d.CustomerNo || val('h_billToCustomer')),
    navStr(d.ShipToAddressCode || val('h_shipToCode')),
    navStr(d.ServiceItemNo || val('h_serviceItemNo')),
    navStr(d.ResourceNo || val('h_resourceNo')),
    mileage,
    navStr(d.Observations || val('h_observations')),
    navStr(d.LicensePlate || val('h_licensePlate')),
    navDate(d.WorkshopEntryDate || val('h_workshopEntryDate')),
    navStr(d.ServiceOrderUser || val('h_serviceOrderUser')),
    navStr(d.ServiceOrderType || val('h_serviceOrderType')),
    navStr(d.SellToCustomer || val('h_sellToCustomer')),
    navStr(d.ExternalOrderNo || val('h_externalOrderNo')),
    navStr(d.ContractNo || val('h_contractNo'))
  ];

  document.getElementById('headerOnRunOutput').value =
    'CreateServiceOrderHeader(\n' + params.join(',\n') + '\n);';
  const ok = document.getElementById('headerOnRunOkBox');
  ok.textContent = 'OnRun generado.';
  ok.style.display = 'block';
});

document.getElementById('copyHeaderOnRunBtn').addEventListener('click', () => {
  const el = document.getElementById('headerOnRunOutput');
  el.select();
  document.execCommand('copy');
  const ok = document.getElementById('headerOnRunOkBox');
  ok.textContent = 'Copiado al portapapeles';
  ok.style.display = 'block';
  setTimeout(() => ok.style.display = 'none', 1500);
});

// ---------- Update ----------
function showUpdateOnRunError(msg) {
  document.getElementById('updateOnRunOkBox').style.display = 'none';
  const box = document.getElementById('updateOnRunErrBox');
  box.textContent = msg;
  box.style.display = 'block';
}

document.getElementById('genUpdateOnRunBtn').addEventListener('click', () => {
  document.getElementById('updateOnRunErrBox').style.display = 'none';
  document.getElementById('updateOnRunOkBox').style.display = 'none';

  const raw = document.getElementById('updateJsonInput').value.trim();
  let d = {};
  if (raw !== '') {
    try { d = JSON.parse(raw); }
    catch (e) { showUpdateOnRunError('JSON inválido: ' + e.message); return; }
  }
  const val = id => document.getElementById(id).value.trim();

  const mileageRaw = (d.Mileage !== undefined && d.Mileage !== null && d.Mileage !== '') ? d.Mileage : val('u_kilometers');
  const mileage = (mileageRaw === '' || mileageRaw === undefined) ? 0 : mileageRaw;

  const lines = [
    navStr(d.ServiceOrderNo || val('u_serviceOrderNo')) + ', // ServiceOrderNo',
    mileage + ', // Kilometers',
    navStr(d.ServiceOrderType || val('u_serviceOrderType')) + ', // ServiceOrderType',
    navStr(d.EntryComment || val('u_ingressComment')) + ', // IngressComment',
    navStr(d.ExitComment || val('u_egressComment')) + ', // EgressComment',
    navStr(d.RepairStatusCode || val('u_repairStatusCode')) + ', // RepairStatusCode',
    navStr(d.ResourceNo || val('u_resourceNo')) + ', // ResourceNo',
    navStr(d.SellToCustomer || val('u_billToCustomer')) + ', // BillToCustomer',
    navStr(d.ApproverUserID || val('u_approverUserID')) + ' // ApproverUserID'
  ];

  document.getElementById('updateOnRunOutput').value =
    'UpdateServiceOrder(\n' + lines.join('\n') + '\n);';
  const ok = document.getElementById('updateOnRunOkBox');
  ok.textContent = 'OnRun generado.';
  ok.style.display = 'block';
});

document.getElementById('copyUpdateOnRunBtn').addEventListener('click', () => {
  const el = document.getElementById('updateOnRunOutput');
  el.select();
  document.execCommand('copy');
  const ok = document.getElementById('updateOnRunOkBox');
  ok.textContent = 'Copiado al portapapeles';
  ok.style.display = 'block';
  setTimeout(() => ok.style.display = 'none', 1500);
});

// ---------- Líneas ----------
function showLinesOnRunError(msg) {
  document.getElementById('linesOnRunOkBox').style.display = 'none';
  const box = document.getElementById('linesOnRunErrBox');
  box.textContent = msg;
  box.style.display = 'block';
}

document.getElementById('genLinesOnRunBtn').addEventListener('click', () => {
  document.getElementById('linesOnRunErrBox').style.display = 'none';
  document.getElementById('linesOnRunOkBox').style.display = 'none';

  // Reutiliza el array "lines" ya existente: se llena manual (addLineBtn) o vía JSON (importJsonBtn)
  if (lines.length === 0) {
    showLinesOnRunError('Agrega al menos una línea (manual o desde JSON) antes de generar el OnRun.');
    return;
  }

  const docNo = document.getElementById('docNo').value.trim();
  if (docNo === '') {
    showLinesOnRunError('El serviceOrderNo es obligatorio.');
    return;
  }

  const str = lines.join(',');
  const primaryFailurePart = document.getElementById('primaryFailurePart').value.trim();
  const faultAreaCode = document.getElementById('faultAreaCode').value.trim();
  const symptomCode = document.getElementById('symptomCode').value.trim();
  const failureCode = document.getElementById('failureCode').value.trim();

  document.getElementById('linesOnRunOutput').value =
    'CreateServiceOrderLine(' +
    navStr(docNo) + ',' +
    navStr(str) + ',' +
    navStr(primaryFailurePart) + ',' +
    navStr(faultAreaCode) + ',' +
    navStr(symptomCode) + ',' +
    navStr(failureCode) + ');';

  const ok = document.getElementById('linesOnRunOkBox');
  ok.textContent = lines.length + ' línea(s) incluidas en el OnRun.';
  ok.style.display = 'block';
});

document.getElementById('copyLinesOnRunBtn').addEventListener('click', () => {
  const el = document.getElementById('linesOnRunOutput');
  el.select();
  document.execCommand('copy');
  const ok = document.getElementById('linesOnRunOkBox');
  ok.textContent = 'Copiado al portapapeles';
  ok.style.display = 'block';
  setTimeout(() => ok.style.display = 'none', 1500);
});