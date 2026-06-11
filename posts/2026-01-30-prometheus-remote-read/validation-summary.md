# Validation Summary: How to Implement Prometheus Remote Read

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Prometheus (remote read protocol, configuration)
- Thanos (Sidecar, Store Gateway, Query)
- VictoriaMetrics (single-node)
- Go (`github.com/prometheus/prometheus/prompb`, `github.com/golang/snappy`, `github.com/gogo/protobuf`)
- Docker / Docker Compose
- YAML configuration
- PromQL

## Sources Consulted
- Prometheus remote_read config reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_read
- Prometheus `DefaultRemoteReadConfig` in `config/config.go`: https://github.com/prometheus/prometheus/blob/main/config/config.go
- Prometheus remote read client metrics in `storage/remote/client.go`: https://github.com/prometheus/prometheus/blob/main/storage/remote/client.go
- prompb Go types: https://github.com/prometheus/prometheus/blob/main/prompb/types.pb.go and https://github.com/prometheus/prometheus/blob/main/prompb/remote.pb.go
- Thanos Store Gateway docs (gRPC StoreAPI, no `/api/v1/read`): https://thanos.io/tip/components/store.md/
- Thanos Query docs (HTTP port 10902, supports Prometheus `/api/v1/read`): https://thanos.io/tip/components/query.md/
- VictoriaMetrics FAQ ("Why doesn't VictoriaMetrics support the Prometheus remote read API?"): https://docs.victoriametrics.com/victoriametrics/faq/
- VictoriaMetrics single-server docs: https://docs.victoriametrics.com/victoriametrics/single-server-victoriametrics/

## Issues Found

1. **`read_recent` default value incorrect.** The configuration options table listed `read_recent` default as `true`. The actual default in `DefaultRemoteReadConfig` is `false`. Corrected the table.

2. **First Thanos config example pointed at Store Gateway.** The example used `http://thanos-store-gateway:10901/api/v1/read` and described it as reading "from a Thanos Store Gateway". Thanos Store Gateway exposes the Thanos `StoreAPI` over gRPC on port 10901 and only has `/metrics` / health endpoints over HTTP — it does not implement the Prometheus remote read HTTP API. Prometheus `remote_read` should be configured against Thanos Querier (default HTTP port 10902), which does implement `/api/v1/read`. Updated the URL to `http://thanos-query:10902/api/v1/read` and the surrounding text accordingly.

3. **VictoriaMetrics remote_read example was invalid.** The post showed configuring Prometheus `remote_read` against `http://victoriametrics:8428/api/v1/read`. Per the official VictoriaMetrics FAQ, VictoriaMetrics intentionally does not implement the Prometheus remote read API (citing performance and the protocol's unsuitability for a global query view). Rewrote the section to: (a) explain that VM doesn't implement remote_read, (b) keep the remote_write configuration which IS supported, and (c) direct readers to query VM's Prometheus-compatible HTTP query API via Grafana for historical data.

4. **Incorrect Prometheus client metric names.** The post used `prometheus_remote_storage_read_request_duration_seconds_*` and `prometheus_remote_storage_read_queries_total`. The actual metrics registered in `storage/remote/client.go` use the `remote_read_client` subsystem: `prometheus_remote_read_client_request_duration_seconds` (Histogram) and `prometheus_remote_read_client_queries_total` (Counter). Updated both PromQL snippets (latency average and 99th percentile).

## Review Notes

- The Go remote read server example is correct against current `prompb`: `TimeSeries.Labels` is `[]Label` (value slice), `ReadResponse.Results` is `[]*QueryResult`, `QueryResult.Timeseries` is `[]*TimeSeries`, and `Query.StartTimestampMs` / `EndTimestampMs` are valid fields. The `github.com/gogo/protobuf/proto` import remains valid because `prompb` is still generated with gogoproto.
- The default 15-day retention claim for Prometheus is accurate (`--storage.tsdb.retention.time=15d`).
- The Thanos Docker Compose example uses correct gRPC store flags (`--store=thanos-sidecar:10901`, `--store=thanos-store:10901`) and the Thanos Query HTTP port 10902 is correctly mapped — the remote_read URL for that setup (`http://thanos-query:10902/api/v1/read`) is correct.
- `required_matchers` and `remote_timeout` (default `1m`) are documented correctly.
- For readers who want a backend that DOES implement Prometheus remote read for `remote_read` (rather than only remote_write), Thanos Query, Cortex/Mimir, and M3DB are all valid choices. The post mentions all of these.
