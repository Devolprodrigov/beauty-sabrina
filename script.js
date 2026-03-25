const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&auto=format&fit=crop';
const WHATSAPP_PRIMARY = '5541997282177';

const state = {
  view: 'shop',
  products: [],
  cart: []
};

async function loadProductsFromServer() {
  try {
    const response = await fetch('products.json?v=' + Date.now());

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

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

function saveProducts() {
  alert('Para atualizar o catálogo para todo mundo, edite o arquivo products.json no GitHub.');
}

function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value || 0));
}

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

function updateCartCount() {
  const total = state.cart.reduce((acc, item) => acc + item.qty, 0);
  const cartCount = document.getElementById('cartCount');
  if (cartCount) cartCount.textContent = total;
}

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

function changeQty(id, delta) {
  const input = document.getElementById(`qty-${id}`);
  if (!input) return;

  const max = Number(input.max || 999);
  const current = Number(input.value || 1);
  input.value = Math.max(1, Math.min(max, current + delta));
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

function renderCart() {
  const box = document.getElementById('cartContent');
  if (!box) return;

  if (!state.cart.length) {
    box.innerHTML = '<div class="empty-state">Seu carrinho está vazio.</div>';
    return;
  }

  const items = state.cart.map(item => `
    <div class="cart-card">
      <img src="${escapeAttr(item.image || DEFAULT_IMAGE)}">
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <div>Qtd: ${item.qty}</div>
        <div>${formatBRL(item.price * item.qty)}</div>
      </div>
      <button onclick="removeFromCart(${item.id})">Remover</button>
    </div>
  `).join('');

  box.innerHTML = items + `
    <input id="customerFirstName" placeholder="Nome">
    <input id="customerLastName" placeholder="Sobrenome">
    <button onclick="finishOrder()">Finalizar no WhatsApp</button>
  `;
}

// 🔥 FUNÇÃO CORRIGIDA FINAL
async function finishOrder() {
  const firstName = document.getElementById('customerFirstName')?.value.trim();
  const lastName = document.getElementById('customerLastName')?.value.trim();

  if (!firstName || !lastName) {
    alert('Preencha nome e sobrenome.');
    return;
  }

  if (!state.cart.length) {
    alert('Carrinho vazio.');
    return;
  }

  let message = `Olá Sabrina Beauty! Meu nome é ${firstName} ${lastName}.\n\nPedido:\n\n`;

  state.cart.forEach(item => {
    message += `• ${item.name} (${item.qty}x) - ${formatBRL(item.price * item.qty)}\n`;
  });

  message += `\nTotal: ${formatBRL(cartTotal())}`;

  const url = `https://wa.me/${WHATSAPP_PRIMARY}?text=${encodeURIComponent(message)}`;

  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);

  if (isMobile) {
    window.location.href = url;
  } else {
    window.open(url, '_blank');
  }

  state.cart = [];
  updateCartCount();
  renderCart();
}

function escapeHtml(text) {
  return String(text).replaceAll('<','&lt;').replaceAll('>','&gt;');
}

function escapeAttr(text) {
  return escapeHtml(text);
}

window.changeQty = changeQty;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.finishOrder = finishOrder;

loadProductsFromServer();
