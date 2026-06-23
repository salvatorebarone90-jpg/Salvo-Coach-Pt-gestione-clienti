SB PERSONAL COACH GESTIONALE 6.1.2 HOTFIX CALENDARIO

Correzioni:
- Giorni/orari fissi automatici corretti.
- I campi vuoti non generano più eventi.
- Le date vengono calcolate sul giorno reale della settimana.
- Aggiunto pulsante Rigenera calendario automatico.
- Sistemato tasto Inattivo.
- Aggiunto tasto Riattiva.
- Aggiunto tasto Elimina cliente con conferma.
- Eliminando un cliente vengono eliminati anche eventi e check collegati.

Carica su GitHub:
- index.html
- firebase-config.js
- manifest.json
- logo.jpeg
- README_ISTRUZIONI.txt

Test consigliato:
crea un cliente fittizio con data inizio 23/06/2026, lunedì 09:00, mercoledì 08:30, venerdì 10:00.
Il calendario deve creare:
24/06/2026 08:30
26/06/2026 10:00
29/06/2026 09:00
