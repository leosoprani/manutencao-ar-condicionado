import { db, seedDatabase } from './db';

// UI Elements
const mainContent = document.getElementById('main-content');
const headerContent = document.getElementById('header-content');
const navItems = document.querySelectorAll('.nav-item');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const closeModalBtn = document.getElementById('btn-close-modal');
const fabAdd = document.getElementById('fab-add');

const avatar = document.querySelector('.user-profile');
const btnNotif = document.getElementById('btn-notifications');

const marcas = ['EOS', 'AGRATTO', 'LG', 'Samsung', 'Gree', 'Midea', 'Springer', 'Carrier', 'Fujitsu', 'Daikin', 'Electrolux', 'Philco', 'Consul', 'Hitachi', 'Comfee', 'Elgin'];
const btus = [9000, 12000, 18000, 24000, 30000, 36000, 48000, 60000];

function openModal(title) { modalTitle.textContent = title; modalOverlay.classList.add('active'); }
function closeModal() { modalOverlay.classList.remove('active'); }
if (closeModalBtn) closeModalBtn.onclick = closeModal;
if (fabAdd) fabAdd.onclick = () => renderMaintenanceForm();
if (avatar) avatar.onclick = () => renderMais();

const getLogo = (m) => {
  const name = m.toLowerCase();
  const ext = (name === 'samsung') ? 'jpg' : 'png';
  return `brands/${name}.${ext}`;
};

async function requestPersist() {
  if (navigator.storage \&\& navigator.storage.persist) {
    const isPersisted = await navigator.storage.persist();
    console.log(`Storage persisted: ${isPersisted}`);
  }
}

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
  const app = localStorage.getItem('jampa_app_name') || 'AR JAMPA';
  if (document.getElementById('display-user-name')) document.getElementById('display-user-name').textContent = tech;
  headerContent.innerHTML = `<div style="display: flex; flex-direction: column; gap: 15px;"><div style="display: flex; justify-content: space-between; align-items: center;"><h2 style="font-size: 20px;">Agenda</h2><select id="d-s" class="form-control" style="width: auto; font-size: 11px;"><option value="proximas" ${sortBy === 'proximas' ? 'selected' : ''}>Agenda Geral</option><option value="bairro" ${sortBy === 'bairro' ? 'selected' : ''}>Por Bairro</option></select></div><div class="search-bar-global" style="position: relative;"><span class="material-symbols-rounded" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-secondary); font-size: 18px;">search</span><input type="text" id="g-s" placeholder="Pesquisar..." style="width: 100%; background: rgba(255,255,255,0.05); border-radius: 12px; padding: 12px 15px 12px 40px; color: white; border: none; outline: none;"></div></div>`;
  const eqs = await db.equipamentos.toArray();
  const rec = await db.manutencoes.reverse().limit(3).toArray();
  let html = '<div class="dashboard-grid animate-in">';
  if (rec.length > 0) {
    html += `<div style="grid-column: span 2; margin-top: 10px; display: flex; align-items: center; gap: 8px;"><h3 style="font-size: 12px; color: var(--secondary);">SERVIÇOS RECENTES</h3></div>`;
    for (const m of rec) {
      const e = await db.equipamentos.get(m.equipamentoId);
      const c = e ? await db.clientes.get(e.clienteId) : null;
      html += `<div class="card" style="grid-column: span 2; padding: 10px; display: flex; align-items: center; gap: 10px;"><img src="${getLogo(e?.marca)}" style="width: 24px;" /><div><h4 style="font-size: 12px; margin: 0;">${c?.nome}</h4><p style="font-size: 10px; opacity: 0.5;">${new Date(m.dataRealizada).toLocaleDateString()}</p></div></div>`;
    }
  }
  html += `<div style="grid-column: span 2; margin-top: 20px;"><h3 style="font-size: 12px; color: var(--primary);">PRÓXIMAS MANUTENÇÕES</h3></div>`;
  const sorted = eqs.sort((a,b) => new Date(a.proximaManutencao) - new Date(b.proximaManutencao));
  for (const e of sorted) {
    const c = await db.clientes.get(e.clienteId);
    const diff = Math.ceil((new Date(e.proximaManutencao) - new Date()) / (86400000));
    html += `<div class="card" style="grid-column: span 2; display: flex; flex-direction: column; gap: 10px;"><div style="display: flex; align-items: center; gap: 12px;"><img src="${getLogo(e.marca)}" style="width: 32px;" /><div onclick="window.renderBairroDetail(${c?.bairroId}, 'home')"><h3 style="font-size: 14px; margin: 0;">${c?.nome}</h3><p style="font-size: 10px; opacity: 0.7;">${e.marca} - ${e.localizacao} (${e.unidade || ''})</p></div><span style="margin-left: auto; font-size: 10px; background: rgba(0,242,255,0.1); padding: 4px 8px; border-radius: 4px;">${diff <= 0 ? 'HOJE' : diff + 'd'}</span></div><div style="display: flex; gap: 8px;"><button class="btn-primary q-m" data-id="${e.id}" style="padding: 6px; font-size: 11px;">REGISTRAR MANUTENÇÃO</button><a href="https://wa.me/${c?.whatsapp.replace(/\D/g,'')}" class="icon-btn" style="color: #25D366;"><span class="material-symbols-rounded">chat</span></a></div></div>`;
  }
  mainContent.innerHTML = html + '</div>';
  document.querySelectorAll('.q-m').forEach(b => b.onclick = () => renderMaintenanceForm(Number(b.dataset.id)));
}

