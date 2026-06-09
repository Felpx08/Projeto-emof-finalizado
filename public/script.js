// ============================================================
// script.js — Front-end do FactoryTrack (SPA vanilla JS)
//
// Toda a lógica de interface roda neste arquivo único:
//   - Autenticação (login/logout com JWT)
//   - Navegação entre seções (sem reload de página)
//   - CRUD de Ordens, Produtos, Clientes e Usuários
//   - Tela de Produção exclusiva para perfil Líder
//   - Dashboard com resumo para perfil Administrador/Operador
// ============================================================

const API = '/api'; // Prefixo de todas as chamadas à API

// ── Cache local ────────────────────────────────────────────
// Evitam requisições repetidas enquanto a página está aberta.
// São invalidados automaticamente após criar/editar/deletar.
let cProdutos     = [];
let cClientes     = [];
let _statusFiltro = ''; // Filtro ativo na listagem de ordens

// ── Sessão do usuário ──────────────────────────────────────
// Token JWT e dados do usuário são persistidos no localStorage
// para sobreviver a recarregamentos da página.
let TOKEN          = localStorage.getItem('ft_token') || '';
let USUARIO_LOGADO = JSON.parse(localStorage.getItem('ft_usuario') || 'null');

// ═══════════════════════════════════ AUTH ══════════════════

/**
 * Realiza o login do usuário.
 * Envia email/senha para a API e, em caso de sucesso:
 *   - Salva o token JWT e os dados do usuário no localStorage
 *   - Aplica restrições de interface conforme o perfil
 *   - Adiciona a classe .logado ao body (exibe o app, oculta a tela de login)
 */
async function fazerLogin() {
  const email = document.getElementById('l-email').value.trim();
  const senha = document.getElementById('l-senha').value;
  const btn   = document.getElementById('btn-login');
  const erro  = document.getElementById('login-erro');

  if (!email || !senha) {
    erro.style.display = 'block';
    erro.textContent   = 'Preencha e-mail e senha.';
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Entrando...';
  erro.style.display = 'none';

  try {
    const res  = await fetch(API + '/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, senha }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.erro || 'Credenciais inválidas');

    TOKEN = data.token;
    USUARIO_LOGADO = data.usuario;
    localStorage.setItem('ft_token', TOKEN);
    localStorage.setItem('ft_usuario', JSON.stringify(data.usuario));

    aplicarPerfil(data.usuario);
    document.body.classList.add('logado');

  } catch (e) {
    erro.style.display = 'block';
    erro.textContent   = e.message;
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Entrar';
  }
}

/**
 * Encerra a sessão do usuário.
 * Limpa o token e os dados do localStorage e remove a classe .logado,
 * voltando para a tela de login.
 */
function sair() {
  TOKEN = '';
  USUARIO_LOGADO = null;
  localStorage.removeItem('ft_token');
  localStorage.removeItem('ft_usuario');
  document.body.classList.remove('logado');
  document.getElementById('l-senha').value = '';
}

// Restaura sessão ao recarregar a página, se o token ainda estiver salvo
if (TOKEN && USUARIO_LOGADO) {
  aplicarPerfil(USUARIO_LOGADO);
  document.body.classList.add('logado');
}

// ═══════════════════════════════════ HELPERS ═══════════════

/**
 * Exibe uma notificação temporária no canto da tela.
 * @param {string} msg  - Mensagem a exibir
 * @param {string} tipo - 'ok' (verde) | 'err' (vermelho)
 */
function toast(msg, tipo = 'ok') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = `show ${tipo}`;
  setTimeout(() => el.className = '', 3200);
}

// Abre/fecha modais adicionando ou removendo a classe CSS "open"
function abrir(id)  { document.getElementById(id).classList.add('open'); }
function fechar(id) { document.getElementById(id).classList.remove('open'); }

// Fecha qualquer modal ao clicar no fundo escuro (overlay)
document.querySelectorAll('.modal-bg').forEach(bg =>
  bg.addEventListener('click', e => { if (e.target === bg) bg.classList.remove('open'); })
);

// Formata um número como moeda brasileira: 1234.5 → "R$ 1.234,50"
function R$(v) {
  return 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',');
}

// Retorna o HTML de um badge colorido para cada status de ordem
function badge(s) {
  const r = {
    aguardando_producao: '⏳ Aguardando',
    em_producao:         '⚙️ Em Produção',
    finalizado:          '✅ Finalizado',
    cancelado:           '❌ Cancelado',
  };
  return `<span class="badge b-${s}">${r[s] || s}</span>`;
}

/**
 * Formata a data de prazo com alertas visuais:
 *   - Vermelho + ⚠️ se o prazo já venceu
 *   - Amarelo + 🔔 se vence em até 3 dias
 *   - Normal para datas futuras
 */
