# Validation Summary: How to Implement PostgreSQL Triggers and Functions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- PL/pgSQL
- PostgreSQL functions
- PostgreSQL triggers
- PostgreSQL LISTEN/NOTIFY
- JSON/JSONB audit logging patterns

## Sources Consulted
- PostgreSQL documentation: CREATE TRIGGER - https://www.postgresql.org/docs/current/sql-createtrigger.html
- PostgreSQL documentation: Overview of Trigger Behavior - https://www.postgresql.org/docs/current/trigger-definition.html
- PostgreSQL documentation: PL/pgSQL Trigger Functions - https://www.postgresql.org/docs/current/plpgsql-trigger.html
- PostgreSQL documentation: CREATE FUNCTION - https://www.postgresql.org/docs/current/sql-createfunction.html
- PostgreSQL documentation: PL/pgSQL Under the Hood / Variable Substitution - https://www.postgresql.org/docs/current/plpgsql-implementation.html
- PostgreSQL documentation: PL/pgSQL Control Structures / Error Handling - https://www.postgresql.org/docs/current/plpgsql-control-structures.html
- PostgreSQL documentation: Asynchronous Notification - https://www.postgresql.org/docs/current/libpq-notify.html

## Issues Found
- The `calculate_order_total` example used `WHERE order_id = calculate_order_total.order_id`, where the unqualified `order_id` can be ambiguous in PL/pgSQL because it matches both a table column and a function parameter. Changed the table reference to use an alias: `oi.order_id = calculate_order_total.order_id`.
- The conditional trigger example created `log_price_changes` before defining `log_price_change()`. PostgreSQL requires the trigger function to exist before `CREATE TRIGGER`, so the function and trigger order was corrected.
- The `compare_changes` example used `OLD.status != NEW.status`, which does not detect changes involving `NULL`. Changed it to `OLD.status IS DISTINCT FROM NEW.status`, matching PostgreSQL's NULL-safe comparison pattern used elsewhere in the post.

## Review Notes
The remaining examples are technically valid for PostgreSQL 12+ syntax. PostgreSQL 12 is now unsupported, so a future content refresh could update the prerequisite to a currently supported PostgreSQL version, but the examples themselves do not depend on unsupported-only behavior.