async function exportData() {
  const bairros = await db.bairros.toArray();
  const clientes = await db.clientes.toArray();
  const equipamentos = await db.equipamentos.toArray();
  const manutencoes = await db.manutencoes.toArray();
  const backup = { bairros, clientes, equipamentos, manutencoes, date: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_arjampa_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
}

async function importData(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      await db.delete(); await db.open();
      if (data.bairros) await db.bairros.bulkAdd(data.bairros);
      if (data.clientes) await db.clientes.bulkAdd(data.clientes);
      if (data.equipamentos) await db.equipamentos.bulkAdd(data.equipamentos);
      if (data.manutencoes) await db.manutencoes.bulkAdd(data.manutencoes);
      alert('Backup Restaurado com Sucesso!');
      location.reload();
    } catch (err) { alert('Erro ao importar arquivo!'); }
  };
  reader.readAsText(file);
}

function renderMais() {
  const t = localStorage.getItem('jampa_tech_name') || 'Técnico';
  headerContent.innerHTML = `<h2>Perfil</h2><p>Backup e Configurações</p>`;
  mainContent.innerHTML = `
    <div class="animate-in" style="display: flex; flex-direction: column; gap: 15px;">
      <div class="card" style="padding: 20px;">
        <div class="form-group"><label>Nome</label><input type="text" id="p-t" class="form-control" value="${t}"></div>
        <button class="btn-primary" id="b-s">SALVAR NOME</button>
      </div>
      <div class="card" style="padding: 20px; background: rgba(0,242,255,0.05);">
        <h3 style="font-size: 14px; margin-bottom: 10px;">SEGURANÇA (BACKUP)</h3>
        <p style="font-size: 11px; opacity: 0.7; margin-bottom: 15px;">Baixe seus dados para não perder nada se limpar o histórico.</p>
        <div style="display: flex; gap: 10px;">
          <button class="btn-primary" id="b-exp" style="flex: 1;">EXPORTAR BACKUP</button>
          <label class="btn-primary" style="flex: 1; text-align: center; background: var(--surface-container); color: var(--primary); cursor: pointer;">
            IMPORTAR <input type="file" id="b-imp" style="display: none;" accept=".json">
          </label>
        </div>
      </div>
      <button class="btn-primary" style="background: var(--accent);" id="b-r">APAGAR TUDO</button>
    </div>
  `;
  document.getElementById('b-s').onclick = () => { localStorage.setItem('jampa_tech_name', document.getElementById('p-t').value); location.reload(); };
  document.getElementById('b-exp').onclick = exportData;
  document.getElementById('b-imp').onchange = (e) => importData(e.target.files[0]);
  document.getElementById('b-r').onclick = async () => { if(confirm('Apagar tudo?')) { await db.delete(); localStorage.clear(); location.reload(); } };
}

