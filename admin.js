
// Admin logic: upload products, videos, models, homepage images
// Assumes app.js has initialized firebase, auth, db, storage

document.addEventListener('auth-changed', e=>{
  if(!e.detail.user || !e.detail.isAdmin){
    // redirect non-admins away
    document.body.innerHTML = '<div class="container card"><h2>No autorizado</h2><p>Debes ser administrador para ver esta página.</p></div>';
  } else {
    initAdminUI();
  }
});

function initAdminUI(){
  // build simple admin UI if not present
  if(!document.getElementById('admin-area')){
    const div = document.createElement('div'); div.id='admin-area'; div.className='container';
    div.innerHTML = `
      <h2>Panel Administrativo</h2>
      <section class="card"><h3>Agregar producto</h3>
        <input id="prod-name" placeholder="Nombre"/><br/>
        <textarea id="prod-desc" placeholder="Descripción"></textarea><br/>
        <input id="prod-price" placeholder="Precio"/><br/>
        <input type="file" id="prod-image"/><br/>
        <button id="prod-upload" class="btn">Subir producto</button>
      </section>
      <section class="card"><h3>Agregar video</h3>
        <input id="video-title" placeholder="Título"/><br/>
        <input id="video-file" type="file" accept="video/*"/><br/>
        <input id="video-embed" placeholder="Embed HTML (opcional)"/><br/>
        <button id="video-upload" class="btn">Subir video</button>
      </section>
      <section class="card"><h3>Agregar modelo</h3>
        <input id="model-category" placeholder="Categoría (e.g. Pasajeros)"/><br/>
        <input id="model-name" placeholder="Modelo (e.g. Glory 330S)"/><br/>
        <input id="model-year" placeholder="Año"/><br/>
        <input type="file" id="model-image"/><br/>
        <textarea id="model-specs" placeholder='Especificaciones JSON (ej: {"motor":"1.3L","potencia":"85hp"})'></textarea><br/>
        <button id="model-upload" class="btn">Subir modelo</button>
      </section>
      <section class="card"><h3>Imágenes inicio (carrusel)</h3>
        <input type="file" id="hero-image" accept="image/*"/><br/>
        <input id="hero-order" placeholder="Orden (número)"/><br/>
        <button id="hero-upload" class="btn">Subir imagen inicio</button>
      </section>
    `;
    document.body.prepend(div);
    // attach handlers
    document.getElementById('prod-upload').onclick = uploadProduct;
    document.getElementById('video-upload').onclick = uploadVideo;
    document.getElementById('model-upload').onclick = uploadModel;
    document.getElementById('hero-upload').onclick = uploadHeroImage;
  }
}

async function uploadProduct(){
  const name = document.getElementById('prod-name').value.trim();
  const desc = document.getElementById('prod-desc').value.trim();
  const price = parseFloat(document.getElementById('prod-price').value) || 0;
  const file = document.getElementById('prod-image').files[0];
  if(!name){ alert('Nombre requerido'); return; }
  let imageUrl = '';
  try{
    if(file){
      const ref = storage.ref('products/'+Date.now() + '_' + file.name);
      await ref.put(file);
      imageUrl = await ref.getDownloadURL();
    }
    const doc = {name, description:desc, price, image: imageUrl, createdAt: firebase.firestore.FieldValue.serverTimestamp()};
    await db.collection('products').add(doc);
    alert('Producto subido');
  }catch(e){ console.error(e); alert('Error subiendo producto'); }
}

async function uploadVideo(){
  const title = document.getElementById('video-title').value.trim();
  const file = document.getElementById('video-file').files[0];
  const embed = document.getElementById('video-embed').value.trim();
  if(!title){ alert('Título requerido'); return; }
  try{
    let url = '';
    if(file){
      const ref = storage.ref('videos/'+Date.now() + '_' + file.name);
      await ref.put(file);
      url = await ref.getDownloadURL();
    }
    await db.collection('videos').add({title, url, embed, createdAt: firebase.firestore.FieldValue.serverTimestamp()});
    alert('Video subido');
  }catch(e){ console.error(e); alert('Error subiendo video'); }
}

async function uploadModel(){
  const category = document.getElementById('model-category').value.trim();
  const model = document.getElementById('model-name').value.trim();
  const year = document.getElementById('model-year').value.trim();
  const file = document.getElementById('model-image').files[0];
  const specsText = document.getElementById('model-specs').value.trim();
  if(!category || !model || !year){ alert('Completa categoría, modelo y año'); return; }
  let imageUrl = '';
  try{
    if(file){
      const ref = storage.ref('models/'+Date.now() + '_' + file.name);
      await ref.put(file);
      imageUrl = await ref.getDownloadURL();
    }
    let specs = {};
    try{ specs = specsText ? JSON.parse(specsText) : {}; }catch(e){ alert('Especificaciones JSON inválido'); return; }
    await db.collection('models').add({category, model, year, image: imageUrl, specs, createdAt: firebase.firestore.FieldValue.serverTimestamp()});
    alert('Modelo subido');
  }catch(e){ console.error(e); alert('Error subiendo modelo'); }
}

async function uploadHeroImage(){
  const file = document.getElementById('hero-image').files[0];
  const order = parseInt(document.getElementById('hero-order').value) || 0;
  if(!file){ alert('Selecciona imagen'); return; }
  try{
    const ref = storage.ref('homepage/'+Date.now() + '_' + file.name);
    await ref.put(file);
    const url = await ref.getDownloadURL();
    await db.collection('homepage_images').add({url, order, createdAt: firebase.firestore.FieldValue.serverTimestamp()});
    alert('Imagen de inicio subida');
  }catch(e){ console.error(e); alert('Error subiendo imagen de inicio'); }
}

