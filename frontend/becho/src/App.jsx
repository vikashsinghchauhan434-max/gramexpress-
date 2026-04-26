import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css'

// ── Constants ──────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || '';
const CATEGORIES = {
  Vegetables: { icon: '🥬', subcategories: ['Leafy Greens','Root Vegetables','Tomatoes & Peppers','Onion & Garlic','Gourds','Beans & Peas','Exotic Vegetables'] },
  Fruits:     { icon: '🍎', subcategories: ['Citrus Fruits','Tropical Fruits','Berries','Apples & Pears','Melons','Dry Fruits','Seasonal Fruits'] },
  Grains:     { icon: '🌾', subcategories: ['Rice','Wheat & Flour','Pulses & Lentils','Millets','Cereals','Oats & Muesli'] },
  Dairy:      { icon: '🥛', subcategories: ['Milk','Curd & Yogurt','Paneer & Cheese','Butter & Ghee','Cream','Milk Products'] },
  Snacks:     { icon: '🍿', subcategories: ['Chips & Namkeen','Biscuits & Cookies','Chocolates','Sweets','Instant Noodles','Breakfast Items'] },
  Electronics:{ icon: '📱', subcategories: ['Mobile Accessories','Earphones','Chargers & Cables','Power Banks','LED Lights','Batteries'] },
  Clothing:   { icon: '👕', subcategories: ["Men's Wear","Women's Wear","Kids Wear","Ethnic Wear","Accessories","Footwear"] },
  Home:       { icon: '🏠', subcategories: ['Kitchen Items','Cleaning Supplies','Storage','Decor','Tools','Gardening'] },
};
const STATUS_MAP = {
  processing:       { label: '⏳ Processing',       cls: 'badge-orange' },
  out_for_delivery: { label: '🚴 Out for Delivery',  cls: 'badge-blue'   },
  delivered:        { label: '✅ Delivered',          cls: 'badge-green'  },
  cancelled:        { label: '❌ Cancelled',          cls: 'badge-red'    },
};

// ── API helper ─────────────────────────────────────────────────────────
async function apiFetch(path, opts = {}, token) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(API + path, { ...opts, headers });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, message: data.error || 'Error' };
  return data;
}

// ── Toast ──────────────────────────────────────────────────────────────
function Toast({ msg }) {
  return <div className={`toast${msg ? ' show' : ''}`}>{msg}</div>;
}

