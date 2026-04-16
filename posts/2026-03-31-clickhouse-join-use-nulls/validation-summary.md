# Validation Summary: How to Set join_use_nulls for NULL Handling in JOINs in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL engine, JOIN semantics)
- ClickHouse settings (`join_use_nulls`)
- ClickHouse access management (`ALTER USER`, `users.xml` profiles)
- ClickHouse Nullable data types

## Sources Consulted
- ClickHouse `Settings.cpp` source (canonical definition of `join_use_nulls`): https://raw.githubusercontent.com/ClickHouse/ClickHouse/master/src/Core/Settings.cpp — confirms default is `false` (0), with value 0 filling type defaults and value 1 producing NULL with `Nullable(T)` promotion.
- ClickHouse JOIN reference: https://clickhouse.com/docs/sql-reference/statements/select/join — confirms `join_use_nulls` governs how empty cells are filled in joined tables.
- ClickHouse `ALTER USER` reference: https://clickhouse.com/docs/en/sql-reference/statements/alter/user — documents `[ADD|MODIFY SETTINGS variable [=value] ...]` syntax.
- ClickHouse `CREATE USER` reference: https://clickhouse.com/docs/en/sql-reference/statements/create/user — documents `SETTINGS variable = value` syntax for user creation.
- ClickHouse access parser source `ParserSettingsProfileElement.cpp`: confirms old-style `SETTINGS` in ALTER USER replaces all settings and profiles, while `MODIFY SETTINGS` is the modern, non-destructive form.

## Issues Found

1. **FULL JOIN claim was incorrect.** The post stated: "`FULL JOIN` always produces `NULL` for unmatched sides, but only when `join_use_nulls = 1` does this behave predictably for `IS NULL` checks". This is wrong — `join_use_nulls` applies to all JOIN types (LEFT, RIGHT, FULL) uniformly. With `join_use_nulls = 0`, FULL JOIN also fills unmatched cells with type defaults, not NULL. Rewrote the sentence to clarify that `join_use_nulls = 0` produces type defaults on both sides and `join_use_nulls = 1` produces NULL with both sides wrapped in `Nullable`.

2. **`ALTER USER ... SETTINGS` syntax and version claim.** The post showed `ALTER USER analytics_user SETTINGS join_use_nulls = 1;` and claimed it was available in "ClickHouse 22.4+". Per the ClickHouse parser source, plain `SETTINGS` in ALTER USER is the "old style" that **replaces all** existing settings and profiles, which is destructive and unlikely to be what the user wants. The documented and non-destructive form is `MODIFY SETTINGS`. I also could not verify the "22.4+" version pinning, and the ALTER USER settings clause predates that version. Changed the syntax to `ALTER USER analytics_user MODIFY SETTINGS join_use_nulls = 1;` and dropped the unsubstantiated version qualifier.

## Review Notes
- The default behavior example, result tables, `SET join_use_nulls = 1` per-session usage, `SETTINGS join_use_nulls = 1` per-query usage, `toTypeName` verification, and `users.xml` profile snippet are all accurate and match ClickHouse's documented behavior.
- The claim that `Nullable` carries "an extra null byte per value" is essentially accurate — ClickHouse stores a separate null map alongside nullable columns, which is the cost the post is describing.
- The "Column Type Implications" section talks specifically about right-side columns being wrapped in `Nullable(T)`, which is correct in the LEFT JOIN context of that section. Readers should note that for RIGHT JOIN the left side is promoted, and for FULL JOIN both sides are.
- The `coalesce(o.amount, 0)` example is a useful idiom for explicitly converting NULL back to a default after enabling `join_use_nulls = 1`.
