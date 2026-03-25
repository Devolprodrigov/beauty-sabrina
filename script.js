const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&auto=format&fit=crop';
const WHATSAPP_PRIMARY = '5541997282177';

const state = {
  view: 'shop',
  products: [],
  cart: []
};

// --- Funções de Utilidade ---
function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value || 0));
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(text) {
  return escapeHtml(text);
}

// --- Lógica de Interface ---
function setView(view) {
  state.view = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const currentView = document.getElementById(`view-${view}`);
  if (currentView) currentView.classList.add('active');

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  if (view === 'cart') renderCart();
  if (view === 'admin') renderAdmin();
}

// --- Carregamento de Dados ---
async function loadProductsFromServer() {
  try {
    const response = await fetch('products.json?v=' + Date.now());
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.products = Array.isArray(data) ? data : [];
    renderProducts();
    renderAdmin();
  } catch (e) {
    console.error('Erro ao carregar produtos:', e);
    state.products = [];
    renderProducts();
    renderAdmin();
  }
}

// --- Lógica do Carrinho ---
function updateCartCount() {
  const total = state.cart.reduce((acc, item) => acc + item.qty, 0);
  const cartCount = document.getElementById('cartCount');
  if (cartCount) cartCount.textContent = total;
}

function addToCart(id) {
  const product = state.products.find(p => Number(p.id) === Number(id));
  const input = document.getElementById(`qty-${id}`);
  const qty = Math.max(1, Number(input?.value || 1));

  if (!product || qty <= 0) return;

  const existing = state.cart.find(item => Number(item.id) === Number(id));
  const currentQty = existing ? existing.qty : 0;
  const stock = Number(product.stock || 0);

  if (currentQty + qty > stock) {
    alert(`Tem apenas ${stock} unidades disponíveis deste produto.`);
    return;
  }

  if (existing) {
    existing.qty += qty;
  } else {
    state.cart.push({ ...product, qty });
  }

  if (input) input.value = 1;
  updateCartCount();
  renderCart();
  renderCartPopup();
  openCartPopup();
}

function removeFromCart(id) {
  state.cart = state.cart.filter(item => Number(item.id) !== Number(id));
  updateCartCount();
  renderCart();
  renderCartPopup();
}

function cartTotal() {
  return state.cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);
}

// --- Finalização do Pedido (Ajustada para PC e Celular) ---
async function finishOrder() {
  const firstName = document.getElementById('customerFirstName')?.value.trim();
  const lastName = document.getElementById('customerLastName')?.value.trim();

  if (!firstName || !lastName) {
    alert('Preencha nome e sobrenome para continuar.');
    return;
  }

  if (!state.cart.length) {
    alert('Seu carrinho está vazio.');
    return;
  }

  // Tenta atualizar o estoque antes de abrir o WhatsApp
  try {
    const stockResp = await fetch('/api/update-stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: state.cart.map(item => ({
          id: item.id,
          qty: item.qty
        }))
      })
    });

    if (!stockResp.ok) {
      const stockResult = await stockResp.json();
      alert(stockResult.error || 'Não foi possível atualizar o estoque.');
      return;
    }
  } catch (err) {
    console.error('Erro de estoque, mas prosseguindo com o pedido via WhatsApp:', err);
    // Nota: Em caso de erro de rede, você decide se bloqueia ou deixa o cliente pedir.
  }

  // Montagem da mensagem
  let message = `Olá Sabrina Beauty! Meu nome é ${encodeURIComponent(firstName)} ${encodeURIComponent(lastName)}.%0A%0AGostaria de fazer um pedido:%0A%0A`;

  state.cart.forEach(item => {
    const totalItem = Number(item.price || 0) * Number(item.qty || 0);
    message += `• ${encodeURIComponent(item.name)} (${item.qty}x) - ${encodeURIComponent(formatBRL(totalItem))}%0A`;
  });

  message += `%0A*Total: ${encodeURIComponent(formatBRL(cartTotal()))}*`;

  // Define o link correto para Mobile ou PC
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const baseUrl = isMobile ? "https://api.whatsapp.com/send" : "https://web.whatsapp.com/send";
  const finalUrl = `${baseUrl}?phone=${WHATSAPP_PRIMARY}&text=${message}`;

  // Limpa o carrinho e renderiza estados
  state.cart = [];
  updateCartCount();
  renderCart();
  renderCartPopup();
  closeCartPopup();
  setView('shop');
  loadProductsFromServer();

  // Abre o WhatsApp em nova aba
  window.open(finalUrl, '_blank');
}

