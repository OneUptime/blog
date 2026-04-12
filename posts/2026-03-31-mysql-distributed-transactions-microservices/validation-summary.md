# Validation Summary: How to Handle Distributed Transactions with MySQL in Microservices

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (XA transactions, JSON functions, InnoDB)
- Distributed transactions (Two-Phase Commit / 2PC)
- Saga pattern (choreography-based)
- Transactional outbox pattern
- Idempotent operations with INSERT IGNORE

## Sources Consulted
- MySQL 8.0 Reference Manual — XA Transaction SQL Statements: https://dev.mysql.com/doc/refman/8.0/en/xa-statements.html
- MySQL 8.0 Reference Manual — XA Transaction States: https://dev.mysql.com/doc/refman/8.0/en/xa-states.html
- MySQL 8.0 Reference Manual — Restrictions on XA Transactions: https://dev.mysql.com/doc/refman/8.0/en/xa-restrictions.html
- MySQL 8.0 Reference Manual — Server System Variables (explicit_defaults_for_timestamp): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_explicit_defaults_for_timestamp

## Issues Found

### 1. Incorrect XA rollback guidance after commit failure
- **What was wrong:** The text stated "If the commit fails on one side, roll back both" with rollback SQL. This is incorrect — once `XA COMMIT` succeeds on one participant, that commit is permanent and cannot be rolled back. The correct recovery for a failed commit after prepare is to retry the commit (the prepared transaction persists and can be found via `XA RECOVER`).
- **What was changed:** Updated the text to clarify that rollback applies when a participant fails to prepare. Added a note that commit failures after prepare should be retried, not rolled back, referencing `XA RECOVER`.
- **Why:** Misleading readers into thinking they can roll back a committed XA transaction could cause data inconsistency in production systems.

### 2. Missing NULL DEFAULT NULL on published_at TIMESTAMP column
- **What was wrong:** The `published_at TIMESTAMP` column in the outbox_events table was declared without explicit NULL and DEFAULT clauses. The outbox pattern relies on `published_at IS NULL` to find unpublished events, but without `NULL DEFAULT NULL`, the column's behavior varies across MySQL versions and `explicit_defaults_for_timestamp` settings.
- **What was changed:** Changed `published_at TIMESTAMP` to `published_at TIMESTAMP NULL DEFAULT NULL`.
- **Why:** This ensures the column correctly defaults to NULL on insert and supports the `WHERE published_at IS NULL` polling query regardless of MySQL configuration.

## Review Notes
- The `?` placeholders in the compensating transaction SQL are standard prepared-statement syntax and are appropriate for illustrative code.
- The `LAST_INSERT_ID()` calls in the outbox INSERT are correct — both calls within the same statement return the same value from the preceding orders INSERT.
- The XA limitation about statement-based replication is confirmed by official docs: "XA transactions are considered unsafe for statement-based replication." Using `binlog_format=ROW` or `MIXED` is the recommended mitigation.
- The post could benefit from mentioning orchestration-based Sagas in addition to choreography-based, but this is a scope choice, not a technical error.
