// script.js
// Générateur de QR pour plusieurs noms de fichiers d'images locales
// Utilise la librairie 'qrcode' (CDN) incluse dans index.html

const idsInput = document.getElementById('idsInput');
const generateAllBtn = document.getElementById('generateAllBtn');
const downloadAllQrBtn = document.getElementById('downloadAllQrBtn');
const clearBtn = document.getElementById('clearBtn');
const helpBtn = document.getElementById('helpBtn');
const gallery = document.getElementById('gallery');

function debounce(fn, wait){
  let t;
  return (...args)=>{ clearTimeout(t); t = setTimeout(()=>fn(...args), wait); };
}

// Retourne l'URL de l'image locale ou null
function getImageUrl(filename){
  if(!filename) return null;
  filename = filename.trim();
  if(filename) return window.location.origin + '/images/' + filename;
  return null;
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
  img.src = imageUrl;
  img.alt = token;
  img.className = 'image-preview';
  img.onerror = ()=>{ img.style.objectFit = 'contain'; img.style.background='#fafafa'; };

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
    qrDataURL = await QRCode.toDataURL(imageUrl, { width: 360, margin: 1, color: { dark: '#000000', light: '#ffffff' } });
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
  downloadQrBtn.download = `qr_${name}.png`;

  const copyLinkBtn = document.createElement('button');
  copyLinkBtn.className = 'copy-btn';
  copyLinkBtn.textContent = 'Copier lien';
  copyLinkBtn.onclick = async ()=>{
    try{ await navigator.clipboard.writeText(imageUrl); copyLinkBtn.textContent = 'Copié!'; setTimeout(()=>copyLinkBtn.textContent='Copier lien',1200); }catch(e){ alert('Impossible de copier'); }
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
    if(img && img.src.startsWith('data:image/png;base64,')){
      const name = img.alt.replace('QR ', '').replace(/\.[^/.]+$/, ""); // Nom sans extension
      const base64Data = img.src.split(',')[1];
      zip.file(`qr_${name}.png`, base64Data, {base64: true});
      count++;
    }
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
helpBtn.addEventListener('click', ()=>{ alert('Collez un nom de fichier d\'image (ex: image.jpg) situé dans le dossier images/. Un nom par ligne ou séparés par virgule.'); });

// Regénérer si la fenêtre change (pratique si la mise en page varie)
window.addEventListener('resize', debounce(()=>{ /* nothing auto: attendre action utilisateur */ }, 200));

// Optionnel: génération initiale si textarea contient des exemples
window.addEventListener('load', ()=>{ if(idsInput.value.trim()) generateAll(); });
