# Validation Summary: How to Configure Loki Retention and Compaction

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Grafana Loki
- Loki compactor
- Loki retention policies
- Loki log deletion API
- TSDB and BoltDB Shipper index storage
- S3 and Google Cloud Storage object storage
- Kubernetes StatefulSets
- Prometheus metrics and alerting rules

## Sources Consulted
- Grafana Loki log retention documentation: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki log entry deletion documentation: https://grafana.com/docs/loki/latest/operations/storage/logs-deletion/
- Grafana Loki HTTP API reference: https://grafana.com/docs/loki/latest/reference/loki-http-api/
- Grafana Loki table manager documentation: https://grafana.com/docs/loki/latest/operations/storage/table-manager/
- Grafana Loki upgrade documentation for removed `shared_store` configuration: https://grafana.com/docs/loki/latest/setup/upgrade/
- Grafana Loki source metrics definitions: https://github.com/grafana/loki

## Issues Found
- The examples used deprecated or removed `shared_store` fields under `compactor` and `boltdb_shipper`. Updated the examples to use TSDB schema configuration with `schema_config.configs[].object_store`, `storage_config.tsdb_shipper`, and `delete_request_store`.
- The per-tenant retention example showed tenant overrides as though they were part of the main Loki config. Updated it to show `limits_config.per_tenant_override_config` and a separate runtime overrides file.
- The Delete API example used an unsupported JSON request body with `match.selector`, `start`, and `end`. Updated it to use the documented `query`, `start`, and `end` request parameters.
- The Delete API enablement example used deprecated `allow_deletes`. Replaced it with the current `deletion_mode: filter-and-delete` setting.
- The compaction process described chunk compaction. Loki's compactor compacts index files, applies retention by removing index references, and deletes chunks asynchronously, so the process description was corrected.
- Several monitoring examples used invalid metric names or PromQL for gauges. Replaced them with metrics present in Loki's current compactor source and mixin, including `loki_boltdb_shipper_compactor_running`, `loki_boltdb_shipper_compact_tables_operation_duration_seconds`, `loki_compactor_apply_retention_operation_duration_seconds`, and `loki_compactor_pending_delete_requests_count`.
- The Kubernetes deployment example used an older Loki image tag. Updated it to `grafana/loki:3.7.2`, the current release line checked during review.
- The storage tiering section implied Loki directly configures hot/warm/cold backends by age. Reworded it to describe object-store lifecycle policies, which is how the provided S3 example works.

## Review Notes
The guide is technically relevant and salvageable. The corrected examples target current Loki 3.x TSDB-style configuration while retaining the author's overall structure and intent. Future improvements could mention that Loki 3.6 introduced horizontally scalable compactor support, although the singleton compactor deployment remains the simpler documented baseline for many installations.
