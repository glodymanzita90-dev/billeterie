// script.js
// Générateur de QR pour plusieurs noms de fichiers d'images locales
// Utilise la librairie 'qrcode' (CDN) incluse dans index.html

const idsInput = document.getElementById('idsInput');
const generateAllBtn = document.getElementById('generateAllBtn');
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
  // Card elements
  const card = document.createElement('div');
  card.style.border = '1px solid #e6e6e6';
  card.style.padding = '10px';
  card.style.borderRadius = '8px';
  card.style.background = '#fff';
  card.style.display = 'flex';
  card.style.flexDirection = 'column';
  card.style.gap = '8px';

  const img = document.createElement('img');
  img.src = imageUrl;
  img.alt = token;
  img.style.width = '100%';
  img.style.height = '140px';
  img.style.objectFit = 'cover';
  img.onerror = ()=>{ img.style.objectFit = 'contain'; img.style.background='#fafafa'; };

  const info = document.createElement('div');
  info.style.display = 'flex';
  info.style.justifyContent = 'space-between';
  info.style.alignItems = 'center';

  const idLabel = document.createElement('div');
  idLabel.textContent = token;
  idLabel.style.fontSize = '12px';
  idLabel.style.color = '#333';
  idLabel.style.wordBreak = 'break-all';

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
  qrImg.style.width = '120px';
  qrImg.style.height = '120px';
  qrImg.style.objectFit = 'contain';
  if(qrDataURL) qrImg.src = qrDataURL;


  const downloadQrBtn = document.createElement('a');
  downloadQrBtn.textContent = 'Télécharger QR';
  downloadQrBtn.href = qrDataURL || '#';
  downloadQrBtn.download = `qr_${token}.png`;
  downloadQrBtn.style.padding = '6px 8px';
  downloadQrBtn.style.background = '#2563eb';
  downloadQrBtn.style.color = '#fff';
  downloadQrBtn.style.borderRadius = '6px';
  downloadQrBtn.style.textDecoration = 'none';

  const copyLinkBtn = document.createElement('button');
  copyLinkBtn.textContent = 'Copier lien';
  copyLinkBtn.style.padding = '6px 8px';
  copyLinkBtn.style.borderRadius = '6px';
  copyLinkBtn.style.border = '0';
  copyLinkBtn.style.background = '#efefef';
  // Copier le lien direct de l'image (pas le viewer)
  copyLinkBtn.onclick = async ()=>{
    try{ await navigator.clipboard.writeText(imageUrl); copyLinkBtn.textContent = 'Copié!'; setTimeout(()=>copyLinkBtn.textContent='Copier lien',1200); }catch(e){ alert('Impossible de copier'); }
  };

  btns.appendChild(downloadQrBtn);
  btns.appendChild(copyLinkBtn);

  info.appendChild(idLabel);
  info.appendChild(btns);

  const bottom = document.createElement('div');
  bottom.style.display = 'flex';
  bottom.style.justifyContent = 'space-between';
  bottom.style.alignItems = 'center';

  bottom.appendChild(qrImg);
  bottom.appendChild(img);

  card.appendChild(info);
  card.appendChild(bottom);

  return card;
}

// Parse input (séparateurs: newline, comma, semicolon)
function parseTokens(text){
  return text.split(/\r?\n|,|;/).map(t=>t.trim()).filter(Boolean);
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
}

generateAllBtn.addEventListener('click', ()=>{ generateAll(); });
clearBtn.addEventListener('click', ()=>{ idsInput.value = ''; gallery.innerHTML=''; });
helpBtn.addEventListener('click', ()=>{ alert('Collez un nom de fichier d\'image (ex: image.jpg) situé dans le dossier images/. Un nom par ligne ou séparés par virgule.'); });

// Regénérer si la fenêtre change (pratique si la mise en page varie)
window.addEventListener('resize', debounce(()=>{ /* nothing auto: attendre action utilisateur */ }, 200));

// Optionnel: génération initiale si textarea contient des exemples
window.addEventListener('load', ()=>{ if(idsInput.value.trim()) generateAll(); });
