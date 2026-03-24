<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Catálogo Sabrina Beauty com carrinho, painel de gestão e pedidos por WhatsApp." />
    <title>Sabrina Beauty</title>

    <link rel="manifest" href="manifest.json" />
    <meta name="theme-color" content="#050505" />
    <link rel="apple-touch-icon" href="imagens/icon-192.png" />

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet" />

    <link rel="stylesheet" href="styles.css" />

    <script defer src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  </head>

  <body>
    <div class="bg-decoration bg-1"></div>
    <div class="bg-decoration bg-2"></div>
    <div class="bg-decoration bg-3"></div>

    <header class="topbar">
      <button class="brand" id="goShop" aria-label="Ir para a loja">
        <div class="brand-badge">SB</div>
        <div>
          <h1>SABRINA BEAUTY</h1>
          <p>Revendedor Oficial</p>
        </div>
      </button>

      <div class="header-actions">
        <button class="icon-btn cart-btn" id="openCart" aria-label="Abrir carrinho">
          🛍️
          <span class="badge" id="cartCount">0</span>
        </button>
      </div>
    </header>

    <main class="container">
      <section class="view active" id="view-shop">
        <div class="section-title">
          <h2>Coleção Exclusiva</h2>
          <div class="divider"></div>
          <p>Escolha seus produtos, acompanhe o carrinho e finalize pelo WhatsApp.</p>
        </div>
        <div id="productsGrid" class="products-grid"></div>
      </section>

      <section class="view" id="view-cart">
        <button class="link-back" id="backToShop">← Continuar comprando</button>
        <div id="cartContent"></div>
      </section>

      <section class="view" id="view-admin">
        <div class="admin-header">
          <div>
            <h2>Painel de Gestão</h2>
            <p>Cadastre, visualize e exporte seus produtos.</p>
          </div>
          <button class="secondary-btn" id="exportPdfBtn">Exportar PDF</button>
        </div>

        <section class="card admin-form">
          <h3>Novo produto</h3>
          <div class="form-grid">
            <label><span>Nome</span><input id="newName" type="text" /></label>
            <label><span>Preço (R$)</span><input id="newPrice" type="number" step="0.01" /></label>
            <label><span>Categoria</span><input id="newCategory" type="text" /></label>
            <label><span>Estoque</span><input id="newStock" type="number" /></label>
            <label class="full"><span>Descrição</span><textarea id="newDescription"></textarea></label>
            <label class="full"><span>Imagem (URL)</span><input id="newImageUrl" type="text" /></label>
          </div>
          <button class="primary-btn" id="addProductBtn">Cadastrar produto</button>
        </section>

        <section>
          <h3 class="subheading">Inventário atual</h3>
          <div id="adminList" class="admin-list"></div>
        </section>
      </section>
    </main>

    <div id="cartPopup" class="cart-popup hidden">
      <div class="cart-popup-box">
        <div class="cart-popup-header">
          <h3>Seu carrinho</h3>
          <button id="closeCartPopup" class="icon-btn">✕</button>
        </div>
        <div id="cartPopupContent" class="cart-popup-content"></div>
        <div class="cart-popup-footer">
          <button id="goToCheckout" class="primary-btn">Fechar pedido</button>
        </div>
      </div>
    </div>

    <nav class="bottom-nav">
      <button data-view="shop" class="nav-btn active">Loja</button>
      <button data-view="cart" class="nav-btn">Pedido</button>
      <button data-view="admin" class="nav-btn">Gestão</button>
    </nav>

    <script>
      // 1. Registro do Service Worker (PWA)
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/service-worker.js')
            .catch(err => console.error('Erro ao registrar service worker:', err));
        });
      }

      const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&auto=format&fit=crop';
      const WHATSAPP_PRIMARY = '5541997282177';

      const state = { view: 'shop', products: [], cart: [] };

      // Funções de Escape para segurança
      function escapeHtml(text) {
        return String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
      }
      function escapeAttr(text) { return escapeHtml(text); }

      // Carregamento de dados
      async function loadProductsFromServer() {
        try {
          const response = await fetch('products.json?v=' + Date.now());
          const data = await response.json();
          state.products = Array.isArray(data) ? data : [];
          renderProducts();
          renderAdmin();
        } catch (e) {
          console.error('Erro ao carregar produtos:', e);
          renderProducts();
          renderAdmin();
        }
      }

      function formatBRL(v) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));
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
        grid.innerHTML = state.products.map(p => `
          <article class="product-card">
            <div class="product-image-wrap">
              <img src="${escapeAttr(p.image || DEFAULT_IMAGE)}" alt="${escapeAttr(p.name)}" referrerpolicy="no-referrer">
              <span class="product-category">${escapeHtml(p.category || 'Geral')}</span>
            </div>
            <div class="product-body">
              <h3>${escapeHtml(p.name)}</h3>
              <p class="product-desc">${escapeHtml(p.description || '')}</p>
              <div class="price">${formatBRL(p.price)}</div>
              <div class="stock-line">
                <span class="stock-dot ${Number(p.stock) > 0 ? '' : 'off'}"></span>
                <span>${Number(p.stock) > 0 ? `${Number(p.stock)} disponíveis` : 'Esgotado'}</span>
              </div>
              <div class="qty-row">
                <div class="qty-box">
                  <button onclick="changeQty(${p.id}, -1)">-</button>
                  <input id="qty-${p.id}" type="number" value="1" min="1" max="${p.stock}">
                  <button onclick="changeQty(${p.id}, 1)">+</button>
                </div>
                <button class="primary-btn" onclick="addToCart(${p.id})" ${Number(p.stock) <= 0 ? 'disabled' : ''}>Adicionar</button>
              </div>
            </div>
          </article>`).join('');
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
        if (!product) return;

        const existing = state.cart.find(item => Number(item.id) === Number(id));
        const currentQty = existing ? existing.qty : 0;

        if (currentQty + qty > Number(product.stock)) {
          alert(`Tem apenas ${product.stock} unidades disponíveis.`);
          return;
        }

        if (existing) { existing.qty += qty; } 
        else { state.cart.push({ ...product, qty }); }

        if (input) input.value = 1;
        updateCartCount();
        renderCartPopup();
        openCartPopup();
      }

      function openCartPopup() {
        document.getElementById('cartPopup')?.classList.remove('hidden');
        renderCartPopup();
      }

      function closeCartPopup() {
        document.getElementById('cartPopup')?.classList.add('hidden');
      }

      function renderCartPopup() {
        const box = document.getElementById('cartPopupContent');
        if (!box) return;
        if (!state.cart.length) {
          box.innerHTML = '<div class="empty-state">Seu carrinho está vazio.</div>';
          return;
        }
        box.innerHTML = `<div class="popup-items">` + state.cart.map(item => `
          <div class="cart-card">
            <img src="${escapeAttr(item.image || DEFAULT_IMAGE)}" alt="${escapeAttr(item.name)}">
            <div>
              <strong>${escapeHtml(item.name)}</strong>
              <div class="muted">Qtd: ${item.qty}</div>
              <div class="price">${formatBRL(item.price * item.qty)}</div>
            </div>
          </div>`).join('') + `</div><div class="checkout-box"><strong>Total: ${formatBRL(state.cart.reduce((s, i) => s + (i.price * i.qty), 0))}</strong></div>`;
      }

      function renderCart() {
        const box = document.getElementById('cartContent');
        if (!box) return;
        if (!state.cart.length) {
          box.innerHTML = '<div class="empty-state">Seu carrinho está vazio.</div>';
          return;
        }
        const total = state.cart.reduce((s, i) => s + (i.price * i.qty), 0);
        box.innerHTML = state.cart.map(item => `
          <div class="cart-card">
            <img src="${escapeAttr(item.image || DEFAULT_IMAGE)}">
            <div><strong>${escapeHtml(item.name)}</strong><br>Qtd: ${item.qty}</div>
            <button class="delete-btn" onclick="removeFromCart(${item.id})">Remover</button>
          </div>`).join('') + `
          <div class="checkout-highlight">
            <h3>Total: ${formatBRL(total)}</h3>
            <div class="checkout-form">
              <label>Nome <input id="customerFirstName" type="text" placeholder="Seu nome"></label>
              <label>Sobrenome <input id="customerLastName" type="text" placeholder="Seu sobrenome"></label>
            </div>
            <button class="checkout-whatsapp-btn" onclick="finishOrder()">Fechar pedido no WhatsApp</button>
          </div>`;
      }

      function removeFromCart(id) {
        state.cart = state.cart.filter(i => Number(i.id) !== Number(id));
        updateCartCount();
        renderCart();
        renderCartPopup();
      }

      async function finishOrder() {
        const nome = document.getElementById('customerFirstName')?.value.trim();
        const sobrenome = document.getElementById('customerLastName')?.value.trim();
        if (!nome || !sobrenome) return alert("Preencha nome e sobrenome.");

        let message = `Olá! Pedido de ${nome} ${sobrenome}:%0A%0A`;
        state.cart.forEach(i => message += `• ${i.name} (${i.qty}x) - ${formatBRL(i.price * i.qty)}%0A`);
        message += `%0A*Total: ${formatBRL(state.cart.reduce((s, i) => s + (i.price * i.qty), 0))}*`;

        window.open(`https://wa.me/${WHATSAPP_PRIMARY}?text=${message}`, '_blank');
      }

      function renderAdmin() {
        const adminList = document.getElementById('adminList');
        if (!adminList) return;
        adminList.innerHTML = state.products.map(p => `
          <div class="admin-item">
            <span>${escapeHtml(p.name)} (Estoque: ${p.stock})</span>
            <button class="delete-btn" onclick="copyProductJson(${p.id})">Copiar JSON</button>
          </div>`).join('');
      }

      function copyProductJson(id) {
        const p = state.products.find(prod => prod.id == id);
        navigator.clipboard.writeText(JSON.stringify(p, null, 2)).then(() => alert('JSON Copiado!'));
      }

      async function exportPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.text("SABRINA BEAUTY - CATÁLOGO", 10, 10);
        let y = 20;
        state.products.forEach(p => {
          doc.text(`${p.name} - ${formatBRL(p.price)}`, 10, y);
          y += 10;
        });
        doc.save('catalogo.pdf');
      }

      function bindEvents() {
        document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => setView(btn.dataset.view)));
        document.getElementById('goShop').onclick = () => setView('shop');
        document.getElementById('openCart').onclick = () => setView('cart');
        document.getElementById('backToShop').onclick = () => setView('shop');
        document.getElementById('closeCartPopup').onclick = closeCartPopup;
        document.getElementById('goToCheckout').onclick = () => { setView('cart'); closeCartPopup(); };
        document.getElementById('exportPdfBtn').onclick = exportPDF;
      }

      window.changeQty = changeQty;
      window.addToCart = addToCart;
      window.removeFromCart = removeFromCart;
      window.finishOrder = finishOrder;
      window.copyProductJson = copyProductJson;

      bindEvents();
      loadProductsFromServer();
    </script>
  </body>
</html>
