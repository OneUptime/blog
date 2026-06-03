# Validation Summary: How to Use Thanos Compactor to Downsample Historical Kubernetes Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Thanos Compactor
- Thanos Query
- Thanos bucket tools
- Prometheus metrics and PromQL
- Kubernetes StatefulSet, Service, and PrometheusRule manifests
- Object storage-backed metric retention

## Sources Consulted
- Thanos v0.32 Compactor documentation: https://thanos.io/v0.32/components/compact.md/
- Thanos v0.32 Query documentation: https://thanos.io/v0.32/components/query.md/
- Thanos v0.33 Tools documentation for `tools bucket downsample`: https://thanos.io/v0.33/components/tools.md/
- Thanos v0.32.0 Compactor source for metrics and flags: https://raw.githubusercontent.com/thanos-io/thanos/v0.32.0/cmd/thanos/compact.go
- Thanos v0.32.0 compact package source for compaction metrics: https://raw.githubusercontent.com/thanos-io/thanos/v0.32.0/pkg/compact/compact.go
- Thanos v0.32.0 downsample command source: https://raw.githubusercontent.com/thanos-io/thanos/v0.32.0/cmd/thanos/downsample.go

## Issues Found
- Corrected the main storage-saving claim. Thanos documentation states downsampling is primarily for long-range query performance and may increase storage if all resolutions are retained. The post now says storage savings come from combining downsampling with retention of older raw blocks.
- Corrected downsampling timing. Thanos v0.32 creates 5-minute downsampled blocks after 40 hours and 1-hour downsampled blocks after 10 days, not only after the example retention windows of 30 and 90 days.
- Clarified query resolution selection. Thanos Query uses downsampled data when `--query.auto-downsampling` is enabled or when `max_source_resolution` is set, rather than always selecting based only on requested time range.
- Removed the explicit `--downsampling.disable=false` argument and noted that downsampling is enabled by default. This avoids relying on explicit false parsing for a boolean disable flag.
- Replaced the incorrect aggregation explanation. Thanos stores aggregate chunks with raw, count, sum, min, max, and counter data rather than using one counter/gauge/histogram rule per metric type.
- Replaced non-existent or incorrect monitoring metric examples. The post now uses v0.32 metrics such as `thanos_compact_iterations_total`, `thanos_compact_todo_downsample_blocks`, and the `thanos_compact_downsample_duration_seconds_bucket` histogram.
- Fixed the compaction fetch flag from `--compact.block-fetch-concurrency` to `--compact.blocks-fetch-concurrency`.
- Corrected the storage calculation. The original math reported megabytes per metric and 99% savings incorrectly. The revised calculation shows about 110,280 samples per metric per year and about 89% sample-count reduction before TSDB/index overhead.
- Added the `--deduplication.func=penalty` caveat for HA Prometheus replica deduplication during vertical compaction and clarified that the merge is irreversible.
- Replaced the compaction grouping example. The previous example used a Block Viewer sync interval flag; the revised example shows Prometheus `external_labels`, which are what Thanos uses for compaction grouping.
- Corrected alert examples that referenced unavailable metrics (`thanos_compact_last_run_timestamp_seconds`, `thanos_compact_duration_seconds`) and updated the high-duration alert to use the downsample duration histogram.
- Removed the claim that downsampled blocks have `5m` or `1h` in S3 directory names. Thanos block directories are ULIDs; resolution is visible in bucket inspection output or block metadata.
- Corrected the manual compaction section to describe a one-time compaction pass, not compaction for specific blocks.
- Corrected per-metric downsampling guidance. Thanos does not selectively downsample individual metrics inside a block; the post now recommends querying raw data, retaining raw data long enough, or separating/selecting blocks.
- Corrected the backfill command from `thanos downsample` to the documented `thanos tools bucket downsample` form.

## Review Notes
YAML snippets were parsed successfully with PyYAML. `promtool` and a local `thanos` binary were not installed in the environment, so CLI and metric validation was performed against official Thanos documentation and v0.32.0 source.
