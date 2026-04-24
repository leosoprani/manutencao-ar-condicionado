import { db, seedDatabase } from './db';

const mainContent = document.getElementById('main-content');
const headerContent = document.getElementById('header-content');
const navItems = document.querySelectorAll('.nav-item');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const closeModalBtn = document.getElementById('btn-close-modal');
const fabAdd = document.getElementById('fab-add');
const avatarBtn = document.querySelector('.user-profile');

const marcas = ['EOS', 'AGRATTO', 'LG', 'Samsung', 'Gree', 'Midea', 'Springer', 'Carrier', 'Fujitsu', 'Daikin', 'Electrolux', 'Philco', 'Consul', 'Hitachi', 'Comfee', 'Elgin'];
const btus = [9000, 12000, 18000, 24000, 30000, 36000, 48000, 60000];
const avatarSeeds = ['Felix', 'Leo', 'Max', 'Oliver', 'Jack', 'Charlie', 'Milo', 'Oscar', 'Jasper', 'Harry', 'Theo', 'Noah'];
const getAvatarUrl = (s) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${s}`;

function openModal(title) { if (modalTitle) modalTitle.textContent = title; if (modalOverlay) modalOverlay.classList.add('active'); }
function closeModal() { if (modalOverlay) modalOverlay.classList.remove('active'); }
if (closeModalBtn) closeModalBtn.onclick = closeModal;
if (fabAdd) fabAdd.onclick = () => renderMaintenanceForm();
if (avatarBtn) avatarBtn.onclick = () => renderMais();

const getLogo = (m) => {
  const name = (m || 'Samsung').toLowerCase();
  const ext = (name === 'samsung') ? 'jpg' : 'png';
  return `brands/${name}.${ext}`;
};

function setupNavigation() {
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      const v = item.dataset.view;
      if (v === 'home') renderDashboard();
      else if (v === 'bairros') renderBairros();
      else if (v === 'os') renderHistorico();
      else if (v === 'mais') renderMais();
    });
  });
}

async function renderDashboard(searchTerm = '') {
  try {
    const tech = localStorage.getItem('jampa_tech_name') || 'Técnico';
    const av = localStorage.getItem('jampa_tech_avatar') || 'Felix';
    if (document.getElementById('display-user-name')) document.getElementById('display-user-name').textContent = tech;
    const img = document.querySelector('.user-profile img');
    if (img) img.src = getAvatarUrl(av);
    
    headerContent.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 15px; width: 100%;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h2 style="font-size: 20px; margin:0;">Agenda</h2>
          <span style="font-size:10px; opacity:0.5; font-weight:700; text-transform:uppercase;">Ar Jampa v3</span>
        </div>
        <div class="search-box">
          <span class="material-symbols-rounded">search</span>
          <input type="text" id="main-search" placeholder="Buscar cliente ou marca..." value="${searchTerm}">
        </div>
      </div>`;

    const sInp = document.getElementById('main-search');
    if (sInp) sInp.oninput = (e) => renderDashboard(e.target.value);

    let html = '';
    const lastB = localStorage.getItem('last_jampa_backup');
    if (!lastB || (Date.now() - Number(lastB) > 604800000)) {
      html += `<div class="card animate-in" style="background: rgba(255, 94, 0, 0.08); border: 1px solid #ff5e00; margin-bottom: 20px; display: flex; align-items: center; gap: 12px; padding: 15px;"><span class="material-symbols-rounded" style="color: #ff5e00; font-size: 24px;">cloud_upload</span><div style="flex:1;"><p style="margin:0; font-size:11px; font-weight:700; color:#ff5e00;">BACKUP PENDENTE</p></div><button onclick="window.exportData()" style="background:#ff5e00; color:black; border:none; padding:6px 10px; border-radius:6px; font-size:9px; font-weight:800;">SALVAR</button></div>`;
    }

    const eqs = await db.equipamentos.toArray();
    const sorted = eqs.sort((a,b) => new Date(a.proximaManutencao) - new Date(b.proximaManutencao));
    html += '<div class="dashboard-grid animate-in">';
    
    const lowerSearch = searchTerm.toLowerCase();
    for (const e of sorted) {
      const c = await db.clientes.get(e.clienteId);
      if (!c) continue;
      
      if (searchTerm && !c.nome.toLowerCase().includes(lowerSearch) && !e.marca.toLowerCase().includes(lowerSearch)) continue;

      const diff = Math.ceil((new Date(e.proximaManutencao) - new Date()) / 86400000);
      const ultima = e.ultimaManutencao ? new Date(e.ultimaManutencao).toLocaleDateString() : 'Nenhuma';
      const proxima = new Date(e.proximaManutencao).toLocaleDateString();

      html += `
        <div class="card" style="grid-column: span 2; display: flex; flex-direction: column; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 15px;">
            <div style="width:42px; height:42px; background:white; border-radius:10px; padding:8px;"><img src="${getLogo(e.marca)}" style="width: 100%; height:100%; object-fit:contain;" /></div>
            <div onclick="window.renderEquipmentHistory(${e.id})" style="flex:1; cursor:pointer;"><h3 style="font-size: 15px; margin: 0;">${c.nome}</h3><p style="font-size: 10px; opacity: 0.6; font-weight:600;">${e.marca} • ${e.localizacao}</p></div>
            <span style="font-size: 10px; font-weight: 800; color: ${diff <= 2 ? '#ff5e00' : 'var(--primary)'}; background: rgba(255,255,255,0.03); padding: 5px 8px; border-radius: 6px;">${diff <= 0 ? 'HOJE' : diff + 'd'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; background: rgba(0,0,0,0.15); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.03);"><div style="text-align:left;"><p style="font-size:7px; opacity:0.5; text-transform:uppercase; margin:0;">Última</p><p style="font-size:9px; font-weight:700; margin:0;">${ultima}</p></div><div style="text-align:right;"><p style="font-size:7px; opacity:0.5; text-transform:uppercase; margin:0;">Próxima</p><p style="font-size:9px; font-weight:700; margin:0; color:var(--primary);">${proxima}</p></div></div>
          <div style="display: flex; gap: 8px;"><button class="btn-primary q-m" data-id="${e.id}" style="flex:1; font-size:10px; padding:10px;">PREVENTIVA</button><button class="btn-primary q-m-cor" data-id="${e.id}" style="flex:1; font-size:10px; padding:10px; background:#ff9d00; color:black;">CORRETIVA</button></div>
        </div>`;
    }
    mainContent.innerHTML = html + '</div>';
    document.querySelectorAll('.q-m').forEach(b => b.onclick = () => renderMaintenanceForm(Number(b.dataset.id), 'Manutenção Preventiva'));
    document.querySelectorAll('.q-m-cor').forEach(b => b.onclick = () => renderMaintenanceForm(Number(b.dataset.id), 'Manutenção Corretiva / Emergência'));
  } catch (err) { console.error(err); }
}

