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
if (btnNotif) btnNotif.onclick = () => {
  openModal('Notificações');
  modalBody.innerHTML = '<div style="padding: 20px; text-align: center; opacity: 0.5;"><span class="material-symbols-rounded" style="font-size: 48px;">notifications_off</span><p>Sem notificações novas.</p></div>';
};

const getLogo = (m) => {
  const name = m.toLowerCase();
  const ext = (name === 'samsung') ? 'jpg' : 'png';
  return `brands/${name}.${ext}`;
};

async function requestPersist() {
  if (navigator.storage && navigator.storage.persist) { await navigator.storage.persist(); }
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
  localStorage.setItem('jampa_last_backup', new Date().getTime());
  renderDashboard();
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
      alert('Backup Restaurado!');
      location.reload();
    } catch (err) { alert('Arquivo Inválido!'); }
  };
  reader.readAsText(file);
}

async function performSearch(q) {
  const query = q.toLowerCase();
  const cs = await db.clientes.toArray();
  const es = await db.equipamentos.toArray();
  const filteredC = cs.filter(c => c.nome.toLowerCase().includes(query) || (c.endereco && c.endereco.toLowerCase().includes(query)));
  
  let html = '<div class="dashboard-grid animate-in">';
  filteredC.forEach(c => {
    html += `<div class="card" style="grid-column: span 2;" onclick="window.renderBairroDetail(${c.bairroId}, 'home')"><h3>${c.nome}</h3><p style="font-size: 11px; opacity:0.6;">${c.endereco || ''}</p></div>`;
  });
  mainContent.innerHTML = html + '</div>';
}

