# Validation Summary: How to Reduce Loki Storage Costs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Grafana Loki
- Promtail
- Grafana Alloy
- LogQL and PromQL
- Amazon S3 lifecycle policies and storage classes
- Google Cloud Storage lifecycle policies and storage classes
- Grafana dashboards

## Sources Consulted
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki log retention documentation: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana Loki storage schema documentation: https://grafana.com/docs/loki/latest/operations/storage/schema/
- Grafana Loki TSDB documentation: https://grafana.com/docs/loki/latest/operations/storage/tsdb/
- Grafana Loki storage configuration documentation: https://grafana.com/docs/loki/latest/configure/storage/
- Grafana Loki request validation and rate limits documentation: https://grafana.com/docs/loki/latest/operations/request-validation-rate-limits/
- Grafana Loki Promtail documentation: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Loki Promtail drop stage documentation: https://grafana.com/docs/loki/latest/send-data/promtail/stages/drop/
- Grafana Loki Promtail match stage documentation: https://grafana.com/docs/loki/latest/send-data/promtail/stages/match/
- Grafana Loki Promtail sampling stage documentation: https://grafana.com/docs/loki/latest/send-data/promtail/stages/sampling/
- Amazon S3 lifecycle transition documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html
- Amazon S3 lifecycle configuration examples: https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-configuration-examples.html
- Google Cloud Storage lifecycle documentation: https://docs.cloud.google.com/storage/docs/lifecycle

## Issues Found
- The compression example specified two `chunk_encoding` keys in the same YAML object and called `snappy` the default. Current Loki configuration defaults `chunk_encoding` to `gzip`, and duplicate YAML keys are unsafe. Updated the snippet to use one `gzip` key and show `snappy` as an optional faster codec.
- The Promtail examples did not note that Promtail is EOL as of March 2, 2026. Added a short note recommending Grafana Alloy or another supported client for new deployments.
- The post showed a nonexistent Promtail `dedup` pipeline stage. Replaced it with accurate duplicate-handling guidance because Promtail pipelines do not provide ingestion-time deduplication.
- The S3 Intelligent Tiering example used an ambiguous `s3: s3://bucket-name` value. Updated it to use `bucketnames` with `region`, which matches Loki's current S3 storage configuration fields.
- The S3 lifecycle JSON block included a JavaScript-style comment inside a `json` code fence, making the snippet invalid JSON. Removed the comment.
- The S3 lifecycle example transitioned chunks to `GLACIER`, which can make queryable Loki chunks unavailable until restore. Changed it to `GLACIER_IR`, a Loki-supported S3 storage class intended for instant retrieval.
- The PromQL compression-ratio formula divided raw ingested bytes by stored chunk bytes, producing an inverted or negative result. Reversed the ratio to estimate `1 - stored_bytes / ingested_bytes`.
- The dashboard used `promtail_dropped_entries_total`, but Promtail drop and match stages document `logentry_dropped_lines_total`. Updated the panel query to use the documented metric.
- The per-tenant retention snippet presented `overrides` as if it belonged directly beside `limits_config` in `loki-config.yaml`. Clarified that `limits_config` is in Loki config and tenant `overrides` belong in the runtime configuration file.

## Review Notes
- The post remains technically useful, but future revisions should consider replacing Promtail snippets with Grafana Alloy equivalents now that Promtail is EOL.
- The storage-cost formulas are simplified estimates and do not include replication, index overhead, request costs, cache storage, or provider-specific minimum object-size and retrieval fees.
