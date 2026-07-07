SB PERSONAL COACH GESTIONALE 11.7.7 - STABLE PROTEZIONE DOPPIA SCALATA

Fix critico:
- Conferma scala 1 sola volta.
- Assente scala 1 sola volta.
- Annulla Coach non scala mai.
- Protezione contro doppio click, refresh, onSnapshot e chiamate duplicate.

Nuovi campi tecnici sugli eventi:
- processed: true
- scalata: true/false

Logica:
- Effettuata / Assente / Recuperata: scalano solo se l'evento non è già stato processato.
- Annullata dal coach: viene registrata nello storico ma non modifica il contatore.

Non sono stati toccati:
- Area Cliente
- WhatsApp
- Regolamento
- Recuperi
- Calendario
- Contabilità
