const STORAGE_KEY = 'sb_products_static_v1';
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&auto=format&fit=crop';
const WHATSAPP_PRIMARY = '5541997282177';

const state = {
  view: 'shop',
  products: [],
  cart: []
};

async function loadProductsFromServer() {
  try {
    const response = await fetch('products.json');
    const data = await response.json();
    state.products = data;
    renderProducts();
    renderAdmin();
  } catch (e) {
    console.error('Erro ao carregar produtos:', e);
  }
}
  return [
    { id: 1, name: 'Pigmento Labial Rose', price: 150, stock: 10, category: 'Micropigmentação', image: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=800&auto=format&fit=crop', description: 'Pigmento de alta fixação e brilho natural para lábios perfeitos.' },
    { id: 2, name: 'Kit Cílios Volume Russo', price: 89.9, stock: 25, category: 'Cílios', image: 'https://images.unsplash.com/photo-1583001838478-220a0614f24c?w=800&auto=format&fit=crop', description: 'Fios leves e macios para um olhar marcante e sofisticado.' },
    { id: 3, name: 'Dermógrafo Profissional', price: 1200, stock: 5, category: 'Aparelhos', image: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=800&auto=format&fit=crop', description: 'Equipamento de precisão para micropigmentação com baixo ruído.' }
  ];
}

function saveProducts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.products));
}

function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function setView(view) {
  state.view = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${view}`).classList.add('active');
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
  if (!state.products.length) {
    grid.innerHTML = '<div class="empty-state">Nenhum produto cadastrado.</div>';
    return;
  }
  grid.innerHTML = state.products.map(product => `
    <article class="product-card">
      <div class="product-image-wrap">
        <img src="${product.image || DEFAULT_IMAGE}" alt="${escapeHtml(product.name)}" referrerpolicy="no-referrer">
        <span class="product-category">${escapeHtml(product.category || 'Geral')}</span>
      </div>
      <div class="product-body">
        <div>
          <h3>${escapeHtml(product.name)}</h3>
          <p class="product-desc">${escapeHtml(product.description || 'Produto premium disponível para pedido.')}</p>
          <div class="price">${formatBRL(Number(product.price || 0))}</div>
          <div class="stock-line">
            <span class="stock-dot ${product.stock > 0 ? '' : 'off'}"></span>
            <span>${product.stock > 0 ? `${product.stock} disponíveis` : 'Esgotado'}</span>
          </div>
        </div>
        <div class="qty-row">
          <div class="qty-box">
            <button onclick="changeQty(${product.id}, -1)">-</button>
            <input id="qty-${product.id}" type="number" min="1" max="${Math.max(product.stock, 1)}" value="1">
            <button onclick="changeQty(${product.id}, 1)">+</button>
          </div>
          <button class="primary-btn" onclick="addToCart(${product.id})" ${product.stock <= 0 ? 'disabled' : ''}>Adicionar</button>
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
  const product = state.products.find(p => p.id === id);
  const input = document.getElementById(`qty-${id}`);
  const qty = Math.max(1, Number(input?.value || 1));
  if (!product || qty <= 0) return;

  const existing = state.cart.find(item => item.id === id);
  const currentQty = existing ? existing.qty : 0;
  if (currentQty + qty > product.stock) {
    alert(`Tem apenas ${product.stock} unidades disponíveis deste produto.`);
    return;
  }

  if (existing) existing.qty += qty;
  else state.cart.push({ ...product, qty });

  if (input) input.value = 1;
  updateCartCount();
  renderCart();
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
  if (!state.cart.length) {
    box.innerHTML = '<div class="empty-state">Seu carrinho está vazio.</div>';
    return;
  }

  const items = state.cart.map(item => `
    <div class="cart-card">
      <img src="${item.image || DEFAULT_IMAGE}" alt="${escapeHtml(item.name)}" referrerpolicy="no-referrer">
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <div class="muted">Qtd: ${item.qty}</div>
        <div class="price">${formatBRL(item.price * item.qty)}</div>
      </div>
      <button class="delete-btn" onclick="removeFromCart(${item.id})">Remover</button>
    </div>
  `).join('');

  box.innerHTML = `
    ${items}
    <div class="checkout-box">
      <p class="muted">Total do pedido</p>
      <div class="summary-total">${formatBRL(cartTotal())}</div>
      <div class="form-grid" style="margin-top:20px;">
        <label>
          <span>Nome</span>
          <input id="customerFirstName" type="text" placeholder="Seu nome">
        </label>
        <label>
          <span>Sobrenome</span>
          <input id="customerLastName" type="text" placeholder="Seu sobrenome">
        </label>
      </div>
      <button class="whats-btn" style="margin-top:18px;" onclick="finishOrder()">Finalizar no WhatsApp</button>
    </div>
  `;
}

