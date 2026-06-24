SB PERSONAL COACH GESTIONALE 9.3.3 ANNULLAMENTO CREDITI

Correzione principale:
- Se una lezione viene annullata oltre le 24 ore, il credito torna nel pacchetto.
- Il contatore aumenta di +1 senza superare il totale del pacchetto.
- La lezione viene marcata con creditoRestituito:true per evitare doppi conteggi.
- Nessun recupero automatico: il recupero resta separato e deve passare da richiesta/approvazione coach.

Aggiornato:
- cliente.html
- index.html
- manifest.json
- README_ISTRUZIONI.txt

Test consigliato:
1. Cliente con 12 lezioni e 10 residue.
2. Annulla una lezione futura oltre 24h.
3. Deve diventare 11 residue su 12.
4. La lezione annullata non deve comparire tra le prossime lezioni.
5. Il cliente può richiedere recupero separatamente.
