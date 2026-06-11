# Validation Summary: How to Create Prometheus Retention Strategies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus (TSDB, retention flags, recording rules, alerting rules)
- Thanos (sidecar, compactor, downsampling, object storage)
- PromQL
- Kubernetes Deployment manifests
- S3-compatible object storage (Thanos bucket config)
- Grafana (referenced as the query frontend)

## Sources Consulted
- [Prometheus Storage documentation](https://prometheus.io/docs/prometheus/latest/storage/) — verified TSDB block layout, retention flags (`--storage.tsdb.retention.time`, `--storage.tsdb.retention.size`), capacity planning formula, and bytes-per-sample range
- [Prometheus TSDB source (`tsdb/db.go`)](https://github.com/prometheus/prometheus/blob/main/tsdb/db.go) — verified metric names `prometheus_tsdb_storage_blocks_bytes`, `prometheus_tsdb_retention_limit_bytes`, `prometheus_tsdb_lowest_timestamp_seconds`, `prometheus_tsdb_head_series`, `prometheus_tsdb_head_series_created_total`, `prometheus_tsdb_head_samples_appended_total`, `prometheus_tsdb_compactions_failed_total`
- [Thanos Compactor documentation](https://thanos.io/tip/components/compact.md/) — verified `--retention.resolution-raw`, `--retention.resolution-5m`, `--retention.resolution-1h`, `--wait`, `--wait-interval` flags
- [Thanos Sidecar documentation](https://thanos.io/tip/components/sidecar.md/) — verified `--tsdb.path`, `--prometheus.url`, `--objstore.config-file` flags and that `--storage.tsdb.min-block-duration=2h` / `--storage.tsdb.max-block-duration=2h` are required on Prometheus when running with the sidecar
- [Prometheus remote_write config reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write) — verified `queue_config` fields (`max_samples_per_send`, `batch_send_deadline`, `capacity`, `max_shards`)
- [Prometheus API status/tsdb endpoint](https://prometheus.io/docs/prometheus/latest/querying/api/#tsdb-stats) — verified `data.headStats.numSeries` response shape

## Issues Found

1. **Capacity estimation formula did not match the example calculation.**
   - The original text wrote `bytes = series_count * scrape_interval_samples * retention_seconds * bytes_per_sample`, but the worked example used `100,000 * (1,296,000 / 15) * 2`. The variable `scrape_interval_samples` was undefined and the dimensional flow did not match the calculation.
   - Updated the formula to `bytes = retention_seconds * (series_count / scrape_interval_seconds) * bytes_per_sample`, which is the form used in the official Prometheus storage docs (`needed_disk_space = retention_time_seconds * ingested_samples_per_second * bytes_per_sample`, where ingested samples per second equals series count divided by the scrape interval in seconds). The worked example was reordered to match (`1,296,000 * (100,000 / 15) * 2 ≈ 17.3 GB`); the numeric result is unchanged.
   - Also removed the parenthetical "(4 samples/minute)" since the calculation operates on per-second scrape rate, not per-minute, and the redundant unit caused confusion.

## Review Notes
- All Prometheus TSDB metric names were verified, including the `_seconds`-suffixed `prometheus_tsdb_lowest_timestamp_seconds` (renamed from the older `prometheus_tsdb_lowest_timestamp` per upstream issue #363).
- The `PrometheusStorageFillingUp` alert divides by `prometheus_tsdb_retention_limit_bytes`. When `--storage.tsdb.retention.size` is unset, this metric is 0, and the expression becomes `+Inf > 0.8`, which would fire continuously. The alert is only meaningful when size-based retention is configured; the surrounding text implies that context, so no change was made, but readers should be aware.
- Image versions (`prom/prometheus:v2.47.0` from Sep 2023, `quay.io/thanos/thanos:v0.32.0` from May 2023) are well behind current releases as of mid-2026 (Prometheus is on the 3.x line; Thanos on 0.3x/0.4x). The configurations shown still work, but anyone deploying fresh should pin to a newer maintained tag.
- The Thanos receive port `19291` shown for `remote_write` is the default remote-write HTTP port (`--remote-write.address`), which is correct.
- The Prometheus storage Mermaid diagram is conceptually simplified — head blocks are persisted every 2h and then compacted into larger blocks over time; the diagram's parallel `Block 1` / `Block 2` arrows are stylized but not technically incorrect.
- The Thanos sidecar example correctly pins `--storage.tsdb.min-block-duration=2h` and `--storage.tsdb.max-block-duration=2h` on Prometheus, which is required to disable local compaction so Thanos can take over compaction in object storage.
