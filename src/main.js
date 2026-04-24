import { db, seedDatabase } from './db';

const mainContent = document.getElementById('main-content');
const headerContent = document.getElementById('header-content');
const navItems = document.querySelectorAll('.nav-item');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const closeModalBtn = document.getElementById('btn-close-modal');

let currentViewMode = 'Cronológico';

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

function setupHeader() {
  const tech = localStorage.getItem('jampa_tech_name') || 'Técnico';
  const av = localStorage.getItem('jampa_tech_avatar') || 'Felix';
  headerContent.innerHTML = `
    <div class="logo-area">
      <img src="https://cdn-icons-png.flaticon.com/512/2835/2835912.png" alt="logo" style="filter: hue-rotate(180deg) brightness(1.5);">
      <span>AR JAMPA</span>
    </div>
    <div class="user-status">
      <div class="avatar-small"><img src="${getAvatarUrl(av)}"></div>
      <div class="status-text">
        <span class="name">${tech}</span>
        <span class="online">Online</span>
      </div>
    </div>
    <div class="notif-btn" onclick="window.showNotifications()">
      <span class="material-symbols-rounded">notifications</span>
      <div class="notif-badge">4</div>
    </div>`;
}

window.showNotifications = () => {
  openModal('Notificações');
  modalBody.innerHTML = '<div style="padding:40px 20px; text-align:center; opacity:0.5;"><span class="material-symbols-rounded" style="font-size:48px; margin-bottom:15px;">notifications_off</span><p>Você tem 4 atualizações de sistema pendentes.</p></div>';
};

function setupFAB(view) {
  let fab = document.querySelector('.fab');
  if (!fab) {
    fab = document.createElement('div');
    fab.className = 'fab';
    fab.innerHTML = '<span class="material-symbols-rounded">add</span>';
    document.body.appendChild(fab);
  }
  fab.onclick = () => {
    if (view === 'home') window.renderMaintenanceForm();
    else if (view === 'bairros') window.renderBairroForm();
  };
}