// --- Funções de Renderização (HTML) ---
function renderProducts() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  if (!state.products.length) {
    grid.innerHTML = '<div class="empty-state">Nenhum produto cadastrado.</div>';
    return;
  }
  grid.innerHTML = state.products.map(product => `
    <article class="product-card">
      <div class="product-image-wrap">
        <img src="${escapeAttr(product.image || DEFAULT_IMAGE)}" alt="${escapeAttr(product.name || 'Produto')}" referrerpolicy="no-referrer">
        <span class="product-category">${escapeHtml(product.category || 'Geral')}</span>
      </div>
      <div class="product-body">
        <div>
          <h3>${escapeHtml(product.name || 'Produto sem nome')}</h3>
          <p class="product-desc">${escapeHtml(product.description || 'Produto premium disponível para pedido.')}</p>
          <div class="price">${formatBRL(product.price)}</div>
          <div class="stock-line">
            <span class="stock-dot ${Number(product.stock) > 0 ? '' : 'off'}"></span>
            <span>${Number(product.stock) > 0 ? `${Number(product.stock)} disponíveis` : 'Esgotado'}</span>
          </div>
        </div>
        <div class="qty-row">
          <div class="qty-box">
            <button onclick="changeQty(${Number(product.id)}, -1)">-</button>
            <input id="qty-${Number(product.id)}" type="number" min="1" max="${Math.max(Number(product.stock) || 0, 1)}" value="1">
            <button onclick="changeQty(${Number(product.id)}, 1)">+</button>
          </div>
          <button class="primary-btn" onclick="addToCart(${Number(product.id)})" ${Number(product.stock) <= 0 ? 'disabled' : ''}>
            Adicionar
          </button>
        </div>
      </div>
    </article>
  `).join('');
}

function renderCart() {
  const box = document.getElementById('cartContent');
  if (!box) return;
  if (!state.cart.length) {
    box.innerHTML = '<div class="empty-state">Seu carrinho está vazio.</div>';
    return;
  }
  const items = state.cart.map(item => `
    <div class="cart-card">
      <img src="${escapeAttr(item.image || DEFAULT_IMAGE)}" alt="${escapeAttr(item.name || 'Produto')}" referrerpolicy="no-referrer">
      <div>
        <strong>${escapeHtml(item.name || 'Produto')}</strong>
        <div class="muted">Qtd: ${Number(item.qty)}</div>
        <div class="price">${formatBRL(Number(item.price || 0) * Number(item.qty || 0))}</div>
      </div>
      <button class="delete-btn" onclick="removeFromCart(${Number(item.id)})">Remover</button>
    </div>
  `).join('');

  box.innerHTML = `
    ${items}
    <div class="checkout-highlight">
      <div class="checkout-badge">FINALIZAR PEDIDO</div>
      <h3 class="checkout-title">Falta muito pouco para concluir sua compra</h3>
      <div class="checkout-total-box">
        <span>Total do pedido</span>
        <strong>${formatBRL(cartTotal())}</strong>
      </div>
      <div class="checkout-form">
        <div class="checkout-field"><label>Nome</label><input id="customerFirstName" type="text" placeholder="Seu nome"></div>
        <div class="checkout-field"><label>Sobrenome</label><input id="customerLastName" type="text" placeholder="Seu sobrenome"></div>
      </div>
      <button class="checkout-whatsapp-btn" onclick="finishOrder()">
        <span>Fechar pedido no WhatsApp</span>
      </button>
    </div>
  `;
}

// --- Outras Funções do Sistema ---
function changeQty(id, delta) {
  const input = document.getElementById(`qty-${id}`);
  if (!input) return;
  const max = Number(input.max || 999);
  const current = Number(input.value || 1);
  input.value = Math.max(1, Math.min(max, current + delta));
}

function openCartPopup() {
  const popup = document.getElementById('cartPopup');
  if (popup) {
    popup.classList.remove('hidden');
    renderCartPopup();
  }
}

function closeCartPopup() {
  const popup = document.getElementById('cartPopup');
  if (popup) popup.classList.add('hidden');
}

function renderCartPopup() {
  const box = document.getElementById('cartPopupContent');
  if (!box) return;
  if (!state.cart.length) {
    box.innerHTML = '<div class="empty-state">Seu carrinho está vazio.</div>';
    return;
  }
  box.innerHTML = `
    <div class="popup-items">
      ${state.cart.map(item => `
        <div class="cart-card">
          <img src="${escapeAttr(item.image || DEFAULT_IMAGE)}" alt="${escapeAttr(item.name || 'Produto')}">
          <div>
            <strong>${escapeHtml(item.name || 'Produto')}</strong>
            <div class="price">${formatBRL(Number(item.price || 0) * Number(item.qty || 0))}</div>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="checkout-box">
      <div class="summary-total">${formatBRL(cartTotal())}</div>
    </div>
  `;
}

function renderAdmin() {
  const adminList = document.getElementById('adminList');
  if (!adminList) return;
  adminList.innerHTML = state.products.map(product => `
    <div class="admin-item">
      <span>${escapeHtml(product.name)}</span>
      <button class="delete-btn" onclick="copyProductJson(${Number(product.id)})">Copiar JSON</button>
    </div>
  `).join('');
}

function bindEvents() {
  document.getElementById('goShop')?.addEventListener('click', () => setView('shop'));
  document.getElementById('openAdmin')?.addEventListener('click', () => setView('admin'));
  document.getElementById('openCart')?.addEventListener('click', () => setView('cart'));
  document.getElementById('closeCartPopup')?.addEventListener('click', closeCartPopup);
  document.getElementById('goToCheckout')?.addEventListener('click', () => { closeCartPopup(); setView('cart'); });
}

// --- Inicialização ---
window.changeQty = changeQty;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.finishOrder = finishOrder;

bindEvents();
updateCartCount();
setView('shop');
loadProductsFromServer();
