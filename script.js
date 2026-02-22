// script.js
// Générateur de QR pour plusieurs IDs/URLs Google Drive
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

// Retourne l'ID d'un lien Drive ou null
function extractDriveId(token){
  if(!token) return null;
  token = token.trim();
  // URL forms
  try{
    const u = new URL(token);
    if(u.hostname.includes('drive.google.com')){
      // ?id=ID
      if(u.searchParams.get('id')) return u.searchParams.get('id');
      // /file/d/ID/
      const m = token.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
      if(m) return m[1];
    }
  }catch(e){
    // not a url
  }
  // If looks like an id (alphanum with - _ and length >= 10)
  const idMatch = token.match(/^([a-zA-Z0-9_-]{10,})$/);
  if(idMatch) return idMatch[1];
  return null;
}

// Convertit ID en lien direct affichable (image)
function directImageUrlFromId(id){
  return `https://drive.google.com/uc?export=view&id=${id}`;
}

// Crée l'URL de partage qui sera encodée dans le QR (ouvre viewer.html qui charge l'image)
function makeViewerUrlForImage(imageUrl){
  const u = new URL(window.location.href);
  // Remplace le nom du fichier pour pointer vers viewer.html
  u.pathname = u.pathname.replace(/[^\/]+$/, 'viewer.html');
  u.search = '?img=' + encodeURIComponent(imageUrl);
  return u.toString();
}

// Génère une carte pour un ID/URL
async function createCardForToken(token){
  const id = extractDriveId(token);
  if(!id) return null;

  const imageUrl = directImageUrlFromId(id);
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
  img.alt = id;
  img.style.width = '100%';
  img.style.height = '140px';
  img.style.objectFit = 'cover';
  img.onerror = ()=>{ img.style.objectFit = 'contain'; img.style.background='#fafafa'; };

  const info = document.createElement('div');
  info.style.display = 'flex';
  info.style.justifyContent = 'space-between';
  info.style.alignItems = 'center';

  const idLabel = document.createElement('div');
  idLabel.textContent = id;
  idLabel.style.fontSize = '12px';
  idLabel.style.color = '#333';
  idLabel.style.wordBreak = 'break-all';

  const btns = document.createElement('div');
  btns.style.display = 'flex';
  btns.style.gap = '6px';

  // Générer QR en dataURL — le QR encode le lien direct de l'image Drive
  let qrDataURL = null;
  try{
    qrDataURL = await QRCode.toDataURL(imageUrl, { width: 360, margin: 1, color: { dark: '#000000', light: '#ffffff' } });
  }catch(e){
    console.error('Erreur génération QR pour', id, e);
  }

  const qrImg = document.createElement('img');
  qrImg.alt = 'QR ' + id;
  qrImg.style.width = '120px';
  qrImg.style.height = '120px';
  qrImg.style.objectFit = 'contain';
  if(qrDataURL) qrImg.src = qrDataURL;


  const downloadQrBtn = document.createElement('a');
  downloadQrBtn.textContent = 'Télécharger QR';
  downloadQrBtn.href = qrDataURL || '#';
  downloadQrBtn.download = `qr_${id}.png`;
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
helpBtn.addEventListener('click', ()=>{ alert('Collez un ID (ex: 1a2B3c4D...) ou l\'URL de partage Drive. Un ID par ligne ou séparés par virgule.'); });

// Regénérer si la fenêtre change (pratique si la mise en page varie)
window.addEventListener('resize', debounce(()=>{ /* nothing auto: attendre action utilisateur */ }, 200));

// Optionnel: génération initiale si textarea contient des exemples
window.addEventListener('load', ()=>{ if(idsInput.value.trim()) generateAll(); });
