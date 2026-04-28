// script.js
// Générateur de QR pour plusieurs noms de fichiers d'images locales
// Utilise la librairie 'qrcode' (CDN) incluse dans index.html

const idsInput = document.getElementById('idsInput');
const generateAllBtn = document.getElementById('generateAllBtn');
const downloadAllQrBtn = document.getElementById('downloadAllQrBtn');
const clearBtn = document.getElementById('clearBtn');
const helpBtn = document.getElementById('helpBtn');
const gallery = document.getElementById('gallery');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

function debounce(fn, wait){
  let t;
  return (...args)=>{ clearTimeout(t); t = setTimeout(()=>fn(...args), wait); };
}

// Sanitize filename for downloads
function sanitizeFilename(name){
  return (name||'file').replace(/[^a-z0-9_.-]/gi, '_');
}

// Convert an image source (data: URL or external URL or object URL) to a JPEG Blob
function toJpegBlobFromSrc(src, quality=0.92){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = ()=>{
      try{
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob)=>{
          if(blob) resolve(blob); else reject(new Error('Conversion failed'));
        }, 'image/jpeg', quality);
      }catch(e){ reject(e); }
    };
    img.onerror = (e)=> reject(new Error('Image load error'));
    img.src = src;
  });
}

async function blobToJpegBlob(blob, quality=0.92){
  const obj = URL.createObjectURL(blob);
  try{
    const jpeg = await toJpegBlobFromSrc(obj, quality);
    return jpeg;
  }finally{ URL.revokeObjectURL(obj); }
}

// Gestion du drag & drop
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.style.borderColor = 'var(--primary-color)';
  dropZone.style.background = '#eef2ff';
});
dropZone.addEventListener('dragleave', () => {
  dropZone.style.borderColor = '#d1d5db';
  dropZone.style.background = '#f9fafb';
});
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.style.borderColor = '#d1d5db';
  dropZone.style.background = '#f9fafb';
  const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
  handleFiles(files);
});
fileInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  handleFiles(files);
});

function handleFiles(files) {
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      createCardForUploadedImage(file.name, dataUrl);
    };
    reader.readAsDataURL(file);
  });
}

// Génère une carte pour une image uploadée (data URL)
async function createCardForUploadedImage(filename, dataUrl){
  const name = filename.replace(/\.[^/.]+$/, ""); // Nom sans extension

  // Card elements
  const card = document.createElement('div');
  card.className = 'gallery-item';

  const img = document.createElement('img');
  img.src = dataUrl;
  img.alt = filename;
  img.className = 'image-preview';

  const info = document.createElement('div');
  info.className = 'info';

  const idLabel = document.createElement('div');
  idLabel.className = 'name';
  idLabel.textContent = filename;

  const btns = document.createElement('div');
  btns.className = 'buttons';

  // Générer QR avec la data URL
  let qrDataURL = null;
  try{
    qrDataURL = await QRCode.toDataURL(dataUrl, { width: 360, margin: 1, color: { dark: '#000000', light: '#ffffff' } });
  }catch(e){
    console.error('Erreur génération QR pour', filename, e);
  }

  const qrImg = document.createElement('img');
  qrImg.alt = 'QR ' + filename;
  qrImg.className = 'qr-image';
  if(qrDataURL) qrImg.src = qrDataURL;

  const downloadQrBtn = document.createElement('a');
  downloadQrBtn.className = 'download-btn';
  downloadQrBtn.textContent = 'Télécharger QR';
  downloadQrBtn.href = qrDataURL || '#';
  downloadQrBtn.download = `qr_${sanitizeFilename(name)}.png`;
  // Force download as JPG: convert data URLs or fetched images to JPEG before saving
  downloadQrBtn.download = `qr_${sanitizeFilename(name)}.jpg`;
  downloadQrBtn.addEventListener('click', async (e)=>{
    try{
      const href = downloadQrBtn.href || '';
      if(!href || href === '#'){ e.preventDefault(); return; }
      e.preventDefault();
      let jpegBlob = null;
      if(href.startsWith('data:')){
        jpegBlob = await toJpegBlobFromSrc(href);
      } else {
        const resp = await fetch(href);
        if(!resp.ok) throw new Error('Network error');
        const b = await resp.blob();
        jpegBlob = await blobToJpegBlob(b);
      }
      const obj = URL.createObjectURL(jpegBlob);
      const a = document.createElement('a');
      a.href = obj;
      a.download = downloadQrBtn.download;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(obj);
    }catch(err){ alert('Impossible de télécharger le QR: '+err.message); }
  });

  const copyLinkBtn = document.createElement('button');
  copyLinkBtn.className = 'copy-btn';
  copyLinkBtn.textContent = 'Copier data URL';
  copyLinkBtn.onclick = async ()=>{
    try{ await navigator.clipboard.writeText(dataUrl); copyLinkBtn.textContent = 'Copié!'; setTimeout(()=>copyLinkBtn.textContent='Copier data URL',1200); }catch(e){ alert('Impossible de copier'); }
  };

  btns.appendChild(downloadQrBtn);
  btns.appendChild(copyLinkBtn);

  info.appendChild(idLabel);
  info.appendChild(btns);

  const qrContainer = document.createElement('div');
  qrContainer.className = 'qr-container';
  qrContainer.appendChild(qrImg);

  card.appendChild(img);
  card.appendChild(qrContainer);
  card.appendChild(info);

  gallery.appendChild(card);
}

