SB PERSONAL COACH GESTIONALE 9.3.6 CONTATORE MANUALE COACH

Modifica principale:
- Le lezioni NON vengono più scalate automaticamente quando entrano nelle 24 ore.
- Entro 24 ore diventano solo "Bloccata".
- Il contatore scala solo quando il coach seleziona:
  Effettuata
  Assente

Logica:
- Prenotata: non scala.
- Bloccata: non scala, ma non è annullabile automaticamente dal cliente.
- Effettuata: scala 1 credito.
- Assente: scala 1 credito.
- Annullata: restituisce credito solo se quella lezione era già stata scalata.
- Eliminata: restituisce credito solo se quella lezione era già stata scalata.
- Recupero: resta separato.

Test consigliato:
1. Crea cliente 8 lezioni con più date automatiche.
2. Il contatore deve restare 8/8 finché non premi Effettuata o Assente.
3. Premi Assente su una lezione: deve diventare 7/8.
4. Premi Annullata su una lezione non scalata: deve restare 7/8.
5. Premi Effettuata su una lezione: deve diventare 6/8.
