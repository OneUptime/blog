# Validation Summary: How to Create Trigger-Based CDC

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Change Data Capture (CDC)
- PostgreSQL triggers and PL/pgSQL
- PostgreSQL JSONB, partitioned tables, partial indexes, and row locking
- Python
- psycopg2
- Prometheus alerting rules
- Mermaid diagrams

## Sources Consulted
- PostgreSQL documentation: PL/pgSQL trigger functions, including NEW/OLD availability and AFTER trigger return semantics: https://www.postgresql.org/docs/current/plpgsql-trigger.html
- PostgreSQL documentation: system administration functions, including current_setting and set_config: https://www.postgresql.org/docs/current/functions-admin.html
- PostgreSQL documentation: table partitioning constraints and partitioned index behavior: https://www.postgresql.org/docs/current/ddl-partitioning.html
- PostgreSQL documentation: SELECT locking clauses and SKIP LOCKED: https://www.postgresql.org/docs/current/sql-select.html
- Psycopg 2.9 documentation: connection commit/rollback context manager behavior: https://www.psycopg.org/docs/connection.html
- Local PostgreSQL 16 Docker validation for the complete schema/trigger example and the generic trigger example.

## Issues Found
- The trigger examples used `COALESCE(NEW.id, OLD.id)`, which can reference an unavailable trigger record depending on the operation. Updated the examples to assign `v_order_id` from `NEW` or `OLD` inside the appropriate `TG_OP` branch.
- The batch-aware and fast trigger examples also mixed `NEW` and `OLD` access in generic expressions. Updated them to compute operation-specific variables before inserting into the change table.
- The post said row-level AFTER triggers must return `NEW`/`OLD` and that returning NULL would cancel the operation. PostgreSQL ignores the return value of row-level AFTER triggers, while row-level BEFORE triggers can skip a row by returning NULL. Corrected the explanation.
- The post described AFTER triggers as capturing the final committed state. AFTER triggers run after the row operation but before transaction commit, and their side effects roll back with the transaction. Updated the wording.
- The complete example swallowed trigger errors, which could silently lose CDC events while allowing the source write to proceed. Updated the exception handler to re-raise so the source transaction fails if CDC capture fails.
- The production consumer claimed exactly-once semantics and retry logic, but the code implemented database checkpointing and immediate dead-letter handling. Updated the claims to at-least-once processing, removed the unused retry parameter, and clarified the dead-letter behavior.
- The Python consumer wrote to `order_changes_dead_letter`, but the schema did not define that table. Added the dead-letter table schema.
- Removed unused Python imports from the complete consumer example.

## Review Notes
- The embedded Python examples compile successfully.
- The complete PostgreSQL schema and trigger example was executed in PostgreSQL 16 with INSERT, untracked UPDATE, tracked UPDATE, and DELETE operations; it produced the expected CDC rows.
- The generic trigger example was also executed in PostgreSQL 16 and correctly captured changed columns.
- The Prometheus rules are illustrative and assume exporters expose the named CDC metrics.
