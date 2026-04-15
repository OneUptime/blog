# Validation Summary: How to Audit Dapr API Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar architecture, structured logging, tracing, metrics)
- Kubernetes (pod annotations, kubectl)
- Fluent Bit (log collection and filtering)
- Elasticsearch (log aggregation)
- OpenTelemetry / Zipkin tracing
- Jaeger (trace collector)
- Prometheus (alerting on metrics)
- jq (JSON filtering)

## Sources Consulted
- Dapr documentation on sidecar annotations: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-annotations/
- Dapr documentation on logging: https://docs.dapr.io/operations/observability/logging/
- Dapr documentation on distributed tracing configuration: https://docs.dapr.io/operations/observability/tracing/
- Dapr documentation on metrics: https://docs.dapr.io/operations/observability/metrics/
- Fluent Bit documentation on grep filter: https://docs.fluentbit.io/manual/pipeline/filters/grep
- Fluent Bit documentation on Elasticsearch output: https://docs.fluentbit.io/manual/pipeline/outputs/elasticsearch
- Prior validated blog posts in this repo covering Dapr metrics (dapr-custom-grafana-dashboards, dapr-metrics-prometheus)

## Issues Found
- **Prometheus metric label name**: The alert rule used `status_code="401"` as the label selector, but Dapr's HTTP server metrics use the label `status`, not `status_code`. Changed to `status="401"`. This is consistent with corrections made in other Dapr blog posts in this repository.

## Review Notes
- The example sidecar log entry is illustrative. Actual Dapr structured log output includes standard fields (`time`, `level`, `type`, `msg`, `scope`, `ver`, `instance`), but HTTP-specific fields like `method`, `path`, `status`, and `duration` may appear within the `msg` string rather than as top-level JSON properties depending on the Dapr version. The example conveys the right concept but readers should verify the exact field structure against their Dapr version.
- The Fluent Bit grep filter `Regex msg HTTP API Called` depends on Dapr emitting that exact string in the `msg` field. Readers should adjust the regex to match their actual Dapr log output.
- The Dapr Configuration CRD uses `apiVersion: dapr.io/v1alpha1` which is correct for current Dapr versions. Future Dapr releases may graduate this to a stable API version.
- The tracing configuration uses the Zipkin-compatible endpoint format with Jaeger, which is a valid and common setup.
