# Validation Summary: How to Fix Loki Storage Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Grafana Loki
- Loki TSDB and BoltDB Shipper storage
- Loki compactor and retention
- Loki ingester WAL
- Amazon S3
- Google Cloud Storage
- Azure Blob Storage
- Prometheus metrics and alerts
- Grafana dashboards
- Docker CLI
- AWS CLI, gsutil, and gcloud CLI

## Sources Consulted
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki retention documentation: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana Loki WAL documentation: https://grafana.com/docs/loki/latest/operations/storage/wal/
- Grafana Loki TSDB documentation: https://grafana.com/docs/loki/latest/operations/storage/tsdb/
- Grafana Loki storage configuration examples: https://grafana.com/docs/loki/latest/configure/examples/configuration-examples/
- Grafana Loki upgrade guide: https://grafana.com/docs/loki/latest/setup/upgrade/
- Grafana Loki meta-monitoring metrics documentation: https://grafana.com/docs/loki/latest/operations/meta-monitoring/metrics/

## Issues Found
- The index corruption recovery instructions said TSDB index files could be removed and rebuilt from chunks. Loki relies on the index as the table of contents for chunks, so this could cause data to become unqueryable. Changed the instructions to clear only a local index cache when the persisted index is safe in object storage, and to restore a corrupted persisted index from backup.
- The S3 examples used `s3://bucket-name`, which is less accurate than Loki's documented `s3://region/bucket-name` form. Updated the examples to use `s3://us-east-1/bucket-name`.
- The S3 encryption example used `sse_encryption`, which was removed in Loki 3.0. Replaced it with the current `sse.type: SSE-S3` configuration.
- The GCS example described `service_account` as a key file path. Loki's `service_account` field expects JSON content; key files should normally be supplied through Google application credentials. Updated the comment and example value.
- The Azure example showed an account key and managed identity enabled at the same time while describing managed identity as an alternative. Updated the snippet to make managed identity an alternative to `account_key`.
- The compactor example included `shared_store`, which was removed in Loki 3.0. Removed the field.
- The migration example used a new schema period date that was already in the past relative to the post date. Updated the new schema `from` date to a future date so the example matches Loki's migration guidance.
- The Prometheus alert examples used outdated or inappropriate Loki metric names for object storage and compaction failures. Replaced them with current object store failure and compactor health metrics from the official Loki meta-monitoring documentation.
- The dashboard example used outdated chunk store operation metrics and `loki_compactor_running_compactions`. Replaced them with current object store and compactor running metrics.

## Review Notes
The post is now technically valid for modern Loki 3.x-style configurations. Some commands remain intentionally generic and assume a container named `loki`, a local data path mounted at `/loki`, and the relevant cloud CLIs installed and authenticated.