function formatarPrazo(prazo) {
  if (!prazo) return '<span style="color:var(--muted)">—</span>';
  const d     = new Date(prazo + 'T00:00:00');
  const hoje  = new Date(); hoje.setHours(0,0,0,0);
  const diff  = Math.ceil((d - hoje) / (1000 * 60 * 60 * 24));
  const str   = d.toLocaleDateString('pt-BR');
  if (diff < 0)  return `<span class="prazo-vencido">⚠️ ${str}</span>`;
  if (diff <= 3) return `<span class="prazo-alerta">🔔 ${str}</span>`;
  return `<span>${str}</span>`;
}

/**
 * Wrapper para todas as chamadas à API.
 * Injeta automaticamente o token JWT no cabeçalho Authorization.
 * Se a API retornar 401 (token expirado), faz logout automático.
 *
 * @param {string} method - 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
 * @param {string} url    - Caminho relativo (ex: '/ordens/42')
 * @param {object} body   - Corpo da requisição (opcional)
 */
async function api(method, url, body) {
  const opts = {
    method,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${TOKEN}`,
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res  = await fetch(API + url, opts);
  const data = await res.json();

  if (res.status === 401) { sair(); throw new Error('Sessão expirada'); }
  if (!res.ok) throw new Error(data.erro || 'Erro na requisição');
  return data;
}

// ═══════════════════════════════════ PERFIL ════════════════

/**
 * Adapta a interface ao perfil do usuário logado.
 *
 * Regras de visibilidade:
 *   Administrador — acesso total (menus, botões, dashboard, usuários)
 *   Operador      — igual ao Administrador, exceto gerenciamento de usuários
 *   Lider         — só vê "Produção" e "Catálogo de Peças"; não vê clientes,
 *                   dashboard, ordens administrativas nem botão de novo produto
 *
 * Também define a página inicial que será exibida logo após o login.
 */
function aplicarPerfil(usuario) {
  document.getElementById('sb-nome').textContent   = usuario.nome;
  document.getElementById('sb-perfil').textContent = usuario.perfil;

  const perfil  = usuario.perfil;
  const isAdmin = perfil === 'Administrador';
  const isLider = perfil === 'Lider';

  function show(id, visible, type = 'flex') {
    const el = document.getElementById(id);
    if (el) el.style.display = visible ? type : 'none';
  }

  function showEl(el, visible, type = 'flex') {
    if (el) el.style.display = visible ? type : 'none';
  }

  show('menu-usuarios',   isAdmin, 'block');
  show('btn-usuarios',    isAdmin, 'flex');
  show('sb-group-lider',  isLider, 'block');
  show('btn-nav-producao', isLider, 'flex');

  // Líderes não veem clientes nem dashboard
  showEl(document.querySelector('[onclick*="clientes"]'),  !isLider);
  showEl(document.querySelector('[onclick*="ordens"]'),    !isLider);
  showEl(document.querySelector('[onclick*="dashboard"]'), !isLider);
  showEl(document.querySelector('.sb-group'), !isLider, 'block');

  const labelProdutos = document.getElementById('nav-produtos-label');
  if (labelProdutos) labelProdutos.textContent = isLider ? 'Catálogo' : 'Produtos';

  const tituloProdutos = document.getElementById('pg-produtos-titulo');
  const subProdutos    = document.getElementById('pg-produtos-sub');
  if (tituloProdutos) tituloProdutos.textContent = isLider ? 'Catálogo de Peças' : 'Produtos';
  if (subProdutos)    subProdutos.textContent    = isLider ? 'Peças disponíveis para produção' : 'Gerencie o catálogo de peças';
  show('btn-novo-produto', !isLider, 'inline-flex');

  show('stat-fat', !isLider, 'block');
  show('stat-cli', !isLider, 'block');

  if (isLider) {
    ir('producao', document.getElementById('btn-nav-producao'));
  } else {
    ir('dashboard', document.querySelector('[onclick*="dashboard"]'));
  }
}

// ═══════════════════════════════════ NAVEGAÇÃO ═════════════

/**
 * Navega para uma seção do SPA sem recarregar a página.
 * Verifica permissões antes de exibir a seção solicitada.
 * Cada seção tem uma função "loader" que busca seus dados da API.
 *
 * @param {string} pg  - ID da seção (ex: 'dashboard', 'ordens', 'producao')
 * @param {Element} btn - Botão do menu que disparou a navegação (para marcar como ativo)
 */
function ir(pg, btn) {
  const perfil = document.getElementById('sb-perfil').textContent;

  if (pg === 'usuarios' && perfil !== 'Administrador') {
    toast('Acesso restrito a Administradores', 'err'); return;
  }
  if (pg === 'producao' && perfil !== 'Lider') {
    toast('Área exclusiva para Líderes de Produção', 'err'); return;
  }
  if (perfil === 'Lider' && !['producao','produtos'].includes(pg)) {
    toast('Acesso não permitido', 'err'); return;
  }

  document.querySelectorAll('.secao').forEach(s => s.classList.remove('ativa'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('ativo'));
  document.getElementById('pg-' + pg).classList.add('ativa');
  if (btn) btn.classList.add('ativo');

  const loaders = {
    dashboard: carregarDashboard,
    ordens:    carregarOrdens,
    produtos:  carregarProdutos,
    clientes:  carregarClientes,
    usuarios:  carregarUsuarios,
    producao:  carregarProducao,
  };
  if (loaders[pg]) loaders[pg]();
}

// ═══════════════════════════════════ DASHBOARD ═════════════

/**
 * Carrega o dashboard com estatísticas gerais.
 * Faz 3 requisições em paralelo (Promise.all) para produtos, clientes e ordens,
 * preenche os cards de métricas e renderiza os painéis de ordens recentes
 * e catálogo de produtos disponíveis.
 */
async function carregarDashboard() {
  const h = new Date().getHours();
  const s = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  document.getElementById('dash-sub').textContent = `${s}! Aqui está o resumo da produção.`;

  try {
    const [produtos, clientes, ordens] = await Promise.all([
      api('GET', '/produtos'),
      api('GET', '/clientes'),
      api('GET', '/ordens'),
    ]);

    cProdutos  = produtos;
    cClientes  = clientes;

    document.getElementById('s-pro').textContent  = produtos.length;
    document.getElementById('s-cli').textContent  = clientes.length;
    document.getElementById('s-ord').textContent  = ordens.length;
    document.getElementById('s-prod').textContent =
      ordens.filter(o => o.status === 'em_producao').length;
    document.getElementById('s-fat').textContent  =
      R$(ordens.reduce((acc, o) => acc + (o.total || 0), 0));

    const pend = ordens.filter(o => !['finalizado','cancelado'].includes(o.status)).length;
    document.getElementById('s-ord-sub').textContent = `${pend} pendente(s)`;

    const elO = document.getElementById('dash-ordens');
    elO.innerHTML = ordens.slice(0, 8).map(o => `
      <div class="mini-row">
        <div>
          <div class="mn">#${String(o.numeroOrdem || '?').padStart(3,'0')} · ${o.cliente?.nome || '—'}</div>
          <div class="mc">${new Date(o.createdAt).toLocaleString('pt-BR')} · Prazo: ${o.prazo ? new Date(o.prazo + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</div>
        </div>
        <div style="text-align:right">
          ${badge(o.status)}<br>
          <small style="color:var(--muted)">${R$(o.total)}</small>
        </div>
      </div>`).join('') ||
      '<div class="empty"><span class="ei">📋</span>Nenhuma ordem ainda</div>';

    const elC = document.getElementById('dash-catalogo');
    elC.innerHTML = produtos.filter(p => p.disponivel).slice(0, 8).map(p => `
      <div class="mini-row">
        <span>🔩 ${p.nome}</span>
        <small style="color:var(--muted)">${R$(p.precoUnitario)}</small>
      </div>`).join('') ||
      '<div class="empty"><span class="ei">🔩</span>Nenhum produto</div>';

  } catch (e) { toast('Erro dashboard: ' + e.message, 'err'); }
}

// ═══════════════════════════════════ ORDENS ════════════════

// Cache local das ordens para permitir filtragem sem nova requisição
let _todasOrdens = [];

async function carregarOrdens() {
  const el = document.getElementById('tbl-ordens');
  el.innerHTML = '<div class="spin-wrap"><div class="spin"></div> Carregando...</div>';
  try {
    _todasOrdens = await api('GET', '/ordens');
    renderizarOrdens();
  } catch (e) {
    el.innerHTML = `<div class="empty" style="color:var(--red)">${e.message}</div>`;
  }
}

function filtrarStatus(status, btn) {
  _statusFiltro = status;
  document.querySelectorAll('.filtro-status').forEach(b => b.classList.remove('ativo'));
  if (btn) btn.classList.add('ativo');
  renderizarOrdens();
}

function renderizarOrdens() {
  const el = document.getElementById('tbl-ordens');
  const ordens = _statusFiltro
    ? _todasOrdens.filter(o => o.status === _statusFiltro)
    : _todasOrdens;

  if (!ordens.length) {
    el.innerHTML = '<div class="empty"><span class="ei">📋</span>Nenhuma ordem encontrada</div>';
    return;
  }

  el.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>#</th><th>Cliente</th><th>Itens</th>
          <th>Total</th><th>Pagamento</th><th>Prazo</th>
          <th>Status</th><th>Data</th><th>Ações</th>
        </tr>
      </thead>
      <tbody>
        ${ordens.map(o => `
          <tr>
            <td><strong style="color:var(--blue)">#${String(o.numeroOrdem||'?').padStart(3,'0')}</strong></td>
            <td>
              <strong>${o.cliente?.nome || '—'}</strong><br>
              <small style="color:var(--muted)">${o.cliente?.telefone || ''}</small>
            </td>
            <td style="font-size:.76rem">
              ${o.itens.map(it => `${it.quantidade}x ${it.nomeProduto || '?'}`).join('<br>')}
            </td>
            <td><strong style="color:var(--gold)">${R$(o.total)}</strong></td>
            <td style="font-size:.76rem">${(o.formaPagamento || '—').replace('_', ' ')}</td>
            <td style="font-size:.76rem">${formatarPrazo(o.prazo)}</td>
            <td>${badge(o.status)}</td>
            <td style="font-size:.7rem;color:var(--muted)">${new Date(o.createdAt).toLocaleString('pt-BR')}</td>
            <td>
              <div style="display:flex;gap:5px">
                <button class="btn btn-blue btn-sm" onclick="abrirStatus('${o._id}','${o.status}')">📝</button>
                <button class="btn btn-danger btn-sm" onclick="deletarOrdem('${o._id}')">🗑️</button>
              </div>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

async function abrirOrdem() {
  try {
    if (!cProdutos.length)  cProdutos  = await api('GET', '/produtos');
    if (!cClientes.length) cClientes  = await api('GET', '/clientes');
  } catch (e) { toast('Erro ao carregar dados', 'err'); return; }

  document.getElementById('ord-cli').innerHTML =
    '<option value="">— Selecione o cliente —</option>' +
    cClientes.map(c => `<option value="${c._id}">${c.nome} · ${c.telefone}</option>`).join('');

  document.getElementById('itens-ordem-lista').innerHTML = '';
  document.getElementById('ord-prazo').value = '';
  document.getElementById('ord-obs').value   = '';
  document.getElementById('ord-pag').value   = 'a_prazo';
  document.getElementById('ord-tot').textContent = 'R$ 0,00';

  addItemOrdem();
  abrir('m-ordem');
}

function addItemOrdem() {
  const d = document.createElement('div');
  d.className = 'item-row';
  const opts = cProdutos.filter(p => p.disponivel)
    .map(p => `<option value="${p._id}" data-preco="${p.precoUnitario||0}">${p.nome}</option>`).join('');
  d.innerHTML = `
    <select class="ip" onchange="recalcOrdem()">
      <option value="">Selecione...</option>${opts}
    </select>
    <input class="iq" type="number" value="1" min="1" oninput="recalcOrdem()">
    <div class="is" style="font-size:.8rem;text-align:right;color:var(--muted)">R$ 0,00</div>
    <button class="btn-rm" onclick="this.parentElement.remove();recalcOrdem()">×</button>`;
  document.getElementById('itens-ordem-lista').appendChild(d);
}

/**
 * Recalcula o total da ordem em tempo real.
 * Percorre todas as linhas de item, lê o preço do data-attribute do <option>
 * (definido quando a lista de produtos foi gerada) e atualiza o subtotal
 * de cada linha e o total geral.
 */
function recalcOrdem() {
  let total = 0;
  document.querySelectorAll('#itens-ordem-lista .item-row').forEach(row => {
    const sel   = row.querySelector('.ip');
    const qtd   = parseInt(row.querySelector('.iq').value) || 0;
    const preco = parseFloat(sel.options[sel.selectedIndex]?.dataset?.preco || 0);
    const s     = preco * qtd;
    total      += s;
    row.querySelector('.is').textContent = R$(s);
  });
  document.getElementById('ord-tot').textContent = R$(total);
}

async function salvarOrdem() {
  const cliId = document.getElementById('ord-cli').value;
  if (!cliId) { toast('Selecione um cliente', 'err'); return; }

  const itens = []; let valido = true;
  document.querySelectorAll('#itens-ordem-lista .item-row').forEach(row => {
    const pid = row.querySelector('.ip').value;
    if (!pid) { valido = false; return; }
    itens.push({
      produto:    pid,
      quantidade: parseInt(row.querySelector('.iq').value) || 1,
    });
  });

  if (!valido || !itens.length) { toast('Adicione ao menos um item válido', 'err'); return; }

  try {
    await api('POST', '/ordens', {
      cliente:        cliId,
      itens,
      formaPagamento: document.getElementById('ord-pag').value,
      observacoes:    document.getElementById('ord-obs').value,
      prazo:          document.getElementById('ord-prazo').value || null,
      origem:         'administrativo',
    });
    toast('Ordem registrada! 🏭');
    fechar('m-ordem');
    carregarOrdens();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}

function abrirStatus(id, status) {
  document.getElementById('st-id').value  = id;
  document.getElementById('st-val').value = status;
  abrir('m-status');
}

/**
 * Envia a atualização de status via PATCH.
 * Após salvar, detecta qual página está ativa e recarrega
 * a listagem correta (ordens administrativas ou tela de produção do líder).
 */
async function salvarStatus() {
  const id     = document.getElementById('st-id').value;
  const status = document.getElementById('st-val').value;
  try {
    await api('PATCH', '/ordens/' + id + '/status', { status });
    toast('Status atualizado!');
    fechar('m-status');
    // Atualiza a view correta dependendo de qual está aberta
    const pgAtiva = document.querySelector('.secao.ativa')?.id;
    if (pgAtiva === 'pg-ordens')   carregarOrdens();
    if (pgAtiva === 'pg-producao') carregarProducao();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}

async function deletarOrdem(id) {
  if (!confirm('Deletar esta ordem de produção?')) return;
  try {
    await api('DELETE', '/ordens/' + id);
    toast('Ordem deletada!');
    carregarOrdens();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}

// ═══════════════════════════════════ PRODUÇÃO (LÍDER) ══════

/**
 * Carrega a tela de produção, exclusiva para o perfil Líder.
 * Filtra as ordens pelo ID do líder logado (?lider=<id>),
 * exibe métricas (total, aguardando, em produção, finalizadas)
 * e renderiza cards para cada ordem ativa.
 */
async function carregarProducao() {
  const grid = document.getElementById('grid-producao');
  grid.innerHTML = '<div class="spin-wrap"><div class="spin"></div> Carregando...</div>';

  document.getElementById('producao-sub').textContent =
    `Olá, ${USUARIO_LOGADO?.nome}! Suas ordens de produção.`;

  try {
    const ordens = await api('GET', `/ordens?lider=${USUARIO_LOGADO.id}`);
    const ativas = ordens.filter(o => !['finalizado','cancelado'].includes(o.status));

    document.getElementById('l-ord').textContent   = ordens.length;
    document.getElementById('l-ord-sub').textContent = `${ativas.length} ativa(s)`;
    document.getElementById('l-aguard').textContent =
      ordens.filter(o => o.status === 'aguardando_producao').length;
    document.getElementById('l-prod').textContent  =
      ordens.filter(o => o.status === 'em_producao').length;
    document.getElementById('l-fin').textContent   =
      ordens.filter(o => o.status === 'finalizado').length;

    if (!ativas.length) {
      grid.innerHTML = `
        <div class="empty" style="grid-column:1/-1">
          <span class="ei">⚙️</span>
          Nenhuma ordem ativa no momento.<br>
          <button class="btn btn-blue" style="margin-top:12px" onclick="abrirOrdemLider()">
            + Registrar primeira ordem
          </button>
        </div>`;
      return;
    }

    grid.innerHTML = ativas.map(o => `
      <div class="ordem-card">
        <div class="ordem-card-head">
          <div>
            <div class="ordem-num">#${String(o.numeroOrdem||'?').padStart(3,'0')}</div>
            <div style="font-size:.72rem;color:var(--muted);margin-top:2px">
              ${o.cliente?.nome || 'Sem cliente'} · Prazo: ${o.prazo ? new Date(o.prazo + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
            </div>
          </div>
          ${badge(o.status)}
        </div>
        <div class="ordem-card-body">
          ${o.itens.map(it => `
            <div class="ordem-item">
              <strong>${it.quantidade}x ${it.nomeProduto}</strong>
              <span>${R$(it.subtotal)}</span>
            </div>`).join('')}
          <div class="ordem-total">
            <span style="color:var(--muted)">Total</span>
            <span style="color:var(--gold)">${R$(o.total)}</span>
          </div>
          ${o.observacoes ? `<div style="font-size:.72rem;color:var(--muted);margin-top:6px">📝 ${o.observacoes}</div>` : ''}
        </div>
        <div class="ordem-card-foot">
          <button class="btn btn-blue btn-sm" style="flex:1"
            onclick="abrirStatus('${o._id}','${o.status}')">
            📝 Atualizar Status
          </button>
        </div>
      </div>`).join('');

  } catch (e) {
    grid.innerHTML = `<div class="empty" style="color:var(--red)">${e.message}</div>`;
  }
}

async function abrirOrdemLider() {
  try {
    if (!cProdutos.length)  cProdutos  = await api('GET', '/produtos');
    if (!cClientes.length) cClientes  = await api('GET', '/clientes');
  } catch (e) { toast('Erro ao carregar dados', 'err'); return; }

  document.getElementById('ol-cli').innerHTML =
    '<option value="">— Sem cliente —</option>' +
    cClientes.map(c => `<option value="${c._id}">${c.nome}</option>`).join('');

  document.getElementById('itens-ordem-lider-lista').innerHTML = '';
  document.getElementById('ol-prazo').value = '';
  document.getElementById('ol-obs').value   = '';
  document.getElementById('ol-tot').textContent = 'R$ 0,00';

  addItemOrdemLider();
  abrir('m-ordem-lider');
}

function addItemOrdemLider() {
  const d = document.createElement('div');
  d.className = 'item-row';
  const opts = cProdutos.filter(p => p.disponivel)
    .map(p => `<option value="${p._id}" data-preco="${p.precoUnitario||0}">${p.nome}</option>`).join('');
  d.innerHTML = `
    <select class="ip" onchange="recalcOrdemLider()">
      <option value="">Selecione...</option>${opts}
    </select>
    <input class="iq" type="number" value="1" min="1" oninput="recalcOrdemLider()">
    <div class="is" style="font-size:.8rem;text-align:right;color:var(--muted)">R$ 0,00</div>
    <button class="btn-rm" onclick="this.parentElement.remove();recalcOrdemLider()">×</button>`;
  document.getElementById('itens-ordem-lider-lista').appendChild(d);
}

function recalcOrdemLider() {
  let total = 0;
  document.querySelectorAll('#itens-ordem-lider-lista .item-row').forEach(row => {
    const sel   = row.querySelector('.ip');
    const qtd   = parseInt(row.querySelector('.iq').value) || 0;
    const preco = parseFloat(sel.options[sel.selectedIndex]?.dataset?.preco || 0);
    const s     = preco * qtd;
    total      += s;
    row.querySelector('.is').textContent = R$(s);
  });
  document.getElementById('ol-tot').textContent = R$(total);
}

/**
 * Salva uma ordem criada pelo líder no chão de fábrica.
 * Se nenhum cliente for selecionado, cria (ou reutiliza) automaticamente
 * um cliente genérico "Produção Interna" para ordens internas.
 * A origem da ordem é definida como 'producao' para diferenciá-la
 * das ordens administrativas.
 */
async function salvarOrdemLider() {
  const itens = []; let valido = true;
  document.querySelectorAll('#itens-ordem-lider-lista .item-row').forEach(row => {
    const pid = row.querySelector('.ip').value;
    if (!pid) { valido = false; return; }
    itens.push({
      produto:    pid,
      quantidade: parseInt(row.querySelector('.iq').value) || 1,
    });
  });

  if (!valido || !itens.length) { toast('Adicione ao menos um item', 'err'); return; }

  let clienteId = document.getElementById('ol-cli').value || null;

  // Se não selecionou cliente, cria um genérico "Produção Interna"
  if (!clienteId) {
    try {
      const todos  = await api('GET', '/clientes?busca=Produção Interna');
      const existe = todos.find(c => c.nome === 'Produção Interna');
      if (existe) {
        clienteId = existe._id;
      } else {
        const novo = await api('POST', '/clientes', { nome: 'Produção Interna', telefone: 'Interno' });
        clienteId  = novo._id;
        cClientes  = [];
      }
    } catch (e) { toast('Erro ao registrar cliente', 'err'); return; }
  }

  try {
    await api('POST', '/ordens', {
      cliente:        clienteId,
      itens,
      formaPagamento: 'a_prazo',
      observacoes:    document.getElementById('ol-obs').value,
      prazo:          document.getElementById('ol-prazo').value || null,
      origem:         'producao',
      lider:          USUARIO_LOGADO?.id,
    });
    toast('Ordem registrada no chão de fábrica! ⚙️');
    fechar('m-ordem-lider');
    carregarProducao();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}

// ═══════════════════════════════════ PRODUTOS ══════════════
async function carregarProdutos() {
  const el = document.getElementById('tbl-produtos');
  el.innerHTML = '<div class="spin-wrap"><div class="spin"></div> Carregando...</div>';
  try {
    cProdutos = await api('GET', '/produtos');
    if (!cProdutos.length) {
      el.innerHTML = '<div class="empty"><span class="ei">🔩</span>Nenhum produto</div>';
      return;
    }
    el.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Produto</th><th>Categoria</th><th>Especificações</th>
            <th>Preço Unit.</th><th>Status</th><th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${cProdutos.map(p => `
            <tr>
              <td>
                <strong>${p.nome}</strong><br>
                <small style="color:var(--muted)">${p.descricao || ''}</small>
              </td>
              <td><span class="badge b-cat">${p.categoria || 'usinagem'}</span></td>
              <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.76rem;color:var(--muted)">
                ${p.especificacoes || '—'}
              </td>
              <td><strong style="color:var(--gold)">${R$(p.precoUnitario)}</strong></td>
              <td>
                <span class="badge ${p.disponivel ? 'b-on' : 'b-off'}">
                  ${p.disponivel ? '✅ Disponível' : '❌ Off'}
                </span>
              </td>
              <td>
                <div style="display:flex;gap:5px">
                  <button class="btn btn-ghost btn-sm" onclick="editarProduto('${p._id}')">✏️</button>
                  <button class="btn btn-danger btn-sm" onclick="deletarProduto('${p._id}','${p.nome}')">🗑️</button>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    el.innerHTML = `<div class="empty" style="color:var(--red)">${e.message}</div>`;
  }
}

function abrirProduto() {
  document.getElementById('m-produto-t').textContent = 'Novo Produto';
  ['pr-id','pr-nome','pr-espec','pr-desc','pr-preco']
    .forEach(id => document.getElementById(id).value = '');
  document.getElementById('pr-cat').value  = 'usinagem';
  document.getElementById('pr-disp').value = 'true';
  abrir('m-produto');
}

function editarProduto(id) {
  const p = cProdutos.find(x => x._id == id);
  if (!p) return;
  document.getElementById('m-produto-t').textContent = 'Editar Produto';
  document.getElementById('pr-id').value    = p._id;
  document.getElementById('pr-nome').value  = p.nome;
  document.getElementById('pr-espec').value = p.especificacoes || '';
  document.getElementById('pr-desc').value  = p.descricao || '';
  document.getElementById('pr-preco').value = p.precoUnitario || '';
  document.getElementById('pr-cat').value   = p.categoria || 'usinagem';
  document.getElementById('pr-disp').value  = String(p.disponivel);
  abrir('m-produto');
}

async function salvarProduto() {
  const id    = document.getElementById('pr-id').value;
  const nome  = document.getElementById('pr-nome').value.trim();
  const espec = document.getElementById('pr-espec').value.trim();
  if (!nome || !espec) { toast('Nome e especificações são obrigatórios', 'err'); return; }

  const d = {
    nome,
    especificacoes: espec,
    descricao:      document.getElementById('pr-desc').value.trim(),
    precoUnitario:  parseFloat(document.getElementById('pr-preco').value) || 0,
    categoria:      document.getElementById('pr-cat').value,
    disponivel:     document.getElementById('pr-disp').value === 'true',
  };

  try {
    id ? await api('PUT', '/produtos/' + id, d) : await api('POST', '/produtos', d);
    toast(id ? 'Produto atualizado!' : 'Produto cadastrado!');
    fechar('m-produto');
    carregarProdutos();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}

async function deletarProduto(id, nome) {
  if (!confirm(`Deletar "${nome}"?`)) return;
  try {
    await api('DELETE', '/produtos/' + id);
    toast('Produto deletado!');
    carregarProdutos();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}

// ═══════════════════════════════════ CLIENTES ══════════════
async function carregarClientes(busca = '') {
  const el = document.getElementById('tbl-clientes');
  el.innerHTML = '<div class="spin-wrap"><div class="spin"></div> Carregando...</div>';
  try {
    const url = busca ? `/clientes?busca=${encodeURIComponent(busca)}` : '/clientes';
    cClientes = await api('GET', url);

    if (!cClientes.length) {
      el.innerHTML = '<div class="empty"><span class="ei">🏢</span>Nenhum cliente</div>';
      return;
    }

    el.innerHTML = `
      <table>
        <thead>
          <tr><th>Empresa</th><th>Telefone</th><th>Endereço</th><th>Obs</th><th>Ações</th></tr>
        </thead>
        <tbody>
          ${cClientes.map(c => `
            <tr>
              <td><strong>${c.nome}</strong></td>
              <td>${c.telefone}</td>
              <td style="font-size:.76rem;color:var(--muted)">
                ${[c.endereco?.rua, c.endereco?.numero, c.endereco?.cidade].filter(Boolean).join(', ') || '—'}
              </td>
              <td style="font-size:.76rem;color:var(--muted)">${c.observacoes || '—'}</td>
              <td>
                <div style="display:flex;gap:5px">
                  <button class="btn btn-ghost btn-sm" onclick="editarCliente('${c._id}')">✏️</button>
                  <button class="btn btn-danger btn-sm" onclick="deletarCliente('${c._id}','${c.nome}')">🗑️</button>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    el.innerHTML = `<div class="empty" style="color:var(--red)">${e.message}</div>`;
  }
}

// Debounce de 400ms na busca de clientes — evita uma requisição
// para cada tecla digitada no campo de pesquisa
let _t;
function buscarCli(v) {
  clearTimeout(_t);
  _t = setTimeout(() => carregarClientes(v), 400);
}

function abrirCliente() {
  document.getElementById('m-cli-t').textContent = 'Novo Cliente';
  ['c-id','c-nome','c-tel','c-rua','c-num','c-bairro','c-cidade','c-cep','c-comp','c-obs']
    .forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
  abrir('m-cliente');
}

function editarCliente(id) {
  const c = cClientes.find(x => x._id == id);
  if (!c) return;
  document.getElementById('m-cli-t').textContent    = 'Editar Cliente';
  document.getElementById('c-id').value     = c._id;
  document.getElementById('c-nome').value   = c.nome;
  document.getElementById('c-tel').value    = c.telefone;
  document.getElementById('c-rua').value    = c.endereco?.rua || '';
  document.getElementById('c-num').value    = c.endereco?.numero || '';
  document.getElementById('c-bairro').value = c.endereco?.bairro || '';
  document.getElementById('c-cidade').value = c.endereco?.cidade || '';
  document.getElementById('c-cep').value    = c.endereco?.cep || '';
  document.getElementById('c-comp').value   = c.endereco?.complemento || '';
  document.getElementById('c-obs').value    = c.observacoes || '';
  abrir('m-cliente');
}

async function salvarCliente() {
  const id   = document.getElementById('c-id').value;
  const nome = document.getElementById('c-nome').value.trim();
  const tel  = document.getElementById('c-tel').value.trim();
  if (!nome || !tel) { toast('Nome e telefone são obrigatórios', 'err'); return; }

  const d = {
    nome,
    telefone: tel,
    endereco: {
      rua:         document.getElementById('c-rua').value.trim(),
      numero:      document.getElementById('c-num').value.trim(),
      bairro:      document.getElementById('c-bairro').value.trim(),
      cidade:      document.getElementById('c-cidade').value.trim(),
      cep:         document.getElementById('c-cep').value.trim(),
      complemento: document.getElementById('c-comp').value.trim(),
    },
    observacoes: document.getElementById('c-obs').value.trim(),
  };

  try {
    id ? await api('PUT', '/clientes/' + id, d) : await api('POST', '/clientes', d);
    toast(id ? 'Cliente atualizado!' : 'Cliente cadastrado!');
    fechar('m-cliente');
    carregarClientes();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}

async function deletarCliente(id, nome) {
  if (!confirm(`Deletar "${nome}"?`)) return;
  try {
    await api('DELETE', '/clientes/' + id);
    toast('Cliente deletado!');
    carregarClientes();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}

// ═══════════════════════════════════ USUÁRIOS ══════════════
async function carregarUsuarios() {
  const el = document.getElementById('tbl-usuarios');
  el.innerHTML = '<div class="spin-wrap"><div class="spin"></div> Carregando...</div>';
  try {
    const us = await api('GET', '/usuarios');
    if (!us.length) {
      el.innerHTML = '<div class="empty"><span class="ei">🔐</span>Nenhum usuário</div>';
      return;
    }
    el.innerHTML = `
      <table>
        <thead>
          <tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th>Criado em</th><th>Ações</th></tr>
        </thead>
        <tbody>
          ${us.map(u => `
            <tr>
              <td><strong>${u.nome}</strong></td>
              <td>${u.email}</td>
              <td>
                <span class="badge ${
                  u.perfil === 'Administrador' ? 'b-admin' :
                  u.perfil === 'Lider'         ? 'b-lider' : 'b-operador'
                }">${u.perfil}</span>
              </td>
              <td><span class="badge ${u.ativo ? 'b-on' : 'b-off'}">${u.ativo ? 'Ativo' : 'Inativo'}</span></td>
              <td style="font-size:.73rem;color:var(--muted)">${new Date(u.createdAt).toLocaleDateString('pt-BR')}</td>
              <td>
                <button class="btn btn-danger btn-sm" onclick="deletarUsuario('${u._id}','${u.nome}')">🗑️</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    el.innerHTML = `<div class="empty" style="color:var(--red)">${e.message}</div>`;
  }
}

function abrirUsuario() {
  ['u-nome','u-email','u-senha'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('u-perfil').value = 'Operador';
  abrir('m-usuario');
}

async function salvarUsuario() {
  const nome  = document.getElementById('u-nome').value.trim();
  const email = document.getElementById('u-email').value.trim();
  const senha = document.getElementById('u-senha').value;
  if (!nome || !email || !senha) { toast('Preencha todos os campos', 'err'); return; }

  try {
    await api('POST', '/usuarios', {
      nome, email, senha,
      perfil: document.getElementById('u-perfil').value,
    });
    toast('Usuário criado!');
    fechar('m-usuario');
    carregarUsuarios();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}

async function deletarUsuario(id, nome) {
  if (!confirm(`Deletar "${nome}"?`)) return;
  try {
    await api('DELETE', '/usuarios/' + id);
    toast('Usuário deletado!');
    carregarUsuarios();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}
