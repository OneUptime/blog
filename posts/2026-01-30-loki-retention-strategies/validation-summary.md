# Validation Summary: How to Implement Loki Retention Strategies

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Grafana Loki
- Loki TSDB and BoltDB Shipper storage
- Loki compactor retention
- Loki log deletion API
- Loki runtime overrides
- Prometheus metrics and alerting rules
- Docker Compose
- Kubernetes
- Loki Helm chart
- Amazon S3 lifecycle policies

## Sources Consulted
- Grafana Loki log retention documentation: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana Loki log entry deletion documentation: https://grafana.com/docs/loki/latest/operations/storage/logs-deletion/
- Grafana Loki HTTP API reference: https://grafana.com/docs/loki/latest/reference/loki-http-api/
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki storage configuration documentation: https://grafana.com/docs/loki/latest/configure/storage/
- Grafana Loki storage schema documentation: https://grafana.com/docs/loki/latest/operations/storage/schema/
- Grafana Loki Helm storage/install documentation: https://grafana.com/docs/loki/latest/setup/install/helm/install-scalable/
- Grafana Loki Helm values reference: https://grafana.com/docs/loki/latest/setup/install/helm/reference/
- Grafana Loki v3.7.1 metrics/mixin source: https://github.com/grafana/loki/tree/v3.7.1/production/loki-mixin

## Issues Found
- The compactor examples used `shared_store` and omitted `delete_request_store`. Current Loki documentation requires `delete_request_store` when retention is enabled, so the examples now use `delete_request_store: s3` and remove `shared_store`.
- The global retention example used deprecated `limits_config.allow_deletes` and described it as related to stream retention. This was removed; deletion is now shown with the `deletion_mode` runtime override.
- The deletion API examples used nanosecond timestamps. Loki's delete API accepts RFC3339 or Unix seconds timestamps, so the examples and sample response were corrected to seconds.
- The Table Manager comparison implied broader/current compactor support for "BoltDB". It now distinguishes legacy stores and BoltDB Shipper, matching the documented support.
- Several Prometheus examples used non-existent Loki metrics such as `loki_compactor_deleted_bytes_total`, `loki_compactor_last_successful_run_timestamp_seconds`, and `loki_chunk_store_stored_bytes`. These were replaced with exported compactor deletion and retention metrics.
- The Docker Compose example mounted the runtime config to a path that did not match the earlier `runtime_config.file` setting. The mount now uses `/loki/runtime-config.yaml`.
- The Docker and Kubernetes examples used the old `grafana/loki:2.9.3` image tag while the post otherwise presents current TSDB/deletion behavior. They were updated to `grafana/loki:3.7.1`.
- The Helm chart example mixed old and current values. It now uses `loki.storage.bucketNames`, `loki.storage_config.aws`, `loki.runtimeConfig`, top-level `compactor.replicas`, and the current compactor retention fields.

## Review Notes
The post is technically relevant and implementation-focused. Future improvements could add a short note that retention periods below 24h are not supported and that schema `from` dates for new installations must be in the past, but the existing examples already use valid values.
