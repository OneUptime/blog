# Validation Summary: How to Choose the Right Database Engine in ClickHouse

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- ClickHouse database engines (Atomic, Ordinary, Replicated, Lazy, MySQL, PostgreSQL, SQLite, MaterializedMySQL, MaterializedPostgreSQL)
- ZooKeeper / ClickHouse Keeper (for Replicated engine paths)
- MySQL / PostgreSQL CDC (Change Data Capture) into ClickHouse

## Sources Consulted
- ClickHouse official docs — Replicated database engine: https://clickhouse.com/docs/engines/database-engines/replicated
- ClickHouse official docs — Lazy database engine: https://clickhouse.com/docs/engines/database-engines/lazy
- ClickHouse GitHub issue #39546 (Mechanism to migrate databases from Ordinary to Atomic engine): https://github.com/ClickHouse/ClickHouse/issues/39546
- Altinity Knowledge Base — How to Convert Ordinary to Atomic: https://kb.altinity.com/engines/altinity-kb-atomic-database-engine/how-to-convert-ordinary-to-atomic/
- ClickHouse source — `docs/en/sql-reference/statements/create/database.md`

## Issues Found

1. **Incorrect `Lazy` engine syntax.** The post used `Lazy(expiration_time_seconds = 7200)` (named-argument style with a misspelled name). The Lazy engine accepts a single positional argument named `expiration_time_in_seconds`. Fixed to `Lazy(7200)` and added a brief explanation that Lazy can only host `*Log`-family tables (a documented constraint).

2. **Non-existent `ALTER DATABASE ... MODIFY ENGINE` statement.** The post recommended `ALTER DATABASE mydb MODIFY ENGINE Atomic;` to migrate Ordinary → Atomic. This SQL syntax does not exist in ClickHouse — the proposal in issue #39546 was never merged as a SQL command. The supported mechanism (ClickHouse 22.8+) is to drop a `convert_ordinary_to_atomic` flag file into `/var/lib/clickhouse/flags/` and restart the server. Replaced the example with the correct shell-based procedure.

## Review Notes

- The Lazy database engine is being phased out (see ClickHouse PR #93627 / issue #91231) and in newer versions is silently aliased to Atomic. The post's guidance is still useful for users on supported LTS versions, but a future revision could note that Lazy is deprecated and may be removed.
- The post groups "standalone or ClickHouse Cloud deployments" under the Atomic recommendation. ClickHouse Cloud actually uses Replicated/Shared databases internally, but the user-facing default still behaves like Atomic from a `CREATE DATABASE` perspective, so the guidance is acceptable as written.
- The Replicated engine example uses `{shard}` and `{replica}` macros — correct, and these must be defined in the server's macros config for the path to expand properly. Worth mentioning in a follow-up post but not strictly an error here.
- The MaterializedPostgreSQL engine remains experimental in ClickHouse and requires `allow_experimental_database_materialized_postgresql = 1`. Likewise MaterializedMySQL was experimental for a long time. A version/experimentation caveat would help readers, but the syntax shown is accurate.
