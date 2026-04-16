# Validation Summary: How to Use ClickHouse with Jaeger for Trace Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (24.3)
- Jaeger (v1, gRPC storage plugin API)
- jaeger-clickhouse community plugin
- Docker Compose
- Distributed tracing / OpenTelemetry concepts

## Sources Consulted
- [jaegertracing/jaeger-clickhouse repository (README)](https://github.com/jaegertracing/jaeger-clickhouse)
- [jaeger-clickhouse spans schema template (`jaeger-spans.tmpl.sql`)](https://github.com/jaegertracing/jaeger-clickhouse/blob/main/sqlscripts/jaeger-spans.tmpl.sql)
- [jaeger-clickhouse index schema template (`jaeger-index.tmpl.sql`)](https://github.com/jaegertracing/jaeger-clickhouse/blob/main/sqlscripts/jaeger-index.tmpl.sql)
- [jaeger-clickhouse `config.yaml` reference](https://github.com/jaegertracing/jaeger-clickhouse/blob/main/config.yaml)
- [jaeger-clickhouse releases (latest 0.13.0, Nov 2022)](https://github.com/jaegertracing/jaeger-clickhouse/releases)
- [jaegertracing/jaeger#4647 — gRPC plugin deprecation](https://github.com/jaegertracing/jaeger/issues/4647)
- [jaegertracing/jaeger#5058 — native ClickHouse in Jaeger v2](https://github.com/jaegertracing/jaeger/issues/5058)
- [jaegertracing/jaeger discussion #5851 — ClickHouse with Jaeger 1.58+](https://github.com/orgs/jaegertracing/discussions/5851)
- [Jaeger v2 storage backends doc](https://www.jaegertracing.io/docs/2.0/storage/)

## Issues Found
- **Plugin status not flagged.** The post presented `jaeger-clickhouse` as if it were a current production option. In reality it is experimental, last released `0.13.0` (Nov 2022), targets only the deprecated `grpc-plugin` API, and that API was removed in Jaeger v1.58+. Added a clear note plus a forward pointer to the Jaeger v2 native ClickHouse work (issue #5058).
- **Non-existent Docker image.** The post used `ghcr.io/jaegertracing/jaeger-clickhouse:latest` and ran the plugin as a separate container. The project does not publish a container image — it ships only Go release archives. Replaced with a `make build` from source step.
- **Wrong runtime architecture.** The original docker-compose ran the plugin as its own service exposing port `17271` (a fabricated value) and pointed Jaeger at it via `GRPC_STORAGE_PLUGIN_BINARY: /jaeger-clickhouse` while the binary lived in the other container. The grpc-plugin model requires the plugin binary to live inside the Jaeger container so Jaeger spawns it as a subprocess over stdio. Rewrote the compose file to mount the binary + `config.yaml` into the Jaeger container, pinned `jaegertracing/all-in-one:1.57` (the last release supporting grpc-plugin), and added the correct `--grpc-storage-plugin.*` flags.
- **Wrong configuration mechanism.** The post used `CLICKHOUSE_URL` / `CLICKHOUSE_DATABASE` env vars; the plugin is configured via `config.yaml` with fields `address`, `database`, `init_tables`, `ttl`, etc. Replaced with a real `config.yaml` snippet.
- **Fabricated schema.** The post showed a single `jaeger_spans` table with columns (`trace_id` FixedString(16), `span_id` UInt64, `parent_span_id` UInt64, `operation_name`, `service_name`, `duration_us` Int64, `tags Array(Tuple(...))`, `logs Array(...)`) and an inline TTL clause. The plugin actually creates two tables: `jaeger_spans_local` (`timestamp DateTime`, `traceID String`, `model String`, ORDER BY `traceID`) and `jaeger_index_local` (`timestamp DateTime`, `traceID String`, `service`, `operation`, `durationUs UInt64`, `tags Nested(key, value)`, plus bloom-filter and minmax indexes, ORDER BY `(service, -toUnixTimestamp(timestamp))`). Replaced with the real schemas from `sqlscripts/`.
- **Wrong column names in example query.** The query used `service_name`, `operation_name`, `duration_us`, `trace_id` against `jaeger_spans`. Updated to the real columns (`service`, `operation`, `durationUs`, `traceID`) and the correct table (`jaeger_index_local`).
- **TTL `ALTER TABLE` example.** Changed to alter both `jaeger_index_local` and `jaeger_spans_local`, since both tables hold span data and need consistent retention.

## Review Notes
- The cleanest answer for new deployments is the OpenTelemetry Collector ClickHouse exporter (or Jaeger v2's experimental native ClickHouse backend) rather than this plugin; the post now flags this in the intro and summary, which is the most we can do without restructuring.
- `jaeger_spans_local` / `jaeger_index_local` are the names used when `replication: false` (the default). With `replication: true` the plugin creates `jaeger_spans` / `jaeger_index` distributed tables on top of the `_local` tables. The post sticks with the local-only names, which matches the simple compose example.
- Pinning `jaegertracing/all-in-one:1.57` is intentional: `:latest` would resolve to a Jaeger v1.58+ image where `SPAN_STORAGE_TYPE=grpc-plugin` no longer works. This is the correct workaround for anyone determined to use this plugin today.
- ClickHouse 24.3 is fine for the example, but anything ≥21.8 will satisfy the plugin's requirements.
