# Validation Summary: How to Implement Tempo Ingester Configuration

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Grafana Tempo (ingester component)
- YAML configuration
- Object storage backends (S3, GCS, Azure Blob)
- Memberlist / hash ring for service discovery
- Prometheus (recording and alerting rules)
- Kubernetes (StatefulSet resource configuration)
- Mermaid diagrams

## Sources Consulted
- Grafana Tempo configuration reference: https://grafana.com/docs/tempo/latest/configuration/
- Grafana Tempo configuration manifest: https://grafana.com/docs/tempo/latest/configuration/manifest/
- Tempo ingester source `modules/ingester/config.go` (v2.6.1): https://github.com/grafana/tempo/blob/v2.6.1/modules/ingester/config.go
- Tempo storage WAL source `modules/storage/config.go` (v2.6.1): https://github.com/grafana/tempo/blob/v2.6.1/modules/storage/config.go
- Tempo overrides source `modules/overrides/config.go` and `modules/overrides/config_legacy.go` (v2.6.1)
- Grafana long-running traces doc: https://grafana.com/docs/tempo/latest/troubleshooting/querying/long-running-traces/
- GitHub issue tracking `max_search_bytes_per_trace`: https://github.com/grafana/tempo/issues/1126

## Issues Found
1. **Incorrect defaults in the "Key Parameters Explained" table** (Section 3). Verified against `modules/ingester/config.go`:
   - `max_block_duration` default is **30m**, not 5m.
   - `max_block_bytes` default is **500MB** (524,288,000), not 1GB.
   - `trace_idle_period` default is **10s**, not 30s.
   - `flush_all_on_shutdown` default is **false**, not true.
   - Added `flush_op_timeout` (default 5m) which the post used but did not document.

2. **Invalid ingester parameters removed/relocated**:
   - `max_trace_idle_period` is not a real Tempo ingester field — removed. The post's lifecycle-tuning block now uses real ingester knobs (`trace_idle_period`, `max_block_duration`, `complete_block_timeout`).
   - `max_spans_per_trace` is not a Tempo configuration field at all — removed.
   - `max_bytes_per_trace` is an **overrides** field, not an ingester field — moved to an `overrides.defaults` block.
   - `max_traces` is not an ingester field — replaced with `max_traces_per_user` under `overrides.defaults` (and the matching cluster-wide `max_global_traces_per_user`).

3. **gRPC server limits placed under the wrong block** (Section 6). The `grpc_server_max_recv_msg_size`, `grpc_server_max_send_msg_size`, and `grpc_server_max_concurrent_streams` parameters belong under `server:`, not `ingester:`. The example was restructured accordingly.

4. **WAL configuration placed under the wrong block** (Sections 6, 7, 8). Tempo's WAL configuration lives under `storage.trace.wal`, not under `ingester.wal`. All three sections were corrected to put WAL settings under `storage.trace.wal`.

5. **`wal_segments` is not a valid parameter** — removed everywhere it appeared.

6. **WAL `version` value was wrong**. The post showed `version: v2` (a legacy block encoding). The current accepted values are block encoding names like `vParquet3` / `vParquet4`. Updated to `vParquet3` to match the storage block version already shown in the complete config.

7. **Lifecycler parameter descriptions were misleading** (Section 3):
   - `observe_period` was described as "Time to wait before marking unhealthy ingesters as dead" — that is not what it does. Corrected to describe observing tokens after generating them to resolve ring collisions.
   - `min_ready_duration` was described as "Minimum time to remain in LEAVING state" — corrected to "Minimum time to wait after readiness checks pass before reporting ready."

## Review Notes
- The post is written for the classic Tempo ingester component (Tempo 2.x). In Tempo 3.0 the ingester module was replaced by the `block-builder` and `live-store` components, so readers on Tempo 3.x will need a different configuration. The post does not explicitly call out a Tempo version, but the configuration shown is consistent with Tempo 2.x. A version note would be a useful future improvement.
- `max_search_bytes_per_trace` (used in the `overrides.defaults` example in Section 8) is deprecated upstream but still parsed, so it was left in place.
- The Section 3 default for `flush_check_period` (10s) matches the source and was kept.
- The flat legacy override keys (`ingestion_rate_limit_bytes`, `ingestion_burst_size_bytes`, `max_traces_per_user`, `max_bytes_per_trace`) are still supported through `config_legacy.go`, so the examples that use them remain valid even though the modern structured form nests them under `ingestion:` / `global:`.
- Storage block keys `v2_index_downsample_bytes` and `v2_encoding` only apply to v2-format blocks; with `version: vParquet3` they are ignored. They are not harmful, so they were left in the example.
