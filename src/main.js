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

const marcas = ['LG', 'Samsung', 'Gree', 'Midea', 'Springer', 'Carrier', 'Fujitsu', 'Daikin', 'Electrolux', 'Philco', 'Consul'];
const btus = [9000, 12000, 18000, 24000, 30000, 36000, 48000, 60000];

// Helper Functions
function openModal(title) {
  modalTitle.textContent = title;
  modalOverlay.classList.add('active');
}

function closeModal() {
  modalOverlay.classList.remove('active');
}

closeModalBtn.addEventListener('click', closeModal);
fabAdd.addEventListener('click', () => renderMaintenanceForm());

const getLogo = (m) => {
  if (m === 'Springer') return 'https://www.mideaspringer.com.br/wp-content/themes/midea-springer/assets/img/logo-springer.png';
  if (m === 'Electrolux') return 'https://seeklogo.com/images/E/electrolux-logo-C727D95781-seeklogo.com.png';
  const domainMap = {
    'LG': 'lg.com', 'Samsung': 'samsung.com', 'Gree': 'gree.com.br', 
    'Midea': 'midea.com.br', 'Carrier': 'carrier.com',
    'Fujitsu': 'fujitsu-general.com', 'Daikin': 'daikin.com.br',
    'Philco': 'philco.com.br', 'Consul': 'consul.com.br'
  };
  const domain = domainMap[m] || 'google.com';
  return `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
};

function setupNavigation() {
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      const view = item.dataset.view;
      if (view === 'home') renderDashboard();
      else if (view === 'bairros') renderBairros();
      else if (view === 'os') renderHistorico();
      else if (view === 'mais') renderMais();
    });
  });
}

// Dashboard
async function renderDashboard(sortBy = 'proximas') {
  const techName = localStorage.getItem('jampa_tech_name') || 'Técnico';
  const appName = localStorage.getItem('jampa_app_name') || 'AR JAMPA';
  
  document.getElementById('display-user-name').textContent = techName;
  document.getElementById('app-title-display').textContent = appName;

  headerContent.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 15px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2>Painel de Controle</h2>
        <select id="dash-sort" class="form-control" style="width: auto; font-size: 12px; padding: 4px 8px; height: 32px; background: var(--surface-container);">
          <option value="bairro" ${sortBy === 'bairro' ? 'selected' : ''}>Ver por Bairros</option>
          <option value="alerta" ${sortBy === 'alerta' ? 'selected' : ''}>Ver Alertas</option>
          <option value="prioridade" ${sortBy === 'prioridade' ? 'selected' : ''}>Prioridade (5 dias)</option>
          <option value="proximas" ${sortBy === 'proximas' ? 'selected' : ''}>Cronológico</option>
        </select>
      </div>
      <div class="search-bar-global" style="position: relative;">
        <span class="material-symbols-rounded" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-secondary); font-size: 18px;">search</span>
        <input type="text" id="global-search" placeholder="Pesquisar..." style="width: 100%; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-radius: 12px; padding: 12px 15px 12px 40px; color: white; font-size: 14px; outline: none; border: 1px solid rgba(0, 242, 255, 0.1);">
      </div>
    </div>
  `;

  const bairros = await db.bairros.toArray();
  const equipamentos = await db.equipamentos.toArray();
  let html = '<div class="dashboard-grid animate-in">';

  if (sortBy === 'bairro') {
    for (const b of bairros) {
      const clientCount = await db.clientes.where('bairroId').equals(b.id).count();
      html += `
        <div class="card" onclick="window.renderBairroDetail(${b.id}, 'home')" style="border-left: 4px solid ${b.cor};">
          <div class="card-icon" style="color: ${b.cor}"><span class="material-symbols-rounded">location_on</span></div>
          <h3>${b.nome.toUpperCase()}</h3>
          <p class="card-subtitle">${clientCount} Propriedades</p>
        </div>
      `;
    }
  } else {
    const sortedEqs = [...equipamentos].sort((a, b) => new Date(a.proximaManutencao) - new Date(b.proximaManutencao));
    const displayEqs = sortBy === 'alerta' ? sortedEqs.filter(e => (new Date(e.proximaManutencao) - new Date()) < 0) :
                       sortBy === 'prioridade' ? sortedEqs.filter(e => (new Date(e.proximaManutencao) - new Date()) / (1000*60*60*24) <= 5) : sortedEqs;

    for (const eq of displayEqs) {
      const c = await db.clientes.get(eq.clienteId);
      const diffDays = Math.ceil((new Date(eq.proximaManutencao) - new Date()) / (1000 * 60 * 60 * 24));
      const statusText = diffDays < 0 ? 'ATRASADO' : diffDays === 0 ? 'HOJE' : `FALTAM ${diffDays} DIAS`;
      
      html += `
        <div class="card" style="grid-column: span 2; display: flex; flex-direction: column; gap: 15px; background: ${diffDays <= 5 ? 'rgba(0, 242, 255, 0.03)' : 'var(--surface-container)'}; border: 1px solid ${diffDays <= 5 ? 'rgba(0, 242, 255, 0.2)' : 'var(--glass-border)'};" onclick="window.renderBairroDetail(${c?.bairroId}, 'home')">
          <div style="display: flex; align-items: center; gap: 15px;">
            <div style="width: 44px; height: 44px; background: white; border-radius: 12px; padding: 6px; display: flex; align-items: center; justify-content: center;">
              <img src="${getLogo(eq.marca)}" style="width: 100%; height: 100%; object-fit: contain;" />
            </div>
            <div style="flex: 1;">
              <h3 style="font-size: 14px; margin: 0;">${c?.nome}</h3>
              <p style="font-size: 11px; opacity: 0.7;">${eq.marca} - ${eq.localizacao}</p>
              <p style="font-size: 10px; font-weight: 800; color: ${diffDays < 0 ? 'var(--accent)' : 'var(--primary)'};">${statusText}</p>
            </div>
            ${diffDays > 5 ? `
              <button class="icon-btn quick-maint" data-id="${eq.id}" style="color: var(--secondary);"><span class="material-symbols-rounded">build</span></button>
            ` : ''}
          </div>
          ${diffDays <= 5 ? `
            <button class="btn-primary quick-maint" data-id="${eq.id}" style="padding: 10px; font-size: 12px; background: ${diffDays < 0 ? 'var(--accent)' : 'var(--primary)'}; color: white; border: none; font-weight: 700;">
              <span class="material-symbols-rounded" style="font-size: 18px;">build</span>
              REALIZAR MANUTENÇÃO
            </button>
          ` : ''}
        </div>
      `;
    }
  }
  mainContent.innerHTML = html + '</div>';
  document.getElementById('dash-sort').addEventListener('change', (e) => renderDashboard(e.target.value));
  document.getElementById('global-search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (q.length < 2) { if (q.length === 0) renderDashboard(sortBy); return; }
    performGlobalSearch(q);
  });
  document.querySelectorAll('.quick-maint').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); renderMaintenanceForm(Number(btn.dataset.id)); });
  });
}

