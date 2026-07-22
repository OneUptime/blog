# Validation Summary: How Groundcover Smart Sampling Works and When to Force-Sample Traces

## Status

validated

## Post Type

Technical guide and operational runbook

## Technologies Covered

- Groundcover APM
- eBPF tracing
- Distributed tracing and smart sampling
- OpenTelemetry SDKs and Collector
- Kubernetes workloads and pod templates
- Datadog SDK trace ingestion
- ClickHouse trace storage

## Sources Consulted

- [Groundcover: Traces](https://docs.groundcover.com/capabilities/application-performance-monitoring-apm/traces)
- [Groundcover: Controlling the eBPF sampling mechanism](https://docs.groundcover.com/customization/customize-usage/controlling-the-ebpf-sampling-mechanism)
- [Groundcover: Sending directly from Datadog-instrumented services](https://docs.groundcover.com/integrations/data-sources/datadog/sending-directly-from-instrumented-services)
- [Groundcover: Sensitive data obfuscation](https://docs.groundcover.com/customization/customize-usage/sensitive-data-obfuscation)
- [Groundcover: Application metrics](https://docs.groundcover.com/capabilities/application-performance-monitoring-apm/application-metrics)
- [OpenTelemetry: Sampling concepts](https://opentelemetry.io/docs/concepts/sampling/)
- [OpenTelemetry: Agent-to-gateway deployment pattern](https://opentelemetry.io/docs/collector/deploy/other/agent-to-gateway/)
- [OpenTelemetry: Tracing SDK specification](https://opentelemetry.io/docs/specs/otel/trace/sdk/)
- [Kubernetes: Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)

## Issues Found

No technical issues found.

## Review Notes

The Groundcover-specific header, pod label or annotation, global limiter environment variable, and Datadog sampling ratio match the current official examples. The statistical warning about selection bias is consistent with Groundcover's documented preference for errors, latency outliers, and baseline traces. The OpenTelemetry explanation correctly distinguishes head and tail sampling and notes the same-Collector routing requirement for scaled tail-sampling gateways. No product versions are pinned, so the Groundcover configuration should be rechecked against its documentation when upgrading the sensor or Helm chart.
