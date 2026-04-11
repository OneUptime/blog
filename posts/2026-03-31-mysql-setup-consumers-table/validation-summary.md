# Validation Summary: How to Use setup_consumers Table in MySQL Performance Schema

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL Performance Schema
- setup_consumers table
- MySQL server configuration (my.cnf)

## Sources Consulted
- MySQL 8.0 Reference Manual: Pre-Filtering by Consumer — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-consumer-filtering.html
- MySQL 8.0 Reference Manual: Performance Schema Startup Configuration — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-startup-configuration.html
- MySQL 8.0 Reference Manual: The setup_consumers Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-setup-consumers-table.html

## Issues Found

### 1. Incorrect consumer hierarchy nesting (hierarchy diagram)
- **What was wrong:** The `_history_long` consumers were shown as children of `_history` consumers (e.g., `events_waits_history_long` nested under `events_waits_history`). This implies that enabling `_history_long` requires `_history` to also be enabled, which is incorrect.
- **What was changed:** Corrected the hierarchy so that `_history` and `_history_long` are shown as siblings, both direct children of `_current`. For example, `events_waits_history` and `events_waits_history_long` are both children of `events_waits_current`.
- **Why:** According to MySQL documentation, both history consumers depend only on their corresponding `_current` consumer being enabled, not on each other. You can enable `events_waits_history_long` without enabling `events_waits_history`.

### 2. Missing events_transactions_* consumers
- **What was wrong:** The sample output and hierarchy diagram omitted the three transaction-related consumers: `events_transactions_current`, `events_transactions_history`, and `events_transactions_history_long`. These have been present since MySQL 5.7.3.
- **What was changed:** Added all three transaction consumers to both the sample output table and the hierarchy diagram. In the hierarchy, `events_transactions_current` is a direct child of `thread_instrumentation`, with `events_transactions_history` and `events_transactions_history_long` as its children.
- **Why:** These are standard consumers present in all supported MySQL versions (5.7+, 8.0+). Omitting them gives an incomplete picture, especially since the hierarchy diagram was presented as the authoritative structure.

## Review Notes
- The SQL syntax for querying and updating `setup_consumers` is correct.
- The `my.cnf` configuration variable format (`performance_schema_consumer_*=ON`) is valid. MySQL accepts both dashes and underscores interchangeably in option names.
- The explanation of the consumer-to-table relationship (e.g., `statements_digest` feeding `events_statements_summary_by_digest`) is accurate.
- The general advice about keeping `statements_digest` and `events_statements_history` enabled in production is sound and aligns with common best practices.
