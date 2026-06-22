# Validation Summary: How to Connect Metabase to ClickHouse for Business Intelligence

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- Metabase
- ClickHouse
- Docker
- Docker Compose
- PostgreSQL
- SQL
- Python
- PyJWT
- Dashboard embedding

## Sources Consulted
- Metabase documentation: Running Metabase on Docker - https://www.metabase.com/docs/latest/installation-and-operation/running-metabase-on-docker
- Metabase documentation: Configuring the Metabase application database - https://www.metabase.com/docs/latest/installation-and-operation/configuring-application-database
- Metabase documentation: ClickHouse connection settings - https://www.metabase.com/docs/latest/databases/connections/clickhouse
- Metabase documentation: Config file template and query cache settings - https://www.metabase.com/docs/latest/configuring-metabase/config-template
- Metabase documentation: Caching query results - https://www.metabase.com/docs/latest/configuring-metabase/caching
- Metabase documentation: Static embedding - https://www.metabase.com/docs/latest/embedding/static-embedding
- ClickHouse documentation: Connecting Metabase to ClickHouse - https://clickhouse.com/docs/integrations/metabase
- ClickHouse documentation: Network ports - https://clickhouse.com/docs/guides/sre/network-ports
- ClickHouse documentation: CREATE USER - https://clickhouse.com/docs/sql-reference/statements/create/user
- ClickHouse documentation: Access control and account management - https://clickhouse.com/docs/operations/access-rights
- ClickHouse documentation: GRANT statement - https://clickhouse.com/docs/sql-reference/statements/grant
- ClickHouse documentation: Query cache - https://clickhouse.com/docs/operations/query-cache
- ClickHouse documentation: system.query_log - https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse documentation: AggregatingMergeTree - https://clickhouse.com/docs/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse documentation: AggregateFunction type - https://clickhouse.com/docs/sql-reference/data-types/aggregatefunction
- ClickHouse documentation: SimpleAggregateFunction type - https://clickhouse.com/docs/sql-reference/data-types/simpleaggregatefunction
- ClickHouse documentation: KILL statements - https://clickhouse.com/docs/sql-reference/statements/kill
- PyJWT documentation: API reference - https://pyjwt.readthedocs.io/en/stable/api.html

## Issues Found
- The standalone Docker command configured Metabase to use a Postgres host named `postgres` without starting or linking a Postgres container, so it would fail outside the Compose setup. Changed it to a working single-container Metabase example using the default H2 application database.
- The Docker command comment implied a separate ClickHouse driver install. Current Metabase 54+ bundles the ClickHouse driver, so the comment now says the bundled driver is used.
- The ClickHouse connection field used `Database name`; current Metabase ClickHouse docs call this field `Databases` and support one or more database names. Updated the field label.
- The ClickHouse user example used plaintext password syntax. Updated it to `IDENTIFIED WITH sha256_password BY ...`, matching ClickHouse's recommended SQL user syntax.
- The Metabase user was later expected to query `system.query_log` and `system.processes`, but those grants were missing. Added read grants for those system tables.
- The summary table used `SummingMergeTree` with `uniq(user_id)`, which can overcount unique users when multiple inserted blocks contain the same user for the same key. Replaced it with an `AggregatingMergeTree` table using `AggregateFunction(uniq, String)`, `uniqState`, and `uniqMerge`.
- The materialized view comment said "Refresh daily", but ClickHouse materialized views incrementally process inserted rows rather than refreshing on a schedule. Updated the comment.
- The Metabase cache settings snippet used unsupported or outdated JSON keys such as `cache-ttl` and `cache-max-kb`. Replaced it with supported config-file settings: `query-caching-max-kb` and `query-caching-max-ttl`.
- The ClickHouse query cache hit-rate query read `QueryCacheHits` and `QueryCacheMisses` from `system.metrics`, but ClickHouse documents those counters in `system.events`. Updated the query to use `system.events` and guarded division by zero.
- The troubleshooting `KILL QUERY` example did not mention that terminating another user's queries requires administrative privileges. Added a comment clarifying that it should be run as an administrator.

## Review Notes
- The Docker Compose example is acceptable for a tutorial, but production deployments should pin image versions and use secrets instead of inline passwords.
- The ClickHouse dashboard queries are illustrative and depend on the sample schema having the referenced tables and columns.
- Static embedding with signed JWTs remains valid, but teams should confirm that static embedding is enabled and that dashboard parameters match the locked parameter names configured in Metabase.
