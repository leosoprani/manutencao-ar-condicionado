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

function openModal(title) { modalTitle.textContent = title; modalOverlay.classList.add('active'); }
function closeModal() { modalOverlay.classList.remove('active'); }
if (closeModalBtn) closeModalBtn.onclick = closeModal;
if (fabAdd) fabAdd.onclick = () => renderMaintenanceForm();
if (avatarBtn) avatarBtn.onclick = () => renderMais();

const getLogo = (m) => {
  const name = m.toLowerCase();
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

async function renderDashboard(sortBy = 'proximas') {
  const tech = localStorage.getItem('jampa_tech_name') || 'Técnico';
  const av = localStorage.getItem('jampa_tech_avatar') || 'Felix';
  if (document.getElementById('display-user-name')) document.getElementById('display-user-name').textContent = tech;
  const img = document.querySelector('.user-profile img');
  if (img) img.src = getAvatarUrl(av);
  
  headerContent.innerHTML = `<div style="display: flex; justify-content: space-between; align-items: center;"><h2 style="font-size: 20px; margin:0;">Agenda</h2><select id="d-s" class="form-control" style="width: auto; font-size: 11px; padding: 4px 8px; height: 32px; background: rgba(255,255,255,0.05); border: none; color: var(--primary); font-weight: 700;"><option value="proximas" ${sortBy === 'proximas' ? 'selected' : ''}>GERAL</option><option value="bairro" ${sortBy === 'bairro' ? 'selected' : ''}>POR BAIRRO</option></select></div>`;

  const eqs = await db.equipamentos.toArray();
  const sorted = eqs.sort((a,b) => new Date(a.proximaManutencao) - new Date(b.proximaManutencao));
  let html = '<div class="dashboard-grid animate-in">';
  for (const e of sorted) {
    const c = await db.clientes.get(e.clienteId);
    const diff = Math.ceil((new Date(e.proximaManutencao) - new Date()) / 86400000);
    html += `
      <div class="card" style="grid-column: span 2; display: flex; flex-direction: column; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 15px;">
          <div style="width:42px; height:42px; background:white; border-radius:10px; padding:8px;"><img src="${getLogo(e.marca)}" style="width: 100%; height:100%; object-fit:contain;" /></div>
          <div onclick="window.renderBairroDetail(${c?.bairroId}, 'home')" style="flex:1;"><h3 style="font-size: 15px; margin: 0;">${c?.nome}</h3><p style="font-size: 10px; opacity: 0.6; font-weight:600;">${e.marca} • ${e.localizacao}</p></div>
          <span style="font-size: 10px; font-weight: 800; color: ${diff <= 2 ? '#ff5e00' : 'var(--primary)'}; background: rgba(255,255,255,0.03); padding: 5px 8px; border-radius: 6px;">${diff <= 0 ? 'HOJE' : diff + 'd'}</span>
        </div>
        <div style="display: flex; gap: 8px;"><button class="btn-primary q-m" data-id="${e.id}" style="flex:1;">REGISTRAR</button></div>
      </div>`;
  }
  mainContent.innerHTML = html + '</div>';
  const sSel = document.getElementById('d-s'); if (sSel) sSel.onchange = (e) => renderDashboard(e.target.value);
  document.querySelectorAll('.q-m').forEach(b => b.onclick = () => renderMaintenanceForm(Number(b.dataset.id)));
}

async function renderBairros() {
  headerContent.innerHTML = '<h2 style="font-size:22px;">CADASTRAR</h2><p style="font-size:11px; opacity:0.5;">Selecione o Edifício ou Zona</p>';
  const bairros = await db.bairros.toArray();
  const today = new Date();
  let html = '<div style="display: flex; gap: 10px; margin-bottom: 25px;"><button class="btn-primary" id="b-n-b" style="flex: 1;">+ NOVO EDIFÍCIO / ZONA</button></div><div class="dashboard-grid animate-in">';
  for (const b of bairros) {
    const clients = await db.clientes.where('bairroId').equals(b.id).toArray();
    const cids = clients.map(c => c.id);
    const eqsInB = await db.equipamentos.where('clienteId').anyOf(cids).toArray();
    const totalAtrasados = eqsInB.filter(e => new Date(e.proximaManutencao) <= today).length;
    html += `<div class="card" onclick="window.renderBairroDetail(${b.id}, 'bairros')" style="border-left: 4px solid ${b.cor || 'var(--primary)'}; background: rgba(255,255,255,0.02); padding: 18px;"><h3 style="margin:0; font-size:14px; text-transform:uppercase;">${b.nome}</h3><p style="font-size:11px; font-weight:700; opacity:0.6; margin-top:10px;">${totalAtrasados} PENDENTES</p></div>`;
  }
  mainContent.innerHTML = html + '</div>';
  document.getElementById('b-n-b').onclick = () => renderBairroForm();
}

async function renderBairroDetail(bId, from = 'home') {
  const b = await db.bairros.get(Number(bId));
  const cs = await db.clientes.where('bairroId').equals(Number(bId)).toArray();
  headerContent.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 15px;">
      <div style="display: flex; align-items: center; gap: 15px;">
        <button class="icon-btn" onclick="${from === 'bairros' ? 'window.renderBairros()' : 'window.renderDashboard()'}"><span class="material-symbols-rounded">arrow_back</span></button>
        <div><h2 style="font-size:20px;">${b.nome}</h2><p style="font-size:11px; opacity:0.6;">Painel de Unidades</p></div>
      </div>
      <button class="btn-primary" onclick="window.renderPropertyForm(${bId})" style="width: 100%; background: var(--primary); color: black;">+ ADICIONAR NOVO APTO / PROPRIETÁRIO</button>
    </div>`;
  
  let html = '<div class="animate-in" style="display: flex; flex-direction: column; gap: 15px; margin-top: 15px;">';
  for (const c of cs) {
    const es = await db.equipamentos.where('clienteId').equals(c.id).toArray();
    html += `
      <div class="card" style="border-top: 4px solid var(--primary); padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
          <div>
            <h3 style="margin: 0; font-size: 18px; color: white;">${c.nome}</h3>
            <p style="font-size:11px; opacity:0.5; font-weight:700; text-transform:uppercase; margin-top:4px;">APARTAMENTO • ${c.endereco || 'Geral'}</p>
          </div>
          <a href="https://wa.me/${c.whatsapp.replace(/\D/g,'')}" target="_blank" class="icon-btn" style="color: #25D366; background: rgba(37,211,102,0.1); border:none;"><span class="material-symbols-rounded">chat</span></a>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${es.map(e => {
            const diff = Math.ceil((new Date(e.proximaManutencao) - new Date()) / 86400000);
            return `
            <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: 12px; padding: 15px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width:32px; height:32px; background:white; border-radius:6px; padding:6px;"><img src="${getLogo(e.marca)}" style="width: 100%; height:100%; object-fit:contain;" /></div>
                <div style="flex:1;">
                   <h4 style="margin:0; font-size:13px;">${e.localizacao}</h4>
                   <p style="font-size:9px; opacity:0.5; font-weight:700;">${e.btu} BTU • ${e.modelo || 'S/M'}</p>
                </div>
                <p style="font-size:9px; font-weight:800; color:${diff <= 2 ? '#ff5e00' : 'var(--primary)'};">${diff <= 0 ? 'VENCIDO' : diff + 'd'}</p>
              </div>
              <div style="display: flex; gap: 6px; margin-top: 12px;">
                <button class="btn-primary q-m" data-id="${e.id}" style="flex:2; padding: 8px; font-size: 10px;">REGISTRAR</button>
                <button class="icon-btn" onclick="window.renderEquipmentForm(${e.id}, ${c.id})" style="width:34px; height:34px;"><span class="material-symbols-rounded" style="font-size:16px;">edit</span></button>
                <button class="icon-btn" onclick="window.deleteEquipment(${e.id})" style="width:34px; height:34px; color:var(--accent);"><span class="material-symbols-rounded" style="font-size:16px;">delete</span></button>
              </div>
            </div>`;
          }).join('')}
        </div>
        <button class="btn-primary" style="margin-top: 15px; width:100%; background: #1e293b; color: var(--primary); font-size:10px;" onclick="window.renderEquipmentForm(null, ${c.id})">+ ADICIONAR AR NESTE APTO</button>
      </div>`;
  }
  if (cs.length === 0) html += '<div style="text-align:center; padding:40px; opacity:0.3;"><p>Nenhum apartamento cadastrado neste edifício.</p></div>';
  mainContent.innerHTML = html + '</div>';
  document.querySelectorAll('.q-m').forEach(b => b.onclick = () => renderMaintenanceForm(Number(b.dataset.id)));
}

async function renderPropertyForm(bId) {
  openModal('Novo Apartamento / Proprietário');
  modalBody.innerHTML = `
    <form id="f-p">
      <div class="form-group"><label>Nome do Proprietário</label><input type="text" id="p-n" class="form-control" required placeholder="Ex: João Silva"></div>
      <div class="form-group" style="margin-top:10px;"><label>Número do Apto / Unidade</label><input type="text" id="p-e" class="form-control" required placeholder="Ex: Apt 101"></div>
      <div class="form-group" style="margin-top:10px;"><label>WhatsApp</label><input type="text" id="p-w" class="form-control" value="(83) 9" required></div>
      <button type="submit" class="btn-primary" style="width:100%; margin-top:25px;">CADASTRAR UNIDADE</button>
    </form>`;
  document.getElementById('f-p').onsubmit = async (e) => {
    e.preventDefault();
    await db.clientes.add({ nome: document.getElementById('p-n').value, bairroId: Number(bId), endereco: document.getElementById('p-e').value, whatsapp: document.getElementById('p-w').value, telefone: '(83) 9' });
    closeModal(); renderBairroDetail(bId, 'bairros');
  };
}

// ... other functions (Equipment Form, History, etc) ...
async function renderEquipmentForm(id = null, preCId = null) {
  const eq = id ? await db.equipamentos.get(id) : null;
  openModal(id ? 'Editar Equipamento' : 'Novo Equipamento');
  let sB = eq?.marca || 'Samsung';
  const r = () => {
    modalBody.innerHTML = `
      <form id="f-e">
        <label style="font-size:10px; font-weight:800; color:var(--primary); margin-bottom:12px; display:block; text-transform:uppercase;">Escolha a Marca</label>
        <div class="brand-grid" style="margin-bottom: 20px;">
          ${marcas.map(m => `<div class="brand-item ${sB === m ? 'active' : ''}" data-brand="${m}" style="padding: 10px; border-radius: 12px; background: white; text-align: center; cursor: pointer; border: 2.5px solid ${sB === m ? 'var(--primary)' : 'transparent'};"><img src="${getLogo(m)}" style="width: 100%; height: 24px; object-fit: contain;" /><p style="font-size: 8px; color: #333; font-weight: 800; margin: 4px 0 0;">${m}</p></div>`).join('')}
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap:12px;">
           <div class="form-group"><label>Capacidade (BTU)</label><select id="e-b" class="form-control">${btus.map(b => `<option value="${b}" ${eq?.btu == b ? 'selected' : ''}>${b} BTU</option>`).join('')}</select></div>
           <div class="form-group"><label>Potência (W/A)</label><input type="text" id="e-p" class="form-control" value="${eq?.potencia || ''}" placeholder="Ex: 1500W"></div>
        </div>
        <div class="form-group" style="margin-top:10px;"><label>Localização (Cômodo)</label><input type="text" id="e-l" class="form-control" value="${eq?.localizacao || ''}" placeholder="Ex: Sala"></div>
        <button type="submit" class="btn-primary" style="width:100%; margin-top:25px;">SALVAR APARELHO</button>
      </form>`;
    document.querySelectorAll('.brand-item').forEach(i => i.onclick = () => { sB = i.dataset.brand; r(); });
    document.getElementById('f-e').onsubmit = async (e) => {
      e.preventDefault();
      const c = await db.clientes.get(preCId || eq?.clienteId);
      const d = { marca: sB, btu: Number(document.getElementById('e-b').value), potencia: document.getElementById('e-p').value, modelo: '', localizacao: document.getElementById('e-l').value, unidade: c?.endereco, clienteId: c.id };
      if (id) await db.equipamentos.update(id, d); else await db.equipamentos.add({ ...d, proximaManutencao: new Date() });
      closeModal(); renderBairroDetail(c.bairroId, 'bairros');
    };
  };
  r();
}

window.deleteEquipment = async (id) => {
  if (confirm('Deseja realmente excluir este aparelho?')) {
    const eq = await db.equipamentos.get(id);
    const c = await db.clientes.get(eq.clienteId);
    await db.equipamentos.delete(id);
    renderBairroDetail(c.bairroId, 'bairros');
  }
};

async function renderHistorico() {
  headerContent.innerHTML = '<h2 style="font-size:22px;">RELATÓRIOS</h2><p style="font-size:11px; opacity:0.5;">Histórico completo</p>';
  const os = await db.manutencoes.reverse().toArray();
  let html = '<div class="animate-in" style="display: flex; flex-direction: column; gap: 15px;">';
  for (const m of os) {
    const e = await db.equipamentos.get(m.equipamentoId);
    const c = e ? await db.clientes.get(e.clienteId) : null;
    html += `<div class="card"><h4 style="margin:0; font-size:15px;">${c?.nome}</h4><p style="font-size:10px; color:var(--primary); font-weight:700; margin-top:5px;">${e?.marca} • ${new Date(m.dataRealizada).toLocaleDateString()}</p><p style="font-size: 13px; font-style: italic; background:rgba(0,0,0,0.1); padding:10px; border-radius:10px; margin-top:10px;">${m.descricao}</p></div>`;
  }
  mainContent.innerHTML = html + '</div>';
}

async function renderBairroForm() {
  openModal('Novo Edifício ou Zona');
  modalBody.innerHTML = '<form id="f-b"><div class="form-group"><label>Nome</label><input type="text" id="b-n" class="form-control" required placeholder="Ex: Edifício Água Fria"></div><div class="form-group"><label>Cor do Marcador</label><input type="color" id="b-c" class="form-control" value="#00f2ff"></div><button type="submit" class="btn-primary" style="width:100%; margin-top:20px;">CADASTRAR</button></form>';
  document.getElementById('f-b').onsubmit = async (e) => { e.preventDefault(); await db.bairros.add({ nome: document.getElementById('b-n').value, cor: document.getElementById('b-c').value }); closeModal(); renderBairros(); };
}

function renderMais() {
  const t = localStorage.getItem('jampa_tech_name') || 'Técnico';
  const an = localStorage.getItem('jampa_app_name') || 'AR JAMPA';
  const currentAvatar = localStorage.getItem('jampa_tech_avatar') || 'Felix';
  headerContent.innerHTML = '<h2>AJUSTES</h2><p>Perfil e Sistema</p>';
  mainContent.innerHTML = `
    <div class="animate-in" style="display: flex; flex-direction: column; gap: 20px;">
      <div class="card">
        <label style="font-size: 11px; font-weight: 800; color: var(--primary); text-transform: uppercase; margin-bottom: 15px; display: block;">Escolha seu Avatar</label>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
          ${avatarSeeds.map(s => `<div class="avatar-option ${currentAvatar === s ? 'active' : ''}" data-seed="${s}" style="cursor: pointer; border-radius: 12px; overflow: hidden; border: 2px solid ${currentAvatar === s ? 'var(--primary)' : 'transparent'}; background: rgba(255,255,255,0.03);"><img src="${getAvatarUrl(s)}" style="width: 100%; display: block;" /></div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="form-group"><label>Seu Nome</label><input type="text" id="p-t" class="form-control" value="${t}"></div>
        <div class="form-group" style="margin-top:10px;"><label>Nome do App</label><input type="text" id="p-a" class="form-control" value="${an}"></div>
        <button class="btn-primary" id="b-s" style="margin-top:20px; width:100%;">SALVAR AJUSTES</button>
      </div>
      <div class="card" style="border-left: 4px solid var(--secondary); background: rgba(112, 0, 255, 0.02); padding: 25px;">
        <h3 style="font-size: 14px; margin-bottom: 12px; color: var(--secondary); text-transform: uppercase;">SOBRE O SISTEMA</h3>
        <p style="font-size: 12px; margin:0;"><b>Desenvolvido por:</b> Leonardo Soprani</p>
        <p style="font-size: 12px; margin:0;"><b>Versão:</b> 3.0.0 Premium</p>
        <p style="font-size: 12px; margin:0;"><b>Ano:</b> 2026</p>
        <a href="https://wa.me/5583987014444" target="_blank" class="btn-primary" style="background: #25D366; margin-top:15px;">CONTATO SUPORTE</a>
      </div>
    </div>`;
  document.querySelectorAll('.avatar-option').forEach(opt => {
    opt.onclick = () => {
      const s = opt.dataset.seed; localStorage.setItem('jampa_tech_avatar', s);
      renderMais(); const img = document.querySelector('.user-profile img'); if (img) img.src = getAvatarUrl(s);
    };
  });
  document.getElementById('b-s').onclick = () => { 
    localStorage.setItem('jampa_tech_name', document.getElementById('p-t').value); 
    localStorage.setItem('jampa_app_name', document.getElementById('p-a').value); 
    location.reload(); 
  };
}

async function renderMaintenanceForm(eqId = null) {
  const eqs = await db.equipamentos.toArray();
  const cls = await db.clientes.toArray();
  const brs = await db.bairros.toArray();
  openModal('Registrar Serviço');
  let tab = eqId ? 'existente' : 'avulso';
  const r = () => {
    modalBody.innerHTML = `
      <div style="display: flex; gap: 10px; margin-bottom: 20px;"><button class="btn-primary" id="t-ex" style="flex: 1; background: ${tab === 'existente' ? 'var(--primary)' : '#1e293b'}; color: ${tab === 'existente' ? 'black' : 'white'};">SALVO</button><button class="btn-primary" id="t-av" style="flex: 1; background: ${tab === 'avulso' ? 'var(--primary)' : '#1e293b'}; color: ${tab === 'avulso' ? 'black' : 'white'};">NOVO</button></div>
      <form id="f-m">
        ${tab === 'existente' ? `<div class="form-group"><label>Aparelho</label><select id="m-eq" class="form-control">${eqs.map(e => `<option value="${e.id}" ${eqId == e.id ? 'selected' : ''}>${cls.find(c => c.id === e.clienteId)?.nome} - ${e.marca}</option>`).join('')}</select></div>` : `<div class="form-group"><label>Cliente</label><input type="text" id="av-n" class="form-control" required></div><div style="display: grid; grid-template-columns: 1fr 1fr; gap:12px;"><div class="form-group"><label>Bairro</label><select id="av-b" class="form-control">${brs.map(b => `<option value="${b.id}">${b.nome}</option>`).join('')}</select></div><div class="form-group"><label>Marca</label><select id="av-m" class="form-control">${marcas.map(m => `<option value="${m}">${m}</option>`).join('')}</select></div></div>`}
        <div class="form-group"><label>Descrição</label><textarea id="m-d" class="form-control" rows="2" required placeholder="O que foi feito?"></textarea></div>
        <div class="form-group"><label>Próxima Visita</label><input type="date" id="m-nx" class="form-control" required value="${new Date(Date.now() + 15552000000).toISOString().split('T')[0]}"></div>
        <button type="submit" class="btn-primary" style="width:100%; margin-top:20px;">REGISTRAR</button>
      </form>`;
    document.getElementById('t-ex').onclick = () => { tab = 'existente'; r(); };
    document.getElementById('t-av').onclick = () => { tab = 'avulso'; r(); };
    document.getElementById('f-m').onsubmit = async (e) => {
      e.preventDefault();
      let fId = eqId;
      if (tab === 'avulso') {
        const cId = await db.clientes.add({ nome: document.getElementById('av-n').value, bairroId: Number(document.getElementById('av-b').value), endereco: 'Avulso', whatsapp: '(83) 9' });
        fId = await db.equipamentos.add({ marca: document.getElementById('av-m').value, btu: 12000, localizacao: 'Geral', clienteId: cId, proximaManutencao: new Date() });
      } else { fId = Number(document.getElementById('m-eq').value); }
      const nxD = new Date(document.getElementById('m-nx').value);
      await db.manutencoes.add({ equipamentoId: fId, dataRealizada: new Date(), descricao: document.getElementById('m-d').value, proximaData: nxD });
      await db.equipamentos.update(fId, { ultimaManutencao: new Date(), proximaManutencao: nxD });
      closeModal(); renderDashboard();
    };
  };
  r();
}

async function init() {
  const an = localStorage.getItem('jampa_app_name') || 'AR JAMPA';
  const av = localStorage.getItem('jampa_tech_avatar') || 'Felix';
  const sn = document.getElementById('splash-app-name'); if (sn) sn.textContent = an;
  const s = document.getElementById('splash-screen'); const sl = document.getElementById('splash-loader');
  if (sl) setTimeout(() => sl.style.width = '100%', 100);
  if (s) setTimeout(() => { s.style.opacity = '0'; setTimeout(() => s.remove(), 800); }, 1500);
  if (localStorage.getItem('jampa_reset_v14') !== 'done') { await db.delete(); await db.open(); await seedDatabase(); localStorage.setItem('jampa_reset_v14', 'done'); }
  setupNavigation(); renderDashboard();
}

window.renderBairros = renderBairros;
window.renderDashboard = renderDashboard;
window.renderHistorico = renderHistorico;
window.renderMais = renderMais;
window.renderBairroDetail = renderBairroDetail;
window.renderEquipmentForm = renderEquipmentForm;
window.renderPropertyForm = renderPropertyForm;

init();