// Retourne l'URL de l'image locale ou null
// Retourne les URLs candidates pour l'image (primary puis fallback)
function getImageUrl(filename){
  if(!filename) return null;
  filename = filename.trim();
  if(!filename) return null;
  const origin = window.location.origin;
  // Par défaut le projet contient un dossier `qrcodes/` et un dossier `images/`.
  // On tente d'abord `qrcodes/`, puis `images/` en fallback.
  return {
    primary: origin + '/qrcodes/' + filename,
    fallback: origin + '/images/' + filename
  };
}

// Génère une carte pour un nom de fichier d'image
async function createCardForToken(token){
  const imageUrl = getImageUrl(token);
  if(!imageUrl) return null;

  const name = token.replace(/\.[^/.]+$/, ""); // Nom sans extension pour le QR
  // Card elements
  const card = document.createElement('div');
  card.className = 'gallery-item';

  const img = document.createElement('img');
  img.src = imageUrl.primary;
  img.alt = token;
  img.className = 'image-preview';
  img.onerror = async ()=>{
    // Si le chemin primary échoue, tenter le fallback une seule fois
    if(!img.dataset.triedFallback){
      img.dataset.triedFallback = '1';
      img.src = imageUrl.fallback;
      // Régénérer le QR pour pointer vers la bonne URL (fallback)
          try{
            const newQr = await QRCode.toDataURL(imageUrl.fallback, { width: 360, margin: 1, color: { dark: '#000000', light: '#ffffff' } });
            if(newQr){
              qrImg.src = newQr;
              downloadQrBtn.href = newQr;
              downloadQrBtn.download = `qr_${sanitizeFilename(name)}.jpg`;
              // Mettre à jour le lien copié
              copyLinkBtn.onclick = async ()=>{ try{ await navigator.clipboard.writeText(imageUrl.fallback); copyLinkBtn.textContent = 'Copié!'; setTimeout(()=>copyLinkBtn.textContent='Copier lien',1200); }catch(e){ alert('Impossible de copier'); } };
            }
          }catch(e){ /* ignore */ }
      return;
    }
    img.style.objectFit = 'contain'; img.style.background='#fafafa';
  };

  const info = document.createElement('div');
  info.className = 'info';

  const idLabel = document.createElement('div');
  idLabel.className = 'name';
  idLabel.textContent = token;

  const btns = document.createElement('div');
  btns.style.display = 'flex';
  btns.style.gap = '6px';

  // Générer QR en dataURL — le QR encode le lien direct de l'image locale
  let qrDataURL = null;
  try{
    // QR encode l'URL de l'image (primary par défaut)
    const targetUrl = (typeof imageUrl === 'string') ? imageUrl : (imageUrl.primary || imageUrl);
    qrDataURL = await QRCode.toDataURL(targetUrl, { width: 360, margin: 1, color: { dark: '#000000', light: '#ffffff' } });
  }catch(e){
    console.error('Erreur génération QR pour', token, e);
  }

  const qrImg = document.createElement('img');
  qrImg.alt = 'QR ' + token;
  qrImg.className = 'qr-image';
  if(qrDataURL) qrImg.src = qrDataURL;


  const downloadQrBtn = document.createElement('a');
  downloadQrBtn.className = 'download-btn';
  downloadQrBtn.textContent = 'Télécharger QR';
  downloadQrBtn.href = qrDataURL || '#';
  downloadQrBtn.download = `qr_${sanitizeFilename(name)}.jpg`;
  downloadQrBtn.addEventListener('click', async (e)=>{
    try{
      const href = downloadQrBtn.href || '';
      if(!href || href === '#'){ e.preventDefault(); return; }
      e.preventDefault();
      let jpegBlob = null;
      if(href.startsWith('data:')){
        jpegBlob = await toJpegBlobFromSrc(href);
      } else {
        const resp = await fetch(href);
        if(!resp.ok) throw new Error('Network error');
        const b = await resp.blob();
        jpegBlob = await blobToJpegBlob(b);
      }
      const obj = URL.createObjectURL(jpegBlob);
      const a = document.createElement('a');
      a.href = obj;
      a.download = downloadQrBtn.download;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(obj);
    }catch(err){ alert('Impossible de télécharger le QR: '+err.message); }
  });

  const copyLinkBtn = document.createElement('button');
  copyLinkBtn.className = 'copy-btn';
  copyLinkBtn.textContent = 'Copier lien';
  copyLinkBtn.onclick = async ()=>{
    try{ await navigator.clipboard.writeText(imageUrl.primary); copyLinkBtn.textContent = 'Copié!'; setTimeout(()=>copyLinkBtn.textContent='Copier lien',1200); }catch(e){ alert('Impossible de copier'); }
  };

  // Bouton Imprimer: ouvre une fenêtre contenant l'image et le QR côte-à-côte puis déclenche print
  const printBtn = document.createElement('button');
  printBtn.className = 'print-btn';
  printBtn.textContent = 'Imprimer';
  printBtn.onclick = async ()=>{
    // S'assurer que le QR existe (générer si nécessaire)
    let finalQr = qrDataURL;
    if(!finalQr){
      try{ finalQr = await QRCode.toDataURL(imageUrl.primary, { width: 360, margin: 1 }); }catch(e){}
    }
    const finalImgSrc = img.src || imageUrl.primary;
    const popup = window.open('', '_blank');
    if(!popup) { alert('Autorisez les popups pour imprimer.'); return; }
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Impression QR</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;margin:20px} .wrap{display:flex;gap:20px;align-items:center} img{max-width:45vw;max-height:80vh;border:1px solid #ddd;padding:6px;border-radius:8px}</style>
      </head><body>
      <h3>${token}</h3>
      <div class="wrap">
        <img src="${finalImgSrc}" alt="image" />
        <img src="${finalQr||''}" alt="qr" />
      </div>
      <script>window.onload=()=>{ setTimeout(()=>{ window.print(); },400); };</script>
      </body></html>`;
    popup.document.open(); popup.document.write(html); popup.document.close();
  };

  btns.appendChild(downloadQrBtn);
  btns.appendChild(copyLinkBtn);
  btns.appendChild(printBtn);

  info.appendChild(idLabel);
  info.appendChild(btns);

  const qrContainer = document.createElement('div');
  qrContainer.className = 'qr-container';
  qrContainer.appendChild(qrImg);

  card.appendChild(img);
  card.appendChild(qrContainer);
  card.appendChild(info);

  return card;
}

async function downloadAllQRs(){
  const cards = gallery.querySelectorAll('.gallery-item');
  if(cards.length === 0){
    alert('Aucun QR généré. Générez d\'abord les QR.');
    return;
  }

  const zip = new JSZip();
  let count = 0;
  for(const card of cards){
    const img = card.querySelector('img[alt^="QR"]');
    if(!img) continue;
    const name = img.alt.replace('QR ', '').replace(/\.[^/.]+$/, ""); // Nom sans extension
    try{
      if(img.src && img.src.startsWith('data:')){
        try{
          const jpegBlob = await toJpegBlobFromSrc(img.src);
          const ab = await jpegBlob.arrayBuffer();
          zip.file(`qr_${sanitizeFilename(name)}.jpg`, ab);
          count++;
        }catch(e){ /* skip */ }
      } else if(img.src){
        // Fetch the image and convert to JPEG then add binary content to the zip
        try{
          const resp = await fetch(img.src);
          if(resp.ok){
            const b = await resp.blob();
            const jpegBlob = await blobToJpegBlob(b);
            const ab = await jpegBlob.arrayBuffer();
            zip.file(`qr_${sanitizeFilename(name)}.jpg`, ab);
            count++;
          }
        }catch(e){ /* skip this image */ }
      }
    }catch(e){ /* continue on error */ }
  }

  if(count === 0){
    alert('Aucun QR valide trouvé.');
    return;
  }

  const content = await zip.generateAsync({type: 'blob'});
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'all_qrcodes.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function generateAll(){
  const raw = idsInput.value || '';
  const tokens = parseTokens(raw);
  gallery.innerHTML = '';
  if(tokens.length === 0) return;
  // Pour chaque token, créer la carte
  for(const t of tokens){
    const card = await createCardForToken(t);
    if(card) gallery.appendChild(card);
    else {
      const err = document.createElement('div');
      err.textContent = 'Entrée invalide: ' + t;
      err.style.color = '#b00';
      err.style.fontSize = '13px';
      gallery.appendChild(err);
    }
  }
  // Télécharger automatiquement tous les QR après génération
  setTimeout(() => downloadAllQRs(), 500); // Petit délai pour s'assurer que tout est rendu
}

generateAllBtn.addEventListener('click', ()=>{ generateAll(); });
downloadAllQrBtn.addEventListener('click', ()=>{ downloadAllQRs(); });
clearBtn.addEventListener('click', ()=>{ idsInput.value = ''; gallery.innerHTML=''; });
helpBtn.addEventListener('click', ()=>{ alert('Glissez des images dans la zone ou sélectionnez-les pour générer des QR instantanément. Ou entrez des noms de fichiers d\'images (ex: image.jpg) situés dans le dossier images/. Les QR sont uniques et liés à chaque image.'); });

// Regénérer si la fenêtre change (pratique si la mise en page varie)
window.addEventListener('resize', debounce(()=>{ /* nothing auto: attendre action utilisateur */ }, 200));

// Optionnel: génération initiale si textarea contient des exemples
window.addEventListener('load', ()=>{ if(idsInput.value.trim()) generateAll(); });
