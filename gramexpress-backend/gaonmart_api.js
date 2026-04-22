// ============================================================
// GaonMart API Integration Layer
// Add this <script> tag BEFORE the closing </body> tag in
// gaonmart_v2.html, right before the existing <script> block.
//
// <script src="gaonmart_api.js"></script>
//
// This file:
// 1. Patches saveDB / loadDB to hit the real backend
// 2. Patches handleLogin / handleRegister / handleGoogleSignIn
// 3. Patches placeOrder / updateOrderStatus / approveVendor etc.
// 4. Falls back to localStorage if backend is unreachable (offline mode)
// ============================================================

const API_BASE = 'http://localhost:3000/api'; // Change to your deployed URL

let _authToken = localStorage.getItem('gm_token') || null;

// ── Low-level fetch helper ────────────────────────────────────
async function apiFetch(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (_authToken) headers['Authorization'] = 'Bearer ' + _authToken;
  try {
    const res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    if (!res.ok) throw json;
    return json;
  } catch (err) {
    console.warn('API error:', err);
    throw err;
  }
}

const api = {
  get:    (path)        => apiFetch('GET',    path),
  post:   (path, body)  => apiFetch('POST',   path, body),
  put:    (path, body)  => apiFetch('PUT',    path, body),
  patch:  (path, body)  => apiFetch('PATCH',  path, body),
  delete: (path)        => apiFetch('DELETE', path),
};

// ── Load full DB snapshot from server ────────────────────────
async function loadDBFromServer() {
  try {
    const snapshot = await api.get('/snapshot');
    // Merge server snapshot into local db variable
    Object.assign(db, snapshot);
    console.log('✅ DB loaded from server');
    return true;
  } catch (e) {
    console.warn('⚠️ Could not load DB from server, using localStorage');
    return false;
  }
}

// ── Override: handleLogin ─────────────────────────────────────
window.handleLogin = async function() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) { showAuthError('login-error', '⚠️ Please fill all fields'); return; }

  try {
    const data = await api.post('/auth/login', { email, password });
    _authToken = data.token;
    localStorage.setItem('gm_token', _authToken);
    currentUser = data.user;
    await loadDBFromServer();
    enterApp();
  } catch (err) {
    if (err.error === 'blocked') {
      currentUser = err.user; showScreen('blocked-screen'); return;
    }
    if (err.error === 'pending') {
      currentUser = err.user;
      document.getElementById('pending-email-display').textContent = 'Account: ' + err.user.email;
      showScreen('pending-screen'); return;
    }
    showAuthError('login-error', err.error || '❌ Login failed');
  }
};

// ── Override: handleRegister ──────────────────────────────────
window.handleRegister = async function() {
  const name     = document.getElementById('reg-name').value.trim();
  const email    = document.getElementById('reg-email').value.trim().toLowerCase();
  const phone    = document.getElementById('reg-phone').value.trim();
  const password = document.getElementById('reg-password').value;
  const role     = document.getElementById('reg-role').value;
  const address  = document.getElementById('reg-address')?.value.trim();
  const storeName= document.getElementById('reg-store')?.value.trim();
  const location = document.getElementById('reg-location')?.value.trim();
  const category = document.getElementById('reg-vcat')?.value;

  if (!name || !email || !phone || !password || !role) {
    showAuthError('reg-error', '⚠️ Please fill all fields'); return;
  }
  if (password.length < 6) {
    showAuthError('reg-error', '⚠️ Password min 6 characters'); return;
  }

  try {
    const data = await api.post('/auth/register', { name, email, phone, password, role, address, storeName, location, category });

    if (data.status === 'pending') {
      currentUser = data.user;
      document.getElementById('pending-email-display').textContent = 'Account: ' + data.user.email;
      showScreen('pending-screen'); return;
    }

    _authToken = data.token;
    localStorage.setItem('gm_token', _authToken);
    currentUser = data.user;
    await loadDBFromServer();
    enterApp();
  } catch (err) {
    showAuthError('reg-error', err.error || '❌ Registration failed');
  }
};

