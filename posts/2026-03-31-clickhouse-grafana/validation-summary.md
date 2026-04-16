# Validation Summary: How to Use ClickHouse with Grafana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (user management, MergeTree tables, settings profiles, TTL, `toStartOfInterval`, quantiles)
- Grafana (data source plugin, template variables, alerting, dashboard provisioning)
- grafana-clickhouse-datasource plugin (official Grafana plugin)
- Docker (Grafana OSS container with `GF_INSTALL_PLUGINS`)
- SQL (ClickHouse dialect)
- YAML / JSON (Grafana provisioning formats)

## Sources Consulted
- Grafana ClickHouse data source plugin docs: https://grafana.com/grafana/plugins/grafana-clickhouse-datasource/
- ClickHouse SQL reference — CREATE USER, CREATE SETTINGS PROFILE, ALTER USER: https://clickhouse.com/docs/en/sql-reference/statements/create/user and related pages
- ClickHouse MergeTree engine docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse network ports (9000 native, 9440 native+TLS, 8123 HTTP, 8443 HTTPS): https://clickhouse.com/docs/en/guides/sre/network-ports
- ClickHouse query cache settings (`use_query_cache`, `query_cache_ttl`): https://clickhouse.com/docs/en/operations/query-cache
- Grafana provisioning documentation (dashboards, `foldersFromFilesStructure`, `updateIntervalSeconds`): https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana global variable reference (`$__timeFilter`, `$__interval_s`, variable formatters like `:singlequote`): https://grafana.com/docs/grafana/latest/dashboards/variables/
- Grafana alerting docs: https://grafana.com/docs/grafana/latest/alerting/

## Issues Found
- **ClickHouse HTTPS port 443 → 8443.** The data source configuration listed `443 (HTTPS)` as the port. ClickHouse's default HTTPS port is `8443` (with `9440` for native+TLS, `8123` for plain HTTP). Port 443 is only valid when sitting behind a reverse proxy. Updated to `8443 (HTTPS)` so the port matches the stock ClickHouse listener.

## Review Notes
- The plugin ID `grafana-clickhouse-datasource` and install command are correct for the official Grafana ClickHouse plugin.
- ClickHouse `CREATE USER ... IDENTIFIED WITH plaintext_password`, `CREATE SETTINGS PROFILE`, and the `ALTER USER ... SETTINGS PROFILE <name>` syntax are all valid. Quoting the profile name (`'grafana_profile'`) is also accepted; the unquoted identifier form used here works.
- `use_query_cache` and `query_cache_ttl` are valid ClickHouse settings (query cache introduced in 23.1). Good fit for a Grafana profile.
- `PARTITION BY toYYYYMMDD(ts)` yields one partition per day. Fine for this retention (30 days), but high-ingest users commonly prefer `toYYYYMM(ts)` to reduce part count — not wrong, just worth noting.
- The `$__timeFilter(ts)` and `$__interval_s` macros are the correct Grafana-ClickHouse plugin macros for time-series panels.
- In recent Grafana releases the `datasource` field on a panel prefers an object `{ "type": "grafana-clickhouse-datasource", "uid": "..." }`. The string form (`"ClickHouse Production"`) still works for back-compat and is commonly seen in docs.
- The variable query `AND host IN (${host:singlequote})` correctly uses the `:singlequote` formatter. The logs panel uses `level IN ($log_level)`; for multi-value string variables, `(${log_level:singlequote})` would be safer — acceptable as written but worth future hardening.
- The TLS client auth note (`TLS Client Auth: Enabled (for production)`) specifically refers to mutual TLS. Most deployments enable server-side TLS only; this is a reasonable hardening recommendation but not strictly required.