// ... other render functions (Bairros, OS, forms) remain with their event logic ...
async function renderBairros() {
  headerContent.innerHTML = `<h2>Cadastrar</h2><p>Regiões e Clientes</p>`;
  const bairros = await db.bairros.toArray();
  let html = `<div style="display: flex; gap: 10px; margin-bottom: 15px;"><button class="btn-primary" id="b-n-b">+ BAIRRO</button><button class="btn-primary" id="b-n-p">+ CLIENTE</button></div><div class="dashboard-grid">`;
  for (const b of bairros) { html += `<div class="card" onclick="window.renderBairroDetail(${b.id}, 'bairros')"><h3>${b.nome}</h3></div>`; }
  mainContent.innerHTML = html + '</div>';
  document.getElementById('b-n-b').onclick = () => renderBairroForm();
  document.getElementById('b-n-p').onclick = () => renderPropertyForm();
}

async function renderBairroForm() {
  openModal('Novo Bairro');
  modalBody.innerHTML = `<form id="f-b"><div class="form-group"><label>Nome</label><input type="text" id="b-n" class="form-control" required></div><button type="submit" class="btn-primary">SALVAR</button></form>`;
  document.getElementById('f-b').onsubmit = async (e) => { e.preventDefault(); await db.bairros.add({ nome: document.getElementById('b-n').value, cor: '#00f2ff' }); closeModal(); renderBairros(); };
}

async function renderPropertyForm() {
  const brs = await db.bairros.toArray();
  openModal('Novo Cliente');
  modalBody.innerHTML = `<form id="f-p"><div class="form-group"><label>Nome</label><input type="text" id="p-n" class="form-control" required></div><div class="form-group"><label>Bairro</label><select id="p-b" class="form-control">${brs.map(b => `<option value="${b.id}">${b.nome}</option>`).join('')}</select></div><div class="form-group"><label>WhatsApp</label><input type="text" id="p-w" class="form-control" value="(83) 9"></div><button type="submit" class="btn-primary">SALVAR</button></form>`;
  document.getElementById('f-p').onsubmit = async (e) => { e.preventDefault(); await db.clientes.add({ nome: document.getElementById('p-n').value, bairroId: Number(document.getElementById('p-b').value), endereco: 'Endereço', whatsapp: document.getElementById('p-w').value, tipo: 'Residência', telefone: '(83) 9' }); closeModal(); renderBairros(); };
}

