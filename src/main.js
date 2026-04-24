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
const avatarSeeds = ['Felix', 'Leo', 'Max', 'Oliver', 'Jack', 'Charlie', 'Milo', 'Oscar', 'Jasper', 'Harry', 'Theo', 'Noah'];
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

async function renderHistorico() {
  headerContent.innerHTML = '<h2 style="font-size: 20px; font-weight: 800; margin:0;">HISTÓRICO</h2>';
  const os = await db.manutencoes.reverse().toArray();
  let html = '<div class="animate-in" style="display: flex; flex-direction: column; gap: 15px; padding: 0 20px;">';
  for (const m of os) {
    const e = await db.equipamentos.get(m.equipamentoId);
    const c = e ? await db.clientes.get(e.clienteId) : null;
    const isCor = m.descricao && m.descricao.includes('Corretiva');
    html += `<div class="card" style="border-left: 5px solid ${isCor ? '#ff9d00' : '#22c55e'}; margin:0;"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;"><span style="font-size: 8px; font-weight: 900; padding: 4px 10px; border-radius: 40px; background: rgba(255,255,255,0.05); color: ${isCor ? '#ff9d00' : '#22c55e'}; border: 1px solid ${isCor ? '#ff9d00' : '#22c55e'}; text-transform:uppercase;">${isCor ? 'CORRETIVA' : 'PREVENTIVA'}</span><span style="font-size: 10px; opacity: 0.5; font-weight:700;">${new Date(m.dataRealizada).toLocaleDateString()}</span></div><h4 style="margin:0; font-size:16px;">${c?.nome || 'Removido'}</h4><p style="font-size: 13px; font-style: italic; background:rgba(0,0,0,0.3); padding:15px; border-radius:15px; margin-top:12px; line-height:1.5; color:#eee;">${m.descricao}</p></div>`;
  }
  if (os.length === 0) html += '<p style="text-align:center; opacity:0.3; padding:40px;">Sem registros.</p>';
  mainContent.innerHTML = html + '</div>';
}

async function renderMais() {
  const tech = localStorage.getItem('jampa_tech_name') || 'Alexandre';
  const appN = localStorage.getItem('jampa_app_name') || 'AR JAMPA';
  const curAv = localStorage.getItem('jampa_tech_avatar') || 'Felix';
  headerContent.innerHTML = '<h2 style="font-size: 20px; font-weight: 800; margin:0;">AJUSTES</h2>';
  mainContent.innerHTML = `
    <div class="animate-in" style="display: flex; flex-direction: column; gap: 20px; padding: 0 20px;">
      <div class="card" style="margin:0;"><label style="font-size:11px; font-weight:800; color:var(--primary);">Avatar do Perfil</label><div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top:15px;">${avatarSeeds.map(s => `<div class="avatar-option ${curAv === s ? 'active' : ''}" data-seed="${s}" style="cursor: pointer; border-radius: 12px; border: 2px solid ${curAv === s ? 'var(--primary)' : 'transparent'}; background: rgba(255,255,255,0.03); overflow:hidden;"><img src="${getAvatarUrl(s)}" style="width: 100%; display:block;" /></div>`).join('')}</div></div>
      <div class="card" style="margin:0;">
        <div class="form-group"><label>Nome do Técnico</label><input type="text" id="p-t" class="form-control" value="${tech}"></div>
        <div class="form-group"><label>Nome do Aplicativo</label><input type="text" id="p-a" class="form-control" value="${appN}"></div>
        <button class="btn-primary" id="b-s">SALVAR ALTERAÇÕES</button>
      </div>
      <div class="card" style="background: rgba(34, 197, 94, 0.05); border: 1px solid #22c55e; margin:0;"><h3 style="font-size:14px; color:#22c55e; margin-bottom:15px; text-transform:uppercase;">Backup</h3><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;"><button onclick="window.exportData()" class="btn-primary" style="background:#22c55e; color:black; font-size:11px; margin-top:0;">BAIXAR</button><button onclick="window.importData()" class="btn-primary" style="background:transparent; color:#22c55e; font-size:11px; border: 1px solid #22c55e; margin-top:0;">RESTAURAR</button></div></div>
      <div class="card" style="border-left: 4px solid var(--secondary); background: rgba(112, 0, 255, 0.03); padding: 25px; margin:0;">
        <p style="font-size: 16px; font-weight: 800; margin: 0;">Leonardo Soprani</p>
        <p style="font-size: 11px; opacity: 0.6;">Desenvolvedor Full Stack • 2026</p>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;"><span style="font-size: 10px; font-weight: 800; color: #888;">VERSÃO 3.0.5</span><a href="https://wa.me/5583996612425" target="_blank" class="btn-primary" style="background: #25D366; color: white; padding: 10px 18px; font-size: 11px; border-radius: 12px; width:auto; margin-top:0;">WHATSAPP</a></div>
      </div>
    </div>`;
  document.querySelectorAll('.avatar-option').forEach(opt => { opt.onclick = () => { localStorage.setItem('jampa_tech_avatar', opt.dataset.seed); renderMais(); }; });
  document.getElementById('b-s').onclick = () => { localStorage.setItem('jampa_tech_name', document.getElementById('p-t').value); localStorage.setItem('jampa_app_name', document.getElementById('p-a').value); location.reload(); };
}

window.exportData = async () => {
  const data = { bairros: await db.bairros.toArray(), clientes: await db.clientes.toArray(), equipamentos: await db.equipamentos.toArray(), manutencoes: await db.manutencoes.toArray() };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `backup_jampa.json`; a.click();
  localStorage.setItem('last_jampa_backup', Date.now().toString()); renderDashboard();
};