// ── Modal ──────────────────────────────────────────────────────────────
function Modal({ open, onClose, children, title, style }) {
  return (
    <div className={`modal-overlay${open ? ' open' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={style}>
        {title && (
          <div className="modal-title">
            <span>{title}</span>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  AUTH SCREEN
// ══════════════════════════════════════════════════════════════════════
function AuthScreen({ onLogin, onPending, onBlocked }) {
  const [tab, setTab] = useState('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regRole, setRegRole] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regStore, setRegStore] = useState('');
  const [regLocation, setRegLocation] = useState('');
  const [regVcat, setRegVcat] = useState('Vegetables & Fruits');
  const [regErr, setRegErr] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [fpEmail, setFpEmail] = useState('');
  const [fpNew, setFpNew] = useState('');
  const [fpConfirm, setFpConfirm] = useState('');
  const [fpErr, setFpErr] = useState('');

  async function handleGoogleSignIn() {
    try {
      const provider = new window.firebase.auth.GoogleAuthProvider();
      provider.addScope('email'); provider.addScope('profile');
      const result = await window.firebase.auth().signInWithPopup(provider);
      const user = result.user;
      const data = await apiFetch('/api/auth/google', { method: 'POST', body: JSON.stringify({ name: user.displayName, email: user.email }) });
      localStorage.setItem('gm_token', data.token);
      onLogin(data.user, data.token);
    } catch (e) {
      if (e.code === 'auth/popup-closed-by-user') return;
      setLoginErr('❌ ' + (e.message || 'Google login failed'));
    }
  }

  async function handleLogin() {
    if (!loginEmail || !loginPass) { setLoginErr('Please fill all fields'); return; }
    try {
      const data = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: loginEmail, password: loginPass }) });
      localStorage.setItem('gm_token', data.token);
      onLogin(data.user, data.token);
    } catch (e) {
      if (e.message === 'blocked') { onBlocked(); return; }
      if (e.message === 'pending') { onPending(loginEmail); return; }
      setLoginErr(e.message);
    }
  }

  async function handleRegister() {
    if (!regName || !regEmail || !regPass || !regRole) { setRegErr('Please fill all required fields'); return; }
    if (regPass.length < 6) { setRegErr('Password must be at least 6 characters'); return; }
    const body = { name: regName, email: regEmail.toLowerCase(), password: regPass, role: regRole };
    if (regRole === 'customer') {
      if (!regPhone || !/^\d{10}$/.test(regPhone.replace(/\D/g, ''))) { setRegErr('Please enter a valid 10-digit phone number'); return; }
      body.phone = regPhone; body.address = regAddress;
    }
    if (regRole === 'vendor') {
      if (!regPhone || !/^\d{10}$/.test(regPhone.replace(/\D/g, ''))) { setRegErr('Please enter a valid 10-digit phone number'); return; }
      if (!regStore || !regLocation) { setRegErr('Store name and location are required'); return; }
      body.storeName = regStore; body.location = regLocation; body.category = regVcat; body.phone = regPhone;
    }
    try {
      const data = await apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify(body) });
      if (data.status === 'pending') { onPending(regEmail); return; }
      localStorage.setItem('gm_token', data.token);
      onLogin(data.user, data.token);
    } catch (e) { setRegErr(e.message); }
  }

  async function resetPasswordDirect() {
    setFpErr('');
    if (!fpEmail) { setFpErr('Please enter your email'); return; }
    if (!fpNew || fpNew.length < 6) { setFpErr('Password must be at least 6 characters'); return; }
    if (fpNew !== fpConfirm) { setFpErr('Passwords do not match'); return; }
    try {
      const data = await apiFetch('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ email: fpEmail, newPassword: fpNew }) });
      localStorage.setItem('gm_token', data.token);
      setForgotOpen(false);
      onLogin(data.user, data.token);
    } catch (e) { setFpErr(e.message || 'Could not reset password'); }
  }

  const GoogleLogo = () => (
    <svg className="google-logo" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );

  return (
    <div className="auth-screen">
      <div className="auth-left-panel">
        <div className="alp-eyebrow">Farm to Doorstep</div>
        <h1 className="alp-heading">The freshest produce,<br/>from <em>khet</em> to<br/>your kitchen.</h1>
        <p className="alp-sub">GramExpress connects rural farmers and local vendors directly with households — no middlemen, no delay.</p>
        <div className="alp-pills">
          <div className="alp-pill">
            <div className="alp-pill-icon"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke="#c8a96e" fill="none"/></svg></div>
            <div className="alp-pill-text"><strong>Verified Local Vendors</strong><span>Every seller is reviewed and approved</span></div>
          </div>
          <div className="alp-pill">
            <div className="alp-pill-icon"><svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9z" stroke="#c8a96e" fill="none"/></svg></div>
            <div className="alp-pill-text"><strong>Express Delivery</strong><span>Same-day delivery to your village or town</span></div>
          </div>
          <div className="alp-pill">
            <div className="alp-pill-icon"><svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#c8a96e" fill="none"/></svg></div>
            <div className="alp-pill-text"><strong>Safe & Transparent</strong><span>See prices, track orders, rate your experience</span></div>
          </div>
        </div>
      </div>

      <div className="auth-right-panel">
        <div className="auth-logo">Gram<span>Express</span></div>
        <div className="auth-box">
          <div className="auth-tabs">
            <button className={`auth-tab${tab === 'login' ? ' active' : ''}`} onClick={() => setTab('login')}>Sign In</button>
            <button className={`auth-tab${tab === 'register' ? ' active' : ''}`} onClick={() => setTab('register')}>Register</button>
          </div>

          {tab === 'login' && (
            <div>
              <div className="auth-title">Welcome back</div>
              {loginErr && <div className="auth-error">{loginErr}</div>}
              <button className="google-btn" onClick={handleGoogleSignIn}><GoogleLogo/> Continue with Google</button>
              <div className="auth-divider">or login with email</div>
              <input className="auth-input" type="email" placeholder="Email address" value={loginEmail} onChange={e => setLoginEmail(e.target.value)}/>
              <input className="auth-input" type="password" placeholder="Password" value={loginPass} onChange={e => setLoginPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}/>
              <button className="auth-btn" onClick={handleLogin}>Sign In →</button>
              <div className="forgot-link"><button onClick={() => setForgotOpen(true)}>Forgot Password?</button></div>
            </div>
          )}

          {tab === 'register' && (
            <div>
              <div className="auth-title">Create Account</div>
              {regErr && <div className="auth-error">{regErr}</div>}
              <button className="google-btn" onClick={handleGoogleSignIn}><GoogleLogo/> Continue with Google</button>
              <div className="auth-divider">or register with email</div>
              <input className="auth-input" placeholder="Your full name" value={regName} onChange={e => setRegName(e.target.value)}/>
              <input className="auth-input" type="email" placeholder="Email address" value={regEmail} onChange={e => setRegEmail(e.target.value)}/>
              <input className="auth-input" type="password" placeholder="Create password (min 6 chars)" value={regPass} onChange={e => setRegPass(e.target.value)}/>
              <select className="auth-input" value={regRole} onChange={e => setRegRole(e.target.value)}>
                <option value="">— Select your role —</option>
                <option value="customer">Customer — I want to buy products</option>
                <option value="vendor">Vendor — I want to sell products</option>
              </select>
              {regRole === 'customer' && (
                <>
                  <input className="auth-input" type="tel" placeholder="Phone number (10 digits)" value={regPhone} onChange={e => setRegPhone(e.target.value)}/>
                  <input className="auth-input" placeholder="Your delivery address (optional)" value={regAddress} onChange={e => setRegAddress(e.target.value)}/>
                </>
              )}
              {regRole === 'vendor' && (
                <>
                  <input className="auth-input" type="tel" placeholder="Phone number (10 digits)" value={regPhone} onChange={e => setRegPhone(e.target.value)}/>
                  <input className="auth-input" placeholder="Store / Shop name" value={regStore} onChange={e => setRegStore(e.target.value)}/>
                  <input className="auth-input" placeholder="Village / Town name" value={regLocation} onChange={e => setRegLocation(e.target.value)}/>
                  <select className="auth-input" value={regVcat} onChange={e => setRegVcat(e.target.value)}>
                    {['Vegetables & Fruits','Grains & Pulses','Dairy Products','Snacks & FMCG','Electronics','Clothing','Mixed'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </>
              )}
              <button className="auth-btn" onClick={handleRegister}>Create Account →</button>
            </div>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal open={forgotOpen} onClose={() => setForgotOpen(false)} title="Reset Password"
        style={{ background: 'linear-gradient(160deg,#1e2d18,#2d4a22,#4a3520)', border: '1px solid rgba(200,169,110,0.2)' }}>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>Enter your registered email and new password.</p>
        {fpErr && <div className="auth-error">{fpErr}</div>}
        <input className="auth-input" type="email" placeholder="Registered email address" value={fpEmail} onChange={e => setFpEmail(e.target.value)}/>
        <input className="auth-input" type="password" placeholder="New password (min 6 chars)" value={fpNew} onChange={e => setFpNew(e.target.value)} style={{ marginTop: 10 }}/>
        <input className="auth-input" type="password" placeholder="Confirm new password" value={fpConfirm} onChange={e => setFpConfirm(e.target.value)}/>
        <button className="auth-btn" onClick={resetPasswordDirect} style={{ marginTop: 8 }}>Update Password →</button>
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  CUSTOMER: SHOP PAGE
// ══════════════════════════════════════════════════════════════════════
function ShopPage({ db, cartItems, onAddToCart, onChangeQty, onViewProduct }) {
  const [cat, setCat] = useState('All');
  const [subcat, setSubcat] = useState('All');
  const [sort, setSort] = useState('default');
  const [search, setSearch] = useState('');
  const [listening, setListening] = useState(false);

  const filtered = db.products.filter(p => {
    if (cat !== 'All' && p.category !== cat) return false;
    if (subcat !== 'All' && p.subcategory !== subcat) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !(p.desc || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    if (sort === 'price-asc') return a.price - b.price;
    if (sort === 'price-desc') return b.price - a.price;
    if (sort === 'name-az') return a.name.localeCompare(b.name);
    if (sort === 'newest') return (b.createdAt || '').localeCompare(a.createdAt || '');
    return 0;
  });

  function startVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Voice search not supported'); return; }
    const r = new SR(); r.lang = 'en-IN'; r.interimResults = false;
    setListening(true); r.start();
    r.onresult = e => { setSearch(e.results[0][0].transcript); setListening(false); };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
  }

  const cats = ['All', ...Object.keys(CATEGORIES)];
  const subcats = cat === 'All' ? [] : ['All', ...(CATEGORIES[cat]?.subcategories || [])];

  return (
    <>
      <div className="search-container">
        <div className="search-wrapper">
          <i className="fas fa-search search-icon"/>
          <input type="text" placeholder="Search vegetables, fruits, dairy..." value={search} onChange={e => setSearch(e.target.value)}/>
          <button className={`voice-search-btn${listening ? ' listening' : ''}`} onClick={startVoice}><i className="fas fa-microphone"/></button>
        </div>
      </div>

      <div className="hero-banner">
        <div className="hero-text">
          <h2>Khet ki Tazgi,<br/>Ghar ke Darwaze Tak</h2>
          <p>Sabziyan, Anaaj & Roz ki Zaroorat — Seedha Gaon Se</p>
          <div className="hero-badge">Express Delivery Available</div>
        </div>
      </div>

      <div className="category-scroll">
        {cats.map(c => (
          <button key={c} className={`cat-pill${cat === c ? ' active' : ''}`} onClick={() => { setCat(c); setSubcat('All'); }}>
            <span className="cat-icon">{c === 'All' ? '🛒' : CATEGORIES[c]?.icon}</span>
            <span>{c}</span>
          </button>
        ))}
      </div>

      {subcats.length > 0 && (
        <div className="subcat-row">
          {subcats.map(s => (
            <button key={s} className={`subcat-chip${subcat === s ? ' active' : ''}`} onClick={() => setSubcat(s)}>{s}</button>
          ))}
        </div>
      )}

      <div className="sort-row">
        <select className="sort-select" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="default">Sort: Default</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="name-az">Name: A to Z</option>
          <option value="newest">Newest First</option>
        </select>
      </div>

      <div className="section-header">
        <div className="section-title">{cat === 'All' ? 'All Products' : cat}</div>
      </div>

      <div className="products-grid">
        {!filtered.length ? (
          <div className="empty-state" style={{ gridColumn: '1/-1' }}><div className="es-icon">😕</div><p>No products found</p></div>
        ) : filtered.map(p => {
          const inCart = cartItems.find(c => c.id === p.id);
          const vendor = db.users.find(u => u.id === p.vendorId);
          const discount = p.mrp && p.mrp > p.price ? Math.round((p.mrp - p.price) / p.mrp * 100) : 0;
          const mainPhoto = (p.photos && p.photos[0]) || p.image || '';
          return (
            <div key={p.id} className="product-card" onClick={() => onViewProduct(p.id)}>
              <div className="product-img-wrap">
                {mainPhoto ? <img src={mainPhoto} alt={p.name}/> : <span>{p.emoji || '📦'}</span>}
                <button className="product-fav" onClick={e => e.stopPropagation()}>♡</button>
              </div>
              <div className="product-info">
                {discount > 0 && <span className="product-discount-badge">{discount}% OFF</span>}
                <div className="product-name">{p.name}</div>
                <div className="product-unit">{p.unit || ''}</div>
                {vendor && <div className="product-vendor-tag">🏪 {vendor.storeName || vendor.name}</div>}
                <div className="product-bottom">
                  <div className="product-price-block">
                    <div className="price">₹{p.price}</div>
                    {p.mrp && p.mrp > p.price && <div className="mrp">₹{p.mrp}</div>}
                  </div>
                  {inCart ? (
                    <div className="qty-selector" onClick={e => e.stopPropagation()}>
                      <button className="qty-btn" onClick={() => onChangeQty(p.id, -1)}>−</button>
                      <span className="qty-display">{inCart.qty}</span>
                      <button className="qty-btn" onClick={() => onChangeQty(p.id, 1)}>+</button>
                    </div>
                  ) : (
                    <button className="add-btn" onClick={e => { e.stopPropagation(); onAddToCart(p.id); }}>+ Add</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  CUSTOMER: MY ORDERS
// ══════════════════════════════════════════════════════════════════════
function MyOrdersPage({ db, currentUser, onViewOrder }) {
  const orders = db.orders.filter(o => o.customerId === currentUser.id);
  return (
    <>
      <div className="page-header"><h1>My Orders</h1></div>
      {!orders.length ? (
        <div className="empty-state"><div className="es-icon">📦</div><p>No orders yet. Start shopping!</p></div>
      ) : orders.map(o => (
        <div key={o.id} className="order-card">
          <div className="order-header">
            <span className="order-id">#{o.id}</span>
            <span className={`badge ${STATUS_MAP[o.status]?.cls || 'badge-gray'}`}>{STATUS_MAP[o.status]?.label || o.status}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>{o.date} · 🏪 {o.vendorName}</div>
          <div style={{ margin: '8px 0', fontSize: 13 }}>{o.items.map(i => `${i.emoji} ${i.name} ×${i.qty}`).join(' · ')}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--green)' }}>₹{o.total}</span>
            <button className="btn-primary" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => onViewOrder(o.id)}>View Details</button>
          </div>
        </div>
      ))}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  FEEDBACK
// ══════════════════════════════════════════════════════════════════════
function FeedbackList({ feedbacks }) {
  if (!feedbacks.length) return <div className="empty-state"><div className="es-icon">⭐</div><p>No feedback yet</p></div>;
  return feedbacks.map((f, i) => (
    <div key={i} className="feedback-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div><strong>{f.userName}</strong>{f.vendorName && <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8 }}>→ {f.vendorName}</span>}</div>
      </div>
      <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
        {[1,2,3,4,5].map(n => <span key={n} style={{ color: n <= f.rating ? '#f59e0b' : '#e5e7eb' }}>★</span>)}
      </div>
      <p style={{ fontSize: 13, color: 'var(--text2)' }}>{f.text}</p>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>{f.date}</div>
    </div>
  ));
}

function FeedbackPage({ db, currentUser, token, onRefresh, showToast }) {
  const [rating, setRating] = useState(0);
  const [vendorId, setVendorId] = useState('');
  const [text, setText] = useState('');
  const vendors = db.users.filter(u => u.role === 'vendor' && u.vendorStatus === 'approved');
  const myFb = db.feedback.filter(f => f.userId === currentUser.id).slice().reverse();

  async function submit() {
    if (!rating) { showToast('Select a rating'); return; }
    const vendor = db.users.find(u => u.id === vendorId);
    try {
      await apiFetch('/api/feedback', { method: 'POST', body: JSON.stringify({ vendorId: vendorId || null, vendorName: vendor?.storeName || vendor?.name || 'General', rating, text }) }, token);
      showToast('⭐ Thank you!'); setRating(0); setText(''); setVendorId(''); onRefresh();
    } catch (e) { showToast(e.message || 'Error'); }
  }

  return (
    <>
      <div className="page-header"><h1>Give Feedback ⭐</h1></div>
      <div className="card">
        <div className="card-title">Share Your Experience</div>
        <div className="form-group">
          <label className="form-label">Rating</label>
          <div className="star-rating">
            {[1,2,3,4,5].map(n => <button key={n} className={`star${rating >= n ? ' active' : ''}`} onClick={() => setRating(n)}>★</button>)}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Select Vendor (optional)</label>
          <select className="form-input" value={vendorId} onChange={e => setVendorId(e.target.value)}>
            <option value="">General Feedback</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.storeName || v.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Your Review</label>
          <textarea className="form-input" rows="3" placeholder="Tell us about your experience..." value={text} onChange={e => setText(e.target.value)}/>
        </div>
        <button className="btn-primary" onClick={submit}>Submit Feedback</button>
      </div>
      <FeedbackList feedbacks={myFb}/>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  CUSTOMER: PROFILE
// ══════════════════════════════════════════════════════════════════════
function CustomerProfile({ db, currentUser, onLogout }) {
  const myOrders = db.orders.filter(o => o.customerId === currentUser.id);
  const totalSpent = myOrders.reduce((s, o) => s + o.total, 0);
  const delivered = myOrders.filter(o => o.status === 'delivered').length;
  const initials = currentUser.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <>
      <div className="page-header"><h1>My Profile</h1></div>
      <div className="profile-hero">
        <div className="profile-avatar-big">{currentUser.profilePic ? <img src={currentUser.profilePic} alt=""/> : initials}</div>
        <div className="profile-hero-info">
          <div className="profile-hero-name">{currentUser.name}</div>
          <div className="profile-hero-sub">{currentUser.email}</div>
          <div className="profile-hero-tags">
            <span className="profile-tag">Customer</span>
            {currentUser.phone && <span className="profile-tag">📞 {currentUser.phone}</span>}
          </div>
        </div>
      </div>
      <div className="profile-stats-row">
        <div className="profile-stat-box"><div className="profile-stat-val" style={{ color: 'var(--blue)' }}>{myOrders.length}</div><div className="profile-stat-lbl">Total Orders</div></div>
        <div className="profile-stat-box"><div className="profile-stat-val" style={{ color: 'var(--green)' }}>{delivered}</div><div className="profile-stat-lbl">Delivered</div></div>
        <div className="profile-stat-box"><div className="profile-stat-val" style={{ color: 'var(--orange)' }}>₹{totalSpent}</div><div className="profile-stat-lbl">Total Spent</div></div>
      </div>
      <div className="profile-section">
        <div className="profile-section-title">👤 Personal Information</div>
        <div className="profile-info-grid">
          <div className="profile-info-item"><div className="profile-info-label">Full Name</div><div className="profile-info-value">{currentUser.name}</div></div>
          <div className="profile-info-item"><div className="profile-info-label">Email</div><div className="profile-info-value">{currentUser.email}</div></div>
          <div className="profile-info-item"><div className="profile-info-label">Phone</div><div className="profile-info-value">{currentUser.phone || 'Not added'}</div></div>
          <div className="profile-info-item" style={{ gridColumn: '1/-1' }}><div className="profile-info-label">Delivery Address</div><div className="profile-info-value">{currentUser.address || 'No address saved yet'}</div></div>
        </div>
      </div>
      <button className="mobile-logout-btn" onClick={onLogout}>🚪 Log Out</button>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  VENDOR PAGES
// ══════════════════════════════════════════════════════════════════════
function VendorDashboard({ db, currentUser, token, showToast, onRefresh, onAddProduct }) {
  const myProducts = db.products.filter(p => p.vendorId === currentUser.id);
  const myOrders = db.orders.filter(o => o.vendorId === currentUser.id);
  const revenue = myOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0);

  async function deleteProduct(id) {
    if (!window.confirm('Delete this product?')) return;
    try { await apiFetch('/api/products/' + id, { method: 'DELETE' }, token); showToast('🗑️ Product deleted'); onRefresh(); }
    catch (e) { showToast(e.message || 'Error'); }
  }

  return (
    <>
      <div className="page-header"><h1>Vendor Dashboard</h1></div>
      <div className="stats-grid">
        {[['📦', myProducts.length, 'Products', 'var(--green)'], ['🧾', myOrders.length, 'Orders', 'var(--orange)'], ['✅', myOrders.filter(o => o.status === 'delivered').length, 'Delivered', 'var(--blue)'], ['💰', '₹' + revenue, 'Revenue', 'var(--green)']].map(([icon, val, lbl, col]) => (
          <div key={lbl} className="stat-card"><div className="stat-icon">{icon}</div><div className="stat-value" style={{ color: col }}>{val}</div><div className="stat-label">{lbl}</div></div>
        ))}
      </div>
      <div className="card">
        <div className="card-title">My Products <button className="btn-primary" onClick={onAddProduct} style={{ fontSize: 13, padding: '8px 16px' }}>+ Add Product</button></div>
        {!myProducts.length ? (
          <div className="empty-state"><div className="es-icon">📦</div><p>No products yet. Add your first product!</p></div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Action</th></tr></thead>
              <tbody>
                {myProducts.map(p => (
                  <tr key={p.id}>
                    <td style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, overflow: 'hidden', flexShrink: 0 }}>
                        {(p.photos && p.photos[0]) ? <img src={p.photos[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt=""/> : p.emoji}
                      </div>
                      <span>{p.name}</span>
                    </td>
                    <td><span className="badge badge-green">{p.category}</span></td>
                    <td>₹{p.price}</td>
                    <td><button className="btn-danger" onClick={() => deleteProduct(p.id)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function VendorOrders({ db, currentUser, token, showToast, onRefresh }) {
  async function updateStatus(orderId, status) {
    try { await apiFetch('/api/orders/' + orderId + '/status', { method: 'PATCH', body: JSON.stringify({ status }) }, token); showToast('Order status updated'); onRefresh(); }
    catch (e) { showToast(e.message || 'Error'); }
  }
  const orders = db.orders.filter(o => o.vendorId === currentUser.id);
  return (
    <>
      <div className="page-header"><h1>Orders for My Store</h1></div>
      <div className="card">
        {!orders.length ? <div className="empty-state"><div className="es-icon">🧾</div><p>No orders yet</p></div> : orders.map(o => (
          <div key={o.id} className="order-card">
            <div className="order-header">
              <span className="order-id">#{o.id}</span>
              <span className={`badge ${STATUS_MAP[o.status]?.cls || 'badge-gray'}`}>{STATUS_MAP[o.status]?.label || o.status}</span>
            </div>
            <div style={{ fontSize: 13, marginBottom: 6 }}>👤 {o.customerName} · <strong style={{ color: 'var(--green)' }}>📞 {o.customerPhone || 'N/A'}</strong></div>
            <div style={{ fontSize: 13 }}>{o.items.map(i => `${i.emoji} ${i.name} ×${i.qty}`).join(' · ')}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', margin: '6px 0' }}>📍 {o.customerAddress}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--green)' }}>₹{o.total}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {o.status === 'processing' && <button className="btn-primary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => updateStatus(o.id, 'out_for_delivery')}>Mark Out for Delivery</button>}
                {o.status === 'out_for_delivery' && <button className="btn-primary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => updateStatus(o.id, 'delivered')}>Mark Delivered</button>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function VendorProfile({ db, currentUser, onLogout }) {
  const myProducts = db.products.filter(p => p.vendorId === currentUser.id);
  const myOrders = db.orders.filter(o => o.vendorId === currentUser.id);
  const revenue = myOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0);
  const initials = (currentUser.storeName || currentUser.name).split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <>
      <div className="page-header"><h1>Store Profile</h1></div>
      <div className="profile-hero">
        <div className="profile-avatar-big vendor-av">{currentUser.profilePic ? <img src={currentUser.profilePic} alt=""/> : initials}</div>
        <div className="profile-hero-info">
          <div className="profile-hero-name">{currentUser.storeName || currentUser.name}</div>
          <div className="profile-hero-sub">{currentUser.location || 'Location not set'}</div>
          <div className="profile-hero-tags">
            <span className="profile-tag">🏪 Vendor</span>
            {currentUser.category && <span className="profile-tag">🏷️ {currentUser.category}</span>}
          </div>
        </div>
      </div>
      <div className="profile-stats-row">
        <div className="profile-stat-box"><div className="profile-stat-val" style={{ color: 'var(--green)' }}>{myProducts.length}</div><div className="profile-stat-lbl">Products</div></div>
        <div className="profile-stat-box"><div className="profile-stat-val" style={{ color: 'var(--blue)' }}>{myOrders.length}</div><div className="profile-stat-lbl">Orders</div></div>
        <div className="profile-stat-box"><div className="profile-stat-val" style={{ color: 'var(--orange)' }}>₹{revenue}</div><div className="profile-stat-lbl">Revenue</div></div>
      </div>
      <div className="profile-section">
        <div className="profile-section-title">🏪 Store Information</div>
        <div className="profile-info-grid">
          <div className="profile-info-item"><div className="profile-info-label">Store Name</div><div className="profile-info-value">{currentUser.storeName || '—'}</div></div>
          <div className="profile-info-item"><div className="profile-info-label">Phone</div><div className="profile-info-value">{currentUser.phone || 'Not added'}</div></div>
          <div className="profile-info-item"><div className="profile-info-label">Location</div><div className="profile-info-value">{currentUser.location || 'Not set'}</div></div>
          <div className="profile-info-item"><div className="profile-info-label">Category</div><div className="profile-info-value">{currentUser.category || 'Not set'}</div></div>
        </div>
      </div>
      <button className="mobile-logout-btn" onClick={onLogout}>🚪 Log Out</button>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  ADMIN PAGES
// ══════════════════════════════════════════════════════════════════════
function AdminDashboard({ db }) {
  const totalRevenue = db.orders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0);
  const stats = [
    ['👥', db.users.filter(u => u.role === 'customer').length, 'Customers', 'var(--blue)'],
    ['🏪', db.users.filter(u => u.role === 'vendor' && u.vendorStatus === 'approved').length, 'Active Vendors', 'var(--orange)'],
    ['📦', db.products.length, 'Products', 'var(--green)'],
    ['🧾', db.orders.length, 'Total Orders', 'var(--purple)'],
    ['💰', '₹' + totalRevenue, 'Revenue', 'var(--green)'],
    ['⏳', db.users.filter(u => u.role === 'vendor' && u.vendorStatus === 'pending').length, 'Pending Vendors', 'var(--amber)'],
  ];
  return (
    <>
      <div className="page-header"><h1>Admin Dashboard</h1></div>
      <div className="stats-grid">
        {stats.map(([icon, val, lbl, col]) => (
          <div key={lbl} className="stat-card"><div className="stat-icon">{icon}</div><div className="stat-value" style={{ color: col }}>{val}</div><div className="stat-label">{lbl}</div></div>
        ))}
      </div>
      <div className="card">
        <div className="card-title">Recent Feedback</div>
        <FeedbackList feedbacks={db.feedback.slice(0, 3)}/>
      </div>
    </>
  );
}

function AdminUsers({ db, token, showToast, onRefresh }) {
  const users = db.users.filter(u => u.role !== 'admin');

  async function changeStatus(id, status) {
    try { await apiFetch('/api/users/' + id + '/status', { method: 'PATCH', body: JSON.stringify({ status }) }, token); showToast(status === 'blocked' ? '🚫 User blocked' : '✅ User unblocked'); onRefresh(); }
    catch (e) { showToast(e.message || 'Error'); }
  }
  async function deleteUser(id) {
    if (!window.confirm('Delete this user?')) return;
    try { await apiFetch('/api/users/' + id, { method: 'DELETE' }, token); showToast('🗑️ User deleted'); onRefresh(); }
    catch (e) { showToast(e.message || 'Error'); }
  }

  return (
    <>
      <div className="page-header"><h1>User Management</h1></div>
      <div className="info-box">Blocked users cannot log in. As admin, you have full control.</div>
      <div className="card">
        <div className="card-title">All Users</div>
        {!users.length ? <div className="empty-state"><div className="es-icon">👥</div><p>No users yet</p></div> : (
          <div className="table-responsive">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Contact</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td><strong>{u.name}</strong>{u.storeName && <><br/><span style={{ fontSize: 11, color: 'var(--text3)' }}>🏪 {u.storeName}</span></>}</td>
                    <td style={{ fontSize: 12 }}>📧 {u.email}<br/>📞 {u.phone || 'N/A'}</td>
                    <td>
                      <span className={`badge ${u.role === 'vendor' ? 'badge-orange' : 'badge-blue'}`}>{u.role === 'vendor' ? '🏪 Vendor' : '🛒 Customer'}</span>
                      {u.role === 'vendor' && <><br/><span className={`badge ${u.vendorStatus === 'approved' ? 'badge-green' : 'badge-gray'}`} style={{ marginTop: 4 }}>{u.vendorStatus}</span></>}
                    </td>
                    <td><span className={`badge ${u.status === 'blocked' ? 'badge-red' : 'badge-green'}`}>{u.status === 'blocked' ? '🚫 Blocked' : '✅ Active'}</span></td>
                    <td>
                      {u.status === 'blocked' ? <button className="btn-unblock" onClick={() => changeStatus(u.id, 'active')}>Unblock</button> : <button className="btn-block" onClick={() => changeStatus(u.id, 'blocked')}>Block</button>}
                      <button className="btn-danger" style={{ marginLeft: 4 }} onClick={() => deleteUser(u.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function VendorApprovals({ db, token, showToast, onRefresh }) {
  const pending = db.users.filter(u => u.role === 'vendor' && u.vendorStatus === 'pending');
  const approved = db.users.filter(u => u.role === 'vendor' && u.vendorStatus === 'approved');

  async function changeVendorStatus(id, vendorStatus) {
    if (vendorStatus === 'rejected' && !window.confirm('Reject and delete this vendor?')) return;
    try { await apiFetch('/api/users/' + id + '/vendor-status', { method: 'PATCH', body: JSON.stringify({ vendorStatus }) }, token); showToast(vendorStatus === 'approved' ? '✅ Vendor approved!' : '❌ Vendor rejected'); onRefresh(); }
    catch (e) { showToast(e.message || 'Error'); }
  }

  return (
    <>
      <div className="page-header"><h1>Vendor Approvals</h1></div>
      <div className="card">
        <div className="card-title">Pending Approvals <span className="badge badge-orange">{pending.length} pending</span></div>
        {pending.length ? pending.map(v => (
          <div key={v.id} className="pending-vendor-card">
            <div className="vendor-info">
              <h4>{v.storeName || v.name}</h4>
              <p>👤 {v.name} · 📧 {v.email} · 📞 {v.phone}</p>
              <p>📍 {v.location} · 🏷️ {v.category}</p>
            </div>
            <div className="action-btns">
              <button className="btn-approve" onClick={() => changeVendorStatus(v.id, 'approved')}>✅ Approve</button>
              <button className="btn-danger" onClick={() => changeVendorStatus(v.id, 'rejected')}>❌ Reject</button>
            </div>
          </div>
        )) : <div className="empty-state" style={{ padding: 24 }}><div className="es-icon">✅</div><p>No pending approvals</p></div>}
      </div>
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-title">Approved Vendors</div>
        {approved.length ? (
          <div className="table-responsive">
            <table className="data-table">
              <thead><tr><th>Store</th><th>Owner</th><th>Contact</th><th>Location</th><th>Products</th></tr></thead>
              <tbody>
                {approved.map(v => (
                  <tr key={v.id}>
                    <td><strong>{v.storeName}</strong></td>
                    <td>{v.name}</td>
                    <td style={{ fontSize: 12 }}>📧 {v.email}<br/>📞 {v.phone}</td>
                    <td>{v.location}</td>
                    <td>{db.products.filter(p => p.vendorId === v.id).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="empty-state" style={{ padding: 24 }}><p>No approved vendors</p></div>}
      </div>
    </>
  );
}

function AdminProducts({ db, token, showToast, onRefresh }) {
  async function deleteProduct(id) {
    if (!window.confirm('Delete?')) return;
    try { await apiFetch('/api/products/' + id, { method: 'DELETE' }, token); showToast('🗑️ Product deleted'); onRefresh(); }
    catch (e) { showToast(e.message || 'Error'); }
  }
  return (
    <>
      <div className="page-header"><h1>All Products</h1></div>
      <div className="card">
        {!db.products.length ? <div className="empty-state"><div className="es-icon">📦</div><p>No products yet</p></div> : (
          <div className="table-responsive">
            <table className="data-table">
              <thead><tr><th>Product</th><th>Vendor</th><th>Category</th><th>Price</th><th>Action</th></tr></thead>
              <tbody>
                {db.products.map(p => {
                  const vendor = db.users.find(u => u.id === p.vendorId);
                  return (
                    <tr key={p.id}>
                      <td style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, overflow: 'hidden', flexShrink: 0 }}>
                          {(p.photos && p.photos[0]) ? <img src={p.photos[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt=""/> : p.emoji}
                        </div>
                        <span>{p.name}</span>
                      </td>
                      <td>{vendor?.storeName || vendor?.name || 'Unknown'}</td>
                      <td><span className="badge badge-green">{p.category}</span></td>
                      <td>₹{p.price}</td>
                      <td><button className="btn-danger" onClick={() => deleteProduct(p.id)}>Delete</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function AdminOrders({ db, onViewOrder }) {
  return (
    <>
      <div className="page-header"><h1>All Orders</h1></div>
      <div className="card">
        {!db.orders.length ? <div className="empty-state"><div className="es-icon">🧾</div><p>No orders yet</p></div> : (
          <div className="table-responsive">
            <table className="data-table">
              <thead><tr><th>Order</th><th>Customer & 📞 Phone</th><th>Vendor</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {db.orders.map(o => (
                  <tr key={o.id}>
                    <td><strong>{o.id}</strong><br/><span style={{ fontSize: 11, color: 'var(--text3)' }}>{o.date}</span></td>
                    <td>
                      <strong>{o.customerName}</strong><br/>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, background: 'var(--green-light)', color: 'var(--green)', padding: '3px 8px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>📞 {o.customerPhone || 'N/A'}</span>
                    </td>
                    <td>{o.vendorName}</td>
                    <td><strong>₹{o.total}</strong></td>
                    <td><span className={`badge ${STATUS_MAP[o.status]?.cls || 'badge-gray'}`}>{o.status?.replace(/_/g, ' ')}</span></td>
                    <td><button className="btn-primary" style={{ padding: '6px 12px', fontSize: 11 }} onClick={() => onViewOrder(o.id)}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function AdminFeedback({ db }) {
  return (
    <>
      <div className="page-header"><h1>All Feedback ⭐</h1></div>
      <div className="card"><FeedbackList feedbacks={db.feedback.slice().reverse()}/></div>
    </>
  );
}

function DeliverySettings({ db, token, showToast, onRefresh }) {
  const s = db.settings || {};
  const [base, setBase] = useState(s.baseDeliveryCharge || 20);
  const [freeAbove, setFreeAbove] = useState(s.freeDeliveryAbove || 200);
  const [express, setExpress] = useState(s.expressDeliveryCharge || 40);
  const [couponCode, setCouponCode] = useState('');
  const [couponDisc, setCouponDisc] = useState('');
  const [couponMin, setCouponMin] = useState('');

  async function saveSettings() {
    try { await apiFetch('/api/settings', { method: 'PUT', body: JSON.stringify({ baseDeliveryCharge: base, freeDeliveryAbove: freeAbove, expressDeliveryCharge: express }) }, token); showToast('💾 Delivery settings saved!'); onRefresh(); }
    catch (e) { showToast(e.message || 'Error'); }
  }
  async function addCoupon() {
    if (!couponCode || !couponDisc) { showToast('Fill coupon code and discount'); return; }
    try { await apiFetch('/api/settings/coupons', { method: 'POST', body: JSON.stringify({ code: couponCode.toUpperCase(), discount: parseInt(couponDisc), minOrder: parseInt(couponMin) || 0 }) }, token); showToast('Coupon added!'); setCouponCode(''); setCouponDisc(''); setCouponMin(''); onRefresh(); }
    catch (e) { showToast(e.message || 'Error'); }
  }
  async function deleteCoupon(code) {
    try { await apiFetch('/api/settings/coupons/' + code, { method: 'DELETE' }, token); showToast('🗑️ Coupon deleted'); onRefresh(); }
    catch (e) { showToast(e.message || 'Error'); }
  }

  const coupons = (db.settings?.coupons || []);
  return (
    <>
      <div className="page-header"><h1>Delivery Charge Settings</h1></div>
      <div className="delivery-settings-card">
        <h3>Delivery Charge Control</h3>
        <p>Set delivery charges that apply to all customer orders</p>
        <div className="delivery-setting-row"><span className="delivery-setting-label">Base Delivery Charge (₹)</span><input className="delivery-input" type="number" value={base} onChange={e => setBase(e.target.value)} min="0"/></div>
        <div className="delivery-setting-row"><span className="delivery-setting-label">Free Delivery Above Order Total (₹)</span><input className="delivery-input" type="number" value={freeAbove} onChange={e => setFreeAbove(e.target.value)} min="0"/></div>
        <div className="delivery-setting-row"><span className="delivery-setting-label">Express Delivery Charge (₹)</span><input className="delivery-input" type="number" value={express} onChange={e => setExpress(e.target.value)} min="0"/></div>
        <button className="save-delivery-btn" onClick={saveSettings}>Save Settings</button>
      </div>
      <div className="card">
        <div className="card-title">Active Coupon Codes</div>
        <div style={{ marginBottom: 16 }}>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Coupon Code</label><input className="form-input" placeholder="e.g. GAON20" value={couponCode} onChange={e => setCouponCode(e.target.value)}/></div>
            <div className="form-group"><label className="form-label">Discount %</label><input className="form-input" type="number" placeholder="20" value={couponDisc} onChange={e => setCouponDisc(e.target.value)} min="1" max="100"/></div>
          </div>
          <div className="form-group"><label className="form-label">Min Order Amount (₹)</label><input className="form-input" type="number" placeholder="100" value={couponMin} onChange={e => setCouponMin(e.target.value)} min="0"/></div>
          <button className="btn-primary" onClick={addCoupon}>+ Add Coupon</button>
        </div>
        {!coupons.length ? <div className="empty-state" style={{ padding: 20 }}><p>No coupons yet</p></div> : coupons.map(c => (
          <div key={c.code} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
            <div><span className="badge badge-green" style={{ fontSize: 13, fontWeight: 800 }}>{c.code}</span><span style={{ fontSize: 13, marginLeft: 10 }}>{c.discount}% off · Min ₹{c.minOrder}</span></div>
            <button className="btn-danger" onClick={() => deleteCoupon(c.code)}>Delete</button>
          </div>
        ))}
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  ADD PRODUCT MODAL
// ══════════════════════════════════════════════════════════════════════
function AddProductModal({ open, onClose, token, showToast, onRefresh }) {
  const [pCat, setPCat] = useState('Vegetables');
  const [pSubcat, setPSubcat] = useState('');
  const [pName, setPName] = useState('');
  const [pPrice, setPPrice] = useState('');
  const [pMrp, setPMrp] = useState('');
  const [pUnit, setPUnit] = useState('');
  const [pEmoji, setPEmoji] = useState('');
  const [pBrand, setPBrand] = useState('');
  const [pStock, setPStock] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pHighlights, setPHighlights] = useState('');
  const [photos, setPhotos] = useState(['', '', '']);
  const fileRef = useRef();
  const [uploadSlot, setUploadSlot] = useState(0);

  const subcats = CATEGORIES[pCat]?.subcategories || [];

  function triggerUpload(slot) { setUploadSlot(slot); fileRef.current.click(); }
  function handleUpload(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setPhotos(prev => { const n = [...prev]; n[uploadSlot] = ev.target.result; return n; }); };
    reader.readAsDataURL(file);
    e.target.value = '';
  }
  function removePhoto(i) { setPhotos(prev => { const n = [...prev]; n[i] = ''; return n; }); }

  async function submit() {
    if (!pName || !pPrice || !pUnit) { showToast('Fill required fields: Name, Price, Unit'); return; }
    const body = { name: pName, price: parseFloat(pPrice), mrp: parseFloat(pMrp) || parseFloat(pPrice), unit: pUnit, emoji: pEmoji || '📦', brand: pBrand, stock: parseInt(pStock) || 0, desc: pDesc, highlights: pHighlights.split(',').map(h => h.trim()).filter(Boolean), category: pCat, subcategory: pSubcat || subcats[0], photos: photos.filter(Boolean) };
    try {
      await apiFetch('/api/products', { method: 'POST', body: JSON.stringify(body) }, token);
      onClose(); showToast('Product uploaded!'); onRefresh();
      setPName(''); setPPrice(''); setPMrp(''); setPUnit(''); setPEmoji(''); setPBrand(''); setPStock(''); setPDesc(''); setPHighlights(''); setPhotos(['','','']);
    } catch (e) { showToast(e.message || 'Error'); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add New Product">
      <div className="upload-step">
        <div className="upload-step-title"><span className="step-num">1</span> Category & Subfolder</div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Main Category</label>
            <select className="form-input" value={pCat} onChange={e => { setPCat(e.target.value); setPSubcat(''); }}>
              {Object.keys(CATEGORIES).map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Subcategory</label>
            <select className="form-input" value={pSubcat} onChange={e => setPSubcat(e.target.value)}>
              {subcats.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div className="upload-step">
        <div className="upload-step-title"><span className="step-num">2</span> Product Photos</div>
        <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>Upload upto 3 photos.</p>
        <div className="photo-grid">
          {[0,1,2].map(i => (
            <div key={i} className="photo-slot" onClick={() => triggerUpload(i)}>
              {photos[i] ? <img src={photos[i]} alt=""/> : <span className="add-photo-icon">📷</span>}
              {photos[i] && <button className="photo-remove" onClick={e => { e.stopPropagation(); removePhoto(i); }}>✕</button>}
            </div>
          ))}
        </div>
        <input type="file" ref={fileRef} accept="image/*" style={{ display: 'none' }} onChange={handleUpload}/>
      </div>
      <div className="upload-step">
        <div className="upload-step-title"><span className="step-num">3</span> Product Details</div>
        <div className="form-group"><label className="form-label">Product Name *</label><input className="form-input" placeholder="e.g. Fresh Tomatoes" value={pName} onChange={e => setPName(e.target.value)}/></div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Price (₹) *</label><input className="form-input" type="number" placeholder="99" value={pPrice} onChange={e => setPPrice(e.target.value)}/></div>
          <div className="form-group"><label className="form-label">MRP (₹)</label><input className="form-input" type="number" placeholder="129" value={pMrp} onChange={e => setPMrp(e.target.value)}/></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Unit *</label><input className="form-input" placeholder="1 kg / 500g" value={pUnit} onChange={e => setPUnit(e.target.value)}/></div>
          <div className="form-group"><label className="form-label">Emoji</label><input className="form-input" placeholder="🍅" maxLength="4" value={pEmoji} onChange={e => setPEmoji(e.target.value)}/></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Brand</label><input className="form-input" placeholder="e.g. Local Farm" value={pBrand} onChange={e => setPBrand(e.target.value)}/></div>
          <div className="form-group"><label className="form-label">Stock Qty</label><input className="form-input" type="number" placeholder="100" value={pStock} onChange={e => setPStock(e.target.value)}/></div>
        </div>
        <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" rows="2" placeholder="Short description..." value={pDesc} onChange={e => setPDesc(e.target.value)}/></div>
        <div className="form-group"><label className="form-label">Highlights (comma separated)</label><input className="form-input" placeholder="Farm fresh, Organic" value={pHighlights} onChange={e => setPHighlights(e.target.value)}/></div>
      </div>
      <button className="btn-primary" onClick={submit} style={{ width: '100%', padding: 14, fontSize: 15 }}>Upload Product</button>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  CART MODAL
// ══════════════════════════════════════════════════════════════════════
function CartModal({ open, onClose, cartItems, onChangeQty, db, appliedCoupon, onApplyCoupon, onProceed }) {
  const [couponInput, setCouponInput] = useState('');
  const settings = db.settings || {};
  const subtotal = cartItems.reduce((s, c) => s + c.price * c.qty, 0);
  const delivery = subtotal >= (settings.freeDeliveryAbove || 200) ? 0 : (settings.baseDeliveryCharge || 20);
  const discount = appliedCoupon ? Math.floor(subtotal * appliedCoupon.discount / 100) : 0;
  const total = subtotal + delivery - discount;
  const coupons = settings.coupons || [];

  function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    const coupon = coupons.find(c => c.code === code);
    if (!coupon) { alert('Invalid coupon'); return; }
    if (subtotal < coupon.minOrder) { alert(`⚠️ Min order ₹${coupon.minOrder} required`); return; }
    onApplyCoupon(coupon);
  }

  return (
    <Modal open={open} onClose={onClose} title={`Your Cart — ${cartItems.length} item${cartItems.length !== 1 ? 's' : ''}`}>
      {cartItems.map(c => (
        <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 18 }}>{c.emoji}</span> <strong>{c.name}</strong><br/>
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>₹{c.price} × {c.qty} = ₹{c.price * c.qty}</span>
          </div>
          <div className="qty-selector" style={{ marginLeft: 10 }}>
            <button className="qty-btn" onClick={() => onChangeQty(c.id, -1)}>−</button>
            <span className="qty-display">{c.qty}</span>
            <button className="qty-btn" onClick={() => onChangeQty(c.id, 1)}>+</button>
          </div>
        </div>
      ))}
      {coupons.length > 0 && (
        <div style={{ margin: '10px 0 4px' }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Available coupons:</div>
          {coupons.map(c => (
            <div key={c.code} style={{ display: 'inline-block', margin: 3, padding: '4px 10px', background: 'var(--green-light)', border: '1px dashed var(--green)', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600 }} onClick={() => setCouponInput(c.code)}>
              {c.code} — {c.discount}% off (min ₹{c.minOrder})
            </div>
          ))}
        </div>
      )}
      <div style={{ marginBottom: 12 }}>
        <div className="coupon-input-row">
          <input className="coupon-input" placeholder="Enter coupon code (e.g. GAON20)" value={couponInput} onChange={e => setCouponInput(e.target.value)}/>
          <button className="apply-btn" onClick={applyCoupon}>Apply</button>
        </div>
      </div>
      <div style={{ background: '#1a2e1a', borderRadius: 12, padding: 14, marginBottom: 14, color: '#fff' }}>
        <div className="billing-row"><span>Subtotal</span><span>₹{subtotal}</span></div>
        <div className="billing-row"><span>Delivery</span><span>{delivery === 0 ? 'Free' : '₹' + delivery}</span></div>
        <div className="billing-row" style={{ color: '#7ecf7e' }}><span>Discount</span><span>{discount > 0 ? '−₹' + discount : '₹0'}</span></div>
        <div className="billing-row" style={{ fontWeight: 800, fontSize: 16, borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 8, marginTop: 4 }}><span>Total</span><span style={{ color: '#7ecf7e' }}>₹{total}</span></div>
      </div>
      <button className="btn-primary" style={{ width: '100%', padding: 14, fontSize: 15 }} onClick={onProceed}>Proceed to Checkout →</button>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  CHECKOUT MODAL
// ══════════════════════════════════════════════════════════════════════
function CheckoutModal({ open, onClose, cartItems, db, appliedCoupon, onApplyCoupon, currentUser, token, showToast, onSuccess }) {
  const [address, setAddress] = useState(currentUser?.address || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [deliveryType, setDeliveryType] = useState('standard');
  const [couponInput, setCouponInput] = useState('');
  const [couponMsg, setCouponMsg] = useState('');
  const settings = db.settings || {};
  const subtotal = cartItems.reduce((s, c) => s + c.price * c.qty, 0);
  const isExpress = deliveryType === 'express';
  const delivery = subtotal >= (settings.freeDeliveryAbove || 200) ? 0 : (settings.baseDeliveryCharge || 20) + (isExpress ? (settings.expressDeliveryCharge || 40) : 0);
  const discount = appliedCoupon ? Math.floor(subtotal * appliedCoupon.discount / 100) : 0;
  const total = subtotal + delivery - discount;

  function applyCheckoutCoupon() {
    const code = couponInput.trim().toUpperCase();
    const coupon = (settings.coupons || []).find(c => c.code === code);
    if (!coupon) { setCouponMsg('❌ Invalid coupon'); return; }
    if (subtotal < coupon.minOrder) { setCouponMsg(`⚠️ Min order ₹${coupon.minOrder}`); return; }
    onApplyCoupon(coupon); setCouponMsg(`✅ ${coupon.discount}% off applied!`);
  }

  async function getLocation() {
    if (!navigator.geolocation) { showToast('Location not supported'); return; }
    showToast('📍 Getting location...');
    navigator.geolocation.getCurrentPosition(pos => {
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`)
        .then(r => r.json()).then(d => { setAddress(d.display_name || ''); showToast('📍 Location set!'); })
        .catch(() => showToast('Location error'));
    }, () => showToast('Location denied'));
  }

  async function placeOrder() {
    if (!address) { showToast('Delivery address daalo'); return; }
    if (!phone || phone.length !== 10) { showToast('📞 Valid 10-digit phone number daalo'); return; }
    if (!cartItems.length) { showToast('Cart is empty'); return; }
    try {
      const data = await apiFetch('/api/orders', { method: 'POST', body: JSON.stringify({ items: cartItems.map(c => ({ productId: c.id, vendorId: c.vendorId, name: c.name, price: c.price, qty: c.qty, emoji: c.emoji })), address, deliveryType, couponCode: appliedCoupon?.code || null, phone }) }, token);
      onSuccess(data, address, phone);
    } catch (e) { showToast(e.message || 'Order failed'); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Checkout">
      <div style={{ marginBottom: 16 }}>
        <label className="form-label">📍 Delivery Address *</label>
        <textarea className="form-input" rows="3" placeholder="Enter your full delivery address..." value={address} onChange={e => setAddress(e.target.value)}/>
        <button className="location-btn" style={{ marginTop: 8 }} onClick={getLocation}><i className="fas fa-location-crosshairs"/> Use GPS Location</button>
      </div>
      <div className="phone-required-field">
        <label>📞 Phone Number — Delivery ke liye zaroori *</label>
        <input type="tel" maxLength="10" placeholder="10-digit mobile number" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}/>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#1e3a1e', borderRadius: 10, padding: 12, marginBottom: 16, color: '#fff' }}>
        <span style={{ fontSize: 22 }}>💵</span>
        <div><div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Payment Method</div><div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Cash on Delivery</div></div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label className="form-label">Delivery Type</label>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}><input type="radio" name="delivery-type" value="standard" checked={deliveryType === 'standard'} onChange={() => setDeliveryType('standard')}/> Standard</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}><input type="radio" name="delivery-type" value="express" checked={deliveryType === 'express'} onChange={() => setDeliveryType('express')}/> ⚡ Express (+₹{settings.expressDeliveryCharge || 40})</label>
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label className="form-label">Coupon Code</label>
        <div className="coupon-input-row" style={{ marginTop: 8 }}>
          <input className="coupon-input" placeholder="e.g. GAON20" value={couponInput} onChange={e => setCouponInput(e.target.value)}/>
          <button className="apply-btn" onClick={applyCheckoutCoupon}>Apply</button>
        </div>
        {couponMsg && <div style={{ fontSize: 12, marginTop: 4 }}>{couponMsg}</div>}
      </div>
      <div style={{ background: '#1e3a1e', borderRadius: 12, padding: 14, marginBottom: 16, color: '#fff' }}>
        <div className="billing-row"><span>Subtotal ({cartItems.length} items)</span><span>₹{subtotal}</span></div>
        <div className="billing-row"><span>Delivery</span><span>{delivery === 0 ? '🎉 Free' : '₹' + delivery}</span></div>
        {discount > 0 && <div className="billing-row" style={{ color: '#7ecf7e' }}><span>Discount ({appliedCoupon?.code})</span><span>−₹{discount}</span></div>}
        <div className="billing-row" style={{ fontWeight: 800, fontSize: 16, borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 10, color: '#fff' }}><span>Total</span><span style={{ color: '#7ecf7e' }}>₹{total}</span></div>
      </div>
      <button className="btn-primary" style={{ width: '100%', padding: 14, fontSize: 15 }} onClick={placeOrder}>Place Order 🛒</button>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  PRODUCT DETAIL MODAL