async function renderBairros(searchTerm = '') {
  try {
    headerContent.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 15px; width: 100%;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h2 style="font-size: 22px; margin:0;">CADASTRAR</h2>
          <button class="btn-primary" id="b-n-b" style="width:auto; font-size:10px; padding: 6px 12px;">+ NOVO EDIFÍCIO</button>
        </div>
        <div class="search-box">
          <span class="material-symbols-rounded">search</span>
          <input type="text" id="bairro-search" placeholder="Buscar edifício ou zona..." value="${searchTerm}">
        </div>
      </div>`;

    const bsInp = document.getElementById('bairro-search');
    if (bsInp) bsInp.oninput = (e) => renderBairros(e.target.value);
    const bnb = document.getElementById('b-n-b'); if (bnb) bnb.onclick = () => renderBairroForm();

    const bairros = await db.bairros.toArray();
    const today = new Date();
    let html = '<div class="dashboard-grid animate-in" style="margin-top:10px;">';
    const lowerSearch = searchTerm.toLowerCase();
    for (const b of bairros) {
      if (searchTerm && !b.nome.toLowerCase().includes(lowerSearch)) continue;
      const clients = await db.clientes.where('bairroId').equals(b.id).toArray();
      const cids = clients.map(c => c.id);
      const eqsInB = await db.equipamentos.where('clienteId').anyOf(cids).toArray();
      const totalAtrasados = eqsInB.filter(e => new Date(e.proximaManutencao) <= today).length;
      html += `<div class="card" onclick="window.renderBairroDetail(${b.id}, 'bairros')" style="border-left: 4px solid ${b.cor || 'var(--primary)'}; background: rgba(255,255,255,0.02); padding: 18px;"><h3 style="margin:0; font-size:14px; text-transform:uppercase;">${b.nome}</h3><p style="font-size:11px; font-weight:700; opacity:0.6; margin-top:10px;">${totalAtrasados} PENDENTES</p></div>`;
    }
    mainContent.innerHTML = html + '</div>';
  } catch (err) { console.error(err); }
}

async function renderBairroDetail(bId, from = 'home') {
  try {
    const b = await db.bairros.get(Number(bId));
    if (!b) return renderBairros();
    const cs = await db.clientes.where('bairroId').equals(Number(bId)).toArray();
    headerContent.innerHTML = `<div style="display: flex; flex-direction: column; gap: 15px;"><div style="display: flex; align-items: center; gap: 15px;"><button class="icon-btn" onclick="${from === 'bairros' ? 'window.renderBairros()' : 'window.renderDashboard()'}"><span class="material-symbols-rounded">arrow_back</span></button><div><h2 style="font-size:20px;">${b.nome}</h2><p style="font-size:11px; opacity:0.6;">Unidades</p></div></div><button class="btn-primary" onclick="window.renderPropertyForm(${b.id})" style="width: 100%; background: var(--primary); color: black;">+ ADICIONAR NOVA UNIDADE</button></div>`;
    let html = '<div class="animate-in" style="display: flex; flex-direction: column; gap: 15px; margin-top: 15px;">';
    for (const c of cs) {
      const es = await db.equipamentos.where('clienteId').equals(c.id).toArray();
      html += `<div class="card" style="border-top: 4px solid var(--primary); padding: 20px;"><div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;"><div><h3 style="margin: 0; font-size: 18px; color: white;">${c.nome}</h3><p style="font-size:11px; opacity:0.5; font-weight:700; text-transform:uppercase; margin-top:4px;">APTO • ${c.endereco || '-'}</p></div><a href="https://wa.me/${(c.whatsapp||'').replace(/\D/g,'')}" target="_blank" class="icon-btn" style="color: #25D366; background: rgba(37,211,102,0.1); border:none;"><span class="material-symbols-rounded">chat</span></a></div><div style="display: flex; flex-direction: column; gap: 10px;">${es.map(e => { const diff = Math.ceil((new Date(e.proximaManutencao) - new Date()) / 86400000); return `<div style="background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: 12px; padding: 15px;"><div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;"><div style="width:32px; height:32px; background:white; border-radius:6px; padding:6px;"><img src="${getLogo(e.marca)}" style="width: 100%; height:100%; object-fit:contain;" /></div><div style="flex:1;"><h4 style="margin:0; font-size:13px;">${e.localizacao}</h4><p style="font-size:9px; opacity:0.5; font-weight:700;">${e.btu} BTU • ${e.potencia || 'S/P'}</p></div><p style="font-size:9px; font-weight:800; color:${diff <= 2 ? '#ff5e00' : 'var(--primary)'};">${diff <= 0 ? 'VENCIDO' : diff + 'd'}</p></div><div style="display: flex; gap: 6px;"><button class="btn-primary q-m" data-id="${e.id}" style="flex:2; padding: 8px; font-size: 10px;">PREVENTIVA</button><button class="btn-primary q-m-cor" data-id="${e.id}" style="flex:2; padding: 8px; font-size: 10px; background:#ff9d00; color:black;">CORRETIVA</button><button class="icon-btn" onclick="window.renderEquipmentHistory(${e.id})" style="width:34px; height:34px; color:var(--primary);"><span class="material-symbols-rounded" style="font-size:16px;">history</span></button><button class="icon-btn" onclick="window.renderEquipmentForm(${e.id}, ${c.id})" style="width:34px; height:34px;"><span class="material-symbols-rounded" style="font-size:16px;">edit</span></button></div></div>`; }).join('')}</div><button class="btn-primary" style="margin-top: 15px; width:100%; background: #1e293b; color: var(--primary); font-size:10px;" onclick="window.renderEquipmentForm(null, ${c.id})">+ ADICIONAR AR NESTE APTO</button></div>`;
    }
    mainContent.innerHTML = html + '</div>';
    document.querySelectorAll('.q-m').forEach(b => b.onclick = () => renderMaintenanceForm(Number(b.dataset.id), 'Manutenção Preventiva'));
    document.querySelectorAll('.q-m-cor').forEach(b => b.onclick = () => renderMaintenanceForm(Number(b.dataset.id), 'Manutenção Corretiva / Emergência'));
  } catch (err) { console.error(err); }
}

