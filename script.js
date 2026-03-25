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
      <p class="checkout-subtitle">
        Preencha seus dados abaixo e envie seu pedido direto pelo WhatsApp.
      </p>

      <div class="checkout-total-box">
        <span>Total do pedido</span>
        <strong>${formatBRL(cartTotal())}</strong>
      </div>

      <div class="checkout-form">
        <div class="checkout-field">
          <label for="customerFirstName">Nome</label>
          <input id="customerFirstName" type="text" placeholder="Seu nome">
        </div>

        <div class="checkout-field">
          <label for="customerLastName">Sobrenome</label>
          <input id="customerLastName" type="text" placeholder="Seu sobrenome">
        </div>
      </div>

      <button class="checkout-whatsapp-btn" onclick="finishOrder()">
        <span class="whatsapp-icon">🟢</span>
        <span>Fechar pedido no WhatsApp</span>
      </button>

      <p class="checkout-note">
        Você será direcionado para o WhatsApp com seu pedido pronto para envio.
      </p>
    </div>
  `;
}

function openCartPopup() {
  const popup = document.getElementById('cartPopup');
  if (!popup) return;
  popup.classList.remove('hidden');
  renderCartPopup();
}

function closeCartPopup() {
  const popup = document.getElementById('cartPopup');
  if (!popup) return;
  popup.classList.add('hidden');
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
          <img src="${escapeAttr(item.image || DEFAULT_IMAGE)}" alt="${escapeAttr(item.name || 'Produto')}" referrerpolicy="no-referrer">
          <div>
            <strong>${escapeHtml(item.name || 'Produto')}</strong>
            <div class="muted">Qtd: ${Number(item.qty)}</div>
            <div class="price">${formatBRL(Number(item.price || 0) * Number(item.qty || 0))}</div>
          </div>
          <button class="delete-btn" onclick="removeFromCart(${Number(item.id)})">Remover</button>
        </div>
      `).join('')}
    </div>

    <div class="checkout-box">
      <p class="muted">Total do pedido</p>
      <div class="summary-total">${formatBRL(cartTotal())}</div>
    </div>
  `;
}

function goToCheckoutScreen() {
  closeCartPopup();
  setView('cart');
  renderCart();
}

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
    console.error('Erro ao atualizar estoque:', err);
    // Prosseguimos mesmo assim para não perder a venda
  }

  let message = `Olá Sabrina Beauty! Meu nome é ${encodeURIComponent(firstName)} ${encodeURIComponent(lastName)}.%0A%0AGostaria de fazer um pedido:%0A%0A`;

  state.cart.forEach(item => {
    const totalItem = Number(item.price || 0) * Number(item.qty || 0);
    message += `• ${encodeURIComponent(item.name)} (${item.qty}x) - ${encodeURIComponent(formatBRL(totalItem))}%0A`;
  });

  message += `%0A*Total: ${encodeURIComponent(formatBRL(cartTotal()))}*`;

  // --- AJUSTE PARA COMPUTADOR ---
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const waUrl = isMobile 
    ? `https://api.whatsapp.com/send?phone=${WHATSAPP_PRIMARY}&text=${message}`
    : `https://web.whatsapp.com/send?phone=${WHATSAPP_PRIMARY}&text=${message}`;

  state.cart = [];
  updateCartCount();
  renderCart();
  renderCartPopup();
  closeCartPopup();
  setView('shop');
  loadProductsFromServer();

  window.open(waUrl, '_blank');
}

