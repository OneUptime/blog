# Validation Summary: How to Configure Horizontal Pod Autoscaling for the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Operator for Kubernetes
- Kubernetes Horizontal Pod Autoscaler
- Kubernetes Metrics Server
- Prometheus Operator ServiceMonitor
- Prometheus Adapter custom metrics
- YAML configuration

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaler API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Horizontal Pod Autoscaling concepts: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- OpenTelemetry Operator Horizontal Pod Autoscaling documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/horizontal-pod-autoscaling/
- OpenTelemetry Operator documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/
- OpenTelemetry Operator OpenTelemetryCollector CRD: https://github.com/open-telemetry/opentelemetry-operator/blob/main/config/crd/bases/opentelemetry.io_opentelemetrycollectors.yaml
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector OTLP exporter package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/otlpexporter
- Metrics Server installation documentation: https://github.com/kubernetes-sigs/metrics-server
- Amazon EKS Metrics Server documentation: https://docs.aws.amazon.com/eks/latest/userguide/metrics-server.html

## Issues Found
- The prerequisites section stated that EKS includes Metrics Server by default. AWS documentation says Metrics Server is not deployed by default in Amazon EKS clusters, so the wording was changed to say GKE and AKS commonly include it, while EKS does not.
- The collector configuration used `service.telemetry.metrics.address: 0.0.0.0:8888`. Current OpenTelemetry Collector documentation says this setting is ignored as of Collector v0.123.0. The example now uses `service.telemetry.metrics.readers` with a pull Prometheus exporter bound to `0.0.0.0:8888`.
- The custom metric discussion described `otelcol_exporter_queue_size` as a number of queue items. OpenTelemetry documentation defines it as the current sending queue size in batches, so the text and HPA comment were corrected to say batches.
- The sample `kubectl get hpa` output showed `OpenTelemetryCollector/gateway`, but the example resource is named `gateway-collector`. The output was corrected to `OpenTelemetryCollector/gateway-collector`.

## Review Notes
The post's direct HPA targeting of `OpenTelemetryCollector` is technically valid because the operator CRD exposes the scale subresource. The OpenTelemetry Operator also supports configuring HPA through `spec.autoscaler`, which may be a simpler future improvement, but the existing approach remains valid.
