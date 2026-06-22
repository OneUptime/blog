# Validation Summary: How to Add Columns Without Locking in PostgreSQL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL
- SQL DDL
- Schema migrations
- Table locks and constraints

## Sources Consulted
- PostgreSQL Documentation: ALTER TABLE - https://www.postgresql.org/docs/current/sql-altertable.html
- PostgreSQL Documentation: Modifying Tables - https://www.postgresql.org/docs/current/ddl-alter.html
- PostgreSQL Documentation: Function Volatility Categories - https://www.postgresql.org/docs/current/xfunc-volatility.html

## Issues Found
- The post described nullable column additions and PostgreSQL 11+ default column additions as "no lock". PostgreSQL documentation says `ALTER TABLE` acquires an `ACCESS EXCLUSIVE` lock unless explicitly noted, so I changed the wording to "brief lock" and "no rewrite".
- The post used `NOW()` as an example of a volatile default and recommended `CURRENT_TIMESTAMP` instead. PostgreSQL documents the `current_timestamp` family as `STABLE`, and `now()` is part of that family. I changed the volatile example to `clock_timestamp()`, which PostgreSQL uses as the volatile example for default values that require row updates.
- The post said adding `NOT NULL` without a default requires a table scan. For a non-empty table, adding a new `NOT NULL` column with no default fails because existing rows would receive `NULL`. I updated the comment to describe the failure directly.
- The validation step was described as running "in background". PostgreSQL still scans the table, but `VALIDATE CONSTRAINT` uses a weaker `SHARE UPDATE EXCLUSIVE` lock and does not lock out concurrent updates. I changed the wording to "validate separately with a weaker lock".
- The conclusion claimed PostgreSQL 11+ allows most column additions without table locks. I changed this to say it avoids table rewrites while still taking a brief lock.

## Review Notes
The multi-step pattern using a nullable column, batched backfill, `CHECK (...) NOT VALID`, and `VALIDATE CONSTRAINT` is technically sound. PostgreSQL can skip the table scan for `ALTER COLUMN ... SET NOT NULL` when a valid `CHECK` constraint proves the column cannot contain nulls, but the post's current wording remains conservative by warning that direct `SET NOT NULL` scans the table.
