
// Shared Firebase app logic for Gloryshop
// Requires firebaseConfig.js to be present in the same folder.
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Auth state handling
auth.onAuthStateChanged(async user => {
  window.currentUser = user;
  const isAdmin = user ? await checkIsAdmin(user.uid) : false;
  window.isAdmin = isAdmin;
  // Custom event for other scripts to react
  document.dispatchEvent(new CustomEvent('auth-changed', {detail:{user,isAdmin}}));
});

async function checkIsAdmin(uid) {
  try {
    const doc = await db.collection('roles').doc(uid).get();
    return doc.exists && doc.data().admin === true;
  } catch(e) {
    console.error('checkIsAdmin', e);
    return false;
  }
}

// Homepage images
async function loadHomepageImages(containerId='hero-carousel') {
  const container = document.getElementById(containerId);
  if(!container) return;
  const imgs = [];
  try{
    const snap = await db.collection('homepage_images').orderBy('order').get();
    snap.forEach(d=> imgs.push(d.data().url));
  }catch(e){ console.warn('no homepage_images collection', e); }
  if(imgs.length===0){
    // fallback to assets/logo.png repeated
    imgs.push('assets/logo.png');
  }
  // build simple slider
  container.innerHTML = '';
  const slider = document.createElement('div');
  slider.className = 'slider';
  imgs.forEach((src, i)=>{
    const img = document.createElement('img');
    img.src = src;
    img.dataset.index = i;
    img.style.display = i===0 ? 'block':'none';
    img.alt = 'Dongfeng Glory 330S';
    slider.appendChild(img);
  });
  const prev = document.createElement('button'); prev.textContent='‹'; prev.className='slider-btn prev';
  const next = document.createElement('button'); next.textContent='›'; next.className='slider-btn next';
  container.appendChild(slider); container.appendChild(prev); container.appendChild(next);
  let idx=0;
  function show(i){
    const images = slider.querySelectorAll('img');
    images.forEach((im,ii)=> im.style.display = ii===i ? 'block':'none');
  }
  prev.onclick = ()=>{ idx = (idx-1+imgs.length)%imgs.length; show(idx); };
  next.onclick = ()=>{ idx = (idx+1)%imgs.length; show(idx); };
  // auto rotate
  setInterval(()=>{ idx = (idx+1)%imgs.length; show(idx); }, 5000);
}

// Products loading for catalog
async function loadProducts(containerId='products-grid') {
  const container = document.getElementById(containerId);
  if(!container) return;
  container.innerHTML = '<p class="small">Cargando productos...</p>';
  try{
    const snap = await db.collection('products').orderBy('createdAt','desc').get();
    if(snap.empty){ container.innerHTML = '<p class="small">No hay productos aún.</p>'; return; }
    container.innerHTML = '';
    snap.forEach(doc => {
      const p = doc.data(); p.id = doc.id;
      const card = document.createElement('div'); card.className='product card';
      card.innerHTML = `
        <img src="${p.image || 'assets/logo.png'}" alt="${p.name}"/>
        <h3>${p.name}</h3>
        <p class="small">${p.description || ''}</p>
        <p><strong>$${p.price || '0.00'}</strong></p>
      `;
      const btn = document.createElement('button'); btn.className='btn'; btn.textContent='Agregar al carrito';
      btn.onclick = ()=> addToCart(p);
      card.appendChild(btn);
      container.appendChild(card);
    });
  }catch(e){
    console.error('loadProducts', e);
    container.innerHTML = '<p class="small">Error cargando productos.</p>';
  }
}

async function addToCart(product){
  const user = auth.currentUser;
  if(!user){ alert('Debes iniciar sesión para agregar al carrito.'); window.location='login.html'; return; }
  const cartRef = db.collection('carts').doc(user.uid);
  try{
    const cartDoc = await cartRef.get();
    let items = cartDoc.exists ? cartDoc.data().items || [] : [];
    const existing = items.find(i=>i.id===product.id);
    if(existing) existing.qty = (existing.qty||1)+1;
    else items.push({id:product.id, name:product.name, price:product.price, qty:1, image:product.image||''});
    await cartRef.set({items, updatedAt: firebase.firestore.FieldValue.serverTimestamp()});
    alert('Producto agregado al carrito.');
  }catch(e){ console.error('addToCart', e); alert('Error agregando al carrito.'); }
}

// Models
async function loadModels(containerId='models-list') {
  const container = document.getElementById(containerId);
  if(!container) return;
  container.innerHTML = '<p class="small">Cargando modelos...</p>';
  try{
    const snap = await db.collection('models').orderBy('category').get();
    if(snap.empty){ container.innerHTML = '<p class="small">No hay modelos aún.</p>'; return; }
    // group by category -> model -> years
    const data = {};
    snap.forEach(d=>{
      const m = d.data(); m.id = d.id;
      if(!data[m.category]) data[m.category]={};
      if(!data[m.category][m.model]) data[m.category][m.model] = [];
      data[m.category][m.model].push(m);
    });
    container.innerHTML='';
    for(const cat of Object.keys(data)){
      const catEl = document.createElement('div'); catEl.className='card';
      catEl.innerHTML = `<h3>${cat}</h3>`;
      for(const modelName of Object.keys(data[cat])){
        const modelEl = document.createElement('div');
        modelEl.innerHTML = `<h4>${modelName}</h4>`;
        data[cat][modelName].forEach(item => {
          const btn = document.createElement('button'); btn.className='small btn'; btn.textContent = item.year;
          btn.onclick = ()=> showModelDetail(item);
          modelEl.appendChild(btn);
        });
        catEl.appendChild(modelEl);
      }
      container.appendChild(catEl);
    }
  }catch(e){ console.error('loadModels', e); container.innerHTML='<p class="small">Error cargando modelos.</p>'; }
}

function showModelDetail(item){
  // show modal-like detail
  const win = window.open('', '_blank', 'width=800,height=700');
  win.document.write(`<h2>${item.category} - ${item.model} (${item.year})</h2>`);
  win.document.write(`<img src="${item.image||'assets/logo.png'}" style="max-width:100%"><pre>${JSON.stringify(item.specs||{}, null, 2)}</pre>`);
}

// Videos
async function loadVideos(containerId='videos-grid') {
  const container = document.getElementById(containerId);
  if(!container) return;
  container.innerHTML = '<p class="small">Cargando videos...</p>';
  try{
    const snap = await db.collection('videos').orderBy('createdAt','desc').get();
    if(snap.empty){ container.innerHTML = '<p class="small">No hay videos aún.</p>'; return; }
    container.innerHTML = '';
    snap.forEach(d=>{
      const v = d.data();
      const card = document.createElement('div'); card.className='card';
      if(v.url){
        card.innerHTML = `<h3>${v.title}</h3><video controls src="${v.url}" style="max-width:100%"></video>`;
      } else if(v.embed){
        card.innerHTML = `<h3>${v.title}</h3>${v.embed}`;
      }
      container.appendChild(card);
    });
  }catch(e){ console.error('loadVideos', e); container.innerHTML='<p class="small">Error cargando videos.</p>'; }
}