async function renderDashboard(sortBy = 'proximas') {
  const tech = localStorage.getItem('jampa_tech_name') || 'Técnico';
  const appName = localStorage.getItem('jampa_app_name') || 'AR JAMPA';
  if (document.getElementById('display-user-name')) document.getElementById('display-user-name').textContent = tech;
  const logoEl = document.querySelector('.top-bar div[style*="absolute"]');
  if (logoEl) logoEl.textContent = appName;
  
  headerContent.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 15px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2 style="font-size: 20px;">Agenda</h2>
        <select id="d-s" class="form-control" style="width: auto; font-size: 11px; padding: 5px 10px; height: 32px; background: rgba(255,255,255,0.05); border: none; color: var(--primary); font-weight: 800;">
          <option value="proximas" ${sortBy === 'proximas' ? 'selected' : ''}>Agenda Geral</option>
          <option value="bairro" ${sortBy === 'bairro' ? 'selected' : ''}>Ver por Bairro</option>
        </select>
      </div>
      <div class="search-bar-global" style="position: relative;">
        <span class="material-symbols-rounded" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-secondary); font-size: 18px;">search</span>
        <input type="text" id="g-s" placeholder="Pesquisar cliente ou marca..." style="width: 100%; background: rgba(255,255,255,0.05); border-radius: 12px; padding: 12px 15px 12px 40px; color: white; border: 1px solid var(--glass-border); outline: none;">
      </div>
    </div>
  `;

  const lastBackup = localStorage.getItem('jampa_last_backup');
  const now = new Date().getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  let backupAlert = '';
  if (!lastBackup || (now - lastBackup) > oneDay) {
    backupAlert = `
      <div id="backup-alert" style="background: linear-gradient(90deg, #ff9d00, #ff5e00); padding: 12px; border-radius: 12px; margin-bottom: 20px; display: flex; align-items: center; gap: 12px; color: white; cursor: pointer;">
        <span class="material-symbols-rounded">warning</span>
        <div style="flex: 1;"><p style="margin:0; font-size: 12px; font-weight: 800;">SEGURANÇA RECOMENDADA</p><p style="margin:0; font-size: 10px; opacity: 0.9;">Clique para salvar uma cópia dos seus dados.</p></div>
        <span class="material-symbols-rounded">download</span>
      </div>
    `;
  }

  const eqs = await db.equipamentos.toArray();
  const rec = await db.manutencoes.reverse().limit(3).toArray();
  const bairros = await db.bairros.toArray();
  let html = backupAlert + '<div class="dashboard-grid animate-in">';
  
  if (sortBy === 'bairro') {
    for (const b of bairros) {
      const cCount = await db.clientes.where('bairroId').equals(b.id).count();
      html += `
        <div class="card" onclick="window.renderBairroDetail(${b.id}, 'home')" style="border-left: 4px solid ${b.cor || 'var(--primary)'};">
          <div style="color: ${b.cor || 'var(--primary)'}; margin-bottom: 10px;"><span class="material-symbols-rounded">location_on</span></div>
          <h3 style="margin:0; font-size:14px;">${b.nome.toUpperCase()}</h3>
          <p style="font-size:10px; opacity:0.6;">${cCount} Propriedades</p>
        </div>
      `;
    }
  } else {
    if (rec.length > 0) {
      html += '<div style="grid-column: span 2; display: flex; align-items: center; gap: 8px;"><h3 style="font-size: 12px; color: var(--secondary); letter-spacing:1px; font-weight:800;">SERVIÇOS RECENTES</h3></div>';
      for (const m of rec) {
        const e = await db.equipamentos.get(m.equipamentoId);
        const c = e ? await db.clientes.get(e.clienteId) : null;
        html += `<div class="card" style="grid-column: span 2; padding: 10px; display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.02);"><img src="${getLogo(e?.marca)}" style="width: 24px;" /><div><h4 style="font-size: 12px; margin: 0;">${c?.nome}</h4><p style="font-size: 10px; opacity: 0.5;">${new Date(m.dataRealizada).toLocaleDateString()}</p></div></div>`;
      }
    }
    html += '<div style="grid-column: span 2; margin-top: 15px;"><h3 style="font-size: 12px; color: var(--primary); letter-spacing:1px; font-weight:800;">AGENDA PRÓXIMA</h3></div>';
    const sorted = eqs.sort((a,b) => new Date(a.proximaManutencao) - new Date(b.proximaManutencao));
    for (const e of sorted) {
      const c = await db.clientes.get(e.clienteId);
      const diff = Math.ceil((new Date(e.proximaManutencao) - new Date()) / (86400000));
      html += `
        <div class="card" style="grid-column: span 2; display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${getLogo(e.marca)}" style="width: 32px;" />
            <div onclick="window.renderBairroDetail(${c?.bairroId}, 'home')"><h3 style="font-size: 14px; margin: 0;">${c?.nome}</h3><p style="font-size: 10px; opacity: 0.7;">${e.marca} - ${e.localizacao} ${e.unidade ? '(' + e.unidade + ')' : ''}</p></div>
            <span style="margin-left: auto; font-size: 10px; font-weight: 800; color: ${diff <= 2 ? '#ff5e00' : 'var(--primary)'}; background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 6px;">${diff <= 0 ? 'HOJE' : diff + 'd'}</span>
          </div>
          <div style="display: flex; gap: 8px;"><button class="btn-primary q-m" data-id="${e.id}" style="padding: 8px; font-size: 11px;">REGISTRAR MANUTENÇÃO</button><a href="https://wa.me/${c?.whatsapp.replace(/\D/g,'')}" class="icon-btn" style="color: #25D366;"><span class="material-symbols-rounded">chat</span></a></div>
        </div>`;
    }
  }
  mainContent.innerHTML = html + '</div>';
  const sortSel = document.getElementById('d-s'); if (sortSel) sortSel.onchange = (e) => renderDashboard(e.target.value);
  const searchInp = document.getElementById('g-s'); if (searchInp) searchInp.oninput = (e) => performSearch(e.target.value);
  const bAlert = document.getElementById('backup-alert'); if (bAlert) bAlert.onclick = exportData;
  document.querySelectorAll('.q-m').forEach(b => b.onclick = () => renderMaintenanceForm(Number(b.dataset.id)));
}

async function renderBairros() {
  headerContent.innerHTML = '<h2>Cadastrar</h2><p>Bairros e Clientes</p>';
  const bairros = await db.bairros.toArray();
  let html = '<div style="display: flex; gap: 10px; margin-bottom: 20px;"><button class="btn-primary" id="b-n-b" style="flex: 1;">+ BAIRRO</button><button class="btn-primary" id="b-n-p" style="flex: 1; background: var(--surface-container); color: var(--primary);">+ PROPRIEDADE</button></div><div class="dashboard-grid">';
  for (const b of bairros) { html += `<div class="card" onclick="window.renderBairroDetail(${b.id}, 'bairros')"><h3>${b.nome}</h3></div>`; }
  mainContent.innerHTML = html + '</div>';
  const bB = document.getElementById('b-n-b'); if (bB) bB.onclick = () => renderBairroForm();
  const bP = document.getElementById('b-n-p'); if (bP) bP.onclick = () => renderPropertyForm();
}

async function renderBairroForm() {
  openModal('Novo Bairro');
  modalBody.innerHTML = '<form id="f-b"><div class="form-group"><label>Nome</label><input type="text" id="b-n" class="form-control" required></div><div class="form-group"><label>Cor</label><input type="color" id="b-c" class="form-control" value="#00f2ff"></div><button type="submit" class="btn-primary">SALVAR</button></form>';
  document.getElementById('f-b').onsubmit = async (e) => { e.preventDefault(); await db.bairros.add({ nome: document.getElementById('b-n').value, cor: document.getElementById('b-c').value }); closeModal(); renderBairros(); };
}

async function renderPropertyForm() {
  const brs = await db.bairros.toArray();
  openModal('Nova Propriedade');
  modalBody.innerHTML = `
    <form id="f-p">
      <div class="form-group"><label>Nome / Edifício</label><input type="text" id="p-n" class="form-control" required></div>
      <div class="form-group"><label>Bairro</label><select id="p-b" class="form-control">${brs.map(b => `<option value="${b.id}">${b.nome}</option>`).join('')}</select></div>
      <div class="form-group"><label>Endereço Completo</label><input type="text" id="p-e" class="form-control" placeholder="Rua, Número, Referência" required></div>
      <div class="form-group"><label>WhatsApp</label><input type="text" id="p-w" class="form-control" value="(83) 9" required></div>
      <div class="form-group"><label>Telefone Alternativo</label><input type="text" id="p-t" class="form-control" placeholder="(83) 3000-0000"></div>
      <button type="submit" class="btn-primary">SALVAR PROPRIEDADE</button>
    </form>
  `;
  document.getElementById('f-p').onsubmit = async (e) => {
    e.preventDefault();
    await db.clientes.add({ nome: document.getElementById('p-n').value, bairroId: Number(document.getElementById('p-b').value), endereco: document.getElementById('p-e').value, whatsapp: document.getElementById('p-w').value, telefone: document.getElementById('p-t').value || '(83) 9', tipo: 'Geral' });
    closeModal(); renderBairros();
  };
}

async function renderEquipmentForm(id = null, preCId = null) {
  const eq = id ? await db.equipamentos.get(id) : null;
  openModal(id ? 'Editar Ar' : 'Novo Ar');
  let sB = eq?.marca || 'Samsung';
  const r = () => {
    modalBody.innerHTML = `
      <form id="f-e">
        <label style="font-size:11px; font-weight:800; color:var(--primary); margin-bottom:10px; display:block;">MARCA</label>
        <div class="brand-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px;">
          ${marcas.map(m => `<div class="brand-item ${sB === m ? 'active' : ''}" data-brand="${m}" style="padding: 8px; border-radius: 12px; background: white; text-align: center; cursor: pointer; border: 2px solid ${sB === m ? 'var(--primary)' : 'transparent'};"><img src="${getLogo(m)}" style="width: 100%; height: 30px; object-fit: contain;" /><p style="font-size: 8px; color: #333; font-weight: 800; margin: 4px 0 0;">${m}</p></div>`).join('')}
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap:12px;">
           <div class="form-group"><label>Capacidade</label><select id="e-b" class="form-control">${btus.map(b => `<option value="${b}" ${eq?.btu == b ? 'selected' : ''}>${b} BTU</option>`).join('')}</select></div>
           <div class="form-group"><label>Apartamento/Unidade</label><input type="text" id="e-u" class="form-control" value="${eq?.unidade || ''}" placeholder="Ex: Apt 402"></div>
        </div>
        <div class="form-group"><label>Modelo / Referência</label><input type="text" id="e-m" class="form-control" value="${eq?.modelo || ''}"></div>
        <div class="form-group"><label>Local de Instalação</label><input type="text" id="e-l" class="form-control" value="${eq?.localizacao || ''}"></div>
        <button type="submit" class="btn-primary">SALVAR EQUIPAMENTO</button>
      </form>
    `;
    document.querySelectorAll('.brand-item').forEach(i => i.onclick = () => { sB = i.dataset.brand; r(); });
    document.getElementById('f-e').onsubmit = async (e) => {
      e.preventDefault();
      const data = { marca: sB, btu: Number(document.getElementById('e-b').value), modelo: document.getElementById('e-m').value, localizacao: document.getElementById('e-l').value, unidade: document.getElementById('e-u').value, clienteId: preCId || eq?.clienteId };
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
        ${tab === 'existente' ? `<div class="form-group"><label>Escolha o Ar</label><select id="m-eq" class="form-control">${eqs.map(e => `<option value="${e.id}" ${eqId == e.id ? 'selected' : ''}>${cls.find(c => c.id === e.clienteId)?.nome} - ${e.marca}</option>`).join('')}</select></div>` : `<div class="form-group"><label>Nome do Cliente</label><input type="text" id="av-n" class="form-control" required></div><div style="display: grid; grid-template-columns: 1fr 1fr; gap:15px;"><div class="form-group"><label>Bairro</label><select id="av-b" class="form-control">${brs.map(b => `<option value="${b.id}">${b.nome}</option>`).join('')}</select></div><div class="form-group"><label>Marca</label><select id="av-m" class="form-control">${marcas.map(m => `<option value="${m}">${m}</option>`).join('')}</select></div></div>`}
        <div class="form-group"><label>Serviço Realizado</label><textarea id="m-d" class="form-control" rows="2" required></textarea></div>
        <div class="form-group"><label>Data Retorno</label><input type="date" id="m-nx" class="form-control" required value="${new Date(Date.now() + 15552000000).toISOString().split('T')[0]}"></div>
        <button type="submit" class="btn-primary">SALVAR MANUTENÇÃO</button>
      </form>
    `;
    document.getElementById('t-ex').onclick = () => { tab = 'existente'; r(); };
    document.getElementById('t-av').onclick = () => { tab = 'avulso'; r(); };
    document.getElementById('f-m').onsubmit = async (e) => {
      e.preventDefault();
      let fId = eqId;
      if (tab === 'avulso') {
        const cId = await db.clientes.add({ nome: document.getElementById('av-n').value, bairroId: Number(document.getElementById('av-b').value), endereco: 'Avulso', whatsapp: '(83) 9' });
        fId = await db.equipamentos.add({ marca: document.getElementById('av-m').value, btu: 12000, clienteId: cId, proximaManutencao: new Date() });
      } else { fId = Number(document.getElementById('m-eq').value); }
      const nxD = new Date(document.getElementById('m-nx').value);
      await db.manutencoes.add({ equipamentoId: fId, dataRealizada: new Date(), descricao: document.getElementById('m-d').value, proximaData: nxD });
      await db.equipamentos.update(fId, { ultimaManutencao: new Date(), proximaManutencao: nxD });
      closeModal(); renderDashboard();
    };
  };
  r();
}

