# Validation Summary: How to Configure Prometheus Remote Write for Long-Term Storage

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Prometheus
- Prometheus remote write
- Prometheus TSDB and WAL
- Thanos Sidecar
- Grafana Mimir
- Cortex
- VictoriaMetrics
- Kubernetes manifests
- S3-compatible object storage

## Sources Consulted
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus remote write tuning documentation: https://prometheus.io/docs/practices/remote_write/
- Prometheus storage documentation: https://prometheus.io/docs/prometheus/latest/storage/
- Prometheus changelog for remote write metric renames: https://github.com/prometheus/prometheus/blob/main/CHANGELOG.md
- Thanos Sidecar documentation: https://thanos.io/tip/components/sidecar.md/
- Thanos object storage documentation: https://thanos.io/tip/thanos/storage.md/
- Grafana Mimir authentication and remote write documentation: https://grafana.com/docs/mimir/latest/manage/secure/authentication-and-authorization/
- Cortex authentication guide: https://cortexmetrics.io/docs/guides/auth/
- Cortex HTTP API documentation: https://cortexmetrics.io/docs/api/
- VictoriaMetrics Prometheus integration documentation: https://docs.victoriametrics.com/victoriametrics/integrations/prometheus/

## Issues Found
- The Thanos sidecar example used `--storage.tsdb.retention.time=2h`, but Thanos recommends retaining at least three times the configured block duration when uploading blocks. Changed the local retention example to `6h`.
- The Thanos sidecar example omitted `--web.enable-admin-api`, which current Thanos documentation lists as required for sidecar metadata access. Added the flag.
- The example image tags were old for the current review date. Updated Prometheus from `v2.51.0` to `v3.11.3` and Thanos from `v0.34.0` to `v0.41.0`.
- The Thanos S3 object store example used `${AWS_ACCESS_KEY_ID}` and `${AWS_SECRET_ACCESS_KEY}` inside the YAML file, which can be misleading because the object store config is not shell-expanded. Replaced them with placeholder values.
- The remote write queue defaults were outdated. Updated `capacity` from `2500` to `10000`, `max_shards` from `200` to `50`, and `max_samples_per_send` from `500` to `2000`.
- The monitoring examples used pre-2.23 remote write metric names. Updated them to `prometheus_remote_storage_samples_pending`, `prometheus_remote_storage_samples_total`, and `prometheus_remote_storage_samples_failed_total`.
- The highest timestamp example subtracted two timestamp gauges. Replaced it with `prometheus_remote_storage_queue_highest_sent_timestamp_seconds`, which directly represents the latest sample timestamp successfully sent by a queue.

## Review Notes
The main configuration structure, remote write endpoints for Mimir/Cortex and VictoriaMetrics, write relabeling examples, and high-level architecture explanations are technically correct. The post now uses current Prometheus and Thanos examples as of 2026-05-27.
