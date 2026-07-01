SB PERSONAL COACH GESTIONALE 11.7.6 - FIX CONTATORI CLIENTI

Fix:
- Corregge la visualizzazione dei contatori nella sezione Clienti.
- NON elimina eventi.
- NON tocca calendario, recuperi, area cliente o contabilità.
- Aggiunto tasto in sezione Clienti: "Ricalcola contatori clienti".

Logica:
- Usa lezioniResidue se valido.
- Se manca o è incoerente, ricalcola da lezioniTotali - lezioni già Effettuate/Assenti/Recuperate.
- Annullata dal coach e Recupero programmato NON scalano il contatore.