// ── Override: handleGoogleSignIn ──────────────────────────────
window.handleGoogleSignIn = async function() {
  // In production: use Firebase Auth then call this with real user data
  const mockName  = 'Google User';
  const mockEmail = 'googleuser' + Date.now() + '@gmail.com';
  try {
    const data = await api.post('/auth/google', { name: mockName, email: mockEmail });
    _authToken = data.token;
    localStorage.setItem('gm_token', _authToken);
    currentUser = data.user;
    await loadDBFromServer();
    showToast('🎉 Logged in with Google!');
    enterApp();
  } catch {
    showToast('❌ Google sign-in failed');
  }
};

// ── Override: doLogout ────────────────────────────────────────
const _origLogout = window.doLogout;
window.doLogout = function() {
  _authToken = null;
  localStorage.removeItem('gm_token');
  if (_origLogout) _origLogout();
};

// ── Override: placeOrder ──────────────────────────────────────
window.placeOrder = async function() {
  if (!cartItems.length) return;
  const address = document.getElementById('delivery-address').value.trim();
  if (!address) { showToast('⚠️ Please enter delivery address'); return; }

  const isExpress   = document.querySelector('input[name="delivery-type"]:checked')?.value === 'express';
  const couponCode  = appliedCoupon?.code || null;

  const items = cartItems.map(i => ({
    id: i.id, name: i.name, qty: i.qty, price: i.price,
    emoji: i.emoji, vendorId: i.vendorId
  }));

  try {
    const data = await api.post('/orders', {
      items, address,
      deliveryType: isExpress ? 'express' : 'standard',
      couponCode
    });

    // Reload db from server so everything is in sync
    await loadDBFromServer();
    closeModal('cart-modal');
    cartItems    = [];
    appliedCoupon = null;
    updateCartUI();
    filterProducts();

    // Show billing receipt for first order
    const mainOrder = data.orders[0];
    const s = getSettings();
    document.getElementById('billing-content').innerHTML = `
      <div style="text-align:center;margin-bottom:20px;">
        <div style="font-size:52px;margin-bottom:8px;">✅</div>
        <h3 style="font-family:Syne,sans-serif;font-size:20px;font-weight:700;color:var(--green);">Order Placed Successfully!</h3>
        <p style="font-size:13px;color:var(--text2);margin-top:4px;">Estimated delivery in 30-45 mins</p>
      </div>
      ${data.orders.map(o => `
        <div style="background:var(--bg);border-radius:12px;padding:16px;margin-bottom:12px;">
          <div style="font-weight:700;font-size:14px;margin-bottom:10px;">📋 Order #${o.id} — ${o.vendorName}</div>
          ${o.items.map(i => `<div class="billing-row"><span>${i.emoji} ${i.name} ×${i.qty}</span><span>₹${i.price * i.qty}</span></div>`).join('')}
          <div class="billing-row" style="margin-top:8px;"><span>Subtotal</span><span>₹${o.subtotal}</span></div>
          <div class="billing-row"><span>Delivery</span><span>${o.delivery === 0 ? 'FREE' : '₹' + o.delivery}</span></div>
          ${o.discount > 0 ? `<div class="billing-row discount-row"><span>Coupon (${o.coupon})</span><span>−₹${o.discount}</span></div>` : ''}
          <div class="billing-row" style="border-top:2px solid var(--border);margin-top:8px;padding-top:8px;font-size:16px;font-weight:800;"><span>Total</span><span style="color:var(--green);">₹${o.total}</span></div>
        </div>
      `).join('')}
      <div style="background:var(--green-light);border-radius:12px;padding:12px 16px;font-size:13px;color:var(--green);">
        📍 Delivering to: ${address}
      </div>
      <button class="btn-primary" onclick="closeModal('billing-modal')" style="width:100%;margin-top:16px;">Close ✓</button>
    `;
    openModal('billing-modal');
  } catch (err) {
    showToast('❌ ' + (err.error || 'Order failed'));
  }
};

