# Validation Summary: How to Combine Beyla with OpenTelemetry SDK Instrumentation Without Duplicate Spans or Metrics

## Status
validated

## Post Type
Guide

## Technologies Covered
- Grafana Beyla 3.33.x
- OpenTelemetry SDKs and OTLP
- eBPF application and network instrumentation
- Grafana Tempo metrics-generator
- Grafana Alloy and OpenTelemetry Collector span-metrics and service-graph pipelines
- Kubernetes
- W3C Trace Context
- OpenTelemetry Go Auto SDK

## Sources Consulted
- [Grafana Beyla compatibility and practical guidance](https://grafana.com/docs/beyla/latest/#determine-compatibility)
- [Grafana Beyla service discovery configuration](https://grafana.com/docs/beyla/latest/configure/service-discovery/)
- [Grafana Beyla export configuration](https://grafana.com/docs/beyla/latest/configure/export-data/)
- [Grafana Beyla network metrics](https://grafana.com/docs/beyla/latest/network/)
- [Grafana Beyla network configuration](https://grafana.com/docs/beyla/latest/network/config/)
- [Grafana Beyla distributed tracing and context propagation](https://grafana.com/docs/beyla/latest/distributed-traces/)
- [Grafana Cloud Application Observability duplication options](https://grafana.com/docs/grafana-cloud/platform/knowledge-graph/get-started/manage-datasets/application/application-metrics/)
- [Grafana Tempo metrics from traces](https://grafana.com/docs/tempo/latest/metrics-from-traces/)
- [Grafana Tempo span-metrics filtering](https://grafana.com/docs/tempo/latest/metrics-from-traces/span-metrics/span-metrics-metrics-generator/#filtering)
- [Grafana Tempo service-graph filter policies](https://grafana.com/docs/tempo/latest/metrics-from-traces/service_graphs/#filter-policies)
- [Grafana Alloy span-metrics connector](https://grafana.com/docs/alloy/latest/reference/components/otelcol/otelcol.connector.spanmetrics/)
- [Grafana Alloy filter processor](https://grafana.com/docs/alloy/latest/reference/components/otelcol/otelcol.processor.filter/)
- [OpenTelemetry resource SDK specification](https://opentelemetry.io/docs/specs/otel/resource/sdk/)
- [OpenTelemetry SDK resource semantic conventions](https://opentelemetry.io/docs/specs/semconv/resource/#telemetry-sdk)
- [OpenTelemetry context propagation concepts](https://opentelemetry.io/docs/concepts/context-propagation/)
- [OpenTelemetry Go Auto SDK](https://opentelemetry.io/docs/zero-code/go/autosdk/)
- [Grafana Beyla v3.33.0 configuration source](https://github.com/grafana/beyla/blob/v3.33.0/pkg/beyla/config_obi.go)
- [Grafana Beyla v3.33.0 OpenTelemetry resource source](https://github.com/grafana/beyla/blob/v3.33.0/pkg/export/otel/common.go)

## Issues Found
- The post stated that overlapping instrumentation always creates two traces. This was corrected to explain that independently generated server spans can share one trace when both producers honor the same incoming context, or appear in separate traces when they do not.
- The post implied that Grafana trace-to-metrics components automatically honor `span.metrics.skip=true`. This was corrected to distinguish Grafana Cloud's configurable Duplication Option from self-managed Tempo and Alloy, which require explicit filtering in the relevant metrics-generation path.
- The post did not account for the resource-attribute type difference between the string value produced by `OTEL_RESOURCE_ATTRIBUTES` and the Boolean value emitted by Beyla. The filtering guidance now states that a shared self-managed filter must handle both types.
- The post said Beyla adds `span.metrics.skip` when either span-metric or service-graph generation is enabled. Current Beyla 3.33.0 source adds it for span-metric export, but not for a service-graph-only configuration; the text was corrected accordingly.
- The Kubernetes resource-identity guidance referred only to generic standard annotations. It now names the Pod annotations Beyla recognizes and notes that the application SDK or another component must also map the identity into the application's resource.
- The propagation guidance attributed header injection to the SDK itself and understated the limitations of network-level propagation. It now attributes injection to HTTP or RPC instrumentation and documents the HTTPS, Beyla-endpoint, and L7 proxy limitations.
- The verification guidance conflated resource and instrumentation-scope metadata. It now identifies `telemetry.sdk.name` as a resource attribute and records the current Beyla values separately.
- The discovery example did not mention that a later matching rule can override `exports`. A narrow caveat was added so the no-traces guarantee is accurate for an ordered discovery configuration.

## Review Notes
The YAML fields, feature names, exporter endpoints, discovery defaults, network-only configuration, and Go Auto SDK warning were checked against current official documentation and Beyla 3.33.0 source. The post contains no terminal commands. `span.metrics.skip` is a Grafana convention rather than an OpenTelemetry semantic convention, so behavior remains dependent on the configured Grafana Cloud, Tempo, or Alloy pipeline.
