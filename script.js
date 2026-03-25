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
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    state.products = Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('Erro ao carregar produtos:', e);
    state.products = [];
  }

  renderProducts();
  renderAdmin();
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
  document.getElementById(`view-${view}`)?.classList.add('active');

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  if (view === 'cart') renderCart();
  if (view === 'admin') renderAdmin();
}

function updateCartCount() {
  const total = state.cart.reduce((acc, item) => acc + item.qty, 0);
  document.getElementById('cartCount').textContent = total;
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
      <img src="${product.image || DEFAULT_IMAGE}">
      <h3>${product.name}</h3>
      <p>${product.description}</p>
      <div>${formatBRL(product.price)}</div>
      <button onclick="addToCart(${product.id})">Adicionar</button>
    </article>
  `).join('');
}

function addToCart(id) {
  const product = state.products.find(p => p.id === id);
  if (!product) return;

  const existing = state.cart.find(i => i.id === id);

  if (existing) {
    existing.qty++;
  } else {
    state.cart.push({ ...product, qty: 1 });
  }

  updateCartCount();
  renderCart();
  openCartPopup();
}

function removeFromCart(id) {
  state.cart = state.cart.filter(item => item.id !== id);
  updateCartCount();
  renderCart();
}

function cartTotal() {
  return state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function renderCart() {
  const box = document.getElementById('cartContent');
  if (!box) return;

  if (!state.cart.length) {
    box.innerHTML = '<div class="empty-state">Carrinho vazio</div>';
    return;
  }

  box.innerHTML = `
    ${state.cart.map(item => `
      <div>
        ${item.name} (${item.qty}) - ${formatBRL(item.price * item.qty)}
        <button onclick="removeFromCart(${item.id})">Remover</button>
      </div>
    `).join('')}

    <h3>Total: ${formatBRL(cartTotal())}</h3>

    <input id="customerFirstName" placeholder="Nome">
    <input id="customerLastName" placeholder="Sobrenome">

    <button onclick="finishOrder()">Finalizar no WhatsApp</button>
  `;
}

function openCartPopup() {
  document.getElementById('cartPopup')?.classList.remove('hidden');
}

function closeCartPopup() {
  document.getElementById('cartPopup')?.classList.add('hidden');
}

/* ✅ FUNÇÃO UNIVERSAL WHATSAPP */
function openWhatsApp(message) {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const url = isMobile
    ? `https://wa.me/${WHATSAPP_PRIMARY}?text=${message}`
    : `https://web.whatsapp.com/send?phone=${WHATSAPP_PRIMARY}&text=${message}`;

  window.open(url, '_blank');
}

async function finishOrder() {
  const firstName = document.getElementById('customerFirstName')?.value.trim();
  const lastName = document.getElementById('customerLastName')?.value.trim();

  if (!firstName || !lastName) {
    alert('Preencha nome e sobrenome');
    return;
  }

  if (!state.cart.length) {
    alert('Carrinho vazio');
    return;
  }

  /* 🔥 Atualiza estoque */
  try {
    await fetch('/api/update-stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: state.cart })
    });
  } catch {
    alert('Erro ao atualizar estoque');
  }

  /* 🧾 Monta mensagem */
  let message = `Olá! Meu nome é ${encodeURIComponent(firstName)} ${encodeURIComponent(lastName)}.%0A%0A Pedido:%0A`;

  state.cart.forEach(item => {
    message += `• ${encodeURIComponent(item.name)} (${item.qty}x)%0A`;
  });

  message += `%0ATotal: ${encodeURIComponent(formatBRL(cartTotal()))}`;

  /* 🔄 Reset */
  state.cart = [];
  updateCartCount();
  renderCart();
  closeCartPopup();
  setView('shop');
  loadProductsFromServer();

  /* 🚀 Abre WhatsApp (PC + celular) */
  openWhatsApp(message);
}

function renderAdmin() {
  const adminList = document.getElementById('adminList');
  if (!adminList) return;

  adminList.innerHTML = state.products.map(p => `
    <div>${p.name} - ${formatBRL(p.price)}</div>
  `).join('');
}

/* INIT */
document.getElementById('openCart')?.addEventListener('click', () => setView('cart'));

updateCartCount();
setView('shop');
loadProductsFromServer();

/* GLOBAL */
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.finishOrder = finishOrder;