async function renderHistorico() {
  try {
    headerContent.innerHTML = '<h2 style="font-size:22px;">RELATÓRIOS</h2><p style="font-size:11px; opacity:0.5;">Conclusões</p>';
    const os = await db.manutencoes.reverse().toArray();
    let html = '<div class="animate-in" style="display: flex; flex-direction: column; gap: 15px;">';
    for (const m of os) {
      const e = m.equipamentoId ? await db.equipamentos.get(m.equipamentoId) : null;
      const c = e ? await db.clientes.get(e.clienteId) : null;
      const isCor = m.descricao && m.descricao.includes('Corretiva');
      html += `<div class="card" style="border-left: 5px solid ${isCor ? '#ff9d00' : '#22c55e'};"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;"><span style="font-size: 8px; font-weight: 800; padding: 4px 8px; border-radius: 40px; background: ${isCor ? 'rgba(255,157,0,0.1)' : 'rgba(34,197,94,0.1)'}; color: ${isCor ? '#ff9d00' : '#22c55e'}; border: 1px solid ${isCor ? '#ff9d00' : '#22c55e'};">CONCLUÍDO</span><span style="font-size: 10px; opacity: 0.5;">${new Date(m.dataRealizada).toLocaleDateString()}</span></div><h4 style="margin:0; font-size:16px;">${c?.nome || 'Removido'}</h4><div style="background: rgba(255,255,255,0.02); padding: 10px; border-radius: 10px; display: flex; align-items: center; gap: 10px; margin-top:10px;"><div style="width:24px; height:24px; background:white; border-radius:4px; padding:4px;"><img src="${getLogo(e?.marca)}" style="width: 100%; height:100%; object-fit:contain;" /></div><p style="font-size:11px; font-weight:800; margin:0;">${e?.marca || 'S/M'} - ${e?.localizacao || 'Geral'}</p></div><p style="font-size: 13px; font-style: italic; background:rgba(0,0,0,0.2); padding:12px; border-radius:10px; margin-top:12px; color: #ddd;">${m.descricao}</p></div>`;
    }
    mainContent.innerHTML = html + '</div>';
  } catch (err) { console.error(err); }
}