async function renderHistorico() {
  headerContent.innerHTML = '<h2>Histórico</h2><p>Serviços Realizados</p>';
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
  headerContent.innerHTML = `<div style="display: flex; align-items: center; gap: 12px;"><button class="icon-btn" onclick="${from === 'bairros' ? 'window.renderBairros()' : 'window.renderDashboard()'}"><span class="material-symbols-rounded">arrow_back</span></button><div><h2>${b.nome}</h2><p>Clientes</p></div></div>`;
  let html = '<div class="animate-in">';
  for (const c of cs) {
    const es = await db.equipamentos.where('clienteId').equals(c.id).toArray();
    html += `
      <div class="property-section" style="background: var(--surface-container); border-radius: 20px; padding: 20px; margin-bottom: 25px; border: 1px solid var(--glass-border);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <div><h3 style="margin: 0; font-size: 17px;">${c.nome}</h3><p style="font-size:10px; opacity:0.6;">${c.endereco}</p></div>
          <a href="https://wa.me/${c.whatsapp.replace(/\D/g,'')}" target="_blank" class="icon-btn" style="color: #25D366;"><span class="material-symbols-rounded">chat</span></a>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          ${es.map(e => `
            <div class="card" style="margin:0; padding: 10px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px;">
              <img src="${getLogo(e.marca)}" style="width: 32px;" />
              <p style="font-size: 10px; margin: 0; font-weight:800;">${e.localizacao}</p>
              <div style="display:flex; gap:5px;"><button class="icon-btn q-m" data-id="${e.id}" style="width:30px; height:30px;"><span class="material-symbols-rounded" style="font-size: 16px;">build</span></button><button class="icon-btn" onclick="window.renderEquipmentForm(${e.id}, ${c.id})" style="width:30px; height:30px;"><span class="material-symbols-rounded" style="font-size: 16px;">edit</span></button></div>
            </div>
          `).join('')}
        </div>
        <button class="btn-primary" style="margin-top: 15px; font-size:11px;" onclick="window.renderEquipmentForm(null, ${c.id})">+ NOVO AR</button>
      </div>`;
  }
  mainContent.innerHTML = html + '</div>';
  document.querySelectorAll('.q-m').forEach(b => b.onclick = () => renderMaintenanceForm(Number(b.dataset.id)));
}