async function renderBairroDetail(bId, from = 'home') {
  const bairro = await db.bairros.get(Number(bId));
  const clientes = await db.clientes.where('bairroId').equals(Number(bId)).toArray();
  headerContent.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <button class="icon-btn" onclick="${from === 'bairros' ? 'renderBairros()' : 'renderDashboard()'}"><span class="material-symbols-rounded">arrow_back</span></button>
      <div><h2>${bairro.nome}</h2><p>Propriedades na região</p></div>
    </div>
  `;
  let html = '<div class="animate-in">';
  for (const c of clientes) {
    const eqs = await db.equipamentos.where('clienteId').equals(c.id).toArray();
    html += `
      <div class="property-section" style="background: var(--surface-container); border-radius: 20px; padding: 20px; margin-bottom: 25px; border: 1px solid var(--glass-border);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <div>
            <h3 style="margin: 0; font-size: 16px;">${c.nome}</h3>
            <p style="font-size: 11px; opacity: 0.6;">${c.endereco}</p>
          </div>
          <div style="display: flex; gap: 10px;">
            <a href="tel:${c.telefone}" class="icon-btn" style="color: var(--primary); background: rgba(0,242,255,0.05);"><span class="material-symbols-rounded">call</span></a>
            <a href="https://wa.me/${c.whatsapp.replace(/\D/g,'')}" target="_blank" class="icon-btn" style="color: #25D366; background: rgba(37,211,102,0.05);"><span class="material-symbols-rounded">chat</span></a>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
          ${eqs.map(e => `
            <div class="card" style="margin: 0; padding: 12px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; background: rgba(255,255,255,0.02);">
              <img src="${getLogo(e.marca)}" style="width: 32px; height: 32px; object-fit: contain; background: white; border-radius: 8px; padding: 4px;" />
              <div>
                <h4 style="font-size: 12px; margin: 0;">${e.localizacao}</h4>
                <p style="font-size: 10px; opacity: 0.6;">${e.btu.toLocaleString()} BTU</p>
              </div>
              <button class="icon-btn quick-maint" data-id="${e.id}" style="color: var(--secondary);"><span class="material-symbols-rounded" style="font-size: 20px;">build</span></button>
            </div>
          `).join('')}
        </div>
        <button class="btn-primary" style="padding: 10px; font-size: 12px;" onclick="window.renderEquipmentForm(null, ${c.id})">+ Novo Ar-Condicionado</button>
      </div>
    `;
  }
  mainContent.innerHTML = html + '</div>';
  document.querySelectorAll('.quick-maint').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); renderMaintenanceForm(Number(btn.dataset.id)); });
  });
}

async function renderEquipmentForm(id = null, preCId = null) {
  const eq = id ? await db.equipamentos.get(id) : null;
  const cls = await db.clientes.toArray();
  openModal('Cadastrar Equipamento');
  
  let selectedBrand = eq?.marca || 'Samsung';
  
  const renderForm = () => {
    modalBody.innerHTML = `
      <form id="f-e">
        <label style="font-size: 12px; color: var(--primary); margin-bottom: 10px; display: block;">Selecione a Marca</label>
        <div class="brand-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
          ${marcas.map(m => `
            <div class="brand-item ${selectedBrand === m ? 'active' : ''}" data-brand="${m}" style="padding: 8px; border: 1px solid ${selectedBrand === m ? 'var(--primary)' : 'var(--glass-border)'}; border-radius: 10px; text-align: center; cursor: pointer; background: ${selectedBrand === m ? 'rgba(0,242,255,0.1)' : 'transparent'};">
              <img src="${getLogo(m)}" style="width: 24px; height: 24px; object-fit: contain; filter: ${selectedBrand === m ? 'none' : 'grayscale(100%) opacity(0.5)'};" />
            </div>
          `).join('')}
        </div>
        <div class="form-group"><label>BTUs</label><select id="e-b" class="form-control">${btus.map(b => `<option value="${b}" ${eq?.btu == b ? 'selected' : ''}>${b.toLocaleString()} BTU</option>`).join('')}</select></div>
        <div class="form-group"><label>Modelo/Ref</label><input type="text" id="e-m" class="form-control" value="${eq?.modelo || ''}" placeholder="Ex: Inverter WindFree"></div>
        <div class="form-group"><label>Localização</label><input type="text" id="e-l" class="form-control" value="${eq?.localizacao || ''}" placeholder="Ex: Sala, Quarto, Portaria" list="loc-list"><datalist id="loc-list"><option value="Sala"><option value="Quarto"><option value="Suíte"><option value="Recepção"><option value="Portaria"></datalist></div>
        <button type="submit" class="btn-primary">Salvar Equipamento</button>
      </form>
    `;
    
    document.querySelectorAll('.brand-item').forEach(item => {
      item.addEventListener('click', () => { selectedBrand = item.dataset.brand; renderForm(); });
    });

    document.getElementById('f-e').onsubmit = async (e) => {
      e.preventDefault();
      const cId = preCId || eq?.clienteId || cls[0].id;
      const data = { marca: selectedBrand, btu: Number(document.getElementById('e-b').value), modelo: document.getElementById('e-m').value, localizacao: document.getElementById('e-l').value, clienteId: cId };
      if (id) await db.equipamentos.update(id, data); else await db.equipamentos.add({ ...data, ultimaManutencao: new Date(), proximaManutencao: new Date(Date.now() + 30*24*60*60*1000) });
      closeModal(); if (preCId) renderBairroDetail(cls.find(x => x.id === preCId).bairroId); else renderDashboard();
    };
  };
  renderForm();
}

async function renderBairros() {
  headerContent.innerHTML = `<h2>Cadastrar</h2><p>Regiões de João Pessoa</p>`;
  const bairros = await db.bairros.toArray();
  let html = `<div style="display: flex; gap: 10px; margin-bottom: 20px;">
    <button class="btn-primary" id="btn-new-b" style="flex: 1;">+ Bairro</button>
    <button class="btn-primary" id="btn-new-p" style="flex: 1; background: var(--surface-container); color: var(--primary);">+ Propriedade</button>
  </div><div class="dashboard-grid">`;
  for (const b of bairros) {
    html += `<div class="card" style="border-left: 4px solid ${b.cor};" onclick="window.renderBairroDetail(${b.id}, 'bairros')">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div><h3 style="margin: 0;">${b.nome}</h3><p style="font-size: 10px; opacity: 0.6;">Gerenciar Região</p></div>
        <span class="material-symbols-rounded">chevron_right</span>
      </div></div>`;
  }
  mainContent.innerHTML = html + '</div>';
  document.getElementById('btn-new-b').addEventListener('click', () => renderBairroForm());
  document.getElementById('btn-new-p').addEventListener('click', () => renderPropertyForm());
}

async function renderHistorico() {
  headerContent.innerHTML = `<h2>Histórico de OS</h2><p>Serviços Finalizados</p>`;
  const os = await db.manutencoes.reverse().toArray();
  let html = '<div class="equipment-list">';
  for (const m of os) {
    const eq = await db.equipamentos.get(m.equipamentoId);
    const cli = eq ? await db.clientes.get(eq.clienteId) : null;
    html += `<div class="equipment-card" style="flex-direction: column; align-items: flex-start; gap: 8px;">
      <div style="display: flex; justify-content: space-between; width: 100%;">
        <span style="font-size: 11px; color: var(--primary); font-weight: 700;">${new Date(m.dataRealizada).toLocaleDateString('pt-BR')}</span>
        <span style="font-size: 10px; opacity: 0.5;">Ref: #${m.id}</span>
      </div>
      <div><h4 style="margin: 0;">${cli?.nome}</h4><p style="font-size: 12px; color: var(--text-secondary);">${eq?.marca} - ${eq?.localizacao}</p></div>
      <div style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px; width: 100%; border-left: 3px solid var(--primary);"><p style="font-size: 13px; font-style: italic; margin: 0;">"${m.descricao}"</p></div>
    </div>`;
  }
  mainContent.innerHTML = html + '</div>';
}

function renderMais() {
  const tech = localStorage.getItem('jampa_tech_name') || 'Técnico';
  const app = localStorage.getItem('jampa_app_name') || 'AR JAMPA';
  headerContent.innerHTML = `<h2>Mais</h2><p>Perfil e Ajustes</p>`;
  mainContent.innerHTML = `
    <div class="animate-in" style="padding: 10px;">
      <div class="card" style="padding: 20px;">
        <div class="form-group"><label>Seu Nome</label><input type="text" id="p-tech" class="form-control" value="${tech}"></div>
        <div class="form-group"><label>Nome do App</label><input type="text" id="p-app" class="form-control" value="${app}"></div>
        <button class="btn-primary" id="btn-p-save">Salvar Configurações</button>
      </div>
      <div style="margin-top: 40px; text-align: center; opacity: 0.9;">
        <p style="font-size: 14px; color: var(--primary); font-weight: 700; margin: 0;">Desenvolvido por Leonardo S.</p>
        <p style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">2026 • Versão 1.0.0 Pro</p>
      </div>
    </div>
  `;
  document.getElementById('btn-p-save').addEventListener('click', () => {
    localStorage.setItem('jampa_tech_name', document.getElementById('p-tech').value);
    localStorage.setItem('jampa_app_name', document.getElementById('p-app').value);
    alert('Configurações salvas!'); location.reload();
  });
}

// Initialization and Missing Modals
async function renderBairroForm(id = null) {
  const b = id ? await db.bairros.get(id) : null;
  openModal(id ? 'Editar Bairro' : 'Novo Bairro');
  modalBody.innerHTML = `<form id="f-b">
    <div class="form-group"><label>Nome do Bairro</label><input type="text" id="b-nome" class="form-control" value="${b?.nome || ''}" required></div>
    <div class="form-group"><label>Cor do Marcador</label><input type="color" id="b-cor" class="form-control" value="${b?.cor || '#00f2ff'}"></div>
    <button type="submit" class="btn-primary">Salvar Bairro</button>
  </form>`;
  document.getElementById('f-b').onsubmit = async (e) => {
    e.preventDefault();
    const data = { nome: document.getElementById('b-nome').value, cor: document.getElementById('b-cor').value };
    if (id) await db.bairros.update(id, data); else await db.bairros.add(data);
    closeModal(); renderBairros();
  };
}

async function renderPropertyForm() {
  const bairros = await db.bairros.toArray();
  openModal('Nova Propriedade');
  modalBody.innerHTML = `<form id="f-p">
    <div class="form-group"><label>Nome da Propriedade/Cliente</label><input type="text" id="p-nome" class="form-control" placeholder="Ex: Edifício Solar Prime" required></div>
    <div class="form-group"><label>Bairro</label><select id="p-b" class="form-control">${bairros.map(b => `<option value="${b.id}">${b.nome}</option>`).join('')}</select></div>
    <div class="form-group"><label>Endereço Completo</label><input type="text" id="p-end" class="form-control" placeholder="Rua, Número..." required></div>
    <div class="form-group"><label>WhatsApp de Contato</label><input type="text" id="p-wa" class="form-control" value="(83) 9"></div>
    <button type="submit" class="btn-primary">Salvar Propriedade</button>
  </form>`;
  document.getElementById('f-p').onsubmit = async (e) => {
    e.preventDefault();
    await db.clientes.add({ nome: document.getElementById('p-nome').value, bairroId: Number(document.getElementById('p-b').value), endereco: document.getElementById('p-end').value, whatsapp: document.getElementById('p-wa').value, tipo: 'Edifício', telefone: '(83) 9' });
    closeModal(); renderBairros();
  };
}

async function renderMaintenanceForm(eqId = null) {
  const eqs = await db.equipamentos.toArray();
  const cls = await db.clientes.toArray();
  openModal('Registrar Manutenção');
  modalBody.innerHTML = `<form id="f-m">
    ${!eqId ? `<div class="form-group"><label>Equipamento</label><select id="m-eq-id" class="form-control">${eqs.map(e => { const c = cls.find(x => x.id === e.clienteId); return `<option value="${e.id}">${c?.nome} - ${e.marca} (${e.localizacao})</option>`; }).join('')}</select></div>` : ''}
    <div class="form-group"><label>Descrição do Serviço</label><textarea id="m-desc" class="form-control" rows="3" required placeholder="O que foi feito?"></textarea></div>
    <div class="form-group"><label>Data da Próxima Manutenção</label><input type="date" id="m-next" class="form-control" required></div>
    <button type="submit" class="btn-primary">Finalizar OS</button>
  </form>`;
  document.getElementById('f-m').onsubmit = async (e) => {
    e.preventDefault();
    const finalEqId = eqId || Number(document.getElementById('m-eq-id').value);
    const nextDate = new Date(document.getElementById('m-next').value);
    await db.manutencoes.add({ equipamentoId: finalEqId, dataRealizada: new Date(), descricao: document.getElementById('m-desc').value, proximaData: nextDate });
    await db.equipamentos.update(finalEqId, { ultimaManutencao: new Date(), proximaManutencao: nextDate });
    closeModal(); renderDashboard();
  };
}

async function performGlobalSearch(query) {
  const clientes = await db.clientes.toArray();
  const eqs = await db.equipamentos.toArray();
  let html = '<div class="dashboard-grid animate-in">';
  const resC = clientes.filter(c => c.nome.toLowerCase().includes(query) || c.endereco.toLowerCase().includes(query));
  const resE = eqs.filter(e => e.marca.toLowerCase().includes(query) || e.localizacao.toLowerCase().includes(query));
  resC.forEach(c => { html += `<div class="card" onclick="window.renderBairroDetail(${c.bairroId}, 'home')" style="grid-column: span 2;"><h3>${c.nome}</h3><p>${c.endereco}</p></div>`; });
  resE.forEach(e => { const c = clientes.find(x => x.id === e.clienteId); html += `<div class="card" onclick="window.renderBairroDetail(${c?.bairroId}, 'home')" style="grid-column: span 2; display: flex; align-items: center; gap: 10px;"><img src="${getLogo(e.marca)}" style="width: 24px;" /><div><h4 style="margin: 0;">${e.marca} ${e.modelo}</h4><p style="font-size: 10px;">${c?.nome}</p></div></div>`; });
  mainContent.innerHTML = html + '</div>';
}

async function init() {
  const splash = document.getElementById('splash-screen');
  const loader = document.getElementById('splash-loader');
  if (loader) loader.style.width = '100%';
  setTimeout(() => { if (splash) { splash.style.opacity = '0'; setTimeout(() => splash.remove(), 500); } }, 2000);

  if (localStorage.getItem('jampa_reset_v8') !== 'done') {
    await db.delete(); await db.open();
    await seedDatabase();
    localStorage.setItem('jampa_reset_v8', 'done');
  }
  setupNavigation(); renderDashboard();
}

window.renderBairroDetail = renderBairroDetail;
window.renderEquipmentForm = renderEquipmentForm;
window.renderBairros = renderBairros;
window.renderDashboard = renderDashboard;
window.renderHistorico = renderHistorico;
window.renderMais = renderMais;

// PWA Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('SW Registered!', reg);
    }).catch(err => {
      console.log('SW Registration failed!', err);
    });
  });
}

init();
