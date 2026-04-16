# Validation Summary: How to Fix 'Mutation was killed' in ClickHouse

## Status
validated

## Post Type
Troubleshooting guide / tutorial

## Technologies Covered
- ClickHouse
- ClickHouse mutations (`ALTER TABLE ... UPDATE` / `ALTER TABLE ... DELETE`)
- ClickHouse lightweight DELETE
- ClickHouse `system.mutations` / `system.metrics` tables
- ClickHouse server configuration (config.xml, users.xml)

## Sources Consulted
- ClickHouse docs — ALTER: https://clickhouse.com/docs/sql-reference/statements/alter/
- ClickHouse docs — system.mutations: https://clickhouse.com/docs/operations/system-tables/mutations
- ClickHouse docs — KILL: https://clickhouse.com/docs/sql-reference/statements/kill
- ClickHouse docs — DELETE (lightweight): https://clickhouse.com/docs/sql-reference/statements/delete
- ClickHouse docs — Server settings (background_pool_size): https://clickhouse.com/docs/operations/server-configuration-parameters/settings#background_pool_size
- ClickHouse docs — Settings (mutations_execute_nondeterministic_on_initiator): https://clickhouse.com/docs/operations/settings/settings
- ClickHouse release notes — 23.3 (lightweight DELETE GA)

## Issues Found
1. **Invalid `ALTER SYSTEM SET` statement.** The post suggested `ALTER SYSTEM SET background_pool_size = 16;` as a runtime equivalent to the config change. ClickHouse has no `ALTER SYSTEM SET` statement (that's Oracle/PostgreSQL syntax). `background_pool_size` is a server-level setting configured in `config.xml`; to apply it without a full restart you use `SYSTEM RELOAD CONFIG`, and per the docs only *increases* take effect at runtime (decreasing the pool still requires a restart). Replaced the invalid SQL with `SYSTEM RELOAD CONFIG;` and added a note about the increase-only-at-runtime constraint.

2. **Outdated lightweight DELETE guidance.** The post implied `SET allow_experimental_lightweight_delete = 1;` is always required on ClickHouse 22.8+. The flag was only needed while the feature was experimental; lightweight DELETE became generally available in ClickHouse 23.3 and is enabled by default. Clarified that the flag is only needed on 22.8–23.2.

3. **`mutations_execute_nondeterministic_on_initiator` mislabelled as a timeout setting.** The post placed it under "Set Mutation Execution Timeouts", but this setting has nothing to do with timeouts — per the docs, it evaluates constant nondeterministic functions (e.g. `now()`) on the initiator and substitutes literals so that mutations stay consistent across replicas. Renamed the subsection to "Keep Nondeterministic Functions Consistent Across Replicas" and rewrote the intro sentence to describe what the setting actually does.

## Review Notes
- `MUTATION_WAS_KILLED` (error code 379), the listed columns of `system.mutations` (including `parts_to_do_names`), `KILL MUTATION WHERE ...` syntax, `ALTER TABLE ... UPDATE/DELETE`, and `DELETE FROM ... WHERE ...` (MergeTree family) all verified as correct.
- The `parts_to_do_names` column can be very large on big tables; future revisions may want to note limiting it in ad-hoc diagnostic queries.
- Section "Monitor Mutation Queue Length" is correct and useful; `sum(parts_to_do)` is a reasonable proxy for outstanding work.
- `background_pool_size` is still valid but newer ClickHouse versions also expose `background_merges_mutations_concurrency_ratio` for finer tuning — worth mentioning in a future update but not a correction.
