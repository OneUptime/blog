# Validation Summary: How to Set Up Long-Term Storage for Istio Metrics

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio telemetry metrics
- Prometheus TSDB retention, recording rules, remote write, and PromQL HTTP API
- Prometheus Operator `Prometheus` custom resource
- Thanos Sidecar, Store Gateway, Querier, Compactor, Receive, and object storage
- Grafana Cloud Metrics / Grafana Mimir
- Amazon Managed Service for Prometheus
- Google Cloud Managed Service for Prometheus
- Kubernetes manifests

## Sources Consulted
- Prometheus storage documentation: https://prometheus.io/docs/prometheus/latest/storage/
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus command-line reference: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Operator Thanos integration: https://prometheus-operator.dev/docs/platform/thanos/
- Thanos object storage documentation: https://thanos.io/tip/thanos/storage.md/
- Thanos Sidecar documentation: https://thanos.io/v0.40/components/sidecar.md/
- Thanos Compactor documentation: https://thanos.io/v0.28/components/compact.md/
- Thanos Receive documentation: https://thanos.io/v0.27/components/receive.md/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Grafana Cloud Prometheus remote write documentation: https://grafana.com/docs/grafana-cloud/send-data/metrics/metrics-prometheus/
- Amazon Managed Service for Prometheus remote write documentation: https://docs.aws.amazon.com/prometheus/latest/userguide/AMP-onboard-ingest-metrics-existing-Prometheus.html
- Google Cloud Managed Service for Prometheus overview and managed collection setup: https://cloud.google.com/stackdriver/docs/managed-prometheus and https://cloud.google.com/stackdriver/docs/managed-prometheus/setup-managed
- Amazon S3 pricing: https://aws.amazon.com/s3/pricing/

## Issues Found
- The Prometheus CLI retention example used `--storage.tsdb.retention.time` and `--storage.tsdb.retention.size`. These flags still exist, but current Prometheus documentation marks them deprecated in favor of the runtime-reloadable `storage.tsdb.retention` configuration fields. I changed the example to the current configuration-file syntax.
- The Google Cloud Managed Service for Prometheus section showed a standard upstream Prometheus `remote_write` endpoint. Current Google documentation describes ingestion through managed collection, self-deployed collection, OpenTelemetry Collector, or Ops Agent, not a simple upstream Prometheus `remote_write` block. I replaced the snippet with the documented `OperatorConfig` credential pattern for managed collection outside GKE.
- The Thanos Compactor Kubernetes `Deployment` snippet was missing the required `spec.selector` and matching pod-template labels for `apps/v1`. I added a minimal selector and labels so the manifest is structurally valid.
- The storage-cost estimate treated Prometheus' 1-2 bytes/sample planning estimate as uncompressed and then applied an additional 10x compression factor. Prometheus documentation says the average on-disk storage is already 1-2 bytes per sample. I corrected the daily, monthly, yearly, and S3 monthly cost estimates.

## Review Notes
- The examples are still intentionally illustrative and omit production details such as IAM setup, bucket policies, TLS, HA labels, compactor singleton enforcement, and complete Kubernetes deployment metadata.
- Prometheus Operator and Thanos configuration details can vary by operator, Helm chart, and Thanos version, so readers should still verify against the versions they deploy.
