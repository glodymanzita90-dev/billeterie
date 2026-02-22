# Générateur de QR Code (client-side)

Ce petit projet génère un QR Code dynamique (client-side) contenant un lien direct vers une image (par exemple hébergée sur Google Drive). Le QR peut être téléchargé en PNG.

Fichiers créés:
- `index.html` : interface utilisateur minimale + inclusion de la librairie QR (CDN)
- `script.js`  : logique JS pour générer le QR, convertir les liens Drive, rendre le canvas responsive et télécharger le PNG
- `viewer.html` : page intermédiaire qui affiche automatiquement l'image quand on scanne le QR

Fonctionnalités:
- Conversion automatique de liens Drive de type `/file/d/FILE_ID/view` et `?id=FILE_ID` en lien direct `https://drive.google.com/uc?export=view&id=FILE_ID`.
- **Le QR Code pointe vers `viewer.html?img=URL_IMAGE`** : quand vous scannez le QR avec un téléphone, il ouvre automatiquement la page `viewer.html` qui charge et affiche l'image (au lieu de montrer juste l'URL en texte).
- QR responsive : le canvas s'adapte au conteneur et utilise `devicePixelRatio` pour afficher une image nette sur écrans Retina.
- Bouton de téléchargement PNG qui exporte le contenu du canvas.

Comment tester rapidement:
1. Ouvrir `index.html` dans un navigateur moderne (double-clic ou `Fichier > Ouvrir`).
2. (Optionnel) Installer l'extension VS Code **Live Server** (`ritwickdey.LiveServer`) et cliquer sur "Go Live" pour un rafraîchissement automatique.
3. Coller ou modifier l'URL (ex : l'URL fournie par défaut pointe déjà vers une image Drive) puis cliquer sur **Générer le QR**.
4. Cliquer sur **Télécharger PNG** pour obtenir le fichier `qrcode.png`.
5. **Scannez le QR avec un téléphone** : il devrait ouvrir `viewer.html?img=...` qui affichera **automatiquement** l'image de Google Drive.

**Important** : pour que le scan fonctionne, assurez-vous que `index.html` et `viewer.html` sont accessibles via une URL (par exemple `http://localhost:5500/index.html` via Live Server ou un vrai serveur web). Si vous ouvrez directement le fichier en `file://...`, le viewer.html ne sera pas trouvé lors du scan.

Notes Google Drive:
- Si vous fournissez un lien vers un *dossier* Drive (drive/folders/ID), on ne peut pas en tirer directement une image. Assurez-vous d'utiliser le lien de partage du *fichier* image.
- Le code tente de convertir automatiquement les formes courantes d'URL Drive en lien direct utilisable par le QR.

Extensions recommandées (optionnel):
- `Live Server` : utile pour prévisualiser `index.html` et recharger automatiquement pendant le développement.
- Une extension VS Code nommée "QR Code Generator" (recherchez-la sur le Marketplace) peut être utile pour générer rapidement des QR à partir d'un texte/URL directement dans l'éditeur, mais elle n'est pas nécessaire pour ce projet.

Pas de dépendances npm : la librairie QR est chargée via CDN (`qrcode@1.5.1`). Si vous préférez un workflow npm, on peut ajouter un `package.json` et la dépendance `qrcode`.

Si vous voulez que je :
- ajoute une version serveur (Node) pour servir la page,
- ou intègre un mode pour générer des QR en SVG au lieu de PNG,
dites-le et je l'ajoute.