async function renderMais() {
  const tech = localStorage.getItem('jampa_tech_name') || 'Técnico';
  const an = localStorage.getItem('jampa_app_name') || 'AR JAMPA';
  const curAv = localStorage.getItem('jampa_tech_avatar') || 'Felix';
  headerContent.innerHTML = '<h2>AJUSTES</h2><p>Sistema</p>';
  mainContent.innerHTML = `<div class="animate-in" style="display: flex; flex-direction: column; gap: 20px;"><div class="card"><label style="font-size:11px; font-weight:800; color:var(--primary); margin-bottom:15px; display:block;">Avatar</label><div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">${avatarSeeds.map(s => `<div class="avatar-option ${curAv === s ? 'active' : ''}" data-seed="${s}" style="cursor: pointer; border-radius: 12px; border: 2px solid ${curAv === s ? 'var(--primary)' : 'transparent'};"><img src="${getAvatarUrl(s)}" style="width: 100%;" /></div>`).join('')}</div></div><div class="card"><div class="form-group"><label>Nome</label><input type="text" id="p-t" class="form-control" value="${tech}"></div><div class="form-group" style="margin-top:10px;"><label>App</label><input type="text" id="p-a" class="form-control" value="${an}"></div><button class="btn-primary" id="b-s" style="margin-top:20px; width:100%;">SALVAR</button></div><div class="card" style="background: rgba(34, 197, 94, 0.05); border: 1px solid #22c55e;"><h3 style="font-size:14px; color:#22c55e; margin-bottom:12px;">BACKUP</h3><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;"><button onclick="window.exportData()" class="btn-primary" style="background:#22c55e; color:black; font-size:11px;">BAIXAR</button><button onclick="window.importData()" class="btn-primary" style="background:#1e293b; color:#22c55e; font-size:11px; border: 1px solid #22c55e;">RESTORE</button></div></div><div class="card" style="border-left: 4px solid var(--secondary); background: rgba(112, 0, 255, 0.02); padding: 25px;"><p style="font-size: 12px; margin:0;"><b>Versão:</b> 3.0.3 Titanium Pro</p><a href="https://wa.me/5583996612425" target="_blank" class="btn-primary" style="background: #25D366; margin-top:15px;">SUPORTE</a></div></div>`;
  document.querySelectorAll('.avatar-option').forEach(opt => { opt.onclick = () => { localStorage.setItem('jampa_tech_avatar', opt.dataset.seed); renderMais(); }; });
  document.getElementById('b-s').onclick = () => { localStorage.setItem('jampa_tech_name', document.getElementById('p-t').value); localStorage.setItem('jampa_app_name', document.getElementById('p-a').value); location.reload(); };
}

