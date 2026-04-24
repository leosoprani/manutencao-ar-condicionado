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
    else if (type === 'unidade') await db.unidades.delete(id);
    else if (type === 'manutencao') await db.manutencoes.delete(id);
    location.reload();
  }
};

const fileToBase64 = file => new Promise((resolve, reject) => {
  if (!file) return resolve(null);
  const r = new FileReader();
  r.readAsDataURL(file);
  r.onload = () => resolve(r.result);
  r.onerror = e => reject(e);
});

window.gerarPDF = async (mId) => {
  const m = await db.manutencoes.get(mId);
  const e = await db.equipamentos.get(m.equipamentoId);
  const c = e ? await db.clientes.get(e.clienteId) : null;
  const u = e && e.unidadeId && db.unidades ? await db.unidades.get(e.unidadeId) : null;
  const techName = localStorage.getItem('jampa_tech_name') || 'Técnico';
  const appName = localStorage.getItem('jampa_app_name') || 'AR JAMPA';

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html><head><title>Recibo - ${c ? c.nome : 'Cliente'}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; }
        .header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
        .title { font-size: 24px; font-weight: bold; color: #22c55e; }
        .info-group { margin-bottom: 15px; }
        .info-group label { font-weight: bold; font-size: 12px; color: #666; text-transform: uppercase; }
        .info-group p { margin: 5px 0 0 0; font-size: 16px; }
        .value-box { background: #f9f9f9; padding: 20px; border-radius: 10px; text-align: center; margin-top: 30px; }
        .value-box h3 { margin: 0; font-size: 14px; color: #666; }
        .value-box p { margin: 10px 0 0 0; font-size: 32px; font-weight: bold; color: #22c55e; }
        .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #999; }
        ${m.foto ? '.service-photo { max-width: 100%; max-height: 400px; margin-top: 20px; border-radius: 8px; border: 1px solid #ddd; padding: 5px; }' : ''}
      </style>
    </head><body>
      <div class="header"><div class="title">${appName.toUpperCase()}</div><div>Recibo de Prestação de Serviço</div></div>
      <div class="info-group"><label>Cliente</label><p>${c ? c.nome : 'N/A'} ${u ? ` - ${u.apartamento} (${u.proprietario})` : ''}</p></div>
      ${c && c.endereco ? `<div class="info-group"><label>Endereço</label><p>${c.endereco}</p></div>` : ''}
      <div class="info-group"><label>Equipamento</label><p>${e ? `${e.marca} - ${e.btu} BTU - ${e.localizacao}` : 'N/A'}</p></div>
      <div class="info-group"><label>Data do Serviço</label><p>${new Date(m.dataRealizada).toLocaleDateString()}</p></div>
      <div class="info-group"><label>Descrição do Serviço</label><p>${m.descricao}</p></div>
      ${m.foto ? `<div class="info-group"><label>Foto do Serviço</label><br><img src="${m.foto}" class="service-photo"></div>` : ''}
      <div class="value-box"><h3>VALOR TOTAL (${m.formaPagamento || '-'})</h3><p>R$ ${Number(m.valor || 0).toFixed(2)}</p></div>
      <div class="footer"><p>Serviço realizado por <strong>${techName}</strong></p><p>Este documento é um recibo não fiscal.</p></div>
    </body></html>
  `);
  printWindow.document.close(); printWindow.focus();
  setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
};

window.renderMaintenanceForm = async function(eqId, defaultType = '') {
  const eqs = await db.equipamentos.toArray(); const cls = await db.clientes.toArray();
  openModal(defaultType || 'Registrar Serviço');
  modalBody.innerHTML = `
    <form id="f-m">
      <div class="form-group"><label>Aparelho</label><select id="m-eq" class="form-control">${eqs.map(e => `<option value="${e.id}" ${eqId == e.id ? 'selected' : ''}>${cls.find(c => c.id === e.clienteId)?.nome || 'S/N'} - ${e.marca}</option>`).join('')}</select></div>
      <div class="form-group"><label>O que foi feito?</label><textarea id="m-d" class="form-control" rows="3" required>${defaultType ? defaultType + ': ' : ''}</textarea></div>
      <div style="display:flex; gap:10px;">
        <div class="form-group" style="flex:1;"><label>Valor Cobrado (R$)</label><input type="number" step="0.01" id="m-v" class="form-control" required placeholder="Ex: 150.00"></div>
        <div class="form-group" style="flex:1;"><label>Pagamento</label><select id="m-p" class="form-control"><option value="PIX">PIX</option><option value="Dinheiro">Dinheiro</option><option value="Cartão">Cartão</option><option value="Prazo (30 dias)">Prazo (30 dias)</option></select></div>
      </div>
      <div class="form-group"><label>Próxima Visita</label><input type="date" id="m-nx" class="form-control" required value="${new Date(Date.now() + 15552000000).toISOString().split('T')[0]}"></div>
      <div class="form-group"><label>Tirar Foto / Anexar (Opcional)</label><input type="file" id="m-ft" class="form-control" accept="image/*" capture="environment" style="padding: 8px;"></div>
      <button type="submit" class="btn-primary">FINALIZAR SERVIÇO</button>
    </form>`;
  document.getElementById('f-m').onsubmit = async (ev) => {
    ev.preventDefault();
    const fId = Number(document.getElementById('m-eq').value);
    const nxD = new Date(document.getElementById('m-nx').value);
    const ftInput = document.getElementById('m-ft');
    const fotoBase64 = ftInput.files.length > 0 ? await fileToBase64(ftInput.files[0]) : null;
    await db.manutencoes.add({ equipamentoId: fId, dataRealizada: new Date(), descricao: document.getElementById('m-d').value, proximaData: nxD, valor: Number(document.getElementById('m-v').value), formaPagamento: document.getElementById('m-p').value, foto: fotoBase64 });
    await db.equipamentos.update(fId, { ultimaManutencao: new Date(), proximaManutencao: nxD });
    closeModal(); renderDashboard();
  };
};

window.showNotifications = async () => {
  openModal('Notificações');
  const eqs = await db.equipamentos.toArray();
  const clsList = await db.clientes.toArray();
  const undList = db.unidades ? await db.unidades.toArray() : [];
  const today = new Date();
  const alerts = eqs.filter(e => e.proximaManutencao && Math.ceil((new Date(e.proximaManutencao) - today) / 86400000) <= 7).sort((a,b) => new Date(a.proximaManutencao) - new Date(b.proximaManutencao));
  
  if (alerts.length === 0) {
    modalBody.innerHTML = '<div style="padding:20px; text-align:center; opacity:0.5;"><span class="material-symbols-rounded" style="font-size:40px; display:block; margin-bottom:10px;">notifications_off</span>Nenhuma notificação no momento.</div>';
    return;
  }
  
  let html = '<div style="display:flex; flex-direction:column; gap:10px;">';
  alerts.forEach(e => {
     const diff = Math.ceil((new Date(e.proximaManutencao) - today) / 86400000);
     const c = clsList.find(cl => cl.id === e.clienteId);
     const u = e.unidadeId && undList.length ? undList.find(un => un.id === e.unidadeId) : null;
     const name = u ? `${c?.nome} • ${u.apartamento}` : (c?.nome || 'Desconhecido');
     const color = diff <= 0 ? '#ff4d4d' : '#ff9d00';
     const txt = diff < 0 ? `Vencido há ${Math.abs(diff)} dias` : (diff === 0 ? 'Vence hoje!' : `Vence em ${diff} dias`);
     html += `<div style="background:rgba(255,255,255,0.05); padding:10px; border-left:3px solid ${color}; border-radius:8px;"><p style="margin:0; font-size:12px; font-weight:bold;">${name}</p><p style="margin:2px 0 0 0; font-size:10px; opacity:0.7;">${e.marca} • ${e.localizacao}</p><p style="margin:5px 0 0 0; font-size:10px; color:${color}; font-weight:bold;">${txt}</p></div>`;
  });
  modalBody.innerHTML = html + '</div>';
};

window.currentFinanceOffset = 0;
window.renderFinancas = async (offset = window.currentFinanceOffset) => {
  window.currentFinanceOffset = offset;
  openModal('Relatório Financeiro');
  const manutencoes = await db.manutencoes.toArray();
  const targetDate = new Date();
  targetDate.setMonth(targetDate.getMonth() + offset);
  const targetMonth = targetDate.getMonth();
  const targetYear = targetDate.getFullYear();
  const monthName = targetDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
  
  let totalMes = 0; let totalReceber = 0; let recebido = 0;
  manutencoes.forEach(m => {
    const d = new Date(m.dataRealizada);
    if (d.getMonth() === targetMonth && d.getFullYear() === targetYear) {
      const val = Number(m.valor) || 0; totalMes += val;
      if (m.formaPagamento === 'Prazo (30 dias)') totalReceber += val; else recebido += val;
    }
  });
  modalBody.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; background:rgba(255,255,255,0.05); border-radius:12px; padding:5px;">
      <button class="icon-btn" onclick="window.renderFinancas(${offset - 1})" style="width:36px; height:36px;"><span class="material-symbols-rounded">chevron_left</span></button>
      <span style="font-size:12px; font-weight:800;">${monthName}</span>
      <button class="icon-btn" onclick="window.renderFinancas(${offset + 1})" style="width:36px; height:36px;"><span class="material-symbols-rounded">chevron_right</span></button>
    </div>
    <div style="display:flex; flex-direction:column; gap:15px; padding:5px;">
      <div class="card" style="margin:0; background:rgba(34, 197, 94, 0.05); border:1px solid #22c55e;"><h3 style="margin:0; font-size:11px; color:#22c55e;">RECEBIDO (MÊS)</h3><p style="margin:5px 0 0 0; font-size:28px; font-weight:800;">R$ ${recebido.toFixed(2)}</p></div>
      <div class="card" style="margin:0; background:rgba(255, 157, 0, 0.05); border:1px solid #ff9d00;"><h3 style="margin:0; font-size:11px; color:#ff9d00;">A RECEBER (PRAZO 30 DIAS)</h3><p style="margin:5px 0 0 0; font-size:28px; font-weight:800;">R$ ${totalReceber.toFixed(2)}</p></div>
      <div class="card" style="margin:0; background:rgba(255, 255, 255, 0.02);"><h3 style="margin:0; font-size:11px; opacity:0.7;">BRUTO DO MÊS</h3><p style="margin:5px 0 0 0; font-size:20px; font-weight:800;">R$ ${totalMes.toFixed(2)}</p></div>
    </div>
  `;
};

async function renderDashboard(searchTerm = '') {
  const tech = localStorage.getItem('jampa_tech_name') || 'Alexandre';
  const av = localStorage.getItem('jampa_tech_avatar') || 'Felix';
  const hour = new Date().getHours();
  let greeting = 'Boa noite';
  if (hour >= 5 && hour < 12) greeting = 'Bom dia';
  else if (hour >= 12 && hour < 18) greeting = 'Boa tarde';

  const eqsN = await db.equipamentos.toArray();
  const hasNotif = eqsN.some(e => e.proximaManutencao && Math.ceil((new Date(e.proximaManutencao) - new Date()) / 86400000) <= 7);
  const badge = hasNotif ? `<span style="position:absolute; top:0; right:0; width:10px; height:10px; background:#ff4d4d; border-radius:50%; border:2px solid var(--bg);"></span>` : '';

  headerContent.innerHTML = `
    <div class="user-info">
      <div class="user-profile"><img src="${getAvatarUrl(av)}"></div>
      <div class="user-text"><h1 style="font-size:14px; margin:0; font-weight:600; opacity:0.8;">${greeting},</h1><p style="font-size:18px; font-weight:800; margin:0; color:var(--primary);">${tech}</p></div>
    </div>
    <div style="display:flex; gap:10px;"><div class="icon-btn" onclick="window.renderFinancas()" style="background:rgba(34, 197, 94, 0.1); color:#22c55e;"><span class="material-symbols-rounded">bar_chart</span></div><div class="icon-btn" style="position:relative;" onclick="window.showNotifications()"><span class="material-symbols-rounded">notifications</span>${badge}</div></div>`;
  
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
  const undList = db.unidades ? await db.unidades.toArray() : [];
  let filtered = eqs.filter(e => e.proximaManutencao); // Exclui recém-cadastrados (ainda sem manutenção)
  if (currentHomeFilter === 'vencidos') filtered = eqs.filter(e => Math.ceil((new Date(e.proximaManutencao) - new Date()) / 86400000) <= 0);
  let sorted = filtered.sort((a,b) => new Date(a.proximaManutencao) - new Date(b.proximaManutencao));
  if (currentHomeFilter === 'alfabetica') sorted = filtered.sort((a,b) => (clsList.find(c => c.id === a.clienteId)?.nome || '').localeCompare(clsList.find(c => c.id === b.clienteId)?.nome || ''));

  html += '<div class="dashboard-grid animate-in">';
  for (const e of sorted) {
    const c = clsList.find(cl => cl.id === e.clienteId);
    const u = e.unidadeId && undList ? undList.find(un => un.id === e.unidadeId) : null;
    const displayName = u ? `${c.nome} • ${u.apartamento}` : (c ? c.nome : 'Desconhecido');
    if (!c || (searchTerm && !displayName.toLowerCase().includes(searchTerm.toLowerCase()) && !e.marca.toLowerCase().includes(searchTerm.toLowerCase()))) continue;
    
    const diff = Math.ceil((new Date(e.proximaManutencao) - new Date()) / 86400000);
    let tel = u && u.telefone ? u.telefone : (c.whatsapp ? c.whatsapp : (c.telefone ? c.telefone : ''));
    let zapBtn = '';
    if (tel && diff <= 15) {
      const msg = encodeURIComponent(`Olá! Verifiquei no meu sistema que a manutenção preventiva do seu ar-condicionado (${e.marca} - ${e.localizacao}) está no momento de ser realizada. Podemos agendar uma visita?`);
      zapBtn = `<a href="https://wa.me/${tel.replace(/\D/g,'')}?text=${msg}" target="_blank" class="icon-btn success" style="width:24px; height:24px; padding:0; display:flex; align-items:center; justify-content:center; margin-left:8px;"><span class="material-symbols-rounded" style="font-size:12px;">chat</span></a>`;
    }
    
    html += `<div class="card" style="grid-column: span 2; margin-left:0; margin-right:0;"><div style="display: flex; align-items: center; gap: 15px;"><div style="width:42px; height:42px; background:white; border-radius:10px; padding:8px;"><img src="${getLogo(e.marca)}" style="width: 100%; height:100%; object-fit:contain;" /></div><div onclick="window.renderEquipmentHistory(${e.id})" style="flex:1; min-width:0;"><h3 style="font-size: 14px; margin: 0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${displayName}">${displayName}</h3>${u ? `<p style="font-size: 9px; color:var(--primary); margin:2px 0 0 0; font-weight:700;">${u.proprietario}</p>` : ''}<p style="font-size: 10px; opacity: 0.6; font-weight:600; margin-top:2px;">${e.marca} • ${e.localizacao}</p></div><div style="display:flex; align-items:center;"><span style="font-size: 10px; font-weight: 800; color: ${diff <= 0 ? '#ff4d4d' : 'var(--primary)'};">${diff <= 0 ? 'VENCIDO' : 'Faltam ' + diff + 'd'}</span>${zapBtn}</div></div><div style="display: flex; justify-content: space-between; background: rgba(0,0,0,0.15); padding: 12px; border-radius: 12px; margin-top:15px;"><div style="text-align:left;"><p style="font-size:7px; opacity:0.5; margin:0;">ÚLTIMA</p><p style="font-size:9px; font-weight:700; margin:0;">${e.ultimaManutencao ? new Date(e.ultimaManutencao).toLocaleDateString() : '---'}</p></div><div style="text-align:right;"><p style="font-size:7px; opacity:0.5; margin:0;">PRÓXIMA</p><p style="font-size:9px; font-weight:700; margin:0; color:var(--primary);">${new Date(e.proximaManutencao).toLocaleDateString()}</p></div></div><div style="display: flex; gap: 10px; margin-top:15px;"><button class="btn-primary" onclick="window.renderMaintenanceForm(${e.id}, 'Manutenção Preventiva')" style="flex:1; margin-top:0;">PREVENTIVA</button><button class="btn-primary" onclick="window.renderMaintenanceForm(${e.id}, 'Manutenção Corretiva')" style="flex:1; background:#ff9d00; margin-top:0;">CORRETIVA</button></div></div>`;
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
    const tel = c?.whatsapp || c?.telefone || '';
    let btnRecibo = `<button onclick="window.gerarPDF(${m.id})" class="btn-primary" style="background:#ff3b30; color:white; padding:6px 12px; font-size:9px; margin:0; width:auto; border-radius:8px; display:flex; align-items:center; gap:4px; margin-right:8px;"><span class="material-symbols-rounded" style="font-size:12px;">picture_as_pdf</span> GERAR PDF</button>`;
    if (tel) {
       const msg = encodeURIComponent(`*RECIBO DE SERVIÇO*\n\n*Cliente:* ${c?.nome}\n*Aparelho:* ${e?.marca} - ${e?.localizacao}\n*Data:* ${new Date(m.dataRealizada).toLocaleDateString()}\n*Serviço:* ${m.descricao}\n*Valor:* R$ ${Number(m.valor||0).toFixed(2)} (${m.formaPagamento||'N/A'})\n\nObrigado pela preferência!`);
       btnRecibo += `<a href="https://wa.me/${tel.replace(/\D/g,'')}?text=${msg}" target="_blank" class="btn-primary" style="background:#25D366; color:white; padding:6px 12px; font-size:9px; margin:0; width:auto; border-radius:8px; display:flex; align-items:center; gap:4px;"><span class="material-symbols-rounded" style="font-size:12px;">receipt_long</span> ENVIAR RECIBO</a>`;
    }
    const imgHtml = m.foto ? `<img src="${m.foto}" style="width:100%; max-height:150px; object-fit:cover; border-radius:8px; margin-top:12px; border: 1px solid rgba(255,255,255,0.1);">` : '';
    html += `<div class="card" style="border-left: 5px solid ${isCor ? '#ff9d00' : '#22c55e'}; margin:0;"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;"><span style="font-size: 8px; font-weight: 900; padding: 4px 10px; border-radius: 40px; background: rgba(255,255,255,0.05); color: ${isCor ? '#ff9d00' : '#22c55e'}; border: 1px solid ${isCor ? '#ff9d00' : '#22c55e'}; text-transform:uppercase;">${isCor ? 'CORRETIVA' : 'PREVENTIVA'}</span><div style="display:flex; align-items:center; gap:10px;"><span style="font-size: 10px; opacity: 0.5; font-weight:700;">${new Date(m.dataRealizada).toLocaleDateString()}</span><button class="icon-btn" style="border:none; padding:0; width:auto; height:auto;" onclick="window.deleteItem('manutencao', ${m.id})"><span class="material-symbols-rounded" style="font-size:16px; color:#ff4d4d;">delete</span></button></div></div><div style="display:flex; justify-content:space-between; align-items:center;"><h4 style="margin:0; font-size:16px;">${c?.nome || 'Removido'}</h4>${m.valor ? `<span style="font-size:12px; font-weight:800; color:#22c55e;">R$ ${Number(m.valor).toFixed(2)} <span style="font-size:8px; opacity:0.6;">(${m.formaPagamento})</span></span>` : ''}</div><p style="font-size: 13px; font-style: italic; background:rgba(0,0,0,0.3); padding:15px; border-radius:15px; margin-top:12px; line-height:1.5; color:#eee;">${m.descricao}</p>${imgHtml}<div style="display:flex; justify-content:flex-end; margin-top:12px;">${btnRecibo}</div></div>`;
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
  const data = { bairros: await db.bairros.toArray(), clientes: await db.clientes.toArray(), unidades: db.unidades ? await db.unidades.toArray() : [], equipamentos: await db.equipamentos.toArray(), manutencoes: await db.manutencoes.toArray() };
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
        if (confirm('Restaurar dados?')) { await db.delete(); await db.open(); if (data.bairros) await db.bairros.bulkAdd(data.bairros); if (data.clientes) await db.clientes.bulkAdd(data.clientes); if (data.unidades && db.unidades) await db.unidades.bulkAdd(data.unidades); if (data.equipamentos) await db.equipamentos.bulkAdd(data.equipamentos); if (data.manutencoes) await db.manutencoes.bulkAdd(data.manutencoes); location.reload(); }
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
    const imgHtml = m.foto ? `<img src="${m.foto}" style="width:100%; height:100px; object-fit:cover; border-radius:8px; margin-top:8px;">` : '';
    html += `<div style="border-left: 2px solid var(--primary); padding-left: 15px;"><p style="font-size: 11px; font-weight: 800; color: var(--primary); margin: 0;">${new Date(m.dataRealizada).toLocaleDateString()}</p><p style="font-size: 13px; color: white; margin: 5px 0;">${m.descricao}</p>${imgHtml}</div>`;
  }
  modalBody.innerHTML = html + '</div>';
};

function renderEquipmentsList(equipamentos) {
  if (equipamentos.length === 0) return '<p style="font-size:10px; opacity:0.4; margin:0; padding: 5px 0;">Nenhum aparelho cadastrado.</p>';
  return equipamentos.map(e => {
    const diff = e.proximaManutencao ? Math.ceil((new Date(e.proximaManutencao) - new Date()) / 86400000) : null;
    const statusText = diff === null ? 'NOVO' : (diff <= 0 ? 'VENCIDO' : 'Faltam ' + diff + 'd');
    const statusColor = diff === null ? '#10b981' : (diff <= 0 ? '#ff4d4d' : 'var(--primary)');
    
    let actions = '';
    if (!e.ultimaManutencao) {
        actions = `<button class="btn-primary" onclick="window.renderMaintenanceForm(${e.id}, 'Primeira Manutenção')" style="flex:1; font-size:9px; padding:8px; margin:0; background:#10b981; color:white;">FAZER MANUTENÇÃO AGORA</button>`;
    } else {
        actions = `<button class="btn-primary" onclick="window.renderMaintenanceForm(${e.id}, 'Manutenção Preventiva')" style="flex:1; font-size:9px; padding:8px; margin:0;">PREVENTIVA</button><button class="btn-primary" onclick="window.renderMaintenanceForm(${e.id}, 'Manutenção Corretiva')" style="flex:1; font-size:9px; padding:8px; margin:0; background:#ff9d00;">CORRETIVA</button>`;
    }

    return `<div style="background:rgba(255,255,255,0.02); padding:12px; border-radius:12px; margin-bottom:10px; display:flex; flex-direction:column; gap:10px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:10px; cursor:pointer;" onclick="window.renderEquipmentHistory(${e.id})">
           <div style="width:32px; height:32px; background:white; border-radius:8px; padding:4px;"><img src="${getLogo(e.marca)}" style="width:100%; height:100%; object-fit:contain;" /></div>
           <div>
              <p style="margin:0; font-size:12px; font-weight:700;">${e.marca} • ${e.localizacao}</p>
              <p style="margin:0; font-size:9px; opacity:0.5;">${e.btu} BTU</p>
           </div>
        </div>
        <div style="text-align:right;">
           <span style="font-size: 9px; font-weight: 800; color: ${statusColor};">${statusText}</span>
           <br/>
           <button class="icon-btn" style="border:none; padding:0; width:auto; height:auto; margin-top:4px;" onclick="window.deleteItem('equipamento', ${e.id})"><span class="material-symbols-rounded" style="font-size:16px; color:#ff4d4d;">delete</span></button>
        </div>
      </div>
      <div style="display:flex; gap:8px;">
        ${actions}
      </div>
    </div>`;
  }).join('');
}

window.renderBairroDetail = async function(bId, from) {
  const b = await db.bairros.get(Number(bId));
  const cs = await db.clientes.where('bairroId').equals(Number(bId)).toArray();
  headerContent.innerHTML = `<div style="display: flex; align-items: center; gap: 15px;"><button class="icon-btn" onclick="window.renderBairros()"><span class="material-symbols-rounded">arrow_back</span></button><h2 style="font-size:18px;">${b.nome}</h2></div>`;
  let html = '<div class="animate-in" style="display: flex; flex-direction: column; gap: 15px; padding: 0 20px; margin-top:20px;">';

  for (const c of cs) {
    const esAll = await db.equipamentos.where('clienteId').equals(c.id).toArray();
    const unidades = db.unidades ? await db.unidades.where('clienteId').equals(c.id).toArray() : [];
    const icon = c.tipo === 'Casa' ? 'home' : (c.tipo === 'Comercial' ? 'storefront' : 'domain');
    
    html += `<div class="card" style="margin:0;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
        <div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="material-symbols-rounded" style="color:var(--primary); font-size:20px;">${icon}</span>
            <h3 style="margin: 0; font-size: 16px;">${c.nome}</h3>
          </div>
          <p style="font-size:10px; opacity:0.5; margin-top:4px;">${c.endereco}</p>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="icon-btn" onclick="window.renderFullPropertyForm(${c.id})"><span class="material-symbols-rounded" style="font-size:16px;">edit</span></button>
          ${c.whatsapp ? `<a href="https://wa.me/${c.whatsapp.replace(/\D/g,'')}" target="_blank" class="icon-btn success"><span class="material-symbols-rounded" style="font-size:16px;">chat</span></a>` : ''}
          <button class="icon-btn" style="border:none;" onclick="window.deleteItem('cliente', ${c.id})"><span class="material-symbols-rounded" style="font-size:16px; color:#ff4d4d;">delete</span></button>
        </div>
      </div>`;
      
    if (c.tipo === 'Casa') {
      html += `<div style="display:flex; gap:10px; margin-bottom: 15px;">
         <button class="btn-primary" onclick="window.renderEquipmentForm(null, ${c.id}, null)" style="flex:1; font-size:10px; padding:10px;">+ ADICIONAR AR (CÔMODO)</button>
      </div>`;
    } else {
      html += `<div style="display:flex; gap:10px; margin-bottom: 15px;">
         <button class="btn-primary" onclick="window.renderUnidadeForm(${c.id})" style="flex:1; font-size:10px; padding:10px; background:#4a4a6a;">+ NOVO APARTAMENTO</button>
         <button class="btn-primary" onclick="window.renderEquipmentForm(null, ${c.id}, null)" style="flex:1; font-size:10px; padding:10px;">+ AR (ÁREA COMUM)</button>
      </div>`;
    }

    for (const u of unidades) {
       const esUnidade = esAll.filter(e => e.unidadeId === u.id);
       html += `<div style="background: rgba(0,0,0,0.2); border-radius: 12px; padding: 12px; margin-bottom: 10px; border-left: 3px solid var(--primary);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px;">
             <div>
                <h4 style="margin:0; font-size:13px; color:var(--primary);">${u.apartamento}</h4>
                <p style="margin:0; font-size:10px; opacity:0.7;">${u.proprietario}</p>
             </div>
             <div style="display:flex; gap:5px;">
                <button class="icon-btn" onclick="window.renderEquipmentForm(null, ${c.id}, ${u.id})" style="width:28px; height:28px;"><span class="material-symbols-rounded" style="font-size:14px;">add</span></button>
                ${u.telefone ? `<a href="https://wa.me/${u.telefone.replace(/\D/g,'')}" target="_blank" class="icon-btn success" style="width:28px; height:28px;"><span class="material-symbols-rounded" style="font-size:14px;">chat</span></a>` : ''}
                <button class="icon-btn" onclick="window.deleteItem('unidade', ${u.id})" style="width:28px; height:28px;"><span class="material-symbols-rounded" style="font-size:14px; color:#ff4d4d;">delete</span></button>
             </div>
          </div>
          ${renderEquipmentsList(esUnidade)}
       </div>`;
    }

    const esComum = esAll.filter(e => !e.unidadeId);
    if (esComum.length > 0) {
       const labelComum = c.tipo === 'Casa' ? 'Aparelhos Cadastrados' : 'Área Comum / Aparelhos';
       html += `<div style="margin-top: 15px;">
          <h4 style="font-size: 11px; opacity: 0.6; margin-bottom: 10px; text-transform:uppercase;">${labelComum}</h4>
          ${renderEquipmentsList(esComum)}
       </div>`;
    }
    
    html += `</div>`;
  }
  if (cs.length === 0) html += '<p style="text-align:center; opacity:0.3; padding:40px;">Nenhuma propriedade cadastrada.</p>';
  mainContent.innerHTML = html + '</div>';
};

window.renderBairroForm = function() {
  const bairrosJampa = [
    'Aeroclube', 'Água Fria', 'Altiplano', 'Alto do Céu', 'Alto do Mateus', 'Bairro das Indústrias', 'Bairro dos Estados', 'Bairro dos Ipês', 'Bairro dos Novais', 'Bancários', 'Brisamar', 'Cabo Branco', 'Castelo Branco', 'Centro', 'Cidade dos Colibris', 'Costa e Silva', 'Cristo Redentor', 'Cruz das Armas', 'Cuiá', 'Distrito Industrial', 'Ernesto Geisel', 'Expedicionários', 'Funcionários', 'Grotão', 'Ilha do Bispo', 'Jaguaribe', 'Jardim Cidade Universitária', 'Jardim Luna', 'Jardim Oceania', 'Jardim São Paulo', 'Jardim Veneza', 'João Agripino', 'João Paulo II', 'José Américo', 'Manaíra', 'Mandacaru', 'Mangabeira', 'Miramar', 'Muçumagro', 'Oitizeiro', 'Padre Zé', 'Paratibe', 'Pedro Gondim', 'Portal do Sol', 'Roger', 'São José', 'Tambaú', 'Tambauzinho', 'Torre', 'Treze de Maio', 'Valentina Figueiredo', 'Varadouro'
  ].sort();

  openModal('Novo Bairro');
  modalBody.innerHTML = `
    <style>
      .suggestions-list { position: absolute; bottom: 100%; left: 0; right: 0; background: #2a2a3e; border: 1px solid #444; border-radius: 8px; max-height: 150px; overflow-y: auto; z-index: 100; margin-bottom: 5px; display: none; box-shadow: 0 -4px 10px rgba(0,0,0,0.5); }
      .suggestion-item { padding: 12px 15px; cursor: pointer; font-size: 14px; }
      .suggestion-item:hover { background: var(--primary); color: black; }
      .suggestion-item.disabled { opacity: 0.5; cursor: not-allowed; }
      .suggestion-item.disabled:hover { background: transparent; color: #fff; }
    </style>
    <form id="f-b">
      <div class="form-group" style="position: relative;">
        <label>Nome do Bairro</label>
        <input type="text" id="b-nome" class="form-control" required placeholder="Digite para buscar..." autocomplete="off">
        <div id="bairro-suggestions" class="suggestions-list"></div>
      </div>
      <button type="submit" class="btn-primary" style="margin-top: 15px;">SALVAR BAIRRO</button>
    </form>`;

  const input = document.getElementById('b-nome');
  const suggestionsContainer = document.getElementById('bairro-suggestions');

  const showSuggestions = async () => {
    const searchTerm = input.value.toLowerCase();
    suggestionsContainer.innerHTML = '';
    
    const allDbBairros = await db.bairros.toArray();
    const filtered = bairrosJampa.filter(b => b.toLowerCase().includes(searchTerm));
    
    if (filtered.length === 0 && searchTerm.length > 0) {
      suggestionsContainer.style.display = 'none';
      return;
    }

    suggestionsContainer.style.display = 'block';
    const listSource = searchTerm.length > 0 ? filtered : bairrosJampa;

    listSource.forEach(bairro => {
      const dbEntry = allDbBairros.find(dbb => dbb.nome.toLowerCase() === bairro.toLowerCase());
      const item = document.createElement('div');
      item.textContent = bairro;
      item.classList.add('suggestion-item');

      if (dbEntry) {
        item.classList.add('disabled');
        item.title = 'Bairro já cadastrado';
        item.style.borderLeft = `4px solid ${dbEntry.cor}`;
        item.style.paddingLeft = '11px';
      } else {
        item.onmousedown = (e) => { e.preventDefault(); input.value = bairro; suggestionsContainer.style.display = 'none'; };
      }
      suggestionsContainer.appendChild(item);
    });
  };

  input.oninput = showSuggestions;
  input.onfocus = showSuggestions;
  input.onblur = () => { setTimeout(() => { if (suggestionsContainer) suggestionsContainer.style.display = 'none'; }, 200); };

  document.getElementById('f-b').onsubmit = async (ev) => {
    ev.preventDefault();
    const nome = document.getElementById('b-nome').value.trim();
    if (!nome) { alert('Por favor, digite um nome para o bairro.'); return; }
    
    const existing = await db.bairros.where('nome').equalsIgnoreCase(nome).first();
    if (existing) { alert('Este bairro já está cadastrado!'); return; }

    const cor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    await db.bairros.add({ nome, cor });
    closeModal(); renderBairros();
  };
};

window.renderFullPropertyForm = async function(clientId = null) {
  const bairros = await db.bairros.toArray();
  if (bairros.length === 0) { alert('Cadastre um bairro primeiro!'); return; }
  const client = clientId ? await db.clientes.get(Number(clientId)) : null;
  openModal(client ? 'Editar Propriedade' : 'Nova Propriedade');
  modalBody.innerHTML = `
    <form id="f-c">
      <div class="form-group"><label>Bairro</label><select id="c-bairro" class="form-control">${bairros.map(b => `<option value="${b.id}" ${client && client.bairroId === b.id ? 'selected' : ''}>${b.nome}</option>`).join('')}</select></div>
      <div class="form-group"><label>Tipo de Imóvel</label><select id="c-tipo" class="form-control"><option value="Edifício" ${client && client.tipo === 'Edifício' ? 'selected' : ''}>Edifício / Prédio</option><option value="Casa" ${client && client.tipo === 'Casa' ? 'selected' : ''}>Casa / Residência</option><option value="Comercial" ${client && client.tipo === 'Comercial' ? 'selected' : ''}>Ponto Comercial</option></select></div>
      <div class="form-group"><label>Nome / Edifício / Proprietário</label><input type="text" id="c-nome" class="form-control" required value="${client ? client.nome : ''}" placeholder="Ex: Edifício X ou João da Silva"></div>
      <div class="form-group"><label>Endereço</label><input type="text" id="c-end" class="form-control" required value="${client ? client.endereco : ''}" placeholder="Ex: Rua Y, 123"></div>
      <div class="form-group"><label>Telefone</label><input type="text" id="c-tel" class="form-control" value="${client ? client.telefone : ''}" placeholder="Ex: 83 99999-0000"></div>
      <div class="form-group"><label>WhatsApp</label><input type="text" id="c-wpp" class="form-control" value="${client && client.whatsapp ? client.whatsapp : ''}" placeholder="Ex: 83 99999-0000"></div>
      <button type="submit" class="btn-primary" style="margin-top: 15px;">SALVAR PROPRIEDADE</button>
    </form>`;
  document.getElementById('f-c').onsubmit = async (ev) => {
    ev.preventDefault();
    const data = {
      bairroId: Number(document.getElementById('c-bairro').value),
      tipo: document.getElementById('c-tipo').value,
      nome: document.getElementById('c-nome').value, endereco: document.getElementById('c-end').value,
      telefone: document.getElementById('c-tel').value, whatsapp: document.getElementById('c-wpp').value
    };
    if (client) await db.clientes.update(client.id, data);
    else await db.clientes.add(data);
    closeModal(); renderBairros();
  };
};

window.renderUnidadeForm = function(clienteId) {
  openModal('Novo Apartamento / Cliente');
  modalBody.innerHTML = `
    <form id="f-u">
      <div class="form-group"><label>Nº do Apartamento / Sala</label><input type="text" id="u-apt" class="form-control" required placeholder="Ex: Apt 101"></div>
      <div class="form-group"><label>Nome do Proprietário</label><input type="text" id="u-prop" class="form-control" required placeholder="Ex: João da Silva"></div>
      <div class="form-group"><label>Telefone / WhatsApp</label><input type="text" id="u-tel" class="form-control" placeholder="Ex: 83 99999-0000"></div>
      <button type="submit" class="btn-primary" style="margin-top: 15px;">SALVAR</button>
    </form>`;
  document.getElementById('f-u').onsubmit = async (ev) => {
    ev.preventDefault();
    await db.unidades.add({ clienteId: Number(clienteId), apartamento: document.getElementById('u-apt').value, proprietario: document.getElementById('u-prop').value, telefone: document.getElementById('u-tel').value });
    closeModal();
    const cli = await db.clientes.get(Number(clienteId));
    window.renderBairroDetail(cli.bairroId);
  };
};

window.renderEquipmentForm = async function(id, cId, uId = null) {
  openModal('Novo Aparelho');
  let sB = 'Samsung';
  const r = () => {
    modalBody.innerHTML = `
      <form id="f-e">
        <label>Marca</label><div class="brand-grid">${marcas.map(m => `<div class="brand-item ${sB === m ? 'active' : ''}" data-brand="${m}"><img src="${getLogo(m)}" /></div>`).join('')}</div>
        <div class="form-group" style="margin-top:20px;"><label>BTU</label><select id="e-b" class="form-control">${btus.map(b => `<option value="${b}">${b}</option>`).join('')}</select></div>
        <div class="form-group"><label>Localização</label><input type="text" id="e-l" class="form-control" placeholder="Ex: Sala"></div>
        <div class="form-group"><label>Tirar Foto / Etiqueta (Opcional)</label><input type="file" id="e-ft" class="form-control" accept="image/*" capture="environment" style="padding: 8px;"></div>
        <button type="submit" class="btn-primary">SALVAR</button>
      </form>`;
    document.querySelectorAll('.brand-item').forEach(i => i.onclick = () => { sB = i.dataset.brand; r(); });
    document.getElementById('f-e').onsubmit = async (ev) => {
      ev.preventDefault();
      const ftInput = document.getElementById('e-ft');
      const fotoBase64 = ftInput.files.length > 0 ? await fileToBase64(ftInput.files[0]) : null;
      await db.equipamentos.add({ marca: sB, btu: Number(document.getElementById('e-b').value), localizacao: document.getElementById('e-l').value, clienteId: Number(cId), unidadeId: uId ? Number(uId) : null, ultimaManutencao: null, proximaManutencao: null, foto: fotoBase64 });
      closeModal(); 
      const cli = await db.clientes.get(Number(cId));
      window.renderBairroDetail(cli.bairroId);
    };
  }; r();
};

async function init() {
  const style = document.createElement('style');
  style.innerHTML = 'select.form-control, select.form-control option { background-color: #2a2a3e !important; color: #ffffff !important; }';
  document.head.appendChild(style);
  if (navigator.storage && navigator.storage.persist) await navigator.storage.persist();
  if (!db.isOpen()) await db.open();
  await seedDatabase();
  setupNavigation(); await renderDashboard();
  
  const manifestLink = document.createElement('link');
  manifestLink.rel = 'manifest';
  manifestLink.href = './manifest.json';
  document.head.appendChild(manifestLink);

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(err => console.log('PWA error:', err));

  const s = document.getElementById('splash-screen');
  if (s) { 
    const appN = localStorage.getItem('jampa_app_name') || 'AR JAMPA';
    const titleEl = s.querySelector('h1, h2, h3, .title, .logo-text, .splash-text');
    if (titleEl) titleEl.textContent = appN;
    setTimeout(() => { 
      s.style.opacity = '0'; 
      s.style.transform = 'scale(1.05)';
      setTimeout(() => s.remove(), 600); 
    }, 3800); 
  }
}

window.renderDashboard = renderDashboard; window.renderBairros = renderBairros; window.renderHistorico = renderHistorico; window.renderMais = renderMais; init();
