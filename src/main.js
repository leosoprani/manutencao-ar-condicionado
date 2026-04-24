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
  
  headerContent.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 15px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2 style="font-size: 20px; margin:0;">Agenda</h2>
        <select id="d-s" class="form-control" style="width: auto; font-size: 11px; padding: 4px 8px; height: 32px; background: rgba(255,255,255,0.05); border: none; color: var(--primary); font-weight: 700;">
          <option value="proximas" ${sortBy === 'proximas' ? 'selected' : ''}>GERAL</option>
          <option value="bairro" ${sortBy === 'bairro' ? 'selected' : ''}>POR BAIRRO</option>
        </select>
      </div>
    </div>
  `;

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
          <div style="flex:1;"><h3 style="font-size: 15px; margin: 0;">${c?.nome}</h3><p style="font-size: 10px; opacity: 0.6; font-weight:600;">${e.marca} • ${e.localizacao}</p></div>
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
  headerContent.innerHTML = '<h2 style="font-size:22px;">ZONAS DE ATENDIMENTO</h2><p style="font-size:11px; opacity:0.5;">Gestão operacional</p>';
  const bairros = await db.bairros.toArray();
  const today = new Date();
  let html = '<div style="display: flex; gap: 10px; margin-bottom: 25px;"><button class="btn-primary" id="b-n-b" style="flex: 1;">+ NOVO BAIRRO</button><button class="btn-primary" id="b-n-p" style="flex: 1; background: #1e293b; color: var(--primary);">+ PROPRIEDADE</button></div><div class="dashboard-grid animate-in" style="height: auto; overflow: visible;">';
  for (const b of bairros) {
    const clients = await db.clientes.where('bairroId').equals(b.id).toArray();
    const cids = clients.map(c => c.id);
    const eqsInB = await db.equipamentos.where('clienteId').anyOf(cids).toArray();
    const totalAtrasados = eqsInB.filter(e => new Date(e.proximaManutencao) <= today).length;
    html += `
      <div class="card" onclick="window.renderBairroDetail(${b.id}, 'bairros')" style="border-left: 4px solid ${b.cor || 'var(--primary)'}; background: rgba(255,255,255,0.02); padding: 18px; height: auto;">
        <h3 style="margin:0; font-size:14px; text-transform:uppercase;">${b.nome}</h3>
        <div style="margin-top:10px; display:flex; align-items:center; gap:8px;">
           <span style="font-size:11px; font-weight:700; color:var(--text-secondary);">${totalAtrasados} PENDENTES</span>
        </div>
      </div>`;
  }
  mainContent.innerHTML = html + '</div>';
  document.getElementById('b-n-b').onclick = () => renderBairroForm();
  document.getElementById('b-n-p').onclick = () => renderPropertyForm();
}

async function renderHistorico() {
  headerContent.innerHTML = '<h2 style="font-size:22px;">RELATÓRIOS</h2><p style="font-size:11px; opacity:0.5;">Histórico de serviços</p>';
  const os = await db.manutencoes.reverse().toArray();
  let html = '<div class="animate-in" style="display: flex; flex-direction: column; gap: 15px;">';
  for (const m of os) {
    const e = await db.equipamentos.get(m.equipamentoId);
    const c = e ? await db.clientes.get(e.clienteId) : null;
    html += `
      <div class="card">
        <h4 style="margin:0; font-size:15px;">${c?.nome}</h4>
        <p style="font-size:10px; color:var(--primary); font-weight:700; margin-top:5px;">${e?.marca} • ${new Date(m.dataRealizada).toLocaleDateString()}</p>
        <p style="font-size: 13px; font-style: italic; background:rgba(0,0,0,0.1); padding:10px; border-radius:10px; margin-top:10px;">${m.descricao}</p>
      </div>`;
  }
  mainContent.innerHTML = html + '</div>';
}

function renderMais() {
  const t = localStorage.getItem('jampa_tech_name') || 'Técnico';
  const an = localStorage.getItem('jampa_app_name') || 'AR JAMPA';
  const currentAvatar = localStorage.getItem('jampa_tech_avatar') || 'Felix';
  headerContent.innerHTML = '<h2>AJUSTES</h2><p>Perfil e sistema</p>';
  mainContent.innerHTML = `
    <div class="animate-in" style="display: flex; flex-direction: column; gap: 20px;">
      <div class="card">
        <label style="font-size: 11px; font-weight: 800; color: var(--primary); text-transform: uppercase; margin-bottom: 15px; display: block;">Escolha seu Avatar</label>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
          ${avatarSeeds.map(s => `
            <div class="avatar-option ${currentAvatar === s ? 'active' : ''}" data-seed="${s}" style="cursor: pointer; border-radius: 12px; overflow: hidden; border: 2px solid ${currentAvatar === s ? 'var(--primary)' : 'transparent'}; background: rgba(255,255,255,0.03);">
              <img src="${getAvatarUrl(s)}" style="width: 100%; display: block;" />
            </div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="form-group"><label>Seu Nome</label><input type="text" id="p-t" class="form-control" value="${t}"></div>
        <div class="form-group" style="margin-top:10px;"><label>Nome do App</label><input type="text" id="p-a" class="form-control" value="${an}"></div>
        <button class="btn-primary" id="b-s" style="margin-top:20px; width:100%;">SALVAR</button>
      </div>
      
      <!-- Informações de Desenvolvedor e Suporte -->
      <div class="card" style="border-left: 4px solid var(--secondary); background: rgba(112, 0, 255, 0.02); padding: 25px; margin-top: 20px;">
        <h3 style="font-size: 14px; margin-bottom: 12px; color: var(--secondary); text-transform: uppercase;">SOBRE O SISTEMA</h3>
        <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12px;">
          <p style="margin:0;"><b>Desenvolvido por:</b> Leonardo Soprani</p>
          <p style="margin:0;"><b>Versão:</b> 3.0.0 Gold Premium</p>
          <p style="margin:0;"><b>Ano de Criação:</b> 2026</p>
        </div>
        <div style="margin-top: 20px; border-top: 1px solid var(--glass-border); padding-top: 15px;">
          <a href="https://wa.me/5583987014444" target="_blank" class="btn-primary" style="background: #25D366; box-shadow: 0 5px 15px rgba(37,211,102,0.2);">
            <span class="material-symbols-rounded" style="font-size: 18px;">support_agent</span> CONTATO SUPORTE
          </a>
        </div>
      </div>

      <button class="btn-primary" style="background:var(--accent); width:100%;" onclick="if(confirm('Apagar tudo?')){localStorage.clear();location.reload();}">RESET TOTAL</button>
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
window.renderBairroDetail = (id, f) => { console.log('detail'); }; // restore full if needed

init();
