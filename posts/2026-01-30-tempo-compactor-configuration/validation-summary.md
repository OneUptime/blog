# Validation Summary: How to Build Tempo Compactor Configuration

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Grafana Tempo (distributed tracing backend)
- YAML configuration
- Object storage backends (S3 / GCS / Azure)
- Memberlist / Consul (ring kvstore)
- vParquet block format
- Prometheus alerting rules (PromQL)

## Sources Consulted
- Grafana Tempo configuration reference: https://grafana.com/docs/tempo/latest/configuration/
- Grafana Tempo manifest (full field listing): https://grafana.com/docs/tempo/latest/configuration/manifest/
- Grafana Tempo compaction component docs: https://grafana.com/docs/tempo/latest/reference-tempo-architecture/components/compaction/
- Tempo source: `tempodb/compactor.go` and `tempodb/retention.go` (github.com/grafana/tempo)

## Issues Found
1. **Invalid field `max_compaction_range`** under `compactor.compaction` — not a valid Tempo field. Removed from the basic, window, and production examples.
2. **`max_compaction_objects: 6`** — semantically wrong. This setting bounds the number of objects (traces) per compacted block, not the number of blocks; default is ~6,000,000. Corrected the value and the inline comment.
3. **`block_selector: time-window`** — value is not the canonical option (Tempo uses `time_window` and this is rarely surfaced as user-tunable). Removed the field along with its incorrect comment.
4. **`compactor.max_block_bytes` at the top level of `compactor`** — invalid location. Moved under `compactor.compaction` where the manifest places it.
5. **`tenant_shard_size` under `compactor.compaction`** — not a real field. Replaced with `max_block_bytes` (the size cap intent the section actually needed) and removed the stray reference.
6. **`storage.trace.block.flush_all_on_shutdown`** — wrong location. This option lives on the `ingester` block in current Tempo. Moved accordingly.
7. **`storage.trace.wal.encoding: snappy`** and **`truncate_frequency: 15m`** — not valid WAL fields in current Tempo (WAL config exposes `path` and a few v2-only knobs). Removed both.
8. **`vParquet3`** — outdated. Current default block format is `vParquet4`. Updated all configuration and the best-practices summary.
9. **Overrides structure was flat (legacy)** — current Tempo uses the nested scoped-defaults structure: `overrides.defaults.compaction.block_retention`, `overrides.defaults.ingestion.max_traces_per_user`, `overrides.defaults.ingestion.rate_limit_bytes`, `overrides.defaults.ingestion.burst_size_bytes`, `overrides.defaults.read.max_bytes_per_tag_values_query`. Restructured the multi-tenant example, the per-tenant overrides file example, and the production overrides section.
10. **Metric `tempo_retention_deleted_blocks_total`** — not a real metric name. Replaced with the correct `tempodb_retention_deleted_total` and used `increase(...)` since this is a counter.
11. **`rate(tempodb_compaction_outstanding_blocks[5m])`** — `tempodb_compaction_outstanding_blocks` is a gauge, and `rate()` is only valid on counters. Replaced with a direct threshold comparison.

## Review Notes
- The v2 buffer knobs (`v2_in_buffer_bytes`, `v2_out_buffer_bytes`, `v2_prefetch_traces_count`) are retained in the examples because they remain valid configuration fields, but they only take effect when using v2-format blocks. With `vParquet4` (now the default), they are inert. Inline comments now flag this.
- The "Compaction Levels" diagram uses illustrative block sizes (100MB / 400MB / 1.6GB / 5GB) that depend entirely on tenant traffic and configuration; they are conceptually fine as an illustration.
- The `compaction_window` and `compaction_cycle` values used throughout are within the documented range and consistent with Tempo defaults (1h window, 30s cycle).
- The example `memberlist.join_members` Kubernetes DNS names are illustrative; users will need to adjust namespace/service names for their own clusters.
