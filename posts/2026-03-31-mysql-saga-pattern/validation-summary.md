# Validation Summary: How to Implement the Saga Pattern with MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB engine)
- Saga Pattern (distributed transaction management)
- Transactional Outbox Pattern
- JSON functions (`JSON_OBJECT`)

## Sources Consulted
- MySQL 8.0 Reference Manual: START TRANSACTION, COMMIT, and ROLLBACK Statements — https://dev.mysql.com/doc/refman/8.0/en/commit.html
- MySQL 8.0 Reference Manual: Flow Control Statements (IF, CASE, etc.) — https://dev.mysql.com/doc/refman/8.0/en/flow-control-statements.html
- MySQL 8.0 Reference Manual: ROW_COUNT() — https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_row-count
- MySQL 8.0 Reference Manual: LAST_INSERT_ID() — https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_last-insert-id
- MySQL 8.0 Reference Manual: JSON_OBJECT() — https://dev.mysql.com/doc/refman/8.0/en/json-creation-functions.html#function_json-object
- MySQL 8.0 Reference Manual: CREATE TABLE — https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual: TIMESTAMP initialization — https://dev.mysql.com/doc/refman/8.0/en/timestamp-initialization.html

## Issues Found
- **Step 2 used stored procedure syntax (`IF/THEN/ELSE/END IF`) in a plain SQL context.** The `IF ROW_COUNT() = 0 THEN ... ELSE ... END IF;` construct is only valid inside MySQL stored procedures, functions, or triggers. It cannot be used in regular SQL scripts or ad-hoc queries. Running this as written would produce a syntax error. Fixed by splitting the code into separate SQL blocks — one for the UPDATE attempt, one for the failure path, and one for the success path — with explanatory text noting that the application layer checks `ROW_COUNT()` and executes the appropriate branch.

## Review Notes
- Step 1 uses `LAST_INSERT_ID()` to capture the auto-generated order ID, but subsequent steps hardcode `101` as the order ID. This is fine for illustration purposes but could be noted for reader clarity.
- The outbox pattern shown relies on an external poller or CDC mechanism (e.g., Debezium) to read the `outbox_events` table and publish events to a message broker. The post does not cover this relay component, which is acceptable for scope but worth noting.
- The post mixes choreography language ("reacts to events") with an orchestrator concept (saga_state tracking table). Both are valid saga approaches, but readers may benefit from knowing the distinction. This is a stylistic observation, not a technical error.
- All `JSON_OBJECT()` usage, `CURRENT_TIMESTAMP` defaults, and `ON UPDATE CURRENT_TIMESTAMP` syntax are correct for MySQL 5.7+/8.0.
