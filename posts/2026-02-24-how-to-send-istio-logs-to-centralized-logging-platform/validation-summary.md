# Validation Summary: How to Send Istio Logs to Centralized Logging Platform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio access logging and Telemetry API
- Kubernetes DaemonSets and container logs
- Fluent Bit Kubernetes and Elasticsearch outputs
- Grafana Loki and Grafana Alloy
- OpenTelemetry Collector
- AWS CloudWatch, Google Cloud Logging, and Azure Monitor Container Insights

## Sources Consulted
- Istio Envoy Access Logs documentation: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio OpenTelemetry access log provider documentation: https://istio.io/latest/docs/tasks/observability/logs/otel-provider/
- IstioOperator API reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Fluent Bit Kubernetes filter documentation: https://docs.fluentbit.io/manual/data-pipeline/filters/kubernetes/
- Fluent Bit Tail input documentation: https://docs.fluentbit.io/manual/pipeline/inputs/tail
- Fluent Bit Elasticsearch output documentation: https://docs.fluentbit.io/manual/pipeline/outputs/elasticsearch
- Grafana Loki Promtail EOL notice: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Alloy Kubernetes log collection documentation: https://grafana.com/docs/grafana-cloud/send-data/alloy/collect/logs-in-kubernetes/
- Grafana Alloy loki.source.kubernetes reference: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.source.kubernetes/
- Grafana Alloy loki.process reference: https://grafana.com/docs/alloy/latest/reference/components/loki.process/
- Grafana Loki OpenTelemetry Collector ingestion documentation: https://grafana.com/docs/loki/latest/send-data/otel/
- AWS CloudWatch Observability EKS add-on documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/install-CloudWatch-Observability-EKS-addon.html
- Google Cloud GKE logging documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/about-logs
- Azure Monitor ContainerLogV2 schema documentation: https://learn.microsoft.com/en-us/azure/azure-monitor/containers/container-insights-logs-schema
- Azure Monitor container log query documentation: https://learn.microsoft.com/en-us/azure/azure-monitor/containers/container-insights-log-query

## Issues Found
- Promtail was recommended for new Loki deployments, but Grafana documents Promtail as end-of-life as of March 2, 2026. Replaced the Promtail example with a Grafana Alloy configuration using Kubernetes discovery, relabeling, log processing, and `loki.write`.
- The OpenTelemetry Collector example used the older Loki exporter and `/loki/api/v1/push` path. Updated it to use the current `otlphttp` exporter with Loki's `/otlp` endpoint.
- The Azure Monitor query used the legacy `ContainerLog` table and `LogEntry` field. Updated it to `ContainerLogV2`, `ContainerName`, and `LogMessage`.
- The verification command sent traffic to `httpbin.default:8080`, but the Istio sample `httpbin` service uses port `8000`. Updated the command to use port `8000`.

## Review Notes
- The Fluent Bit example is technically plausible, but a production deployment should also include the required ServiceAccount, ClusterRole, and ClusterRoleBinding for Kubernetes metadata enrichment.
- The article uses `fluent/fluent-bit:latest`; pinning a tested version would be better for reproducible production deployments.
