# Validation Summary: How to Write a ClickHouse Cluster Status Dashboard Script

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (HTTP interface, system tables, SQL functions)
- Bash shell scripting
- curl
- watch (procps utility)

## Sources Consulted
- ClickHouse docs: Other functions (`uptime`, `version`, `formatReadableSize`) — https://clickhouse.com/docs/sql-reference/functions/other-functions
- ClickHouse docs: `system.processes` — https://clickhouse.com/docs/operations/system-tables/processes
- ClickHouse docs: `system.disks` — https://clickhouse.com/docs/operations/system-tables/disks
- ClickHouse docs: `system.replicas` — https://clickhouse.com/docs/operations/system-tables/replicas
- ClickHouse docs: `system.parts` — https://clickhouse.com/docs/operations/system-tables/parts
- ClickHouse docs: `system.clusters` — https://clickhouse.com/docs/operations/system-tables/clusters
- ClickHouse docs: Output formats (`TabSeparated`, `PrettyCompactMonoBlock`) — https://clickhouse.com/docs/interfaces/formats
- ClickHouse docs: HTTP interface (port 8123, basic auth, POST body) — https://clickhouse.com/docs/interfaces/http

## Issues Found
No technical issues found. All ClickHouse functions, system-table column references, output formats, and the HTTP interface usage (port 8123, `-u user:password` basic auth, `--data-binary` POST body) match official documentation. The bash script is syntactically valid.

## Review Notes
- The `NODES=($CH1 $CH2 $CH3)` line hardcodes exactly three nodes; readers wishing to scale the dashboard to more or fewer nodes will need to adjust this array (or iterate over a dynamic list in the config file). This is a design choice, not an error.
- Passing credentials via `-u "${CH_USER}:${CH_PASSWORD}"` exposes the password in process listings on the local host. In production it is generally preferable to use the `X-ClickHouse-User` / `X-ClickHouse-Key` HTTP headers or a netrc file. Not incorrect, just worth noting.
- The "Cross-Cluster Replication Status" section queries `system.clusters` rather than anything replication-specific (despite the heading); the results show cluster topology, which is still useful context.
