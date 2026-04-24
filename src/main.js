import { db, seedDatabase } from './db';

const mainContent = document.getElementById('main-content');
const headerContent = document.getElementById('header-content');
const navItems = document.querySelectorAll('.nav-item');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const closeModalBtn = document.getElementById('btn-close-modal');

let currentHomeFilter = 'vencimentos';

const marcas = ['EOS', 'AGRATTO', 'LG', 'Samsung', 'Gree', 'Midea', 'Springer', 'Carrier', 'Fujitsu', 'Daikin', 'Electrolux', 'Philco', 'Consul', 'Hitachi', 'Comfee', 'Elgin'];
const btus = [9000, 12000, 18000, 24000, 30000, 36000, 48000, 60000];
const getAvatarUrl = (s) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${s}`;

function openModal(title) { if (modalTitle) modalTitle.textContent = title; if (modalOverlay) modalOverlay.classList.add('active'); }
function closeModal() { if (modalOverlay) modalOverlay.classList.remove('active'); }
if (closeModalBtn) closeModalBtn.onclick = closeModal;

const getLogo = (m) => {
  const name = (m || 'Samsung').toLowerCase();
  const ext = (name === 'samsung') ? 'jpg' : 'png';
  return `brands/${name}.${ext}`;
};

function setupNavigation() {
  navItems.forEach(item => {
    item.onclick = () => {
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      const v = item.dataset.view;
      if (v === 'home') renderDashboard();
      else if (v === 'bairros') renderBairros();
      else if (v === 'os') renderHistorico();
      else if (v === 'mais') renderMais();
    };
  });
}

window.deleteItem = async (type, id) => {
  if (confirm(`Excluir ${type}?`)) {
    if (type === 'bairro') await db.bairros.delete(id);
    else if (type === 'cliente') await db.clientes.delete(id);
    else if (type === 'equipamento') await db.equipamentos.delete(id);
    location.reload();
  }
};

window.renderMaintenanceForm = async function(eqId, defaultType = '') {
  const eqs = await db.equipamentos.toArray(); const cls = await db.clientes.toArray();
  openModal(defaultType || 'Registrar Serviço');
  modalBody.innerHTML = `
    <form id="f-m">
      <div class="form-group"><label>Aparelho</label><select id="m-eq" class="form-control">${eqs.map(e => `<option value="${e.id}" ${eqId == e.id ? 'selected' : ''}>${cls.find(c => c.id === e.clienteId)?.nome || 'S/N'} - ${e.marca}</option>`).join('')}</select></div>
      <div class="form-group"><label>O que foi feito?</label><textarea id="m-d" class="form-control" rows="3" required>${defaultType ? defaultType + ': ' : ''}</textarea></div>
      <div class="form-group"><label>Próxima Visita</label><input type="date" id="m-nx" class="form-control" required value="${new Date(Date.now() + 15552000000).toISOString().split('T')[0]}"></div>
      <button type="submit" class="btn-primary">FINALIZAR SERVIÇO</button>
    </form>`;
  document.getElementById('f-m').onsubmit = async (ev) => {
    ev.preventDefault();
    const fId = Number(document.getElementById('m-eq').value);
    const nxD = new Date(document.getElementById('m-nx').value);
    await db.manutencoes.add({ equipamentoId: fId, dataRealizada: new Date(), descricao: document.getElementById('m-d').value, proximaData: nxD });
    await db.equipamentos.update(fId, { ultimaManutencao: new Date(), proximaManutencao: nxD });
    closeModal(); renderDashboard();
  };
};

async function renderDashboard(searchTerm = '') {
  const tech = localStorage.getItem('jampa_tech_name') || 'Alexandre';
  const av = localStorage.getItem('jampa_tech_avatar') || 'Felix';
  headerContent.innerHTML = `
    <div class="user-info">
      <div class="user-profile"><img src="${getAvatarUrl(av)}"></div>
      <div class="user-text"><h1>Olá, técnico</h1><p>${tech}</p></div>
    </div>
    <div class="icon-btn" onclick="openModal('Notificações')"><span class="material-symbols-rounded">notifications</span></div>`;
  
  let html = `
    <div class="page-header animate-in" style="padding: 0 20px;">
      <h2 style="font-size: 24px; margin:0; font-weight:800;">Agenda</h2>
      <div style="display: flex; gap: 8px; overflow-x: auto; padding: 15px 0; scrollbar-width: none;">
        <button class="pill ${currentHomeFilter === 'vencimentos' ? 'active' : ''}" onclick="window.setHomeFilter('vencimentos')">VENCIMENTOS</button>
        <button class="pill ${currentHomeFilter === 'vencidos' ? 'active' : ''}" onclick="window.setHomeFilter('vencidos')">VENCIDOS</button>
        <button class="pill ${currentHomeFilter === 'alfabetica' ? 'active' : ''}" onclick="window.setHomeFilter('alfabetica')">ALFABÉTICA</button>
      </div>
      <div class="search-box"><span class="material-symbols-rounded">search</span><input type="text" id="main-search" placeholder="Buscar cliente..." value="${searchTerm}"></div>
    </div>`;

  const eqs = await db.equipamentos.toArray();
  const clsList = await db.clientes.toArray();
  let filtered = eqs;
  if (currentHomeFilter === 'vencidos') filtered = eqs.filter(e => Math.ceil((new Date(e.proximaManutencao) - new Date()) / 86400000) <= 0);
  let sorted = filtered.sort((a,b) => new Date(a.proximaManutencao) - new Date(b.proximaManutencao));
  if (currentHomeFilter === 'alfabetica') sorted = filtered.sort((a,b) => (clsList.find(c => c.id === a.clienteId)?.nome || '').localeCompare(clsList.find(c => c.id === b.clienteId)?.nome || ''));

  html += '<div class="dashboard-grid animate-in">';
  for (const e of sorted) {
    const c = clsList.find(cl => cl.id === e.clienteId);
    if (!c || (searchTerm && !c.nome.toLowerCase().includes(searchTerm.toLowerCase()) && !e.marca.toLowerCase().includes(searchTerm.toLowerCase()))) continue;
    const diff = Math.ceil((new Date(e.proximaManutencao) - new Date()) / 86400000);
    html += `<div class="card" style="grid-column: span 2; margin-left:0; margin-right:0;"><div style="display: flex; align-items: center; gap: 15px;"><div style="width:42px; height:42px; background:white; border-radius:10px; padding:8px;"><img src="${getLogo(e.marca)}" style="width: 100%; height:100%; object-fit:contain;" /></div><div onclick="window.renderEquipmentHistory(${e.id})" style="flex:1;"><h3 style="font-size: 15px; margin: 0;">${c.nome}</h3><p style="font-size: 10px; opacity: 0.6; font-weight:600;">${e.marca} • ${e.localizacao}</p></div><span style="font-size: 10px; font-weight: 800; color: ${diff <= 0 ? '#ff4d4d' : 'var(--primary)'};">${diff <= 0 ? 'VENCIDO' : 'Faltam ' + diff + 'd'}</span></div><div style="display: flex; justify-content: space-between; background: rgba(0,0,0,0.15); padding: 12px; border-radius: 12px; margin-top:15px;"><div style="text-align:left;"><p style="font-size:7px; opacity:0.5; margin:0;">ÚLTIMA</p><p style="font-size:9px; font-weight:700; margin:0;">${e.ultimaManutencao ? new Date(e.ultimaManutencao).toLocaleDateString() : '---'}</p></div><div style="text-align:right;"><p style="font-size:7px; opacity:0.5; margin:0;">PRÓXIMA</p><p style="font-size:9px; font-weight:700; margin:0; color:var(--primary);">${new Date(e.proximaManutencao).toLocaleDateString()}</p></div></div><div style="display: flex; gap: 10px; margin-top:15px;"><button class="btn-primary" onclick="window.renderMaintenanceForm(${e.id}, 'Manutenção Preventiva')" style="flex:1; margin-top:0;">PREVENTIVA</button><button class="btn-primary" onclick="window.renderMaintenanceForm(${e.id}, 'Manutenção Corretiva')" style="flex:1; background:#ff9d00; margin-top:0;">CORRETIVA</button></div></div>`;
  }
  mainContent.innerHTML = html + '</div>';
  const sInp = document.getElementById('main-search'); if (sInp) sInp.oninput = (e) => renderDashboard(e.target.value);
}

window.setHomeFilter = (f) => { currentHomeFilter = f; renderDashboard(); };

async function renderBairros(searchTerm = '') {
  headerContent.innerHTML = '<h2 style="font-size: 20px; font-weight: 800; margin:0;">CADASTRAR</h2>';
  let html = `
    <div class="page-header animate-in" style="padding: 0 20px;">
      <div class="search-box"><span class="material-symbols-rounded">search</span><input type="text" id="b-search" placeholder="Buscar bairro..." value="${searchTerm}"></div>
      <div style="display: flex; gap: 10px; margin-bottom: 20px;">
        <button class="btn-primary" onclick="window.renderBairroForm()" style="flex:1; font-size:10px;">+ NOVO BAIRRO</button>
        <button class="btn-primary" onclick="window.renderFullPropertyForm()" style="flex:1; font-size:10px;">+ CLIENTE / PROPRIEDADE</button>
      </div>
    </div>`;
  const bs = await db.bairros.toArray();
  html += '<div class="dashboard-grid animate-in">';
  for (const b of bs) {
    if (searchTerm && !b.nome.toLowerCase().includes(searchTerm.toLowerCase())) continue;
    const cls = await db.clientes.where('bairroId').equals(b.id).toArray();
    html += `<div class="card" style="border-left: 4px solid ${b.cor || 'var(--primary)'}; margin:0; padding:15px; position:relative;"><div onclick="window.renderBairroDetail(${b.id}, 'bairros')"><h3 style="margin:0; font-size:13px; text-transform:uppercase;">${b.nome}</h3><p style="font-size:10px; font-weight:700; opacity:0.6; margin-top:8px;">${cls.length} UNIDADES</p></div><button class="icon-btn" style="width:24px; height:24px; position:absolute; top:10px; right:10px; border:none;" onclick="window.deleteItem('bairro', ${b.id})"><span class="material-symbols-rounded" style="font-size:14px; color:#ff4d4d;">delete</span></button></div>`;
  }
  mainContent.innerHTML = html + '</div>';
  document.getElementById('b-search').oninput = (e) => renderBairros(e.target.value);
}

window.renderFullPropertyForm = async function(cId = null) {
  const c = cId ? await db.clientes.get(Number(cId)) : null;
  const bs = await db.bairros.toArray();
  openModal('Cliente / Propriedade');
  modalBody.innerHTML = `
    <form id="f-f-p">
      <div class="form-group"><label>Nome do Cliente</label><input type="text" id="p-n" class="form-control" value="${c?.nome || ''}" required></div>
      <div class="form-group"><label>Bairro</label><select id="p-b" class="form-control" required><option value="">Selecione...</option>${bs.map(b => `<option value="${b.id}" ${c?.bairroId == b.id ? 'selected' : ''}>${b.nome}</option>`).join('')}</select></div>
      <div class="form-group"><label>Endereço / Unidade</label><input type="text" id="p-e" class="form-control" value="${c?.endereco || ''}" required></div>
      <div class="form-group"><label>WhatsApp</label><input type="text" id="p-w" class="form-control" value="${c?.whatsapp || '(83) 9'}" required></div>
      <button type="submit" class="btn-primary">SALVAR DADOS</button>
    </form>`;
  document.getElementById('f-f-p').onsubmit = async (ev) => {
    ev.preventDefault();
    const d = { nome: document.getElementById('p-n').value, bairroId: Number(document.getElementById('p-b').value), endereco: document.getElementById('p-e').value, whatsapp: document.getElementById('p-w').value };
    if (cId) await db.clientes.update(Number(cId), d);
    else await db.clientes.add(d);
    closeModal(); renderBairros();
  };
};

window.renderBairroForm = async function() {
  openModal('Novo Bairro');
  modalBody.innerHTML = `<form id="f-b"><div class="form-group"><label>Nome do Bairro</label><input type="text" id="b-n" class="form-control" required></div><button type="submit" class="btn-primary">SALVAR</button></form>`;
  document.getElementById('f-b').onsubmit = async (e) => { e.preventDefault(); await db.bairros.add({ nome: document.getElementById('b-n').value }); closeModal(); renderBairros(); };
};

async function init() {
  if (navigator.storage && navigator.storage.persist) await navigator.storage.persist();
  if (!db.isOpen()) await db.open();
  setupNavigation(); await renderDashboard();
  const s = document.getElementById('splash-screen');
  if (s) { setTimeout(() => { s.style.opacity = '0'; setTimeout(() => s.remove(), 500); }, 1200); }
}

window.renderDashboard = renderDashboard; window.renderBairros = renderBairros; init();
