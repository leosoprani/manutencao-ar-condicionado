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

// TOP BAR ELEMENTS
const avatar = document.querySelector('.user-profile');
const btnNotif = document.getElementById('btn-notifications');

const marcas = ['Elgin', 'LG', 'Samsung', 'Gree', 'Midea', 'Springer', 'Carrier', 'Fujitsu', 'Daikin', 'Electrolux', 'Philco', 'Consul'];
const btus = [9000, 12000, 18000, 24000, 30000, 36000, 48000, 60000];

// Helper Functions
function openModal(title) {
  modalTitle.textContent = title;
  modalOverlay.classList.add('active');
}

function closeModal() {
  modalOverlay.classList.remove('active');
}

if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
if (fabAdd) fabAdd.addEventListener('click', () => renderMaintenanceForm());

// ACTIVATE TOP ICONS
if (avatar) avatar.onclick = () => renderMais();
if (btnNotif) btnNotif.onclick = () => {
  openModal('Notificações');
  modalBody.innerHTML = '<div style="padding: 20px; text-align: center; opacity: 0.5;"><span class="material-symbols-rounded" style="font-size: 48px;">notifications_off</span><p>Você não tem notificações novas.</p></div>';
};

const getLogo = (m) => {
  if (m === 'Springer') return 'https://www.mideaspringer.com.br/wp-content/themes/midea-springer/assets/img/logo-springer.png';
  if (m === 'Electrolux') return 'https://seeklogo.com/images/E/electrolux-logo-C727D95781-seeklogo.com.png';
  const domainMap = { 'Elgin': 'elgin.com.br',  'LG': 'lg.com', 'Samsung': 'samsung.com', 'Gree': 'gree.com.br', 'Midea': 'midea.com.br', 'Carrier': 'carrier.com', 'Fujitsu': 'fujitsu-general.com', 'Daikin': 'daikin.com.br', 'Philco': 'philco.com.br', 'Consul': 'consul.com.br' };
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

async function renderDashboard(sortBy = 'proximas') {
  const techName = localStorage.getItem('jampa_tech_name') || 'Técnico';
  const appName = localStorage.getItem('jampa_app_name') || 'AR JAMPA';
  if (document.getElementById('display-user-name')) document.getElementById('display-user-name').textContent = techName;
  if (document.getElementById('app-title-display')) document.getElementById('app-title-display').textContent = appName;

  headerContent.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 15px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2 style="font-size: 20px;">Visão Geral</h2>
        <select id="dash-sort" class="form-control" style="width: auto; font-size: 11px; padding: 4px 8px; height: 32px; background: var(--surface-container); border: none;">
          <option value="proximas" ${sortBy === 'proximas' ? 'selected' : ''}>Agenda Geral</option>
          <option value="bairro" ${sortBy === 'bairro' ? 'selected' : ''}>Ver por Bairro</option>
        </select>
      </div>
      <div class="search-bar-global" style="position: relative;">
        <span class="material-symbols-rounded" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-secondary); font-size: 18px;">search</span>
        <input type="text" id="global-search" placeholder="Pesquisar..." style="width: 100%; background: rgba(255,255,255,0.05); border-radius: 12px; padding: 12px 15px 12px 40px; color: white; font-size: 14px; outline: none; border: 1px solid rgba(0, 242, 255, 0.1);">
      </div>
    </div>
  `;

  const bairros = await db.bairros.toArray();
  const equipamentos = await db.equipamentos.toArray();
  const recentes = await db.manutencoes.reverse().limit(3).toArray();
  let html = '<div class="dashboard-grid animate-in">';

  if (sortBy === 'bairro') {
    for (const b of bairros) {
      const clientCount = await db.clientes.where('bairroId').equals(b.id).count();
      html += `
        <div class="card" onclick="window.renderBairroDetail(${b.id}, 'home')" style="border-left: 4px solid ${b.cor};">
          <div class="card-icon" style="color: ${b.cor}"><span class="material-symbols-rounded">location_on</span></div>
          <h3>${b.nome.toUpperCase()}</h3>
          <p class="card-subtitle">${clientCount} Clientes</p>
        </div>
      `;
    }
  } else {
    if (recentes.length > 0) {
      html += `<div style="grid-column: span 2; margin-top: 10px; display: flex; align-items: center; gap: 8px;"><span class="material-symbols-rounded" style="color: var(--secondary); font-size: 20px;">history</span><h3 style="font-size: 14px; color: var(--secondary); letter-spacing: 1px; font-weight: 800;">SERVIÇOS RECENTES</h3></div>`;
      for (const m of recentes) {
        const eq = await db.equipamentos.get(m.equipamentoId);
        const cli = eq ? await db.clientes.get(eq.clienteId) : null;
        html += `<div class="card" style="grid-column: span 2; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1); padding: 12px; display: flex; align-items: center; gap: 12px;"><div style="width: 32px; height: 32px; background: white; border-radius: 6px; padding: 4px; display: flex; align-items: center; justify-content: center; opacity: 0.8;"><img src="${getLogo(eq?.marca)}" style="width: 100%; height: 100%; object-fit: contain;" /></div><div style="flex: 1;"><h4 style="font-size: 13px; margin: 0; color: #aaa;">${cli?.nome}</h4><p style="font-size: 10px; opacity: 0.5;">${new Date(m.dataRealizada).toLocaleDateString('pt-BR')} - ${m.descricao.substring(0, 20)}...</p></div><span class="material-symbols-rounded" style="color: var(--secondary); font-size: 18px;">check_circle</span></div>`;
      }
    }
    html += `<div style="grid-column: span 2; margin-top: 25px; display: flex; align-items: center; gap: 8px;"><span class="material-symbols-rounded" style="color: var(--primary); font-size: 20px;">event_upcoming</span><h3 style="font-size: 14px; color: var(--primary); letter-spacing: 1px; font-weight: 800;">AGENDA PRÓXIMA</h3></div>`;
    const sortedEqs = [...equipamentos].sort((a, b) => new Date(a.proximaManutencao) - new Date(b.proximaManutencao));
    for (const eq of sortedEqs) {
      const c = await db.clientes.get(eq.clienteId);
      const diffDays = Math.ceil((new Date(eq.proximaManutencao) - new Date()) / (1000 * 60 * 60 * 24));
      const statusText = diffDays < 0 ? 'ATRASADO' : diffDays === 0 ? 'HOJE' : `FALTAM ${diffDays} DIAS`;
      html += `
        <div class="card" style="grid-column: span 2; display: flex; flex-direction: column; gap: 12px; background: ${diffDays <= 5 ? 'rgba(0, 242, 255, 0.04)' : 'var(--surface-container)'}; border: 1px solid ${diffDays <= 5 ? 'rgba(0, 242, 255, 0.2)' : 'var(--glass-border)'};">
          <div style="display: flex; align-items: center; gap: 15px;">
            <div style="width: 48px; height: 48px; background: white; border-radius: 12px; padding: 8px; display: flex; align-items: center; justify-content: center;"><img src="${getLogo(eq.marca)}" style="width: 100%; height: 100%; object-fit: contain;" /></div>
            <div style="flex: 1;" onclick="window.renderBairroDetail(${c?.bairroId}, 'home')"><h3 style="font-size: 15px; margin: 0; color: white;">${c?.nome}</h3><p style="font-size: 11px; opacity: 0.7; margin-top: 2px;">${eq.marca} - ${eq.localizacao} ${eq.unidade ? '(\' + eq.unidade + \')' : ''}</p><span style="font-size: 10px; font-weight: 800; color: ${diffDays < 0 ? 'var(--accent)' : 'var(--primary)'}; background: rgba(0,242,255,0.1); padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 4px;">${statusText}</span></div>
          </div>
          <div style="display: flex; gap: 8px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px;"><button class="btn-primary quick-maint" data-id="${eq.id}" style="flex: 2; padding: 8px; font-size: 11px; font-weight: 700; gap: 6px;"><span class="material-symbols-rounded" style="font-size: 16px;">build</span> MANUTENÇÃO</button><a href="https://wa.me/${c?.whatsapp.replace(/\D/g,'')}" target="_blank" class="icon-btn" style="background: rgba(37,211,102,0.1); color: #25D366; width: 38px; height: 38px;"><span class="material-symbols-rounded" style="font-size: 18px;">chat</span></a></div>
        </div>`;
    }
  }
  mainContent.innerHTML = html + '</div>';
  document.getElementById('dash-sort').addEventListener('change', (e) => renderDashboard(e.target.value));
  document.getElementById('global-search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (q.length < 2) { if (q.length === 0) renderDashboard(sortBy); return; }
    performGlobalSearch(q);
  });
  document.querySelectorAll('.quick-maint').forEach(btn => { btn.addEventListener('click', (e) => { e.stopPropagation(); renderMaintenanceForm(Number(btn.dataset.id)); }); });
}

function renderMais() {
  const tech = localStorage.getItem('jampa_tech_name') || 'Técnico';
  const app = localStorage.getItem('jampa_app_name') || 'AR JAMPA';
  headerContent.innerHTML = `<h2>Mais</h2><p>Configurações e Suporte</p>`;
  mainContent.innerHTML = `
    <div class="animate-in" style="display: flex; flex-direction: column; gap: 20px; padding-bottom: 30px;">
      <div class="card" style="padding: 20px;">
        <h3 style="font-size: 14px; color: var(--primary); margin-bottom: 15px;">PERFIL</h3>
        <div class="form-group"><label>Seu Nome</label><input type="text" id="p-tech" class="form-control" value="${tech}"></div>
        <div class="form-group"><label>Nome do App</label><input type="text" id="p-app" class="form-control" value="${app}"></div>
        <button class="btn-primary" id="btn-p-save">Salvar Configurações</button>
      </div>

      <div class="card" style="padding: 20px;">
        <h3 style="font-size: 14px; color: var(--primary); margin-bottom: 15px;">SUPORTE E CONTATO</h3>
        <div style="display: flex; flex-direction: column; gap: 10px;">
           <button class="btn-primary" style="background: rgba(255,255,255,0.05); color: white;" onclick="window.location.href='mailto:suporte@arjampa.com.br'"><span class="material-symbols-rounded">mail</span> suporte@arjampa.com.br</button>
           <button class="btn-primary" style="background: #25D366; color: white;" onclick="window.location.href='https://wa.me/5583999999999'"><span class="material-symbols-rounded">chat</span> Falar com Desenvolvedor</button>
        </div>
      </div>

      <div class="card" style="padding: 20px; border: 1px solid rgba(244,63,94,0.3);">
        <h3 style="font-size: 14px; color: var(--accent); margin-bottom: 10px;">ÁREA DE RISCO</h3>
        <p style="font-size: 11px; opacity: 0.6; margin-bottom: 15px;">Apagar todos os clientes, bairros e manutenções permanentemente.</p>
        <button class="btn-primary" style="background: var(--accent); color: white;" id="btn-reset-all">APAGAR TODOS OS DADOS</button>
      </div>

      <div style="margin-top: 20px; text-align: center; opacity: 0.8;">
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
  document.getElementById('btn-reset-all').addEventListener('click', async () => {
    if (confirm('TEM CERTEZA? Isso vai apagar TUDO e não pode ser desfeito.')) {
      await db.delete();
      localStorage.clear();
      location.reload();
    }
  });
}