async function renderDashboard(searchTerm = '') {
  setupHeader(); setupFAB('home');
  const appN = localStorage.getItem('jampa_app_name') || 'AR JAMPA';
  
  let html = `
    <div class="page-header animate-in">
      <div class="title-row">
        <h2>Painel de Controle</h2>
        <select class="view-select" id="view-mode-selector">
          <option ${currentViewMode === 'Cronológico' ? 'selected' : ''}>Cronológico</option>
          <option ${currentViewMode === 'Ver por Bairros' ? 'selected' : ''}>Ver por Bairros</option>
          <option ${currentViewMode === 'Ver Alertas' ? 'selected' : ''}>Ver Alertas</option>
          <option ${currentViewMode === 'Prioridade (5 dias)' ? 'selected' : ''}>Prioridade (5 dias)</option>
        </select>
      </div>
      <div class="search-box">
        <span class="material-symbols-rounded">search</span>
        <input type="text" id="main-search" placeholder="Pesquisar..." value="${searchTerm}">
      </div>
    </div>`;

  const eqs = await db.equipamentos.toArray();
  const clsList = await db.clientes.toArray();
  
  let sorted = eqs.sort((a,b) => new Date(a.proximaManutencao) - new Date(b.proximaManutencao));
  
  html += '<div class="dashboard-grid animate-in">';
  const lS = searchTerm.toLowerCase();
  for (const e of sorted) {
    const c = clsList.find(cl => cl.id === e.clienteId);
    if (!c || (searchTerm && !c.nome.toLowerCase().includes(lS) && !e.marca.toLowerCase().includes(lS))) continue;
    const diff = Math.ceil((new Date(e.proximaManutencao) - new Date()) / 86400000);
    const diffColor = diff <= 0 ? '#ff4d4d' : (diff <= 7 ? '#ff9d00' : 'var(--primary)');
    html += `<div class="card" style="grid-column: span 2; display: flex; flex-direction: column; gap: 15px; margin-left:0; margin-right:0;"><div style="display: flex; align-items: center; gap: 15px;"><div style="width:42px; height:42px; background:white; border-radius:10px; padding:8px;"><img src="${getLogo(e.marca)}" style="width: 100%; height:100%; object-fit:contain;" /></div><div onclick="window.renderEquipmentHistory(${e.id})" style="flex:1; cursor:pointer;"><h3 style="font-size: 15px; margin: 0;">${c.nome}</h3><p style="font-size: 10px; opacity: 0.6; font-weight:600;">${e.marca} • ${e.localizacao}</p></div><div style="text-align:right;"><span style="font-size: 10px; font-weight: 800; color: ${diffColor}; background: rgba(0,0,0,0.2); padding: 5px 8px; border-radius: 6px;">${diff <= 0 ? 'VENCIDO' : 'Faltam ' + diff + ' dias'}</span></div></div><div style="display: flex; justify-content: space-between; background: rgba(0,0,0,0.15); padding: 12px; border-radius: 12px;"><div style="text-align:left;"><p style="font-size:7px; opacity:0.5; text-transform:uppercase; margin:0;">Última</p><p style="font-size:9px; font-weight:700; margin:0;">${e.ultimaManutencao ? new Date(e.ultimaManutencao).toLocaleDateString() : 'Nenhuma'}</p></div><div style="text-align:right;"><p style="font-size:7px; opacity:0.5; text-transform:uppercase; margin:0;">Próxima</p><p style="font-size:9px; font-weight:700; margin:0; color:var(--primary);">${new Date(e.proximaManutencao).toLocaleDateString()}</p></div></div><div style="display: flex; gap: 10px;"><button class="btn-primary" onclick="window.renderMaintenanceForm(${e.id}, 'Manutenção Preventiva')" style="flex:1; padding:12px; font-size:11px;">PREVENTIVA</button><button class="btn-primary" onclick="window.renderMaintenanceForm(${e.id}, 'Manutenção Corretiva / Emergência')" style="flex:1; background:#ff9d00; padding:12px; font-size:11px;">CORRETIVA</button></div></div>`;
  }
  mainContent.innerHTML = html + '</div>';

  document.getElementById('view-mode-selector').onchange = (e) => { currentViewMode = e.target.value; renderDashboard(); };
  document.getElementById('main-search').oninput = (e) => renderDashboard(e.target.value);
}

window.renderFullPropertyForm = async function(cId = null) {
  const c = cId ? await db.clientes.get(Number(cId)) : null;
  const bs = await db.bairros.toArray();
  openModal(cId ? 'Editar Propriedade' : 'Nova Propriedade');
  modalBody.innerHTML = `
    <form id="f-f-p">
      <div class="form-group"><label>Nome da Propriedade/Cliente</label><input type="text" id="p-n" class="form-control" value="${c?.nome || ''}" placeholder="Ex: Edifício Solar Prime" required></div>
      <div class="form-group"><label>Bairro</label><select id="p-b" class="form-control" required><option value="">Selecione o Bairro...</option>${bs.map(b => `<option value="${b.id}" ${c?.bairroId == b.id ? 'selected' : ''}>${b.nome}</option>`).join('')}</select></div>
      <div class="form-group"><label>Endereço Completo</label><input type="text" id="p-e" class="form-control" value="${c?.endereco || ''}" placeholder="Rua, Número..." required></div>
      <div class="form-group"><label>WhatsApp de Contato</label><input type="text" id="p-w" class="form-control" value="${c?.whatsapp || '(83) 9'}" required></div>
      <button type="submit" class="btn-primary">Salvar Propriedade</button>
    </form>`;
  document.getElementById('f-f-p').onsubmit = async (ev) => {
    ev.preventDefault();
    const d = { nome: document.getElementById('p-n').value, bairroId: Number(document.getElementById('p-b').value), endereco: document.getElementById('p-e').value, whatsapp: document.getElementById('p-w').value };
    if (cId) await db.clientes.update(Number(cId), d);
    else await db.clientes.add(d);
    closeModal(); renderBairros();
  };
};