async function renderEquipmentForm(id = null, preCId = null) {
  const eq = id ? await db.equipamentos.get(id) : null;
  openModal(id ? 'Editar Ar' : 'Novo Ar');
  let selectedBrand = eq?.marca || 'Samsung';
  const r = () => {
    modalBody.innerHTML = `
      <form id="f-e">
        <div class="brand-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px;">
          ${marcas.map(m => `
            <div class="brand-item ${selectedBrand === m ? 'active' : ''}" data-brand="${m}" style="padding: 8px; border-radius: 12px; background: white; text-align: center; cursor: pointer; border: 2px solid ${selectedBrand === m ? 'var(--primary)' : 'transparent'};">
              <img src="${getLogo(m)}" style="width: 100%; height: 30px; object-fit: contain;" />
              <p style="font-size: 8px; color: #333; font-weight: 800; margin: 4px 0 0;">${m}</p>
            </div>
          `).join('')}
        </div>
        <div class="form-group"><label>BTUs</label><select id="e-b" class="form-control">${btus.map(b => `<option value="${b}" ${eq?.btu == b ? 'selected' : ''}>${b} BTU</option>`).join('')}</select></div>
        <div class="form-group"><label>Modelo</label><input type="text" id="e-m" class="form-control" value="${eq?.modelo || ''}"></div>
        <div class="form-group"><label>Local</label><input type="text" id="e-l" class="form-control" value="${eq?.localizacao || ''}"></div>
        <button type="submit" class="btn-primary">SALVAR</button>
      </form>
    `;
    document.querySelectorAll('.brand-item').forEach(i => i.onclick = () => { selectedBrand = i.dataset.brand; r(); });
    document.getElementById('f-e').onsubmit = async (e) => {
      e.preventDefault();
      const data = { marca: selectedBrand, btu: Number(document.getElementById('e-b').value), modelo: document.getElementById('e-m').value, localizacao: document.getElementById('e-l').value, clienteId: preCId || eq?.clienteId };
      if (id) await db.equipamentos.update(id, data); else await db.equipamentos.add({ ...data, proximaManutencao: new Date() });
      closeModal(); renderDashboard();
    };
  };
  r();
}

async function renderMaintenanceForm(eqId = null) {
  const eqs = await db.equipamentos.toArray();
  const cls = await db.clientes.toArray();
  const brs = await db.bairros.toArray();
  openModal('Registrar Serviço');
  let tab = eqId ? 'existente' : 'avulso';
  const r = () => {
    modalBody.innerHTML = `
      <div style="display: flex; gap: 10px; margin-bottom: 20px;"><button class="btn-primary" id="t-ex" style="flex: 1; background: ${tab === 'existente' ? 'var(--primary)' : 'var(--surface-container)'}; color: ${tab === 'existente' ? 'black' : 'white'};">EXISTENTE</button><button class="btn-primary" id="t-av" style="flex: 1; background: ${tab === 'avulso' ? 'var(--primary)' : 'var(--surface-container)'}; color: ${tab === 'avulso' ? 'black' : 'white'};">AVULSO</button></div>
      <form id="f-m">
        ${tab === 'existente' ? `<div class="form-group"><label>Ar</label><select id="m-eq" class="form-control">${eqs.map(e => `<option value="${e.id}" ${eqId == e.id ? 'selected' : ''}>${cls.find(c => c.id === e.clienteId)?.nome} - ${e.marca}</option>`).join('')}</select></div>` : `<div class="form-group"><label>Cliente</label><input type="text" id="av-n" class="form-control" required></div><div class="form-group"><label>Bairro</label><select id="av-b" class="form-control">${brs.map(b => `<option value="${b.id}">${b.nome}</option>`).join('')}</select></div><div class="form-group"><label>Marca</label><select id="av-m" class="form-control">${marcas.map(m => `<option value="${m}">${m}</option>`).join('')}</select></div>`}
        <div class="form-group"><label>O que foi feito?</label><textarea id="m-d" class="form-control" rows="2" required></textarea></div>
        <div class="form-group"><label>Data Retorno</label><input type="date" id="m-nx" class="form-control" required value="${new Date(Date.now() + 15552000000).toISOString().split('T')[0]}"></div>
        <button type="submit" class="btn-primary">SALVAR</button>
      </form>
    `;
    document.getElementById('t-ex').onclick = () => { tab = 'existente'; r(); };
    document.getElementById('t-av').onclick = () => { tab = 'avulso'; r(); };
    document.getElementById('f-m').onsubmit = async (e) => {
      e.preventDefault();
      let fid = eqId;
      if (tab === 'avulso') {
        const cid = await db.clientes.add({ nome: document.getElementById('av-n').value, bairroId: Number(document.getElementById('av-b').value), endereco: 'Avulso', whatsapp: '(83) 9' });
        fid = await db.equipamentos.add({ marca: document.getElementById('av-m').value, btu: 12000, clienteId: cid, proximaManutencao: new Date() });
      } else { fid = Number(document.getElementById('m-eq').value); }
      const nxD = new Date(document.getElementById('m-nx').value);
      await db.manutencoes.add({ equipamentoId: fid, dataRealizada: new Date(), descricao: document.getElementById('m-d').value, proximaData: nxD });
      await db.equipamentos.update(fid, { ultimaManutencao: new Date(), proximaManutencao: nxD });
      closeModal(); renderDashboard();
    };
  };
  r();
}