function renderMais() {
  const t = localStorage.getItem('jampa_tech_name') || 'Técnico';
  const an = localStorage.getItem('jampa_app_name') || 'AR JAMPA';
  headerContent.innerHTML = '<h2>Perfil</h2><p>Configurações e Suporte</p>';
  mainContent.innerHTML = `
    <div class="animate-in" style="display: flex; flex-direction: column; gap: 15px;">
      <div class="card" style="padding: 20px;">
        <div class="form-group"><label>Seu Nome</label><input type="text" id="p-t" class="form-control" value="${t}"></div>
        <div class="form-group"><label>Nome do Aplicativo</label><input type="text" id="p-a" class="form-control" value="${an}"></div>
        <button class="btn-primary" id="b-s">SALVAR CONFIGURAÇÕES</button>
      </div>
      
      <div class="card" style="padding: 20px; border-left: 4px solid var(--secondary);">
        <h3 style="font-size: 14px; margin-bottom: 10px; color:var(--secondary);">SOBRE O APP</h3>
        <p style="font-size: 12px; margin: 5px 0;"><b>Desenvolvido por:</b> Leonardo Soprani</p>
        <p style="font-size: 12px; margin: 5px 0;"><b>Versão:</b> 2.5.0 (Premium)</p>
        <p style="font-size: 12px; margin: 5px 0;"><b>Data de Criação:</b> Abril de 2024</p>
        <div style="margin-top: 15px; border-top: 1px solid var(--glass-border); padding-top: 10px;">
          <label style="font-size:10px; color:var(--text-secondary);">CONTATO DE SUPORTE</label>
          <a href="https://wa.me/5583987014444" target="_blank" class="btn-primary" style="background:#25D366; margin-top:10px;">
            <span class="material-symbols-rounded">chat</span> FALAR COM SUPORTE
          </a>
        </div>
      </div>

      <div class="card" style="padding: 20px; background: rgba(0,242,255,0.05);">
        <h3 style="font-size: 14px; margin-bottom: 10px; color:var(--primary);">SEGURANÇA (BACKUP)</h3>
        <p style="font-size: 11px; opacity: 0.7; margin-bottom: 15px;">Mantenha uma cópia externa dos seus dados.</p>
        <div style="display: flex; gap: 10px;">
          <button class="btn-primary" id="b-exp" style="flex: 1;">EXPORTAR</button>
          <label class="btn-primary" style="flex: 1; text-align: center; background: var(--surface-container); color: var(--primary); cursor: pointer;">
            RESTAURAR <input type="file" id="b-imp" style="display: none;" accept=".json">
          </label>
        </div>
      </div>
      <button class="btn-primary" style="background: var(--accent);" id="b-r">APAGAR TUDO (RESET)</button>
    </div>
  `;
  document.getElementById('b-s').onclick = () => { 
    localStorage.setItem('jampa_tech_name', document.getElementById('p-t').value); 
    localStorage.setItem('jampa_app_name', document.getElementById('p-a').value); 
    location.reload(); 
  };
  document.getElementById('b-exp').onclick = exportData;
  document.getElementById('b-imp').onchange = (e) => importData(e.target.files[0]);
  document.getElementById('b-r').onclick = async () => { if(confirm('Apagar tudo?')) { await db.delete(); localStorage.clear(); location.reload(); } };
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

if ('serviceWorker' in navigator) { 
  navigator.serviceWorker.register('sw.js').then(reg => {
    reg.onupdatefound = () => {
      const newSW = reg.installing;
      newSW.onstatechange = () => {
        if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
          if (confirm('Nova atualização disponível! Deseja instalar agora?')) { window.location.reload(); }
        }
      };
    };
  }).catch(() => {});
}

try { init(); } catch (e) { console.error(e); }
