# Validation Summary: How to Document Your OpenTelemetry Collector Pipeline Architecture

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector receivers, processors, exporters, and internal telemetry
- OTLP gRPC and OTLP HTTP
- Kubernetes kubectl commands
- Kubernetes HorizontalPodAutoscaler autoscaling/v2
- Git rollback commands

## Sources Consulted
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector memory limiter processor package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/memorylimiterprocessor
- OpenTelemetry Collector batch processor package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/batchprocessor
- OpenTelemetry Collector tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector tail sampling internal telemetry documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/documentation.md
- OpenTelemetry Collector attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.153.0/processor/attributesprocessor
- Kubernetes HorizontalPodAutoscaler autoscaling/v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/

## Issues Found
- The memory limiter description said it drops data when memory exceeds thresholds. Updated it to say it refuses data, which matches the processor behavior. Dropping can still occur if upstream components cannot retry refused data.
- The batch processor comment described `send_batch_size` as the number of items per batch. Updated it to describe the setting as the number of spans, metric points, or log records that triggers a send; the official docs note it is a trigger and does not enforce a maximum batch size.
- The failure-mode table referenced `otelcol_processor_tail_sampling_count`, which is not the current documented tail sampling metric. Replaced it with `otelcol_processor_tail_sampling_global_count_traces_sampled`.
- The failure-mode table and health-check commands referenced `otelcol_processor_refused_spans` / `otelcol_processor_refused`, but Collector internal telemetry documents receiver refusal metrics such as `otelcol_receiver_refused_spans`. Updated those references.
- The internal metrics commands used `curl http://localhost:8888/metrics` without first making the Collector metrics endpoint available locally. Added a `kubectl port-forward` command before the local curl checks.
- The exporter backpressure remediation suggested increasing batch timeout. Updated it to check exporter queue metrics and tune exporter queue/retry settings or scale collectors, which aligns better with Collector troubleshooting guidance.

## Review Notes
The snippets are illustrative runbook examples rather than complete Collector and Kubernetes manifests. The Collector metric names can differ if internal telemetry is manually configured with Prometheus unit/type suffix behavior, so teams should verify names against their deployed Collector configuration.
