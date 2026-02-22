const { JSDOM } = require('jsdom');
const fs = require('fs').promises;
const path = require('path');

(async ()=>{
  try{
    const root = path.resolve('.');
    const indexPath = path.join(root, 'index.html');
    const scriptPath = path.join(root, 'script.js');

    const html = await fs.readFile(indexPath, 'utf8');
    const scriptCode = await fs.readFile(scriptPath, 'utf8');

    // JSDOM avec url pour que window.location fonctionne (remplace index.html path)
    const dom = new JSDOM(html, { runScripts: 'outside-only', resources: 'usable', url: 'file://' + indexPath.replace(/\\/g, '/') });
    const { window } = dom;

    // Fournir une implementation minimale pour clipboard
    window.navigator.clipboard = { writeText: async ()=>{} };

    // Injecter la lib qrcode dans l'environnement, la variable globale s'appelle 'QRCode' dans notre script
    window.QRCode = require('qrcode');

    // Exécuter le script dans le contexte de la fenêtre
    const vm = require('vm');
    const context = vm.createContext(window);
    const wrapped = `(function(){\n${scriptCode}\n})();`;
    const script = new vm.Script(wrapped);
    script.runInContext(context);

    // Attendre un peu pour la génération asynchrone
    await new Promise(r=>setTimeout(r, 1200));

    const gallery = window.document.getElementById('gallery');
    const idsInput = window.document.getElementById('idsInput');
    const tokens = (idsInput && idsInput.value) ? idsInput.value.split(/\r?\n|,|;/).map(t=>t.trim()).filter(Boolean) : [];

    if(!gallery){
      console.error('Échec: conteneur #gallery introuvable');
      process.exit(4);
    }

    console.log('Entrées attendues:', tokens.length, 'cartes trouvées:', gallery.children.length);

    if(gallery.children.length !== tokens.length){
      console.error('Échec: le nombre de cartes générées ne correspond pas au nombre d\'entrées.');
      process.exit(2);
    }

    // Vérifier que chaque carte a un lien de téléchargement de QR en data URL
    for(let i=0;i<gallery.children.length;i++){
      const card = gallery.children[i];
      const a = card.querySelector('a[download]');
      if(!a){
        console.error('Échec: lien de téléchargement introuvable pour la carte', i);
        process.exit(3);
      }
      if(!a.href || !a.href.startsWith('data:')){
        console.error('Échec: le href du QR n\'est pas un data URL pour la carte', i, 'href=', a.href);
        process.exit(5);
      }
    }

    console.log('OK: tous les QR ont été générés en data URLs et sont téléchargeables.');
    process.exit(0);
  }catch(err){
    console.error('Erreur du test:', err);
    process.exit(1);
  }
})();
