# Validation Summary: How to Build Prometheus TSDB Compaction

## Status
validated

## Post Type
Technical deep-dive / Tutorial — explains Prometheus TSDB compaction internals and walks through a custom compactor implementation in Go.

## Technologies Covered
- Prometheus TSDB
- Go (language used for example implementations)
- Mermaid (for diagrams)
- LSM tree concepts (referenced for compaction approach)
- ULID (used as block identifier scheme)
- YAML (for alerting rule configuration)

## Sources Consulted
- Prometheus Storage docs: https://prometheus.io/docs/prometheus/latest/storage/
- Prometheus Configuration docs: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus command-line flags: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Prometheus TSDB source code: https://github.com/prometheus/prometheus/blob/main/tsdb/compact.go
- Prometheus TSDB source code: https://github.com/prometheus/prometheus/blob/main/tsdb/db.go
- Ganesh Vernekar's TSDB compaction post: https://ganeshvernekar.com/blog/prometheus-tsdb-compaction-and-retention/

## Issues Found

1. **Incorrect description of default max block duration.** The post originally said "default 31 days, configurable". Per official Prometheus docs and the TSDB compaction logic, the actual default is **10% of the retention time, capped at 31 days**. With Prometheus's default retention of 15d, the effective max block duration is 1.5d, not 31d. Updated wording to reflect this.

2. **Storage settings shown as YAML — they are CLI flags only.** The post showed `prometheus.yml` snippets for `storage.tsdb.min-block-duration`, `storage.tsdb.max-block-duration`, `storage.tsdb.retention.time`, and `storage.tsdb.retention.size`. These options are **not configurable via `prometheus.yml`**; they are command-line flags (`--storage.tsdb.min-block-duration`, etc.). Rewrote both YAML blocks as shell command-line examples and clarified in surrounding prose that these are CLI flags, not yaml configuration.

## Review Notes

- The compactor implementation is intentionally a simplified/educational version, not a drop-in replacement for Prometheus's actual TSDB code. Some real-world details are abstracted away (e.g., `ulid.New()` isn't the actual oklog/ulid API, the actual block deletion uses a `deletable` flag in `meta.json` rather than a separate `tombstone` file at block level, and Prometheus's real index format has TOC, label indices, postings offset table, etc.). These simplifications are appropriate for the educational framing and are flagged as a "minimal compactor implementation."
- The default leveled compaction ranges shown (2h → 6h → 18h → 54h, with a 3x multiplier) match the actual Prometheus defaults (`[2h, 6h, 18h, 54h, 162h, 486h]`).
- The block directory structure (`meta.json`, `index`, `chunks/000001`, `tombstones`) matches the official Prometheus storage layout.
- All five `prometheus_tsdb_*` metrics referenced in the monitoring section are real and accurate (verified against `tsdb/db.go` and `tsdb/compact.go`).
- The alerting rule YAML and PromQL expression in the monitoring section are syntactically correct.
- The block-level `tombstone` file written by `deleteOldBlocks` is the post's own convention — real Prometheus uses `meta.json`'s `deletable` flag combined with the cleanup loop in `db.go`. This is acceptable since the post frames this as a custom implementation.
