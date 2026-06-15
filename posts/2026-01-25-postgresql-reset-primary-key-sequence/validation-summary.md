# Validation Summary: How to Reset Primary Key Sequence in PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- SQL
- PostgreSQL sequences
- SERIAL and BIGSERIAL columns
- IDENTITY columns
- PL/pgSQL
- COPY imports

## Sources Consulted
- PostgreSQL 18 documentation: Sequence Manipulation Functions - https://www.postgresql.org/docs/current/functions-sequence.html
- PostgreSQL 18 documentation: ALTER SEQUENCE - https://www.postgresql.org/docs/current/sql-altersequence.html
- PostgreSQL 18 documentation: pg_sequences system view - https://www.postgresql.org/docs/current/view-pg-sequences.html
- PostgreSQL 18 documentation: CREATE TABLE and identity columns - https://www.postgresql.org/docs/current/sql-createtable.html
- PostgreSQL 18 documentation: Identity Columns - https://www.postgresql.org/docs/current/ddl-identity-columns.html
- PostgreSQL 18 documentation: Numeric Types / serial types - https://www.postgresql.org/docs/current/datatype-numeric.html
- PostgreSQL 18 documentation: COPY - https://www.postgresql.org/docs/current/sql-copy.html
- PostgreSQL 18 documentation: System Information Functions, including pg_get_serial_sequence - https://www.postgresql.org/docs/current/functions-info.html

## Issues Found
- Corrected the description and introduction to avoid implying that ordinary row deletion makes a sequence fall behind table data. PostgreSQL sequences are not automatically decremented by DELETE; sequence desynchronization typically happens after explicit ID imports, manual sequence changes, or reload/migration workflows.
- Corrected the "Finding the Current Sequence Value" example. `SELECT last_value FROM users_id_seq` shows the sequence's stored last value, not the next value that will be returned.
- Corrected the `setval` examples. The two-argument form and `setval(..., true)` make the next `nextval` advance before returning; `setval(..., false)` makes the next `nextval` return the supplied value exactly.
- Updated the schema-wide reset function so empty tables are reset to return 1 on the next `nextval` instead of calling `setval(..., 0)`, which is invalid for the default ascending sequence minimum of 1.
- Updated the schema-wide reset function to include both auto (`a`) and internal (`i`) sequence dependencies so it can handle serial-style owned sequences and identity-column sequences.
- Corrected the duplicate-key scenario so it accurately describes a sequence that is behind existing rows. Importing only IDs 100-102 into an otherwise empty table would not make the next generated value of 1 duplicate an existing key.
- Changed the bulk import trigger example from `DISABLE TRIGGER ALL` to `DISABLE TRIGGER USER`, avoiding the unnecessary disabling of system triggers such as referential-integrity triggers.

## Review Notes
The examples assume standard ascending sequences with the default minimum value of 1. For descending, cycling, cached, or custom-minimum sequences, reset logic should account for the sequence's configured parameters.
