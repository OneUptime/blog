# Validation Summary: How to Use ClickHouse with Coroot for Infrastructure Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- Coroot (community edition)
- coroot-node-agent (eBPF collector)
- OpenTelemetry
- Docker Compose

## Sources Consulted
- Coroot main repo and config flags: https://github.com/coroot/coroot/blob/main/config/flags.go
- Coroot ClickHouse schema DDL: https://github.com/coroot/coroot/blob/main/ch/client.go
- Coroot server config defaults: https://github.com/coroot/coroot/blob/main/config/config.go
- Official docker-compose example: https://github.com/coroot/coroot/blob/main/deploy/docker-compose.yaml
- coroot-node-agent flags: https://github.com/coroot/coroot-node-agent/blob/main/flags/flags.go
- Coroot documentation: https://docs.coroot.com

## Issues Found
1. **Invalid `--bootstrap-clickhouse-auth=coroot:coroot` flag.** No such combined `user:password` flag exists. Replaced with the real flags `--bootstrap-clickhouse-user=coroot` and `--bootstrap-clickhouse-password=coroot`. The stray `--bootstrap-clickhouse-database=coroot` line was also removed since the official compose does not set it (Coroot creates the database on bootstrap).
2. **Invalid `COROOT_ENDPOINT` env var on `coroot-node-agent`.** The agent expects the `--collector-endpoint=<url>` flag (env `COLLECTOR_ENDPOINT`). Switched to the flag form in the compose file.
3. **Wrong ClickHouse table names.** The post listed `traces`, `profiles`, `log_patterns`, `node_agents`. The real tables created by Coroot are `otel_logs`, `otel_traces`, `profiling_stacks`, `profiling_samples`, `profiling_profiles`, `metrics`, and `metrics_metadata` (plus materialized-view companions). Updated the `SHOW TABLES` output accordingly.
4. **TTL `ALTER` statements referenced the wrong tables and columns.** Updated to `otel_traces` (timestamp column `Timestamp`) and `profiling_samples` (timestamp column `Start`) to match the actual DDL.
5. **Trace query used non-existent column names.** The post used `service`, `timestamp`, `duration_ms`, and `status = 'error'`. The real schema exposes `ServiceName` (LowCardinality String), `Timestamp` (DateTime64(9)), `Duration` (Int64 nanoseconds), and `StatusCode` as an OTel string (`STATUS_CODE_OK`/`STATUS_CODE_ERROR`/`STATUS_CODE_UNSET`). Rewrote the query against the real columns and converted nanoseconds to ms explicitly.
6. **Claim that ClickHouse stores "traces, profiles, and log patterns"** was incomplete/misleading. ClickHouse holds logs (not just log patterns — pattern clustering is a UI feature over `otel_logs`), traces, profiles, and metrics. Coroot's own project/user configuration lives in Postgres or SQLite, not ClickHouse. Clarified both points in the "What Is Coroot" and Summary sections.

## Review Notes
- A production deployment typically also runs `coroot-cluster-agent` (for Kubernetes cluster-level collection and Prometheus scraping). The post focuses on the single-node `coroot-node-agent` path, which is a legitimate starting point; mentioning the cluster agent could be a useful future addition but is not a correctness issue.
- The `ClickHouse 24.3` image tag is a valid LTS stream as of this review; readers should still pin to a supported version at deploy time.
- The `<max_memory_usage>` XML snippet is a valid ClickHouse server-level setting but is typically set per-user/profile in `users.xml`; leaving as-is since the server config also accepts it and the post's intent (raise limits) is clear.
