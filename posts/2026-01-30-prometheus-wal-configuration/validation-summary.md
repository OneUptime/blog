# Validation Summary: How to Implement Prometheus WAL Configuration

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Prometheus (TSDB / Write-Ahead Log)
- PromQL
- Prometheus remote_write
- promtool
- Snappy compression
- XFS / ext4 filesystem mount options
- Mermaid diagrams (documentation only)

## Sources Consulted
- Prometheus storage documentation: https://prometheus.io/docs/prometheus/latest/storage/
- Prometheus remote_write tuning guide: https://prometheus.io/docs/practices/remote_write/
- promtool command-line reference: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- Prometheus HTTP API (admin endpoints): https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus source: `tsdb/wlog/wlog.go` (DefaultSegmentSize, WAL metrics)
- Prometheus source: `tsdb/head.go` (`prometheus_tsdb_wal_corruptions_total` registration)
- Prometheus source: `storage/remote/queue_manager.go` (remote write metric names)
- Prometheus 2.20.0 release notes (WAL compression enabled by default)
- WAL format docs: https://github.com/prometheus/prometheus/blob/main/tsdb/docs/format/wal.md

## Issues Found

1. **`promtool tsdb repair` command does not exist.** The post claimed a WAL repair tool was added in Prometheus 2.31+ as `promtool tsdb repair`. This subcommand does not exist in any Prometheus release — `promtool tsdb` supports `bench`, `analyze`, `list`, `dump`, `dump-openmetrics`, and `create-blocks-from`, but not `repair`. WAL repair is performed automatically by Prometheus on startup: if corruption is detected, the TSDB truncates from the corruption point and continues, incrementing `prometheus_tsdb_wal_corruptions_total`. Rewrote Section 8.3 ("WAL Corruption") to describe the actual automatic repair behavior and suggested `promtool tsdb analyze` (which does exist) for inspection. Also updated the Section 10 summary row to reference auto-repair instead of the nonexistent command.

## Review Notes

- The metric `prometheus_tsdb_wal_corruptions_total` is correctly named and registered in `tsdb/head.go` (not in the wlog package).
- All remote write `queue_config` parameter names (`capacity`, `max_shards`, `min_shards`, `max_samples_per_send`, `batch_send_deadline`, `min_backoff`, `max_backoff`, `retry_on_http_429`) are valid.
- WAL segment size default of 128 MB is confirmed in source (`DefaultSegmentSize = 128 * 1024 * 1024`).
- WAL compression enabled-by-default starting in Prometheus 2.20 is confirmed in the 2.20.0 release notes.
- The Snapshot API endpoint `/api/v1/admin/tsdb/snapshot` is correct and requires `--web.enable-admin-api`. The post does not explicitly mention this prerequisite, which would be worth adding in a future revision.
- Prometheus 2.40+ also supports `--storage.tsdb.wal-compression-type=zstd` as an alternative to Snappy. The post mentions Snappy only; documenting zstd would strengthen the compression section in a future revision.
- `--storage.tsdb.min-block-duration` and `--storage.tsdb.max-block-duration` are hidden/discouraged flags intended primarily for testing. The post recommends them without this caveat — future revisions could note that production users generally should not change these.
- The phrasing "Samples are written to the WAL before being available for queries in the head block" is slightly imprecise — samples are appended to the head and WAL together, with no observable lag — but it is not technically wrong enough to require an edit.
