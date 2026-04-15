# Validation Summary: How to Build a Multi-Tenant API Layer Over ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL DDL, Row Policies, User Management)
- @clickhouse/client (Node.js ClickHouse client)
- Node.js / Express.js (API middleware and route handling)
- Multi-tenant architecture patterns

## Sources Consulted
- ClickHouse official documentation: CREATE ROW POLICY — https://clickhouse.com/docs/sql-reference/statements/create/row-policy
- ClickHouse official documentation: CREATE USER — https://clickhouse.com/docs/sql-reference/statements/create/user
- ClickHouse official documentation: MergeTree engine — https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse official documentation: Custom Partitioning Key — https://clickhouse.com/docs/engines/table-engines/mergetree-family/custom-partitioning-key
- @clickhouse/client Node.js client documentation — https://clickhouse.com/docs/en/integrations/language-clients/javascript
- @clickhouse/client GitHub repository — https://github.com/ClickHouse/clickhouse-js

## Issues Found
1. **`ENGINE = MergeTree` missing parentheses**: The `CREATE TABLE` statement used `ENGINE = MergeTree` without parentheses. Modern ClickHouse requires `ENGINE = MergeTree()` with empty parentheses. The form without parentheses is deprecated legacy syntax. Fixed to `ENGINE = MergeTree()`.

2. **`host` should be `url` in `createClient()` config**: The `@clickhouse/client` Node.js client uses `url` as the configuration property for the server address, not `host`. The `host` property was deprecated in v1.0.0. Changed `host: process.env.CLICKHOUSE_HOST` to `url: process.env.CLICKHOUSE_HOST`.

3. **`settings` should be `clickhouse_settings` in query options**: In the fallback tenant filtering example, the `client.query()` call used `settings` to pass ClickHouse server settings. The correct property name in `@clickhouse/client` is `clickhouse_settings`. Changed `settings:` to `clickhouse_settings:`.

## Review Notes
- The `plaintext_password` authentication method used in the `CREATE USER` example is valid but insecure for production. `sha256_password` or `bcrypt_password` would be more appropriate. This is acceptable for a tutorial example.
- Partitioning by `(tenant_id, toYYYYMM(event_time))` is syntactically valid but could produce a very large number of partitions with many tenants. ClickHouse recommends keeping partition counts manageable (under ~1000). For high tenant counts, partitioning by time alone with `tenant_id` only in the `ORDER BY` key may perform better.
- The `additional_table_filters` setting in the fallback section is a valid ClickHouse setting, but passing Map-type settings through the Node.js client as a JavaScript object may require version-specific handling. The concept is sound.