// ── Override: updateOrderStatus (vendor) ─────────────────────
window.updateOrderStatus = async function(orderId, status) {
  try {
    await api.patch('/orders/' + orderId + '/status', { status });
    const o = db.orders.find(o => o.id === orderId);
    if (o) o.status = status;
    showToast('✅ Order status updated');
    renderVendorOrders();
  } catch { showToast('❌ Update failed'); }
};

// ── Override: addProduct (vendor) ────────────────────────────
window.addProduct = async function() {
  const name       = document.getElementById('p-name').value.trim();
  const price      = parseFloat(document.getElementById('p-price').value);
  const mrp        = parseFloat(document.getElementById('p-mrp').value) || price;
  const unit       = document.getElementById('p-unit').value.trim();
  const emoji      = document.getElementById('p-emoji').value.trim() || '📦';
  const desc       = document.getElementById('p-desc').value.trim();
  const brand      = document.getElementById('p-brand').value.trim();
  const stock      = parseInt(document.getElementById('p-stock').value) || undefined;
  const highlights = document.getElementById('p-highlights').value.trim();
  const category   = document.getElementById('p-category').value;
  const subcategory= document.getElementById('p-subcategory').value;

  if (!name || !price || !category) { showToast('⚠️ Fill name, price and category'); return; }
  if (price <= 0) { showToast('⚠️ Price must be > 0'); return; }

  try {
    const newProduct = await api.post('/products', {
      name, price, mrp, unit, emoji, desc, brand, stock, highlights,
      category, subcategory,
      photos: productPhotos.filter(Boolean)
    });
    db.products.unshift(newProduct);
    closeModal('add-product-modal');
    renderVendorHome();
    showToast('✅ Product added!');
  } catch (err) {
    showToast('❌ ' + (err.error || 'Failed to add product'));
  }
};

// ── Override: vendorDeleteProduct ────────────────────────────
window.vendorDeleteProduct = async function(id) {
  if (!confirm('Delete this product?')) return;
  try {
    await api.delete('/products/' + id);
    db.products = db.products.filter(p => p.id !== id);
    renderVendorHome();
    showToast('🗑️ Product deleted');
  } catch { showToast('❌ Delete failed'); }
};

// ── Override: adminDeleteProduct ─────────────────────────────
window.adminDeleteProduct = async function(id) {
  if (!confirm('Delete?')) return;
  try {
    await api.delete('/products/' + id);
    db.products = db.products.filter(p => p.id !== id);
    renderAdminProducts();
    showToast('🗑️ Product deleted');
  } catch { showToast('❌ Delete failed'); }
};

// ── Override: approveVendor ───────────────────────────────────
window.approveVendor = async function(id) {
  try {
    await api.patch('/users/' + id + '/vendor-status', { vendorStatus: 'approved' });
    const v = db.users.find(u => u.id === id);
    if (v) v.vendorStatus = 'approved';
    renderVendorApprovals();
    showToast('✅ Vendor approved!');
  } catch { showToast('❌ Approve failed'); }
};

// ── Override: rejectVendor ────────────────────────────────────
window.rejectVendor = async function(id) {
  if (!confirm('Reject this vendor?')) return;
  try {
    await api.patch('/users/' + id + '/vendor-status', { vendorStatus: 'rejected' });
    db.users = db.users.filter(u => u.id !== id);
    renderVendorApprovals();
    showToast('❌ Vendor rejected');
  } catch { showToast('❌ Reject failed'); }
};

// ── Override: blockUser / unblockUser (admin) ─────────────────
window.blockUser = async function(id) {
  try {
    await api.patch('/users/' + id + '/status', { status: 'blocked' });
    const u = db.users.find(u => u.id === id);
    if (u) u.status = 'blocked';
    renderAdminUsers();
    showToast('🚫 User blocked');
  } catch { showToast('❌ Failed'); }
};

