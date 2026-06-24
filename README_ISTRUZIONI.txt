SB PERSONAL COACH GESTIONALE 9.3.5 HOTFIX AREA CLIENTE

Correzione:
- Nell'Area Cliente, la sezione "Prossime lezioni" mostra solo lezioni attive:
  Prenotata, Occupata, Bloccata.
- Non mostra più:
  Assente, Effettuata, Annullata, Annullata dal cliente, Recuperata.
- Anche il calendario mensile cliente evidenzia solo le lezioni attive.

Logica:
- Assente: resta conteggiata, non restituisce credito, sparisce dalle prossime lezioni.
- Annullata: restituisce credito se previsto, sparisce dalle prossime lezioni.
- Effettuata/Recuperata: spariscono dalle prossime lezioni.

Carica su GitHub:
- index.html
- cliente.html
- firebase-config.js
- manifest.json
- logo.jpeg
- README_ISTRUZIONI.txt