// ══════════════════════════════════════════════════════════════════════
function ProductDetailModal({ open, onClose, productId, db, cartItems, onAddToCart, onChangeQty }) {
  const p = db.products.find(x => x.id === productId);
  if (!p) return null;
  const vendor = db.users.find(u => u.id === p.vendorId);
  const inCart = cartItems.find(c => c.id === p.id);
  const discount = p.mrp && p.mrp > p.price ? Math.round((p.mrp - p.price) / p.mrp * 100) : 0;
  const allPhotos = (p.photos || []).filter(Boolean);
  return (
    <Modal open={open} onClose={onClose} style={{ maxWidth: 480, width: '100%', padding: 0, overflow: 'hidden', borderRadius: 20 }}>
      <div style={{ position: 'relative' }}>
        <button className="close-btn" onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, background: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✕</button>
        <div style={{ padding: 20 }}>
          <div style={{ position: 'relative', paddingTop: '60%', background: 'linear-gradient(135deg,#eef5e8,#f7efe6)', overflow: 'hidden', margin: '-20px -20px 16px' }}>
            {allPhotos.length ? <img src={allPhotos[0]} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} alt=""/> : <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 90 }}>{p.emoji || '📦'}</div>}
            {discount > 0 && <span style={{ position: 'absolute', top: 12, left: 12, background: 'var(--green)', color: '#fff', fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 8 }}>{discount}% OFF</span>}
          </div>
          <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>{p.name}</h2>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 10 }}>{p.unit || ''} {p.brand ? `· ${p.brand}` : ''}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: 12, background: 'var(--bg)', borderRadius: 12 }}>
            <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--green)' }}>₹{p.price}</span>
            {p.mrp && p.mrp > p.price && <><span style={{ fontSize: 15, color: 'var(--text3)', textDecoration: 'line-through' }}>₹{p.mrp}</span><span style={{ fontSize: 12, background: '#e8f5e9', color: 'var(--green)', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>Save ₹{p.mrp - p.price}</span></>}
          </div>
          {vendor && <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: 10, marginBottom: 14 }}><span style={{ fontSize: 22 }}>🏪</span><div><div style={{ fontSize: 13, fontWeight: 700 }}>{vendor.storeName || vendor.name}</div><div style={{ fontSize: 11, color: 'var(--text2)' }}>📍 {vendor.location || 'Local Store'}</div></div></div>}
          {(p.description || p.desc) && <div style={{ marginBottom: 14 }}><div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>📋 Product Details</div><p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, background: 'var(--bg)', padding: 12, borderRadius: 10 }}>{p.description || p.desc}</p></div>}
          {inCart ? (
            <div className="qty-selector" style={{ justifyContent: 'center' }}>
              <button className="qty-btn" onClick={() => onChangeQty(p.id, -1)}>−</button>
              <span className="qty-display">{inCart.qty}</span>
              <button className="qty-btn" onClick={() => onChangeQty(p.id, 1)}>+</button>
            </div>
          ) : (
            <button className="btn-primary" style={{ width: '100%', fontSize: 15, padding: 14 }} onClick={() => { onAddToCart(p.id); onClose(); }}>🛒 Add to Cart</button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  VIEW ORDER MODAL
// ══════════════════════════════════════════════════════════════════════
function ViewOrderModal({ open, onClose, orderId, db, currentUser, token, showToast, onRefresh }) {
  const [selStatus, setSelStatus] = useState('');
  const o = db.orders.find(x => x.id === orderId);
  useEffect(() => { if (o) setSelStatus(o.status); }, [o]);
  if (!o) return null;
  const isAdmin = currentUser?.role === 'admin';

  async function updateStatus() {
    try { await apiFetch('/api/orders/' + o.id + '/status', { method: 'PATCH', body: JSON.stringify({ status: selStatus }) }, token); showToast('Order status updated!'); onClose(); onRefresh(); }
    catch (e) { showToast(e.message || 'Failed to update status'); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Order Details">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div><div style={{ fontSize: 20, fontWeight: 700 }}>#{o.id}</div><div style={{ fontSize: 13, color: 'var(--text2)' }}>{o.date}</div></div>
        <span className={`badge ${STATUS_MAP[o.status]?.cls || 'badge-gray'}`}>{STATUS_MAP[o.status]?.label || o.status}</span>
      </div>
      {isAdmin && (
        <div style={{ background: 'var(--green-light)', border: '1.5px solid var(--green-mid)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: 'var(--green)' }}>🔄 Update Status</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <select value={selStatus} onChange={e => setSelStatus(e.target.value)} style={{ flex: 1, padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 13, background: 'var(--white)', cursor: 'pointer', outline: 'none', fontFamily: 'Nunito, sans-serif' }}>
              <option value="processing">⏳ Processing</option>
              <option value="out_for_delivery">🚴 Out for Delivery</option>
              <option value="delivered">✅ Delivered</option>
              <option value="cancelled">❌ Cancelled</option>
            </select>
            <button className="btn-primary" style={{ padding: '9px 20px', fontSize: 13 }} onClick={updateStatus}>Update →</button>
          </div>
        </div>
      )}
      <div style={{ background: 'var(--bg)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>📦 Items</div>
        {o.items.map((i, idx) => <div key={idx} className="billing-row"><span>{i.emoji} {i.name} ×{i.qty}</span><span>₹{i.price * i.qty}</span></div>)}
      </div>
      <div style={{ background: 'var(--bg)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>💰 Billing</div>
        <div className="billing-row"><span>Subtotal</span><span>₹{o.subtotal || o.total}</span></div>
        <div className="billing-row"><span>Delivery</span><span>{(o.delivery || 0) === 0 ? 'Free' : '₹' + (o.delivery || 0)}</span></div>
        {o.discount > 0 && <div className="billing-row" style={{ color: 'var(--green)' }}><span>Discount</span><span>−₹{o.discount}</span></div>}
        <div className="billing-row" style={{ fontSize: 16, fontWeight: 800 }}><span>Total</span><span style={{ color: 'var(--green)' }}>₹{o.total}</span></div>
      </div>
      <div style={{ background: 'var(--green-light)', border: '1.5px solid var(--green)', borderRadius: 12, padding: 14 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--green)' }}>📞 Delivery Contact</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)' }}>{o.customerPhone || 'N/A'}</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>👤 {o.customerName}</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>📍 {o.customerAddress}</div>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  NAV CONFIG
// ══════════════════════════════════════════════════════════════════════
const NAV_CONFIGS = {
  customer: [
    { icon: '🏠', label: 'Shop',      page: 'c-home'     },
    { icon: '📦', label: 'My Orders', page: 'c-orders'   },
    { icon: '⭐', label: 'Feedback',  page: 'c-feedback' },
    { icon: '👤', label: 'Profile',   page: 'c-profile'  },
  ],
  vendor: [
    { icon: '📊', label: 'Dashboard', page: 'v-home'    },
    { icon: '🧾', label: 'Orders',    page: 'v-orders'  },
    { icon: '👤', label: 'My Profile',page: 'v-profile' },
  ],
  admin: [
    { icon: '📊', label: 'Dashboard', page: 'a-home'     },
    { icon: '👥', label: 'Users',     page: 'a-users'    },
    { icon: '✅', label: 'Vendors',   page: 'a-vendors'  },
    { icon: '📦', label: 'Products',  page: 'a-products' },
    { icon: '🧾', label: 'Orders',    page: 'a-orders'   },
    { icon: '🚚', label: 'Delivery',  page: 'a-delivery' },
    { icon: '⭐', label: 'Feedback',  page: 'a-feedback' },
  ],
};

// ══════════════════════════════════════════════════════════════════════
//  MAIN APP
// ══════════════════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState('auth'); // auth | pending | blocked | app
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('gm_token') || null);
  const [pendingEmail, setPendingEmail] = useState('');
  const [db, setDb] = useState({ users: [], products: [], orders: [], feedback: [], settings: {} });
  const [cartItems, setCartItems] = useState([]);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  const [activePage, setActivePage] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Modals
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [productDetailId, setProductDetailId] = useState(null);
  const [viewOrderId, setViewOrderId] = useState(null);

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  }

  const loadSnapshot = useCallback(async (tok) => {
    try {
      const snap = await apiFetch('/api/snapshot', {}, tok || token);
      setDb({ users: snap.users || [], products: snap.products || [], orders: snap.orders || [], feedback: snap.feedback || [], settings: snap.settings || {} });
    } catch (e) { console.warn('Snapshot failed', e); }
  }, [token]);

  async function tryAutoLogin() {
    if (!token) return;
    try {
      const data = await apiFetch('/api/auth/me', {}, token);
      setCurrentUser(data.user);
      await loadSnapshot(token);
      setScreen('app');
    } catch (e) { setToken(null); localStorage.removeItem('gm_token'); }
  }

  useEffect(() => { tryAutoLogin(); }, []); // eslint-disable-line

  function handleLogin(user, tok) {
    setCurrentUser(user);
    setToken(tok);
    loadSnapshot(tok).then(() => {
      setScreen('app');
      const first = NAV_CONFIGS[user.role]?.[0]?.page || '';
      setActivePage(first);
    });
  }

  function doLogout() {
    setCurrentUser(null); setToken(null); setCartItems([]); setAppliedCoupon(null);
    localStorage.removeItem('gm_token');
    setScreen('auth'); setActivePage('');
  }

  function onPending(email) { setPendingEmail(email); setScreen('pending'); }
  function onBlocked() { setScreen('blocked'); }

  useEffect(() => {
    if (screen === 'app' && currentUser && !activePage) {
      setActivePage(NAV_CONFIGS[currentUser.role]?.[0]?.page || '');
    }
  }, [screen, currentUser]); // eslint-disable-line

  function addToCart(pid) {
    if (!currentUser || currentUser.role !== 'customer') { showToast('Please log in as a customer'); return; }
    const p = db.products.find(x => x.id === pid); if (!p) return;
    setCartItems(prev => {
      const existing = prev.find(c => c.id === pid);
      if (existing) return prev.map(c => c.id === pid ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { id: p.id, name: p.name, price: p.price, vendorId: p.vendorId, vendorName: db.users.find(u => u.id === p.vendorId)?.storeName || '', emoji: p.emoji || '📦', qty: 1 }];
    });
    showToast('Added: ' + p.name);
  }

  function changeQty(pid, delta) {
    setCartItems(prev => prev.map(c => c.id === pid ? { ...c, qty: c.qty + delta } : c).filter(c => c.qty > 0));
  }

  const cartTotal = cartItems.reduce((s, c) => s + c.qty, 0);
  const cartAmount = cartItems.reduce((s, c) => s + c.price * c.qty, 0);

  function renderPage() {
    const commonProps = { db, currentUser, token, showToast, onRefresh: () => loadSnapshot() };
    switch (activePage) {
      case 'c-home':    return <ShopPage {...commonProps} cartItems={cartItems} onAddToCart={addToCart} onChangeQty={changeQty} onViewProduct={id => setProductDetailId(id)}/>;
      case 'c-orders':  return <MyOrdersPage {...commonProps} onViewOrder={id => setViewOrderId(id)}/>;
      case 'c-feedback':return <FeedbackPage {...commonProps}/>;
      case 'c-profile': return <CustomerProfile {...commonProps} onLogout={doLogout}/>;
      case 'v-home':    return <VendorDashboard {...commonProps} onAddProduct={() => { if (currentUser.vendorStatus !== 'approved') { showToast('Account not approved yet'); return; } setAddProductOpen(true); }}/>;
      case 'v-orders':  return <VendorOrders {...commonProps}/>;
      case 'v-profile': return <VendorProfile {...commonProps} onLogout={doLogout}/>;
      case 'a-home':    return <AdminDashboard {...commonProps}/>;
      case 'a-users':   return <AdminUsers {...commonProps}/>;
      case 'a-vendors': return <VendorApprovals {...commonProps}/>;
      case 'a-products':return <AdminProducts {...commonProps}/>;
      case 'a-orders':  return <AdminOrders {...commonProps} onViewOrder={id => setViewOrderId(id)}/>;
      case 'a-feedback':return <AdminFeedback {...commonProps}/>;
      case 'a-delivery':return <DeliverySettings {...commonProps}/>;
      default: return null;
    }
  }

  const role = currentUser?.role;
  const navItems = NAV_CONFIGS[role] || [];
  const initials = currentUser ? currentUser.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';
  const avatarCls = `su-avatar${role === 'admin' ? ' admin-av' : role === 'vendor' ? ' vendor-av' : ''}`;

  // ── Auth / Pending / Blocked screens
  if (screen === 'auth') return <AuthScreen onLogin={handleLogin} onPending={onPending} onBlocked={onBlocked}/>;

  if (screen === 'pending') return (
    <div className="pending-screen">
      <div className="pending-box">
        <div className="pending-icon">⏳</div>
        <h2>Approval Pending</h2>
        <p>Your vendor account has been submitted for review. The admin will approve or reject your application.</p>
        <br/>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{pendingEmail}</p>
        <button className="pending-logout" onClick={doLogout}>← Back to Login</button>
      </div>
    </div>
  );

  if (screen === 'blocked') return (
    <div className="blocked-screen">
      <div className="pending-box" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
        <div className="pending-icon">🚫</div>
        <h2 style={{ color: '#fca5a5' }}>Account Blocked</h2>
        <p>Your account has been blocked by the administrator. Please contact support.</p>
        <button className="pending-logout" onClick={doLogout}>← Back to Login</button>
      </div>
    </div>
  );

  // ── Main App
  return (
    <div className="app-screen">
      {/* Hamburger */}
      <button className="hamburger" onClick={() => setSidebarOpen(o => !o)}>
        <i className="fas fa-bars"/>
      </button>

      {/* Sidebar Overlay */}
      <div className={`sidebar-overlay${sidebarOpen ? ' show' : ''}`} onClick={() => setSidebarOpen(false)}/>

      {/* Sidebar */}
      <div className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-logo">
          <h2>Gram<span>Express</span></h2>
          <p>{role ? role.charAt(0).toUpperCase() + role.slice(1) + ' Panel' : 'Dashboard'}</p>
        </div>
        <div className="sidebar-user">
          <div className={avatarCls}>
            {currentUser?.profilePic ? <img src={currentUser.profilePic} alt=""/> : initials}
          </div>
          <div className="su-info">
            <div className="su-name">{currentUser?.name}</div>
            <div className="su-role">{role === 'vendor' ? (currentUser?.storeName || 'Vendor') : role?.charAt(0).toUpperCase() + role?.slice(1)}</div>
          </div>
        </div>
        <div className={`sidebar-role-badge badge-${role}`}>
          {role === 'admin' ? 'Admin' : role === 'vendor' ? 'Vendor' : 'Customer'}
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button key={item.page} className={`nav-item${activePage === item.page ? ' active' : ''}`}
              onClick={() => { setActivePage(item.page); setSidebarOpen(false); }}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="logout-btn" onClick={doLogout}>
            <span>→</span><span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main">{renderPage()}</div>

      {/* Mobile Bottom Nav */}
      {role && (
        <div className="mobile-nav">
          <div className="mobile-nav-items">
            {navItems.map(item => (
              <button key={item.page} className={`mobile-nav-item${activePage === item.page ? ' active' : ''}`}
                onClick={() => setActivePage(item.page)}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
            <button className="mobile-nav-item" onClick={doLogout} style={{ color: 'var(--red)' }}>
              <span>🚪</span><span>Logout</span>
            </button>
          </div>
        </div>
      )}

      {/* Cart Floating Button */}
      {cartTotal > 0 && role === 'customer' && (
        <div className="cart-float" onClick={() => setCartOpen(true)}>
          <span>🛒</span>
          <div className="cart-count">{cartTotal}</div>
          <span>₹{cartAmount}</span>
        </div>
      )}

      {/* Toast */}
      <Toast msg={toastMsg}/>

      {/* Modals */}
      <CartModal
        open={cartOpen} onClose={() => setCartOpen(false)}
        cartItems={cartItems} onChangeQty={changeQty} db={db}
        appliedCoupon={appliedCoupon} onApplyCoupon={setAppliedCoupon}
        onProceed={() => { setCartOpen(false); setCheckoutOpen(true); }}
      />
      <CheckoutModal
        open={checkoutOpen} onClose={() => setCheckoutOpen(false)}
        cartItems={cartItems} db={db} appliedCoupon={appliedCoupon}
        onApplyCoupon={setAppliedCoupon} currentUser={currentUser} token={token}
        showToast={showToast}
        onSuccess={(data, address, phone) => {
          if (currentUser) { currentUser.address = address; currentUser.phone = phone; }
          setCartItems([]); setAppliedCoupon(null); setCheckoutOpen(false);
          showToast('✅ Order placed successfully!');
          loadSnapshot().then(() => setActivePage('c-orders'));
        }}
      />
      <AddProductModal open={addProductOpen} onClose={() => setAddProductOpen(false)} token={token} showToast={showToast} onRefresh={() => loadSnapshot()}/>
      {productDetailId && (
        <ProductDetailModal open={!!productDetailId} onClose={() => setProductDetailId(null)} productId={productDetailId} db={db} cartItems={cartItems} onAddToCart={addToCart} onChangeQty={changeQty}/>
      )}
      {viewOrderId && (
        <ViewOrderModal open={!!viewOrderId} onClose={() => setViewOrderId(null)} orderId={viewOrderId} db={db} currentUser={currentUser} token={token} showToast={showToast} onRefresh={() => loadSnapshot()}/>
      )}
    </div>
  );
}