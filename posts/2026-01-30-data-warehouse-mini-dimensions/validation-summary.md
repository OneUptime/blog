# Validation Summary: How to Build Mini-Dimensions

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Data warehouse dimensional modeling
- Mini-dimensions
- Slowly Changing Dimensions Type 2
- PostgreSQL SQL, including identity columns, procedures, temporary tables, indexes, foreign keys, and MERGE
- Mermaid diagrams

## Sources Consulted
- Kimball Group: Slowly Changing Dimensions Are Not Always as Easy as 1, 2, 3: https://www.kimballgroup.com/2005/03/slowly-changing-dimensions-are-not-always-as-easy-as-1-2-3/
- PostgreSQL documentation: Identity Columns: https://www.postgresql.org/docs/current/ddl-identity-columns.html
- PostgreSQL documentation: CREATE PROCEDURE: https://www.postgresql.org/docs/current/sql-createprocedure.html
- PostgreSQL documentation: MERGE: https://www.postgresql.org/docs/current/sql-merge.html

## Issues Found
- The mini-dimension table used SQL Server-style `IDENTITY(1,1)` while the rest of the examples used PostgreSQL-style syntax. Changed it to PostgreSQL `GENERATED ALWAYS AS IDENTITY` and labeled the implementation examples as PostgreSQL 15+ syntax.
- The procedure examples used incomplete PostgreSQL procedure syntax. Added empty argument lists, `LANGUAGE plpgsql`, dollar-quoted bodies, and closing `$$;` delimiters.
- The pre-populated Cartesian product omitted `Unknown` values for `income_bracket` and `credit_score_band`, even though the ETL lookup can produce those values. Added the missing `Unknown` categories and updated the row-count math from 3,200 to 4,608.
- The post said thousands of mini-dimension rows defeat the purpose, but its own corrected example has several thousand rows. Changed the warning to apply to hundreds of thousands or millions of combinations.
- The performance table presented absolute benchmark numbers without qualification. Labeled the metrics as illustrative and added a note that results depend on schema, indexes, optimizer behavior, engine, and workload.
- The historical-context section implied the fact table preserves all customer profile changes. Clarified that it preserves profile state for events that occurred, and that complete point-in-time change history requires a factless fact, snapshot, or history table.

## Review Notes
The corrected mini-dimension pattern matches Kimball guidance: volatile profile attributes can be isolated into a small profile dimension, with fact rows carrying both the primary dimension key and the mini-dimension key effective at event time. The SQL is illustrative and assumes PostgreSQL 15+ because `MERGE` is part of the PostgreSQL 15+ syntax set.
