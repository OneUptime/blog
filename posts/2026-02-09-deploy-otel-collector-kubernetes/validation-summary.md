# Validation Summary: How to deploy OpenTelemetry Collector in Kubernetes

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Kubernetes and contrib distributions
- Kubernetes DaemonSet, Deployment, Service, ServiceAccount, RBAC, ConfigMap, Secret
- Kubernetes HorizontalPodAutoscaler autoscaling/v2
- Prometheus Operator ServiceMonitor
- OTLP, OTLP HTTP, Prometheus remote write, Jaeger
- OneUptime telemetry ingestion

## Sources Consulted
- OpenTelemetry Collector Kubernetes installation docs: https://opentelemetry.io/docs/collector/install/kubernetes/
- OpenTelemetry Collector Helm chart docs: https://opentelemetry.io/docs/platforms/kubernetes/helm/collector/
- OpenTelemetry Kubernetes Collector components docs: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector kubeletstats receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/kubeletstatsreceiver/README.md
- OpenTelemetry Collector k8sattributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/k8sattributesprocessor/README.md
- OpenTelemetry Collector prometheusremotewrite exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- Kubernetes HorizontalPodAutoscaler autoscaling/v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Prometheus Operator API reference for ServiceMonitor endpoints: https://prometheus-operator.dev/docs/api-reference/api/
- OneUptime OpenTelemetry Collector docs: https://oneuptime.com/docs/en/telemetry/host-otel-collector
- OpenTelemetry Collector release information for v0.153.0: https://github.com/open-telemetry/opentelemetry-collector-releases

## Issues Found
- The collector images were pinned to `0.91.0`, which is outdated for a 2026 deployment guide. Updated the k8s and contrib collector images to `0.153.0`, the current release available during validation.
- The OneUptime exporter used a generic OTLP gRPC endpoint (`oneuptime.com:443`) and API key header. Updated it to the documented OTLP HTTP endpoint `https://oneuptime.com/otlp` with the `x-oneuptime-token` header and matching Kubernetes Secret key.
- The ServiceMonitor selected Services with `app: otel-gateway`, but the gateway Service did not have that label. Added the matching label to the Service metadata so Prometheus Operator discovery can work.
- The troubleshooting command used `otelcol validate` inside a contrib collector pod. Updated it to `otelcol-contrib validate`, which is the binary in the `otel/opentelemetry-collector-contrib` image.
- The batch processor was listed before enrichment processors in some pipelines. Moved `resourcedetection` and `resource` before `batch` so batching remains the final aggregation step after enrichment.

## Review Notes
- The collector configs were validated with Docker against `otel/opentelemetry-collector-k8s:0.153.0` and `otel/opentelemetry-collector-contrib:0.153.0`. The kubeletstats validation required mounting temporary service-account token and CA files because the validation ran outside Kubernetes.
- The `prometheusremotewrite` endpoint is syntactically valid, but a real Prometheus target must be configured to accept remote write, for example by enabling the remote write receiver or using a compatible backend.
