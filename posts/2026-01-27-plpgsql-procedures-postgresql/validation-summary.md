# Validation Summary: How to Build Business Logic with PL/pgSQL Procedures

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- PostgreSQL
- PL/pgSQL
- SQL functions
- Stored procedures
- Triggers
- JSONB
- Transaction control

## Sources Consulted
- PostgreSQL Documentation: User-Defined Procedures - https://www.postgresql.org/docs/current/xproc.html
- PostgreSQL Documentation: PL/pgSQL Transaction Management - https://www.postgresql.org/docs/current/plpgsql-transactions.html
- PostgreSQL Documentation: PL/pgSQL Control Structures - https://www.postgresql.org/docs/current/plpgsql-control-structures.html
- PostgreSQL Documentation: PL/pgSQL Trigger Functions - https://www.postgresql.org/docs/current/plpgsql-trigger.html
- PostgreSQL Documentation: CREATE FUNCTION - https://www.postgresql.org/docs/current/sql-createfunction.html
- PostgreSQL Documentation: PL/pgSQL Porting and variable ambiguity notes - https://www.postgresql.org/docs/current/plpgsql-porting.html

## Issues Found
- The functions-vs-procedures section said procedures do not return values and broadly implied transaction control is always available. Updated the wording to note that procedures are called with `CALL`, can use `OUT`/`INOUT` parameters, and can commit or roll back only when called at the top level outside an explicit transaction block.
- The `get_user_email` usage example passed `orders.id` to a function expecting a user ID. Changed it to pass `orders.user_id`.
- The `calculate_order_total` function used an unqualified `order_id` parameter in one query. Qualified it as `calculate_order_total.order_id` to avoid PL/pgSQL variable/column ambiguity.
- The `transfer_funds` function updated the destination account without first checking that it existed. Added a destination account existence check with `FOR UPDATE`.
- The `search_products` function used `category_id` as both a parameter name and a table column reference, which can trigger PL/pgSQL ambiguity. Renamed the parameter to `p_category_id` and updated the example call.
- The transaction-control section lacked the top-level `CALL` caveat required by PostgreSQL. Added a short note before the procedure example.
- The validation trigger compared `SUM(...) != NEW.total`, which fails to raise when the sum is `NULL`. Changed it to `COALESCE(SUM(...), 0) IS DISTINCT FROM NEW.total`.
- The `update_order_total` trigger referenced `NEW.order_id` even for `DELETE` triggers, where `NEW` is null. Updated it to use `OLD` for deletes, return the correct row value, and recalculate the old order as well when an item's `order_id` changes.
- The conclusion overgeneralized procedures as the choice for all data modifications with transaction control. Revised it to emphasize queryable return values for functions and top-level transaction control for procedures.

## Review Notes
The examples remain illustrative and assume application tables with compatible schemas. PostgreSQL procedure transaction control also has additional restrictions for some procedure attributes, but the post now states the main top-level `CALL` requirement needed for the shown examples.
