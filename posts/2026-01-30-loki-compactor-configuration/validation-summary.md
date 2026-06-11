# Validation Summary: How to Create Loki Compactor Configuration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Grafana Loki
- Loki compactor
- Loki retention configuration
- Loki TSDB shipper storage
- Kubernetes StatefulSet
- Prometheus alerting and metrics
- S3-compatible object storage

## Sources Consulted
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki log retention documentation: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana Loki key metrics documentation: https://grafana.com/docs/loki/latest/operations/meta-monitoring/metrics/
- Grafana Loki components documentation: https://grafana.com/docs/loki/latest/get-started/components/
- Grafana Loki BoltDB shipper documentation: https://grafana.com/docs/loki/latest/operations/storage/boltdb-shipper/
- Grafana Loki GitHub releases: https://github.com/grafana/loki/releases

## Issues Found
- The production storage example used `boltdb_shipper` and `shared_store`, which is legacy for new Loki deployments. Updated the example to use `schema_config` with `store: tsdb`, `storage_config.tsdb_shipper`, and current S3 fields.
- The post described per-tenant retention overrides as if they belonged directly in the main Loki config. Updated the text and examples to use `limits_config.per_tenant_override_config` and a runtime overrides file.
- The stream-retention section said the first matching rule wins. Loki chooses the matching rule with the highest priority value, so the explanation and priorities were corrected.
- The Kubernetes example used `grafana/loki:2.9.0`, which is outdated. Updated it to `grafana/loki:3.7.2`, the current release checked during review.
- The monitoring section used undocumented `loki_compactor_*` metric names for compaction health. Updated the table and alert examples to documented `loki_boltdb_shipper_*` compaction metrics and documented retention/sweeper metrics.
- The troubleshooting section claimed Loki stores a compactor lock file in object storage and suggested deleting it manually. Updated this to reflect the current compactor ring/singleton behavior and replaced the unsafe object-store delete commands with a PromQL check.
- The workflow text said the compactor acquires a lock before starting. Updated it to describe ring election and singleton deployment guidance.

## Review Notes
Retention is only available with a 24h index period for single-store TSDB or BoltDB, which the corrected examples now show. The article remains a general configuration guide rather than a fully deployable production manifest; real deployments still need complete Loki storage credentials, ring settings, and environment-specific resource sizing.
