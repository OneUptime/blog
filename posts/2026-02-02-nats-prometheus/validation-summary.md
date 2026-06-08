# Validation Summary: How to Monitor NATS with Prometheus

## Status
validated

## Post Type
Tutorial / Guide — walks the reader through deploying NATS monitoring with Prometheus, Grafana, and Alertmanager, including server-side metrics, client instrumentation (Go + Python), alerts, dashboards, and a Docker Compose stack.

## Technologies Covered
- NATS server (clustering, monitoring HTTP port, JetStream)
- prometheus-nats-exporter
- Prometheus (scrape configs, relabeling, recording rules, alert rules)
- Grafana (dashboards)
- Alertmanager
- Go NATS client (`github.com/nats-io/nats.go`) + Prometheus Go client
- Python NATS client (`nats-py`) + `prometheus_client`
- Docker Compose
- Kubernetes service discovery

## Sources Consulted
- prometheus-nats-exporter README — https://github.com/nats-io/prometheus-nats-exporter
- prometheus-nats-exporter JetStream collector — https://github.com/nats-io/prometheus-nats-exporter/blob/main/collector/jsz.go
- prometheus-nats-exporter NATS server metrics reference — https://deepwiki.com/nats-io/prometheus-nats-exporter/6.1-nats-server-metrics
- prometheus-nats-exporter JetStream metrics reference — https://deepwiki.com/nats-io/prometheus-nats-exporter/6.2-jetstream-metrics
- NATS monitoring docs — https://docs.nats.io/running-a-nats-service/nats_admin/monitoring
- NATS configuration docs — https://docs.nats.io/running-a-nats-service/configuration/monitoring
- nats.go API docs — https://pkg.go.dev/github.com/nats-io/nats.go
- nats-py module docs — https://nats-io.github.io/nats.py/modules.html
- Prometheus configuration docs — https://prometheus.io/docs/prometheus/latest/configuration/configuration/

## Issues Found

1. **Native `/metrics` endpoint claim was incorrect.** The post stated that NATS's HTTP monitoring port (8222) serves Prometheus-format metrics on `/metrics`. In reality, the stock NATS server only exposes JSON via `/varz`, `/connz`, `/routez`, `/jsz`, `/healthz`, etc. A separate `prometheus-nats-exporter` is required to translate those JSON endpoints into Prometheus text format.
   - Rewrote the architecture diagram to include the exporter as an intermediate sidecar between NATS and Prometheus.
   - Rewrote the "Enabling NATS Metrics" section (renamed to "Enabling NATS Monitoring") to describe the JSON endpoints accurately and reference the exporter explicitly.
   - Added a new "Running the Prometheus Exporter" subsection showing how to launch `prometheus-nats-exporter` with the relevant flags (`-varz`, `-connz`, `-routez`, `-subz`, `-jsz=all`).
   - Updated the verify-with-curl example to point at `http://localhost:8222/varz` for the JSON check and `http://localhost:7777/metrics` for the Prometheus check.

2. **JetStream metric names used the wrong prefix.** The post used `gnatsd_jetstream_*` everywhere; the exporter actually emits metrics under the `jetstream_` namespace with `server_`, `account_`, `stream_`, or `consumer_` subsystems. Specific corrections:
   - `gnatsd_jetstream_total_messages` → `jetstream_server_total_messages`
   - `gnatsd_jetstream_total_bytes` → `jetstream_server_total_message_bytes`
   - `gnatsd_jetstream_streams` → `jetstream_server_total_streams`
   - `gnatsd_jetstream_consumers` → `jetstream_server_total_consumers`
   - `gnatsd_jetstream_memory_used` → `jetstream_account_memory_used`
   - `gnatsd_jetstream_storage_used` → `jetstream_account_storage_used`
   - `gnatsd_jetstream_max_storage` → `jetstream_account_max_storage` (used in ratio expressions where account-level usage is being compared)
   - `gnatsd_jetstream_max_memory` → `jetstream_account_max_memory`
   - `gnatsd_jetstream_consumer_num_pending` → `jetstream_consumer_num_pending`
   - `gnatsd_jetstream_consumer_num_ack_pending` → `jetstream_consumer_num_ack_pending`
   - `gnatsd_jetstream_consumer_num_redelivered` → `jetstream_consumer_num_redelivered`
   These corrections were applied in the metrics catalog, alerting rules, recording rules, the Grafana panel queries, and the `metric_relabel_configs` keep-regex.

3. **Prometheus scrape targets pointed at the wrong port.** Scrape jobs targeted `nats-X:8222` (NATS's JSON port). Changed targets to `nats-X:7777` (the exporter's default port) and updated the related Kubernetes relabel rule to use `:7777` as well.

4. **Fabricated `params: filter:` scrape parameter.** The post showed a Prometheus scrape config that passed `filter: ['connections', 'slow_consumers']` as a URL parameter to the NATS metrics endpoint, claiming the server could filter metrics by query parameter. Neither the NATS monitoring server nor `prometheus-nats-exporter` supports this. Replaced the example with `metric_relabel_configs` doing the same filtering on the Prometheus side, which is the standard idiomatic approach.

5. **Docker Compose was missing the exporter service.** Added a `nats-exporter` service using `natsio/prometheus-nats-exporter:latest` with the appropriate collector flags, and updated Prometheus's `depends_on` accordingly. NATS itself keeps its existing service definition.

6. **Troubleshooting curl example referenced a non-existent endpoint.** Updated `curl http://nats:8222/metrics` to a pair of commands — one hitting `/varz` on NATS (JSON) and one hitting `/metrics` on the exporter (Prometheus text).

7. **Conclusion takeaways list.** Added explicit mention of running `prometheus-nats-exporter` next to each NATS server, since the original list implied native Prometheus exposure.

The Go (`nats.go`) and Python (`nats-py`) client snippets, the Prometheus `out_of_order_time_window` config (correctly nested under `storage.tsdb`), and the `gnatsd_varz_*` core metric names were all verified against authoritative sources and left untouched.

## Review Notes
- The exporter's `-jsz` flag accepts `account`, `accounts`, `consumer`, `consumers`, `all`, `stream`, `streams`. The post uses `-jsz=all`, which is the broadest setting and produces the metrics catalogued in the post. Operators with very large stream counts may want to scope this down for cardinality reasons.
- `jetstream_account_*` metrics carry an `account` label. JetStream storage/memory "used" exists only at the account scope — there is no `jetstream_server_storage_used` or `jetstream_server_memory_used` in the exporter. The ratios in the alerts/dashboards therefore compare account-level used to account-level max, which is the intended behavior.
- The Prometheus `out_of_order_time_window` option (used in the High Memory Usage troubleshooting block) was introduced in Prometheus 2.39 and is still labeled experimental. Readers on older Prometheus versions should drop that block.
- The exporter has historically supported a single NATS server URL per process. For a multi-node cluster, the typical patterns are (a) one exporter sidecar per NATS pod/container, or (b) a single exporter run with multiple URLs via Prometheus relabel federation — the post's diagram and Docker Compose now reflect a one-server starter setup, which a reader can replicate per server.
