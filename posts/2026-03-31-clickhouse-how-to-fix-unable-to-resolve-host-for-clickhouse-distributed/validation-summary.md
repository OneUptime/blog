# Validation Summary: How to Fix 'Unable to resolve host' for ClickHouse Distributed Queries

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- ClickHouse (distributed clusters, `system.clusters`, `config.xml`, `remote_servers`, `interserver_http_host`)
- DNS tooling (`nslookup`, `dig`)
- Networking tools (`nc`, `telnet`, `ping`)
- Linux `/etc/hosts`
- UFW firewall
- Docker Compose
- Kubernetes service DNS

## Sources Consulted
- ClickHouse Configuration Files: https://clickhouse.com/docs/en/operations/configuration-files
- ClickHouse SYSTEM statements: https://clickhouse.com/docs/en/sql-reference/statements/system
- ClickHouse Server Configuration Parameters: https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- ClickHouse system.clusters table: https://clickhouse.com/docs/en/operations/system-tables/clusters
- ClickHouse Network Ports guide: https://clickhouse.com/docs/guides/sre/network-ports
- ClickHouse GitHub issue references for error code 198 (DNS_ERROR)

## Issues Found

1. **Incorrect config reload command.** The post instructed `sudo kill -HUP $(pidof clickhouse-server)` to reload config. In ClickHouse, SIGHUP is used for reopening log files (for logrotate), not for config reload. ClickHouse auto-reloads config files from `config.d`, and the documented manual trigger is the SQL statement `SYSTEM RELOAD CONFIG`. Replaced the command with `clickhouse-client --query "SYSTEM RELOAD CONFIG"` and clarified that auto-reload is the default behavior.

2. **Invalid setting name in Fix 6 heading.** The heading read "Fix 6 - Enable hostname_no_alias to Avoid Reverse DNS Issues" but `hostname_no_alias` is not a real ClickHouse setting. The code example under that heading correctly uses `<interserver_http_host>`. Renamed the heading to "Fix 6 - Set interserver_http_host to Avoid Reverse DNS Issues" to match the actual configuration being shown.

## Review Notes
- Error code 198 (`DNS_ERROR`) is correctly identified.
- Ports 9000 (native), 9009 (inter-server replication), and 8123 (HTTP) are all accurate defaults.
- `system.clusters` columns cited are all real; the actual table has additional columns (e.g., `shard_weight`, `is_local`, `slowdowns_count`, `is_active`) but the subset used is valid and fit for diagnostics.
- The `<clickhouse>` root tag used in config examples is the modern form (replaces the legacy `<yandex>` root); correct for current ClickHouse versions.
- The Kubernetes FQDN form `service-name.namespace.svc.cluster.local` is accurate.