window.unblockUser = async function(id) {
  try {
    await api.patch('/users/' + id + '/status', { status: 'active' });
    const u = db.users.find(u => u.id === id);
    if (u) u.status = 'active';
    renderAdminUsers();
    showToast('✅ User unblocked');
  } catch { showToast('❌ Failed'); }
};

// ── Override: saveDeliverySettings (admin) ───────────────────
window.saveDeliverySettings = async function() {
  const base    = parseFloat(document.getElementById('base-delivery-charge').value) || 20;
  const free    = parseFloat(document.getElementById('free-delivery-above').value)  || 200;
  const express = parseFloat(document.getElementById('express-delivery-charge').value) || 40;
  try {
    await api.put('/settings', { baseDeliveryCharge: base, freeDeliveryAbove: free, expressDeliveryCharge: express });
    const s = getSettings();
    s.baseDeliveryCharge    = base;
    s.freeDeliveryAbove     = free;
    s.expressDeliveryCharge = express;
    db.settings = s;
    showToast('💾 Delivery settings saved!');
  } catch { showToast('❌ Save failed'); }
};

// ── Override: addCoupon (admin) ───────────────────────────────
window.addCoupon = async function() {
  const code     = document.getElementById('new-coupon-code').value.trim().toUpperCase();
  const discount = parseInt(document.getElementById('new-coupon-discount').value);
  const minOrder = parseInt(document.getElementById('new-coupon-min').value) || 0;
  if (!code || !discount) { showToast('⚠️ Fill coupon code and discount'); return; }
  try {
    const result = await api.post('/settings/coupons', { code, discount, minOrder });
    db.settings.coupons = result.coupons;
    renderCouponsList();
    showToast('✅ Coupon added!');
    document.getElementById('new-coupon-code').value    = '';
    document.getElementById('new-coupon-discount').value = '';
    document.getElementById('new-coupon-min').value     = '';
  } catch (err) { showToast('❌ ' + (err.error || 'Failed')); }
};

// ── Override: deleteCoupon (admin) ───────────────────────────
window.deleteCoupon = async function(idx) {
  const s    = getSettings();
  const code = s.coupons[idx]?.code;
  if (!code) return;
  try {
    const result = await api.delete('/settings/coupons/' + code);
    db.settings.coupons = result.coupons;
    renderCouponsList();
    showToast('🗑️ Coupon deleted');
  } catch { showToast('❌ Delete failed'); }
};

// ── Override: submitFeedback (customer) ──────────────────────
window.submitFeedback = async function() {
  if (!currentFeedbackStar) { showToast('⚠️ Please select a rating'); return; }
  const text      = document.getElementById('feedback-text')?.value.trim() || '';
  const vendorId  = document.getElementById('feedback-vendor-select')?.value || '';
  const vendorName= document.getElementById('feedback-vendor-select')?.selectedOptions[0]?.text || '';

  try {
    const fb = await api.post('/feedback', { vendorId, vendorName, rating: currentFeedbackStar, text });
    db.feedback.unshift(fb);
    currentFeedbackStar = 0;
    if (document.getElementById('feedback-text')) document.getElementById('feedback-text').value = '';
    renderFeedbackPage();
    showToast('⭐ Feedback submitted!');
  } catch { showToast('❌ Feedback failed'); }
};

// ── Auto-login on page load if token exists ───────────────────
(async function autoLogin() {
  const saved = localStorage.getItem('gm_token');
  if (!saved) return;
  _authToken = saved;
  try {
    const data = await api.get('/auth/me');
    currentUser = data.user;
    await loadDBFromServer();
    enterApp();
  } catch {
    // Token expired or invalid
    _authToken = null;
    localStorage.removeItem('gm_token');
  }
})();

console.log('🌿 GaonMart API layer loaded. Backend:', API_BASE);