window.exportData = async () => {
  const data = { bairros: await db.bairros.toArray(), clientes: await db.clientes.toArray(), equipamentos: await db.equipamentos.toArray(), manutencoes: await db.manutencoes.toArray() };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `backup_jampa.json`; a.click();
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
        if (confirm('Restaurar dados?')) {
          await db.delete(); await db.open();
          if (data.bairros) await db.bairros.bulkAdd(data.bairros);
          if (data.clientes) await db.clientes.bulkAdd(data.clientes);
          if (data.equipamentos) await db.equipamentos.bulkAdd(data.equipamentos);
          if (data.manutencoes) await db.manutencoes.bulkAdd(data.manutencoes);
          location.reload();
        }
      } catch (err) { alert('Erro'); }
    };
    reader.readAsText(file);
  };
  input.click();
};

async function init() {
  try {
    const s = document.getElementById('splash-screen');
    if (navigator.storage && navigator.storage.persist) { await navigator.storage.persist(); }
    if (!db.isOpen()) await db.open();
    if (localStorage.getItem('jampa_reset_v15') !== 'done') { await db.delete(); await db.open(); await seedDatabase(); localStorage.setItem('jampa_reset_v15', 'done'); }
    setupNavigation(); await renderDashboard();
    if (s) { setTimeout(() => { s.style.opacity = '0'; setTimeout(() => s.remove(), 800); }, 1200); }
  } catch (err) { console.error(err); if (document.getElementById('splash-screen')) document.getElementById('splash-screen').style.display = 'none'; }
}

window.renderBairros = renderBairros; window.renderDashboard = renderDashboard; window.renderHistorico = renderHistorico; window.renderMais = renderMais; window.renderBairroDetail = renderBairroDetail; window.renderEquipmentForm = (id, cId) => { openModal(id ? 'Editar' : 'Novo Ar'); modalBody.innerHTML = `<form id="f-e"><div class="form-group"><label>Marca</label><select id="e-m" class="form-control">${marcas.map(m => `<option value="${m}">${m}</option>`).join('')}</select></div><div class="form-group" style="margin-top:10px;"><label>BTU</label><select id="e-b" class="form-control">${btus.map(b => `<option value="${b}">${b}</option>`).join('')}</select></div><div class="form-group" style="margin-top:10px;"><label>Local</label><input type="text" id="e-l" class="form-control" placeholder="Ex: Sala"></div><button type="submit" class="btn-primary" style="margin-top:20px; width:100%;">SALVAR</button></form>`; document.getElementById('f-e').onsubmit = async (e) => { e.preventDefault(); const d = { marca: document.getElementById('e-m').value, btu: Number(document.getElementById('e-b').value), localizacao: document.getElementById('e-l').value, clienteId: Number(cId), proximaManutencao: new Date() }; if (id) await db.equipamentos.update(Number(id), d); else await db.equipamentos.add(d); closeModal(); renderBairroDetail(cId, 'bairros'); }; };
window.renderPropertyForm = (bId) => { openModal('Novo Apto'); modalBody.innerHTML = `<form id="f-p"><div class="form-group"><label>Dono</label><input type="text" id="p-n" class="form-control" required></div><div class="form-group" style="margin-top:10px;"><label>Apto</label><input type="text" id="p-e" class="form-control" required></div><button type="submit" class="btn-primary" style="margin-top:20px; width:100%;">CADASTRAR</button></form>`; document.getElementById('f-p').onsubmit = async (e) => { e.preventDefault(); await db.clientes.add({ nome: document.getElementById('p-n').value, bairroId: Number(bId), endereco: document.getElementById('p-e').value, whatsapp: '(83) 9' }); closeModal(); renderBairroDetail(bId, 'bairros'); }; };
window.renderEquipmentHistory = renderEquipmentHistory;
init();
