# Validation Summary: How to Use Amazon Managed Prometheus for Container Metrics

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon Managed Service for Prometheus
- Amazon EKS
- IAM Roles for Service Accounts (IRSA)
- Prometheus and PromQL
- Prometheus community Helm chart
- AWS Distro for OpenTelemetry (ADOT)
- OpenTelemetry Operator
- Amazon Managed Grafana
- Node.js, Express, and prom-client
- AWS CLI and awscurl

## Sources Consulted
- Amazon Managed Service for Prometheus User Guide: https://docs.aws.amazon.com/prometheus/latest/userguide/what-is-Amazon-Managed-Service-Prometheus.html
- Amazon Managed Service for Prometheus ingestion with a new Prometheus server using Helm: https://docs.aws.amazon.com/prometheus/latest/userguide/AMP-onboard-ingest-metrics-new-Prometheus.html
- Amazon Managed Service for Prometheus querying with awscurl: https://docs.aws.amazon.com/prometheus/latest/userguide/AMP-compatible-APIs.html
- Amazon Managed Service for Prometheus pricing: https://aws.amazon.com/prometheus/pricing/
- Amazon Managed Service for Prometheus service authorization reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonmanagedserviceforprometheus.html
- AWS CLI amp create-workspace reference: https://docs.aws.amazon.com/cli/latest/reference/amp/create-workspace.html
- AWS CLI amp describe-workspace reference: https://docs.aws.amazon.com/cli/latest/reference/amp/describe-workspace.html
- AWS CLI amp create-rule-groups-namespace reference: https://docs.aws.amazon.com/cli/latest/reference/amp/create-rule-groups-namespace.html
- Amazon EKS ADOT Operator documentation: https://docs.aws.amazon.com/eks/latest/userguide/opentelemetry.html
- AWS Distro for OpenTelemetry Prometheus Remote Write Exporter for AMP: https://aws-otel.github.io/docs/getting-started/prometheus-remote-write-exporter/
- AWS Distro for OpenTelemetry EKS configuration for AMP: https://aws-otel.github.io/docs/getting-started/prometheus-remote-write-exporter/eks/
- OpenTelemetry Operator for Kubernetes documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/
- Prometheus community Helm chart values reference: https://github.com/prometheus-community/helm-charts/blob/main/charts/prometheus/values.yaml
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The Prometheus Helm values used `serviceAccount`, but the Prometheus community chart and AWS AMP Helm guidance use `serviceAccounts.server`. Updated the snippet so the IRSA annotation applies to the Prometheus server service account.
- The post stated that AMP does not handle collection at all. Updated this to account for AMP managed scrapers while preserving the explanation that a scraper or collector is required.
- The OpenTelemetryCollector example used `opentelemetry.io/v1alpha1` and a string-form `spec.config`. Updated it to the current `opentelemetry.io/v1beta1` style with structured `spec.config`.
- The ADOT relabeling replacement used `$1:$2`, which can be interpreted as environment-variable expansion in collector configs. Updated it to `$$1:$$2`.
- The sample app emits request labels `method`, `path`, and `status`, but the PromQL and recording rule aggregated `myapp_http_requests_total` by `service`. Updated those examples to aggregate by `path`.
- The P99 latency PromQL example did not aggregate histogram buckets before `histogram_quantile`. Updated it to use `sum(rate(..._bucket[5m])) by (le, path)`.
- The memory limit query did not filter kube-state-metrics resource limits by `unit="byte"`. Added the unit filter.
- The AMP pricing numbers were outdated and described storage as per million samples. Updated ingestion, storage, and query pricing to current AWS pricing dimensions and corrected the sample monthly ingestion estimate from about $130 to about $39 before free tier or volume tiers.

## Review Notes
- The ADOT add-on version in the example is version-specific; users should verify compatible add-on versions for their EKS cluster with `aws eks describe-addon-versions` before installing.
- The Prometheus and ADOT examples assume Kubernetes RBAC permissions exist for pod discovery.
- Validation included parser checks for all YAML snippets and a Node.js syntax check for the JavaScript example.
