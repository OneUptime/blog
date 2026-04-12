# Validation Summary: How to Implement Event Sourcing with MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB, JSON columns, DATETIME(6) fractional seconds)
- Event Sourcing pattern (append-only event store, aggregate versioning)
- SQL DDL (CREATE TABLE, indexes, unique constraints)
- SQL DML (SELECT ... FOR UPDATE, INSERT, transactions)
- Python (event replay / state reconstruction logic)

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE TABLE syntax: https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual — JSON data type: https://dev.mysql.com/doc/refman/8.0/en/json.html
- MySQL 8.0 Reference Manual — Fractional seconds in temporal types: https://dev.mysql.com/doc/refman/8.0/en/fractional-seconds.html
- MySQL 8.0 Reference Manual — Flow control statements (IF, SIGNAL): https://dev.mysql.com/doc/refman/8.0/en/flow-control-statements.html
- MySQL 8.0 Reference Manual — SIGNAL statement: https://dev.mysql.com/doc/refman/8.0/en/signal.html
- MySQL 8.0 Reference Manual — SELECT ... FOR UPDATE: https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html
- MySQL 8.0 Reference Manual — User-defined variables: https://dev.mysql.com/doc/refman/8.0/en/user-variables.html

## Issues Found

### 1. IF/SIGNAL syntax invalid outside stored procedures
- **What was wrong:** The concurrency check used `IF @current_version IS NOT NULL AND @current_version != @expected_version THEN SIGNAL SQLSTATE '45000' ... END IF;`. In MySQL, `IF...THEN...END IF` and `SIGNAL` are compound/procedural statements only valid inside stored programs (procedures, functions, triggers, events). This code would raise a syntax error if executed as plain SQL from an application or client.
- **What was changed:** Replaced the `IF...SIGNAL...END IF` block with comments explaining that the version check should be performed in application code, and that the UNIQUE constraint serves as a database-level safety net.
- **Why:** The original code was not executable as presented. The fix reflects the practical pattern: the application compares versions and the database enforces uniqueness.

### 2. NULL arithmetic on first event insert
- **What was wrong:** `SELECT MAX(version) INTO @current_version` returns NULL when no events exist for the aggregate. The subsequent `@current_version + 1` evaluates to NULL (NULL arithmetic in MySQL), which would cause the INSERT to fail or insert a NULL version.
- **What was changed:** Changed to `SELECT COALESCE(MAX(version), 0) INTO @current_version`, so the first event correctly gets version 1.
- **Why:** Without COALESCE, the very first event for any aggregate could not be inserted correctly.

### 3. Missing UNIQUE constraint on event version
- **What was wrong:** The events table had an INDEX on `(aggregate_type, aggregate_id, version)` but no UNIQUE constraint. Without uniqueness enforcement, two concurrent transactions could insert events with the same version for the same aggregate, breaking event sourcing invariants.
- **What was changed:** Added `UNIQUE KEY uq_aggregate_version (aggregate_type, aggregate_id, version)` to the events table DDL.
- **Why:** A UNIQUE constraint is essential for correctness in event sourcing — it guarantees that no two events share the same version for a given aggregate, even under concurrent writes.

## Review Notes
- The existing INDEX on `(aggregate_type, aggregate_id, version)` is now redundant since the UNIQUE constraint creates an equivalent index. However, removing the explicit INDEX is a minor optimization concern and doesn't affect correctness, so it was left in place to minimize changes.
- The Python `rebuild_order` function assumes `event["payload"]` is already a dict. Most MySQL drivers (e.g., mysql-connector-python, PyMySQL with appropriate settings) auto-deserialize JSON columns, so this is reasonable but worth noting for readers using drivers that return JSON as a string.
- The post correctly describes the event sourcing pattern at a conceptual level. The snapshot and read-model projection sections are accurate and well-structured.
