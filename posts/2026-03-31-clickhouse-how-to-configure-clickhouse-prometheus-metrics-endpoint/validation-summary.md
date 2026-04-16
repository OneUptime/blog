# Validation Summary: How to Configure ClickHouse Prometheus Metrics Endpoint

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (built-in Prometheus metrics endpoint, `config.d/` XML configuration)
- Prometheus (scrape configuration, alerting rules)
- Grafana (dashboard import)
- systemd (clickhouse-server service)

## Sources Consulted
- ClickHouse docs — Prometheus-compatible metrics endpoint: https://clickhouse.com/docs/integrations/prometheus
- ClickHouse docs — Prometheus protocols / interface: https://clickhouse.com/docs/interfaces/prometheus
- ClickHouse docs — Server configuration parameters (`prometheus`, `listen_host`): https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- ClickHouse docs — `system.events`, `system.metrics`, `system.asynchronous_metrics` system tables
- clickhouse-docs repository (`docs/integrations/interfaces/prometheus.md`) on GitHub
- Grafana Labs dashboard listings (ID 14192 — ClickHouse; ID 14268 — Linkerd Namespace, unrelated)

## Issues Found
1. **Incorrect metric prefix for events.** The post used `ClickHouseEvents_*` throughout. ClickHouse's Prometheus endpoint actually exposes `system.events` counters with the prefix `ClickHouseProfileEvents_*`. Replaced every occurrence — in the sample `curl` output, the bulleted event list, the summary paragraph, and the `ClickHouseEvents_FailedQuery` alert expression (now `ClickHouseProfileEvents_FailedQuery`).
2. **Invalid `<address>` sub-element inside `<prometheus>`.** The "Securing the Endpoint" section recommended `<address>127.0.0.1</address>` inside `<prometheus>`, which is not a valid configuration key. Rewrote the example to use the server-level `<listen_host>127.0.0.1</listen_host>` setting, which is the supported way to bind ClickHouse HTTP listeners (including the Prometheus endpoint) to a specific interface.
3. **Wrong Grafana dashboard ID.** The post cited dashboard ID 14268 as the "official ClickHouse Grafana dashboard". Grafana dashboard 14268 is actually "Linkerd Namespace" (a Linkerd service-mesh dashboard). Replaced with ID 14192, a widely-used community ClickHouse dashboard, and softened "official" to "community" since ClickHouse does not publish an official dashboard under either ID.

## Review Notes
- The `<endpoint>` path (`/metrics`) and `<port>` (9363) are conventional values but are not hard-coded defaults — they must be set explicitly in `<prometheus>`, which the post does correctly.
- `<status_info>true</status_info>` is a valid option and is left in place.
- The `ClickHouseStatusInfo_*` family (exposed when `status_info: true`) is not discussed in the "Metric Categories" section. Not an error, but worth mentioning in a future revision for completeness.
- Binding via `<listen_host>` applies to all HTTP listeners on the server; if the author wants to leave the main HTTP interface on `0.0.0.0` and restrict only `9363`, they should front the port with a firewall rule or reverse proxy — the post already mentions this option.
