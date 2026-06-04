# Validation Summary: How to Run YugabyteDB in Docker for Distributed SQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- YugabyteDB
- Docker
- Docker Compose
- YSQL / PostgreSQL-compatible SQL
- Distributed SQL sharding and replication
- `yugabyted`, `ysqlsh`, and `ysql_dump`

## Sources Consulted
- YugabyteDB `yugabyted` reference: https://docs.yugabyte.com/stable/reference/configuration/yugabyted/
- YugabyteDB Docker quick start / Docker examples: https://docs.yugabyte.com/stable/reference/configuration/yugabyted/#create-a-multi-region-universe-in-docker
- YugabyteDB default ports reference: https://docs.yugabyte.com/stable/reference/configuration/default-ports/
- YugabyteDB `ysqlsh` reference: https://docs.yugabyte.com/stable/api/ysqlsh/
- YugabyteDB configurable data sharding: https://docs.yugabyte.com/preview/explore/going-beyond-sql/data-sharding/
- YugabyteDB hash and range sharding: https://docs.yugabyte.com/preview/architecture/docdb-sharding/sharding/
- YugabyteDB colocation documentation: https://docs.yugabyte.com/v2.25/additional-features/colocation/
- YugabyteDB `yb_servers()` function reference: https://docs.yugabyte.com/stable/api/ysql/exprs/func_yb_servers/
- YugabyteDB `pgcrypto` extension documentation: https://docs.yugabyte.com/v2.25/additional-features/pg-extensions/extension-pgcrypto/
- YugabyteDB `ysql_dump` documentation: https://docs.yugabyte.com/v2025.1/admin/ysql-dump/

## Issues Found
1. **Outdated YugabyteDB Docker image tag**: The post used `yugabytedb/yugabyte:2.21.1.0-b271`, which is from the v2.21 release series and is now listed under end-of-life documentation. Updated examples to the current stable image tag used by official docs, `yugabytedb/yugabyte:2025.2.3.2-b1`.
2. **Deprecated `yugabyted` flag**: The Docker commands used `--daemon=false`. Official `yugabyted` documentation marks `--daemon` as deprecated and recommends `--background` instead. Changed all examples to `--background=false`.
3. **Missing zone-aware placement configuration step**: The compose example passed `--fault_tolerance=zone` during node startup but did not run `yugabyted configure data_placement`. Official docs require this step after starting multi-zone nodes so placement constraints are applied. Added the configure command before checking cluster status.
4. **Missing extension setup for `gen_random_uuid()`**: The table examples used `gen_random_uuid()` without enabling `pgcrypto`. Added `CREATE EXTENSION IF NOT EXISTS pgcrypto;` after connecting to the `myapp` database.
5. **Wrong database context for later SQL examples**: The table-creation snippet switches to `colocated_db`, so later examples operating on `users` and `events` would run in the wrong database if copied sequentially. Added `\c myapp` at the start of those SQL snippets.
6. **Incorrect PostgreSQL database qualification**: The fault-tolerance command used `SELECT COUNT(*) FROM myapp.users;`, but PostgreSQL/YSQL do not use database-qualified table names for cross-database access. Updated the command to connect with `-d myapp` and query `users`.
7. **Misleading `yb_table_properties()` comment**: The post said `yb_table_properties()` checks tablet leaders and locations. Official docs use it for table properties such as colocation, not leader placement. Updated the comment to describe table properties accurately.

## Review Notes
- The post remains a practical local Docker tutorial, not a production deployment guide.
- The built-in UI and port references are accurate for YugabyteDB clusters started with `yugabyted`.
- Docker-based `yugabyted` deployments are documented by YugabyteDB as Early Access in the official reference.