window.renderMaintenanceForm = async function(eqId = null, defaultType = '') {
  const eqs = await db.equipamentos.toArray(); const cls = await db.clientes.toArray();
  openModal('Registrar Manutenção');
  modalBody.innerHTML = `
    <form id="f-m">
      <div class="form-group"><label>Equipamento</label><select id="m-eq" class="form-control" required><option value="">Selecione o Ar...</option>${eqs.map(e => `<option value="${e.id}" ${eqId == e.id ? 'selected' : ''}>${cls.find(c => c.id === e.clienteId)?.nome || 'S/N'} - ${e.marca}</option>`).join('')}</select></div>
      <div class="form-group"><label>Descrição do Serviço</label><textarea id="m-d" class="form-control" rows="4" placeholder="O que foi feito?" required>${defaultType ? defaultType + ': ' : ''}</textarea></div>
      <div class="form-group"><label>Data da Próxima Manutenção</label><input type="date" id="m-nx" class="form-control" required value="${new Date(Date.now() + 15552000000).toISOString().split('T')[0]}"></div>
      <button type="submit" class="btn-primary">Finalizar OS</button>
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

window.renderBairroForm = async function() {
  openModal('Novo Bairro');
  modalBody.innerHTML = `
    <form id="f-b">
      <div class="form-group"><label>Nome do Bairro</label><input type="text" id="b-n" class="form-control" required></div>
      <div class="form-group"><label>Cor do Marcador</label><input type="color" id="b-c" class="form-control" style="height:50px; padding:5px !important;" value="#00f2ff"></div>
      <button type="submit" class="btn-primary">Salvar Bairro</button>
    </form>`;
  document.getElementById('f-b').onsubmit = async (e) => {
    e.preventDefault();
    await db.bairros.add({ nome: document.getElementById('b-n').value, cor: document.getElementById('b-c').value });
    closeModal(); renderBairros();
  };
};

async function renderBairros(searchTerm = '') {
  setupHeader(); setupFAB('bairros');
  headerContent.innerHTML += ''; // Already set by setupHeader
  let html = `
    <div class="page-header animate-in">
      <h2 style="margin-bottom:20px;">CADASTRAR</h2>
      <div class="search-box"><span class="material-symbols-rounded">search</span><input type="text" id="b-search" placeholder="Buscar bairro..." value="${searchTerm}"></div>
      <div style="display: flex; gap: 10px; margin-bottom:20px;">
        <button class="btn-primary" onclick="window.renderBairroForm()" style="flex:1; font-size:11px;">+ NOVO BAIRRO</button>
        <button class="btn-primary" onclick="window.renderFullPropertyForm()" style="flex:1; font-size:11px;">+ CLIENTE / PROP</button>
      </div>
    </div>`;
  const bs = await db.bairros.toArray();
  html += '<div class="dashboard-grid animate-in">';
  for (const b of bs) {
    if (searchTerm && !b.nome.toLowerCase().includes(searchTerm.toLowerCase())) continue;
    const cls = await db.clientes.where('bairroId').equals(b.id).toArray();
    html += `<div class="card" onclick="window.renderBairroDetail(${b.id}, 'bairros')" style="border-left: 4px solid ${b.cor || 'var(--primary)'}; margin:0; padding:15px;"><h3 style="margin:0; font-size:13px; text-transform:uppercase;">${b.nome}</h3><p style="font-size:10px; font-weight:700; opacity:0.6; margin-top:8px;">${cls.length} UNIDADES</p></div>`;
  }
  mainContent.innerHTML = html + '</div>';
  document.getElementById('b-search').oninput = (e) => renderBairros(e.target.value);
}

// ... Rest of functions (renderBairroDetail, renderHistorico, renderMais) with updated UI patterns ...
async function renderBairroDetail(bId, from = 'home') {
  setupHeader();
  const b = await db.bairros.get(Number(bId));
  const cs = await db.clientes.where('bairroId').equals(Number(bId)).toArray();
  let html = `<div class="page-header"><div style="display: flex; align-items: center; gap: 15px; margin-bottom:20px;"><button class="nav-item" style="background:none; border:none; color:white;" onclick="${from === 'bairros' ? 'window.renderBairros()' : 'window.renderDashboard()'}"><span class="material-symbols-rounded">arrow_back</span></button><h2 style="font-size:20px;">${b.nome}</h2></div><button class="btn-primary" onclick="window.renderFullPropertyForm()" style="margin-bottom:20px;">+ ADICIONAR NOVO CLIENTE</button></div>`;
  html += '<div class="animate-in" style="display: flex; flex-direction: column; gap: 15px; margin-top: 15px;">';
  for (const c of cs) {
    const es = await db.equipamentos.where('clienteId').equals(c.id).toArray();
    html += `<div class="card" style="border-top: 4px solid var(--primary);"><div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;"><div><h3 style="margin: 0; font-size: 18px; color: white;">${c.nome}</h3><p style="font-size:11px; opacity:0.5; font-weight:700; text-transform:uppercase; margin-top:4px;">APTO • ${c.endereco || '-'}</p></div><div style="display:flex; gap:8px;"><button class="icon-btn" style="background:rgba(255,255,255,0.05); color:white; border:none; padding:8px; border-radius:10px;" onclick="window.renderFullPropertyForm(${c.id})"><span class="material-symbols-rounded">edit</span></button><a href="https://wa.me/${(c.whatsapp||'').replace(/\D/g,'')}" target="_blank" style="background:rgba(37,211,102,0.1); color:#25D366; padding:8px; border-radius:10px;"><span class="material-symbols-rounded">chat</span></a></div></div><div style="display: flex; flex-direction: column; gap: 10px;">${es.map(e => `<div style="background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: 16px; padding: 15px;"><div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;"><div style="width:32px; height:32px; background:white; border-radius:8px; padding:6px;"><img src="${getLogo(e.marca)}" style="width: 100%; height:100%; object-fit:contain;" /></div><div style="flex:1;"><h4 style="margin:0; font-size:13px;">${e.localizacao}</h4><p style="font-size:9px; opacity:0.5; font-weight:700;">${e.btu} BTU • ${e.potencia || 'S/P'}</p></div></div><div style="display: flex; gap: 10px;"><button class="btn-primary" onclick="window.renderMaintenanceForm(${e.id}, 'Preventiva')" style="flex:1; padding:10px; font-size:10px; margin-top:0;">PREVENTIVA</button><button class="btn-primary" onclick="window.renderMaintenanceForm(${e.id}, 'Corretiva')" style="flex:1; background:#ff9d00; padding:10px; font-size:10px; margin-top:0;">CORRETIVA</button></div></div>`).join('')}</div><button class="btn-primary" style="margin-top: 15px; background: rgba(255,255,255,0.05); color: var(--primary); font-size:11px;" onclick="window.renderEquipmentForm(null, ${c.id})">+ ADICIONAR AR NESTE APTO</button></div>`;
  }
  mainContent.innerHTML = html + '</div>';
}

function setupNavigation() {
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      const v = item.dataset.view;
      if (v === 'home') renderDashboard();
      else if (v === 'bairros') renderBairros();
      // ...
    });
  });
}

async function init() {
  if (navigator.storage && navigator.storage.persist) await navigator.storage.persist();
  if (!db.isOpen()) await db.open();
  setupNavigation(); await renderDashboard();
  const s = document.getElementById('splash-screen');
  if (s) { setTimeout(() => { s.style.opacity = '0'; setTimeout(() => s.remove(), 500); }, 800); }
}

window.renderDashboard = renderDashboard; window.renderBairros = renderBairros;
init();
