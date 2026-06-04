# Validation Summary: How to Configure Prometheus Remote Write to Grafana Mimir for Long-Term Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus
- Prometheus remote write
- Prometheus Operator / kube-prometheus-stack
- Grafana Mimir
- Grafana Mimir distributed Helm chart
- Grafana provisioning
- Kubernetes
- Helm
- kubectl
- PromQL alerting rules

## Sources Consulted
- Grafana Mimir Helm chart get started guide: https://grafana.com/docs/helm-charts/mimir-distributed/latest/get-started-helm-charts/
- Grafana Mimir production Helm chart guide: https://grafana.com/docs/helm-charts/mimir-distributed/latest/run-production-environment-with-helm/
- Grafana Mimir deployment modes: https://grafana.com/docs/mimir/latest/references/architecture/deployment-modes/
- Grafana Mimir HTTP API reference: https://grafana.com/docs/mimir/latest/references/http-api/
- Grafana Mimir configuration parameters: https://grafana.com/docs/mimir/latest/configure/configuration-parameters/
- Grafana Mimir hash ring configuration: https://grafana.com/docs/mimir/latest/configure/configure-hash-rings/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus remote write tuning guide: https://prometheus.io/docs/practices/remote_write/
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus remote write queue metrics source: https://github.com/prometheus/prometheus/blob/main/storage/remote/queue_manager.go
- Grafana Prometheus data source provisioning docs: https://grafana.com/docs/grafana/latest/datasources/prometheus/configure/
- Grafana provisioning docs: https://grafana.com/docs/grafana/latest/administration/provisioning/

## Issues Found
- The original hand-written Mimir Kubernetes manifest deployed only distributor and ingester components, omitted required query/read components and memberlist discovery, and referenced a query-frontend service that was never created. Replaced it with the officially recommended `mimir-distributed` Helm chart pattern and S3-compatible object storage values.
- Updated Mimir write and query URLs to use the Helm chart gateway service (`mimir-nginx`) with `/api/v1/push` for remote write and `/prometheus` for Grafana queries.
- Replaced deprecated clear-text `bearerToken` usage with Prometheus Operator `authorization.credentials` backed by a Kubernetes Secret.
- Fixed the `retryOnRateLimit` explanation from retrying 5xx errors to retrying HTTP 429 rate-limit responses.
- Corrected the WAL comment: `walCompression` compresses the local WAL; it does not increase WAL buffering.
- Fixed remote-write queue utilization examples and alerts to use current Prometheus metrics: `prometheus_remote_storage_shard_capacity * prometheus_remote_storage_shards` instead of a non-existent `prometheus_remote_storage_queue_capacity`.
- Fixed send latency examples and alerts to use `prometheus_remote_storage_sent_batch_duration_seconds` / `_bucket` instead of the old/non-existent `prometheus_remote_storage_queue_duration_seconds`.
- Changed the Mimir connectivity test from an empty POST to `/api/v1/push` to a `/ready` check, because Mimir's remote-write endpoint expects a Snappy-compressed protobuf request body and remote-write headers.

## Review Notes
- The Helm values still need real object storage buckets and secure credentials, typically through IAM roles for service accounts or injected secrets.
- For production deployments using the current Mimir Helm chart, external production-grade object storage and Kafka-compatible ingest storage should be configured instead of demo defaults.