// (Rest of the functions: renderBairroDetail, renderBairros, renderHistorico, etc. remain the same)
async function renderBairroDetail(bId, from = 'home') {
  const bairro = await db.bairros.get(Number(bId));
  const clientes = await db.clientes.where('bairroId').equals(Number(bId)).toArray();
  headerContent.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <button class="icon-btn" onclick="${from === 'bairros' ? 'renderBairros()' : 'renderDashboard()'}"><span class="material-symbols-rounded">arrow_back</span></button>
      <div><h2>${bairro.nome}</h2><p>Propriedades registradas</p></div>
    </div>
  `;
  let html = '<div class="animate-in">';
  for (const c of clientes) {
    const eqs = await db.equipamentos.where('clienteId').equals(c.id).toArray();
    html += `
      <div class="property-section" style="background: var(--surface-container); border-radius: 20px; padding: 20px; margin-bottom: 25px; border: 1px solid var(--glass-border);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
          <div><h3 style="margin: 0; font-size: 17px;">${c.nome}</h3><p style="font-size: 11px; opacity: 0.6;">${c.endereco}</p></div>
          <div style="display: flex; gap: 10px;">
            <a href="tel:${c.telefone}" class="icon-btn" style="color: var(--primary); background: rgba(0,242,255,0.08);"><span class="material-symbols-rounded">call</span></a>
            <a href="https://wa.me/${c.whatsapp.replace(/\D/g,'')}" target="_blank" class="icon-btn" style="color: #25D366; background: rgba(37,211,102,0.08);"><span class="material-symbols-rounded">chat</span></a>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px;">
          ${eqs.map(e => `
            <div class="card" style="margin: 0; padding: 15px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; background: rgba(255,255,255,0.02);">
              <div style="width: 38px; height: 38px; background: white; border-radius: 8px; padding: 4px; display: flex; align-items: center; justify-content: center;">
                <img src="${getLogo(e.marca)}" style="width: 100%; height: 100%; object-fit: contain;" />
              </div>
              <div>
                <h4 style="font-size: 12px; margin: 0; color: white;">${e.localizacao}</h4>
                <p style="font-size: 10px; opacity: 0.6;">${e.unidade ? 'Un: ' + e.unidade : e.btu.toLocaleString() + ' BTU'}</p>
              </div>
              <div style="display: flex; gap: 5px;">
                <button class="icon-btn quick-maint" data-id="${e.id}" style="color: var(--secondary); background: rgba(0,242,255,0.05); width: 32px; height: 32px;"><span class="material-symbols-rounded" style="font-size: 18px;">build</span></button>
                <button class="icon-btn" onclick="window.renderEquipmentForm(${e.id}, ${c.id})" style="background: rgba(255,255,255,0.05); width: 32px; height: 32px;"><span class="material-symbols-rounded" style="font-size: 18px;">edit</span></button>
              </div>
            </div>
          `).join('')}
        </div>
        <button class="btn-primary" style="padding: 12px; font-size: 12px; font-weight: 700; width: 100%;" onclick="window.renderEquipmentForm(null, ${c.id})">+ CADASTRAR NOVO AR</button>
      </div>
    `;
  }
  mainContent.innerHTML = html + '</div>';
  document.querySelectorAll('.quick-maint').forEach(btn => { btn.addEventListener('click', () => renderMaintenanceForm(Number(btn.dataset.id))); });
}

async function renderBairros() {
  headerContent.innerHTML = `<h2>Cadastrar</h2><p>Bairros e Regiões</p>`;
  const bairros = await db.bairros.toArray();
  let html = `<div style="display: flex; gap: 10px; margin-bottom: 20px;"><button class="btn-primary" id="btn-new-b" style="flex: 1;">+ Bairro</button><button class="btn-primary" id="btn-new-p" style="flex: 1; background: var(--surface-container); color: var(--primary);">+ Propriedade</button></div><div class="dashboard-grid">`;
  for (const b of bairros) {
    html += `<div class="card" style="border-left: 4px solid ${b.cor};" onclick="window.renderBairroDetail(${b.id}, 'bairros')"><div style="display: flex; justify-content: space-between; align-items: center;"><h3>${b.nome}</h3><span class="material-symbols-rounded">chevron_right</span></div></div>`;
  }
  mainContent.innerHTML = html + '</div>';
  document.getElementById('btn-new-b').addEventListener('click', () => renderBairroForm());
  document.getElementById('btn-new-p').addEventListener('click', () => renderPropertyForm());
}

async function renderHistorico() {
  headerContent.innerHTML = `<h2>Histórico de OS</h2><p>Manutenções Concluídas</p>`;
  const os = await db.manutencoes.reverse().toArray();
  let html = '<div class="animate-in" style="display: flex; flex-direction: column; gap: 15px;">';
  for (const m of os) {
    const eq = await db.equipamentos.get(m.equipamentoId);
    const cli = eq ? await db.clientes.get(eq.clienteId) : null;
    html += `
      <div class="card" style="border-left: 4px solid var(--secondary);">
        <div style="display: flex; justify-content: space-between;"><h4 style="margin: 0; font-size: 15px;">${cli?.nome}</h4><span style="font-size: 10px; opacity: 0.5;">${new Date(m.dataRealizada).toLocaleDateString('pt-BR')}</span></div>
        <p style="font-size: 11px; opacity: 0.8; margin: 5px 0;">${eq?.marca} - ${eq?.localizacao}</p>
        <div style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px;"><p style="font-size: 13px; font-style: italic; margin: 0;">"${m.descricao}"</p></div>
      </div>
    `;
  }
  mainContent.innerHTML = html + '</div>';
}

async function renderBairroForm() {
  openModal('Novo Bairro');
  modalBody.innerHTML = `<form id="f-b"><div class="form-group"><label>Nome</label><input type="text" id="b-nome" class="form-control" required></div><div class="form-group"><label>Cor</label><input type="color" id="b-cor" class="form-control" value="#00f2ff"></div><button type="submit" class="btn-primary">Salvar</button></form>`;
  document.getElementById('f-b').onsubmit = async (e) => { e.preventDefault(); await db.bairros.add({ nome: document.getElementById('b-nome').value, cor: document.getElementById('b-cor').value }); closeModal(); renderBairros(); };
}

async function renderPropertyForm() {
  const brs = await db.bairros.toArray();
  openModal('Nova Propriedade');
  modalBody.innerHTML = `<form id="f-p"><div class="form-group"><label>Nome</label><input type="text" id="p-nome" class="form-control" required></div><div class="form-group"><label>Bairro</label><select id="p-b" class="form-control">${brs.map(b => `<option value="${b.id}">${b.nome}</option>`).join('')}</select></div><div class="form-group"><label>Endereço</label><input type="text" id="p-end" class="form-control" required></div><button type="submit" class="btn-primary">Salvar</button></form>`;
  document.getElementById('f-p').onsubmit = async (e) => { e.preventDefault(); await db.clientes.add({ nome: document.getElementById('p-nome').value, bairroId: Number(document.getElementById('p-b').value), endereco: document.getElementById('p-end').value, whatsapp: '(83) 9', tipo: 'Residência', telefone: '(83) 9' }); closeModal(); renderBairros(); };
}

async function performGlobalSearch(query) {
  const clientes = await db.clientes.toArray();
  const eqs = await db.equipamentos.toArray();
  let html = '<div class="dashboard-grid animate-in">';
  const resC = clientes.filter(c => c.nome.toLowerCase().includes(query));
  const resE = eqs.filter(e => e.marca.toLowerCase().includes(query) || e.localizacao.toLowerCase().includes(query));
  resC.forEach(c => { html += `<div class="card" onclick="window.renderBairroDetail(${c.bairroId}, 'home')" style="grid-column: span 2;"><h3>${c.nome}</h3><p>${c.endereco}</p></div>`; });
  resE.forEach(e => { const c = clientes.find(x => x.id === e.clienteId); html += `<div class="card" onclick="window.renderBairroDetail(${c?.bairroId}, 'home')" style="grid-column: span 2; display: flex; align-items: center; gap: 10px;"><img src="${getLogo(e.marca)}" style="width: 24px;" /><div><h4 style="margin: 0;">${e.marca} ${e.modelo}</h4><p style="font-size: 10px;">${c?.nome}</p></div></div>`; });
  mainContent.innerHTML = html + '</div>';
}

async function renderEquipmentForm(id = null, preCId = null) {
  const eq = id ? await db.equipamentos.get(id) : null;
  const cls = await db.clientes.toArray();
  openModal(id ? 'Editar Equipamento' : 'Novo Equipamento');
  let selectedBrand = eq?.marca || 'Samsung';
  const renderForm = () => {
    modalBody.innerHTML = `
      <form id="f-e">
        <label style="font-size: 12px; color: var(--primary); margin-bottom: 12px; display: block; font-weight: 700;">MARCA DO APARELHO</label>
        <div class="brand-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 25px;">
          ${marcas.map(m => `
            <div class="brand-item ${selectedBrand === m ? 'active' : ''}" data-brand="${m}" style="padding: 10px; border: 2px solid ${selectedBrand === m ? 'var(--primary)' : 'transparent'}; border-radius: 12px; text-align: center; cursor: pointer; background: ${selectedBrand === m ? 'rgba(0,242,255,0.1)' : 'rgba(255,255,255,0.02)'};">
              <img src="${getLogo(m)}" style="width: 28px; height: 28px; object-fit: contain; filter: ${selectedBrand === m ? 'none' : 'grayscale(100%) opacity(0.4)'};" />
            </div>
          `).join('')}
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
           <div class="form-group"><label>Capacidade (BTUs)</label><select id="e-b" class="form-control">${btus.map(b => `<option value="${b}" ${eq?.btu == b ? 'selected' : ''}>${b.toLocaleString()} BTU</option>`).join('')}</select></div>
           <div class="form-group"><label>Apartamento / Unidade</label><input type="text" id="e-u" class="form-control" value="${eq?.unidade || ''}" placeholder="Ex: Apt 402"></div>
        </div>
        <div class="form-group"><label>Local de Instalação</label><input type="text" id="e-l" class="form-control" value="${eq?.localizacao || ''}" placeholder="Ex: Sala, Portaria" list="loc-list"><datalist id="loc-list"><option value="Sala"><option value="Quarto"><option value="Recepção"><option value="Portaria"><option value="Salão de Festas"></datalist></div>
        <button type="submit" class="btn-primary" style="margin-top: 10px; padding: 15px; font-weight: 800;">SALVAR APARELHO</button>
      </form>
    `;
    document.querySelectorAll('.brand-item').forEach(item => { item.addEventListener('click', () => { selectedBrand = item.dataset.brand; renderForm(); }); });
    document.getElementById('f-e').onsubmit = async (e) => {
      e.preventDefault();
      const cId = preCId || eq?.clienteId;
      const data = { marca: selectedBrand, btu: Number(document.getElementById('e-b').value), localizacao: document.getElementById('e-l').value, unidade: document.getElementById('e-u').value, clienteId: cId };
      if (id) await db.equipamentos.update(id, data); else await db.equipamentos.add({ ...data, proximaManutencao: new Date() });
      closeModal(); renderDashboard();
    };
  };
  renderForm();
}

async function renderMaintenanceForm(eqId = null) {
  const eqs = await db.equipamentos.toArray();
  const cls = await db.clientes.toArray();
  const brs = await db.bairros.toArray();
  openModal('Registrar Manutenção');
  let tab = eqId ? 'existente' : 'avulso';
  const renderMaint = () => {
    modalBody.innerHTML = `
      <div style="display: flex; gap: 10px; margin-bottom: 20px; background: rgba(255,255,255,0.03); padding: 5px; border-radius: 12px;">
        <button class="tab-btn ${tab === 'existente' ? 'active' : ''}" id="tab-ex" style="flex: 1; padding: 10px; border-radius: 8px; border: none; font-size: 11px; font-weight: 700; background: ${tab === 'existente' ? 'var(--primary)' : 'transparent'}; color: ${tab === 'existente' ? 'black' : 'white'};">EXISTENTE</button>
        <button class="tab-btn ${tab === 'avulso' ? 'active' : ''}" id="tab-av" style="flex: 1; padding: 10px; border-radius: 8px; border: none; font-size: 11px; font-weight: 700; background: ${tab === 'avulso' ? 'var(--primary)' : 'transparent'}; color: ${tab === 'avulso' ? 'black' : 'white'};">AVULSO</button>
      </div>
      <form id="f-m">
        ${tab === 'existente' ? `
          <div class="form-group"><label>Aparelho</label><select id="m-eq-id" class="form-control">${eqs.map(e => { const c = cls.find(x => x.id === e.clienteId); return `<option value="${e.id}" ${eqId == e.id ? 'selected' : ''}>${c?.nome} - ${e.marca} (${e.localizacao})</option>`; }).join('')}</select></div>
        ` : `
          <div class="form-group"><label>Nome Cliente</label><input type="text" id="av-nome" class="form-control" required></div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;"><div class="form-group"><label>Bairro</label><select id="av-b" class="form-control">${brs.map(b => `<option value="${b.id}">${b.nome}</option>`).join('')}</select></div><div class="form-group"><label>Marca</label><select id="av-m" class="form-control">${marcas.map(m => `<option value="${m}">${m}</option>`).join('')}</select></div></div>
        `}
        <div class="form-group"><label>O que foi feito?</label><textarea id="m-desc" class="form-control" rows="2" required></textarea></div>
        <div class="form-group"><label>Próximo Retorno</label><input type="date" id="m-next" class="form-control" required value="${new Date(Date.now() + 180*24*60*60*1000).toISOString().split('T')[0]}"></div>
        <button type="submit" class="btn-primary" style="margin-top: 10px; padding: 15px; font-weight: 800;">SALVAR SERVIÇO</button>
      </form>
    `;
    document.getElementById('tab-ex').onclick = () => { tab = 'existente'; renderMaint(); };
    document.getElementById('tab-av').onclick = () => { tab = 'avulso'; renderMaint(); };
    document.getElementById('f-m').onsubmit = async (e) => {
      e.preventDefault();
      let finalEqId = eqId;
      if (tab === 'avulso') {
        const cId = await db.clientes.add({ nome: document.getElementById('av-nome').value, bairroId: Number(document.getElementById('av-b').value), endereco: 'Avulso', whatsapp: '(83) 9', tipo: 'Residência', telefone: '(83) 9' });
        finalEqId = await db.equipamentos.add({ marca: document.getElementById('av-m').value, btu: 12000, localizacao: 'Geral', clienteId: cId, proximaManutencao: new Date() });
      } else { finalEqId = Number(document.getElementById('m-eq-id').value); }
      const nextDate = new Date(document.getElementById('m-next').value);
      await db.manutencoes.add({ equipamentoId: finalEqId, dataRealizada: new Date(), descricao: document.getElementById('m-desc').value, proximaData: nextDate });
      await db.equipamentos.update(finalEqId, { ultimaManutencao: new Date(), proximaManutencao: nextDate });
      closeModal(); renderDashboard();
    };
  };
  renderMaint();
}

async function init() {
  const splash = document.getElementById('splash-screen');
  const loader = document.getElementById('splash-loader');
  if (loader) loader.style.width = '100%';
  setTimeout(() => { if (splash) { splash.style.opacity = '0'; setTimeout(() => splash.remove(), 500); } }, 2000);
  if (localStorage.getItem('jampa_reset_v11') !== 'done') { await db.delete(); await db.open(); await seedDatabase(); localStorage.setItem('jampa_reset_v11', 'done'); }
  setupNavigation(); renderDashboard();
}

window.renderBairroDetail = renderBairroDetail;
window.renderEquipmentForm = renderEquipmentForm;
window.renderBairros = renderBairros;
window.renderDashboard = renderDashboard;
window.renderHistorico = renderHistorico;
window.renderMais = renderMais;

if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); }); }
init();
