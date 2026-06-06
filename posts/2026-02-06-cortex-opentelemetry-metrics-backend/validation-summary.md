# Validation Summary: How to Use Cortex as an OpenTelemetry Metrics Backend

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry metrics
- Prometheus Remote Write
- Cortex
- PromQL
- Grafana datasource provisioning
- S3/object storage

## Sources Consulted
- Cortex configuration file reference: https://cortexmetrics.io/docs/configuration/configuration-file/
- Cortex HTTP API reference: https://cortexmetrics.io/docs/api/
- Cortex authentication and authorization guide: https://cortexmetrics.io/docs/guides/auth/
- Cortex blocks storage production tips: https://cortexmetrics.io/docs/blocks-storage/production-tips/
- Cortex OpenTelemetry Collector guide: https://cortexmetrics.io/docs/guides/use-opentelemetry-collector-to-send-metrics-to-cortex/
- OpenTelemetry Collector Prometheus Remote Write exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- Grafana datasource provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- CNCF Cortex project page: https://www.cncf.io/projects/cortex/

## Issues Found
- The Cortex ingester example used `ingester.ring`, `flush_period`, and `retain_period`, which do not match the current blocks-storage ingester configuration. Changed it to `ingester.lifecycler.ring` and moved local block retention guidance to `blocks_storage.tsdb.retention_period`.
- The comments described `ha_tracker` as accepting delayed samples. Cortex HA tracking is for Prometheus HA replica handling, not sample age tolerance, so the comment was corrected.
- The example configured `query_store_after` and `query_ingesters_within` under `querier`. Current Cortex documentation exposes these as tenant limit settings, so they were moved under `limits`.
- The global active-series limit `max_global_series_per_user` requires `distributor.shard_by_all_labels` according to Cortex configuration notes. Added that setting to make the example consistent.
- The OpenTelemetry Collector exporter type used `prometheusremotewrite`, which current Collector documentation marks as a deprecated alias. Updated it to `prometheus_remote_write` in both the exporter definition and pipeline reference.

## Review Notes
The examples are still intentionally simplified for a single-binary validation setup. A production deployment should add authentication/TLS details, durable local disks for ingesters, explicit object-store credentials management, and microservice-specific service discovery.