function finishOrder() {
  const firstName = document.getElementById('customerFirstName')?.value.trim();
  const lastName = document.getElementById('customerLastName')?.value.trim();
  if (!firstName || !lastName) {
    alert('Preencha nome e sobrenome para continuar.');
    return;
  }

  const updatedProducts = state.products.map(product => {
    const cartItem = state.cart.find(item => item.id === product.id);
    return cartItem ? { ...product, stock: Math.max(0, product.stock - cartItem.qty) } : product;
  });
  state.products = updatedProducts;
  saveProducts();

  let message = `Olá Sabrina Beauty! Meu nome é ${firstName} ${lastName}.%0A%0AGostaria de fazer um pedido:%0A%0A`;
  state.cart.forEach(item => {
    message += `• ${encodeURIComponent(item.name)} (${item.qty}x) - ${encodeURIComponent(formatBRL(item.price * item.qty))}%0A`;
  });
  message += `%0A*Total: ${encodeURIComponent(formatBRL(cartTotal()))}*`;

  state.cart = [];
  updateCartCount();
  renderProducts();
  renderCart();
  setView('shop');
  window.open(`https://wa.me/${WHATSAPP_PRIMARY}?text=${message}`, '_blank');
}

function renderAdmin() {
  const adminList = document.getElementById('adminList');
  if (!state.products.length) {
    adminList.innerHTML = '<div class="empty-state">Nenhum produto cadastrado.</div>';
    return;
  }

  adminList.innerHTML = state.products.map(product => `
    <div class="admin-item">
      <img src="${product.image || DEFAULT_IMAGE}" alt="${escapeHtml(product.name)}" referrerpolicy="no-referrer">
      <div class="admin-fields">
        <input type="text" value="${escapeAttr(product.name)}" onchange="updateProductField(${product.id}, 'name', this.value)">
        <textarea onchange="updateProductField(${product.id}, 'description', this.value)">${escapeHtml(product.description || '')}</textarea>
        <div class="admin-inline">
          <input type="number" step="0.01" value="${Number(product.price)}" onchange="updateProductField(${product.id}, 'price', this.value)">
          <input type="number" step="1" value="${Number(product.stock)}" onchange="updateProductField(${product.id}, 'stock', this.value)">
        </div>
        <input type="text" value="${escapeAttr(product.category || '')}" onchange="updateProductField(${product.id}, 'category', this.value)">
        <input type="text" value="${escapeAttr(product.image || '')}" placeholder="Cole a URL da imagem" onchange="updateProductField(${product.id}, 'image', this.value)">
      </div>
      <div class="admin-actions">
        <button class="delete-btn" onclick="deleteProduct(${product.id})">Excluir</button>
      </div>
    </div>
  `).join('');
}

function updateProductField(id, field, value) {
  const product = state.products.find(p => p.id === id);
  if (!product) return;

  if (field === 'price') {
    product[field] = Number(value) || 0;
  } else if (field === 'stock') {
    product[field] = Math.max(0, parseInt(value || 0, 10));
  } else if (field === 'image') {
    product[field] = value.trim() || DEFAULT_IMAGE;
  } else {
    product[field] = value;
  }

  saveProducts();
  renderProducts();
}

function deleteProduct(id) {
  if (!confirm('Deseja excluir este produto?')) return;
  state.products = state.products.filter(p => p.id !== id);
  state.cart = state.cart.filter(item => item.id !== id);
  saveProducts();
  updateCartCount();
  renderProducts();
  renderAdmin();
}

function addProductFromForm() {
  const name = document.getElementById('newName').value.trim();
  const price = Number(document.getElementById('newPrice').value || 0);
  const stock = Math.max(0, parseInt(document.getElementById('newStock').value || 0, 10));
  const category = document.getElementById('newCategory').value.trim() || 'Geral';
  const description = document.getElementById('newDescription').value.trim();
  const image = document.getElementById('newImageUrl')?.value.trim() || DEFAULT_IMAGE;

  if (!name || !price) {
    alert('Preencha pelo menos nome e preço.');
    return;
  }

  state.products.unshift({
    id: Date.now(),
    name,
    price,
    stock,
    category,
    description,
    image
  });

  saveProducts();
  clearForm();
  renderProducts();
  renderAdmin();
  alert('Produto cadastrado com sucesso.');
}

function clearForm() {
  ['newName','newPrice','newStock','newCategory','newDescription','newImageUrl'].forEach(id => {
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
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setTextColor(20, 20, 20);
    doc.setFont('helvetica', 'bold');
    doc.text(product.name, 14, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 90, 90);
    doc.text(`Categoria: ${product.category}`, 14, y);
    y += 6;
    doc.text(`Preço: ${formatBRL(product.price)}`, 14, y);
    y += 6;
    doc.text(`Estoque: ${product.stock}`, 14, y);
    y += 6;
    const descLines = doc.splitTextToSize(product.description || 'Sem descrição.', 180);
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
  return escapeHtml(text).replaceAll('"', '&quot;');
}

function bindEvents() {
  document.getElementById('goShop').addEventListener('click', () => setView('shop'));
  document.getElementById('openAdmin').addEventListener('click', () => setView('admin'));
  document.getElementById('openCart').addEventListener('click', () => setView('cart'));
  document.getElementById('backToShop').addEventListener('click', () => setView('shop'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => setView(btn.dataset.view)));
  document.getElementById('addProductBtn').addEventListener('click', addProductFromForm);
  document.getElementById('exportPdfBtn').addEventListener('click', exportPDF);
}

window.changeQty = changeQty;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.finishOrder = finishOrder;
window.updateProductField = updateProductField;
window.deleteProduct = deleteProduct;

bindEvents();
renderProducts();
renderCart();
renderAdmin();
updateCartCount();
setView('shop');
