# Validation Summary: How to Use ClickHouse Playground for Testing

## Status
validated

## Post Type
Tutorial / Getting Started Guide

## Technologies Covered
- ClickHouse
- ClickHouse Playground (play.clickhouse.com)
- curl (HTTP interface)
- clickhouse-client (native TCP interface)
- SQL

## Sources Consulted
- ClickHouse Playground documentation: https://clickhouse.com/docs/en/getting-started/playground
- ClickHouse JSON data type documentation: https://clickhouse.com/docs/en/sql-reference/data-types/json
- ClickHouse example datasets documentation: https://clickhouse.com/docs/en/getting-started/example-datasets
- ClickHouse NYC Taxi dataset documentation: https://clickhouse.com/docs/en/getting-started/example-datasets/nyc-taxi

## Issues Found

### 1. Incorrect playground password in curl and clickhouse-client examples
**What was wrong:** Both the curl and clickhouse-client connection examples specified `password=clickhouse` / `--password clickhouse`. The ClickHouse Playground uses an empty password for both the `play` and `explorer` users.
**What was changed:** Removed the password parameter from the curl URL and removed the `--password` flag from the clickhouse-client command.

### 2. Wrong port for clickhouse-client
**What was wrong:** The clickhouse-client example used `--port 443`, which is the HTTPS port. The `clickhouse-client` tool uses the native TCP protocol, which runs on port 9440 for secure connections (not 443).
**What was changed:** Changed `--port 443` to `--port 9440`.

### 3. Invalid JSON type syntax and deprecated setting
**What was wrong:** The JSON example used `allow_experimental_object_type = 1` (which enables the deprecated `Object('json')` type, not the current JSON type) and the syntax `json:$.user.id` which is not valid ClickHouse syntax. ClickHouse uses dot notation for JSON field access (e.g., `data.user.id`). Additionally, the example referenced a `test_json` table that does not exist on the read-only playground.
**What was changed:** Replaced with a self-contained query using `::JSON` cast and dot-notation field access, which is correct for ClickHouse 25.3+ where the JSON type is production-ready.

### 4. curl --data vs --data-binary
**What was wrong:** The curl example used `--data` which strips newlines. The official ClickHouse documentation uses `--data-binary` which preserves newlines and is more correct for multi-line SQL queries.
**What was changed:** Changed `--data` to `--data-binary`.

## Review Notes
- The `datasets.dns` table referenced in the "DNS Logs" section could not be verified as an available dataset on the ClickHouse Playground. The official example datasets documentation does not list a DNS dataset. This section may need to be removed or updated if the table does not exist on the playground.
- The `datasets.trips` table name could not be precisely verified. The official NYC Taxi dataset documentation references `datasets.trips_mergetree` and `nyc_taxi.trips_small` as table names. The playground may use different naming; readers should run `SHOW TABLES FROM datasets` to confirm exact table names.
- The `datasets.github_events` table and column names (`type`, `created_at`, `actor_login`) are consistent with the well-known GitHub Archive dataset schema but could not be directly verified against the live playground.
- The post correctly notes that the playground is read-only and shared, which are the key limitations documented in the official docs.
