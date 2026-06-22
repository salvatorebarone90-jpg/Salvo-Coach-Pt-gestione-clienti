# SB Coach Gestionale 4.0 - Firebase

## Cosa contiene
- Web app mobile con logo Salvatore Barone
- Login Firebase
- Database cloud Firestore
- Clienti, pacchetti, rinnovi, pagamenti
- Tasto WhatsApp con testi modificabili
- Backup JSON

## Passaggi Firebase
1. Vai su https://console.firebase.google.com
2. Crea un progetto
3. Aggiungi una Web App
4. Copia la configurazione firebaseConfig
5. Apri index.html e sostituisci i valori:
   - INCOLLA_LA_TUA_API_KEY
   - INCOLLA_AUTH_DOMAIN
   - INCOLLA_PROJECT_ID
   - INCOLLA_STORAGE_BUCKET
   - INCOLLA_MESSAGING_SENDER_ID
   - INCOLLA_APP_ID
6. In Firebase attiva Authentication > Email/Password
7. Attiva Firestore Database in modalità test per iniziare
8. Pubblica la cartella su GitHub Pages, Vercel, Cloudflare Pages o Netlify

## Regole Firestore consigliate dopo i test
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