window.importData = () => {
  const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (confirm('Restaurar dados?')) { await db.delete(); await db.open(); if (data.bairros) await db.bairros.bulkAdd(data.bairros); if (data.clientes) await db.clientes.bulkAdd(data.clientes); if (data.equipamentos) await db.equipamentos.bulkAdd(data.equipamentos); if (data.manutencoes) await db.manutencoes.bulkAdd(data.manutencoes); location.reload(); }
      } catch (err) { alert('Erro ao importar'); }
    };
    reader.readAsText(file);
  };
  input.click();
};

window.renderEquipmentHistory = async function(eqId) {
  const eq = await db.equipamentos.get(Number(eqId));
  const os = await db.manutencoes.where('equipamentoId').equals(Number(eqId)).reverse().toArray();
  openModal(`Histórico: ${eq.marca}`);
  let html = '<div style="display: flex; flex-direction: column; gap: 15px; padding: 10px;">';
  for (const m of os) {
    html += `<div style="border-left: 2px solid var(--primary); padding-left: 15px;"><p style="font-size: 11px; font-weight: 800; color: var(--primary); margin: 0;">${new Date(m.dataRealizada).toLocaleDateString()}</p><p style="font-size: 13px; color: white; margin: 5px 0;">${m.descricao}</p></div>`;
  }
  modalBody.innerHTML = html + '</div>';
};

window.renderBairroDetail = async function(bId, from) {
  const b = await db.bairros.get(Number(bId));
  const cs = await db.clientes.where('bairroId').equals(Number(bId)).toArray();
  headerContent.innerHTML = `<div style="display: flex; align-items: center; gap: 15px;"><button class="icon-btn" onclick="window.renderBairros()"><span class="material-symbols-rounded">arrow_back</span></button><h2 style="font-size:18px;">${b.nome}</h2></div>`;
  let html = '<div class="animate-in" style="display: flex; flex-direction: column; gap: 15px; padding: 0 20px; margin-top:20px;">';
  for (const c of cs) {
    const es = await db.equipamentos.where('clienteId').equals(c.id).toArray();
    html += `<div class="card" style="margin:0;"><div style="display: flex; justify-content: space-between; margin-bottom: 15px;"><div><h3 style="margin: 0; font-size: 16px;">${c.nome}</h3><p style="font-size:10px; opacity:0.5;">${c.endereco}</p></div><div style="display:flex; gap:10px;"><button class="icon-btn" onclick="window.renderFullPropertyForm(${c.id})"><span class="material-symbols-rounded" style="font-size:16px;">edit</span></button><a href="https://wa.me/${c.whatsapp.replace(/\D/g,'')}" target="_blank" class="icon-btn success"><span class="material-symbols-rounded" style="font-size:16px;">chat</span></a></div></div>${es.map(e => `<div style="background:rgba(255,255,255,0.02); padding:12px; border-radius:12px; margin-bottom:10px;"><div style="display:flex; justify-content:space-between; align-items:center;"><div><p style="margin:0; font-size:12px; font-weight:700;">${e.marca} • ${e.localizacao}</p><p style="margin:0; font-size:9px; opacity:0.5;">${e.btu} BTU</p></div><button class="icon-btn" style="border:none;" onclick="window.deleteItem('equipamento', ${e.id})"><span class="material-symbols-rounded" style="font-size:14px; color:#ff4d4d;">delete</span></button></div></div>`).join('')}<button class="btn-primary" onclick="window.renderEquipmentForm(null, ${c.id})" style="font-size:10px; padding:10px;">+ ADICIONAR AR</button></div>`;
  }
  mainContent.innerHTML = html + '</div>';
};

window.renderEquipmentForm = async function(id, cId) {
  openModal('Novo Aparelho');
  let sB = 'Samsung';
  const r = () => {
    modalBody.innerHTML = `
      <form id="f-e">
        <label>Marca</label><div class="brand-grid">${marcas.map(m => `<div class="brand-item ${sB === m ? 'active' : ''}" data-brand="${m}"><img src="${getLogo(m)}" /></div>`).join('')}</div>
        <div class="form-group" style="margin-top:20px;"><label>BTU</label><select id="e-b" class="form-control">${btus.map(b => `<option value="${b}">${b}</option>`).join('')}</select></div>
        <div class="form-group"><label>Localização</label><input type="text" id="e-l" class="form-control" placeholder="Ex: Sala"></div>
        <button type="submit" class="btn-primary">SALVAR</button>
      </form>`;
    document.querySelectorAll('.brand-item').forEach(i => i.onclick = () => { sB = i.dataset.brand; r(); });
    document.getElementById('f-e').onsubmit = async (ev) => {
      ev.preventDefault();
      await db.equipamentos.add({ marca: sB, btu: Number(document.getElementById('e-b').value), localizacao: document.getElementById('e-l').value, clienteId: Number(cId), proximaManutencao: new Date() });
      closeModal(); location.reload();
    };
  }; r();
};

async function init() {
  if (navigator.storage && navigator.storage.persist) await navigator.storage.persist();
  if (!db.isOpen()) await db.open();
  setupNavigation(); await renderDashboard();
  const s = document.getElementById('splash-screen');
  if (s) { setTimeout(() => { s.style.opacity = '0'; setTimeout(() => s.remove(), 500); }, 1200); }
}

window.renderDashboard = renderDashboard; window.renderBairros = renderBairros; window.renderHistorico = renderHistorico; window.renderMais = renderMais; init();