function renderAdmin() {
  const adminList = document.getElementById('adminList');
  if (!adminList) return;

  if (!state.products.length) {
    adminList.innerHTML = '<div class="empty-state">Nenhum produto cadastrado.</div>';
    return;
  }

  adminList.innerHTML = `
    <div class="empty-state" style="margin-bottom:16px;">
      Para atualizar o catálogo para todo mundo, edite o arquivo <strong>products.json</strong> no GitHub.
    </div>

    ${state.products.map(product => `
      <div class="admin-item">
        <img src="${escapeAttr(product.image || DEFAULT_IMAGE)}" alt="${escapeAttr(product.name || 'Produto')}" referrerpolicy="no-referrer">

        <div class="admin-fields">
          <input type="text" value="${escapeAttr(product.name || '')}" readonly>
          <textarea readonly>${escapeHtml(product.description || '')}</textarea>

          <div class="admin-inline">
            <input type="number" step="0.01" value="${Number(product.price || 0)}" readonly>
            <input type="number" step="1" value="${Number(product.stock || 0)}" readonly>
          </div>

          <input type="text" value="${escapeAttr(product.category || '')}" readonly>
          <input type="text" value="${escapeAttr(product.image || '')}" readonly>
        </div>

        <div class="admin-actions">
          <button class="delete-btn" onclick="copyProductJson(${Number(product.id)})">Copiar JSON</button>
        </div>
      </div>
    `).join('')}
  `;
}

function copyProductJson(id) {
  const product = state.products.find(p => Number(p.id) === Number(id));
  if (!product) return;

  const json = JSON.stringify(product, null, 2);

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(json)
      .then(() => alert('JSON do produto copiado.'))
      .catch(() => fallbackCopyText(json));
  } else {
    fallbackCopyText(json);
  }
}

function fallbackCopyText(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();

  try {
    document.execCommand('copy');
    alert('JSON do produto copiado.');
  } catch {
    alert('Não foi possível copiar automaticamente.');
  }

  document.body.removeChild(textarea);
}

function addProductFromForm() {
  alert('Para adicionar produtos que todos vejam, inclua o item no arquivo products.json no GitHub.');
}

function clearForm() {
  ['newName', 'newPrice', 'newStock', 'newCategory', 'newDescription', 'newImageUrl'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

async function exportPDF() {
  const jspdf = window.jspdf;
  if (!jspdf) {
    alert('O gerador de PDF ainda está carregando.');
    return;
  }

  const { jsPDF } = jspdf;
  const doc = new jsPDF();

  doc.setFillColor(10, 10, 10);
  doc.rect(0, 0, 210, 55, 'F');

  doc.setTextColor(212, 175, 55);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text('SABRINA BEAUTY', 105, 25, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(210, 210, 210);
  doc.text('CATÁLOGO DE PRODUTOS', 105, 34, { align: 'center' });

  let y = 70;

  for (const product of state.products) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(20, 20, 20);
    doc.setFont('helvetica', 'bold');
    doc.text(String(product.name || 'Produto'), 14, y);
    y += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 90, 90);
    doc.text(`Categoria: ${String(product.category || 'Geral')}`, 14, y);
    y += 6;

    doc.text(`Preço: ${formatBRL(product.price)}`, 14, y);
    y += 6;

    doc.text(`Estoque: ${Number(product.stock || 0)}`, 14, y);
    y += 6;

    const descLines = doc.splitTextToSize(String(product.description || 'Sem descrição.'), 180);
    doc.text(descLines, 14, y);
    y += Math.max(12, descLines.length * 5 + 6);

    doc.setDrawColor(220, 220, 220);
    doc.line(14, y, 196, y);
    y += 10;
  }

  doc.save('catalogo-sabrina-beauty.pdf');
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

function bindEvents() {
  document.getElementById('goShop')?.addEventListener('click', () => setView('shop'));
  document.getElementById('openAdmin')?.addEventListener('click', () => setView('admin'));
  document.getElementById('openCart')?.addEventListener('click', () => setView('cart'));
  document.getElementById('backToShop')?.addEventListener('click', () => setView('shop'));

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => setView(btn.dataset.view));
  });

  document.getElementById('addProductBtn')?.addEventListener('click', addProductFromForm);
  document.getElementById('exportPdfBtn')?.addEventListener('click', exportPDF);

  document.getElementById('closeCartPopup')?.addEventListener('click', closeCartPopup);
  document.getElementById('goToCheckout')?.addEventListener('click', goToCheckoutScreen);
}

window.changeQty = changeQty;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.finishOrder = finishOrder;
window.copyProductJson = copyProductJson;

bindEvents();
renderCart();
renderCartPopup();
updateCartCount();
setView('shop');
loadProductsFromServer();