async function renderHistorico() {
  headerContent.innerHTML = `<h2>Histórico</h2><p>Serviços Finalizados</p>`;
  const os = await db.manutencoes.reverse().toArray();
  let html = '<div class="animate-in" style="display: flex; flex-direction: column; gap: 15px;">';
  for (const m of os) {
    const e = await db.equipamentos.get(m.equipamentoId);
    const c = e ? await db.clientes.get(e.clienteId) : null;
    html += `<div class="card"><h4>${c?.nome}</h4><p>${e?.marca} - ${new Date(m.dataRealizada).toLocaleDateString()}</p><p style="font-size: 12px; font-style: italic;">${m.descricao}</p></div>`;
  }
  mainContent.innerHTML = html + '</div>';
}

async function renderBairroDetail(bId, from = 'home') {
  const b = await db.bairros.get(Number(bId));
  const cs = await db.clientes.where('bairroId').equals(Number(bId)).toArray();
  headerContent.innerHTML = `<div style="display: flex; align-items: center; gap: 12px;"><button class="icon-btn" onclick="${from === 'bairros' ? 'renderBairros()' : 'renderDashboard()'}"><span class="material-symbols-rounded">arrow_back</span></button><div><h2>${b.nome}</h2><p>Clientes</p></div></div>`;
  let html = '<div class="animate-in">';
  for (const c of cs) {
    const es = await db.equipamentos.where('clienteId').equals(c.id).toArray();
    html += `
      <div class="property-section" style="background: var(--surface-container); border-radius: 20px; padding: 20px; margin-bottom: 25px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h3 style="margin: 0; font-size: 17px;">${c.nome}</h3>
          <a href="https://wa.me/${c.whatsapp.replace(/\D/g,'')}" class="icon-btn" style="color: #25D366;"><span class="material-symbols-rounded">chat</span></a>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          ${es.map(e => `
            <div class="card" style="margin:0; padding: 10px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px;">
              <img src="${getLogo(e.marca)}" style="width: 32px;" />
              <p style="font-size: 10px; margin: 0;">${e.localizacao}</p>
              <button class="icon-btn q-m" data-id="${e.id}" style="width:30px; height:30px;"><span class="material-symbols-rounded" style="font-size: 16px;">build</span></button>
            </div>
          `).join('')}
        </div>
        <button class="btn-primary" style="margin-top: 15px;" onclick="window.renderEquipmentForm(null, ${c.id})">+ NOVO AR</button>
      </div>`;
  }
  mainContent.innerHTML = html + '</div>';
  document.querySelectorAll('.q-m').forEach(b => b.onclick = () => renderMaintenanceForm(Number(b.dataset.id)));
}

async function init() {
  const s = document.getElementById('splash-screen');
  if (s) setTimeout(() => { s.style.opacity = '0'; setTimeout(() => s.remove(), 500); }, 2000);
  if (localStorage.getItem('jampa_reset_v14') !== 'done') { await db.delete(); await db.open(); await seedDatabase(); localStorage.setItem('jampa_reset_v14', 'done'); }
  requestPersist(); setupNavigation(); renderDashboard();
}

window.renderBairroDetail = renderBairroDetail;
window.renderEquipmentForm = renderEquipmentForm;
window.renderBairros = renderBairros;
window.renderDashboard = renderDashboard;
window.renderHistorico = renderHistorico;
window.renderMais = renderMais;

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
init();
