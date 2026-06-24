SB PERSONAL COACH GESTIONALE 9.3.2 HOTFIX COLLAUDO

Correzioni:
- Regolamento: finché il cliente non accetta, l'Area Cliente resta nascosta.
- Alert cliente: se il regolamento non è accettato, compare un avviso chiaro.
- Calendario mensile Area Cliente: corretto bug di evidenziazione venerdì/sabato.
- Versione regolamento aggiornata a 9.3.2.

Carica su GitHub:
- index.html
- cliente.html
- firebase-config.js
- manifest.json
- logo.jpeg
- README_ISTRUZIONI.txt

Test consigliato:
1. Crea cliente test con regolamento non accettato.
2. Apri Area Cliente: deve mostrare solo regolamento.
3. Spunta checkbox e accetta.
4. Verifica che compaiano dashboard, calendario e lezioni.
5. Cliente con Lun/Mer/Ven: nel calendario devono evidenziarsi lunedì, mercoledì e venerdì.
