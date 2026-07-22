# Validation Summary: How Groundcover Correlates eBPF and OpenTelemetry Traces Across One Request

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Groundcover
- eBPF
- OpenTelemetry tracing and context propagation
- OpenTelemetry Protocol (OTLP) over HTTP and gRPC
- OpenTelemetry Collector
- W3C Trace Context
- Kubernetes
- HTTP and gRPC
- Distributed tracing, sampling, and log correlation

## Sources Consulted
- [Groundcover: November 2024 product update—eBPF enrichment of HTTP/gRPC traces](https://docs.groundcover.com/product-updates/earlier-updates/2024/nov-2024)
- [Groundcover: Application Performance Monitoring](https://docs.groundcover.com/capabilities/application-performance-monitoring-apm)
- [Groundcover: Traces](https://docs.groundcover.com/capabilities/application-performance-monitoring-apm/traces)
- [Groundcover: Supported Technologies](https://docs.groundcover.com/capabilities/application-performance-monitoring-apm/supported-technologies)
- [Groundcover: OpenTelemetry integration](https://docs.groundcover.com/integrations/data-sources/opentelemetry)
- [Groundcover: Sending from Kubernetes Pods](https://docs.groundcover.com/integrations/data-sources/opentelemetry/sending-from-kubernetes-pods)
- [Groundcover: Sending from an OpenTelemetry Collector](https://docs.groundcover.com/integrations/data-sources/opentelemetry/sending-from-an-opentelemetry-collector)
- [Groundcover: Sending from Standalone Applications](https://docs.groundcover.com/integrations/data-sources/opentelemetry/sending-from-standalone-hosts)
- [Groundcover: Ingestion Endpoints](https://docs.groundcover.com/architecture/incloud-managed/ingestion-endpoints)
- [Groundcover: Enriching 3rd Party Data](https://docs.groundcover.com/integrations/data-sources/enriching-3rd-party-data)
- [Groundcover: Log and Trace Correlation](https://docs.groundcover.com/log-and-trace-correlation)
- [Groundcover: Controlling the eBPF Sampling Mechanism](https://docs.groundcover.com/customization/customize-usage/controlling-the-ebpf-sampling-mechanism)
- [Groundcover: Sensitive Data Obfuscation](https://docs.groundcover.com/customization/customize-usage/sensitive-data-obfuscation)
- [Groundcover: Customize Tracing Payload Size](https://docs.groundcover.com/customization/customize-usage/customize-tracing-payload-size)
- [OpenTelemetry: Context Propagation](https://opentelemetry.io/docs/concepts/context-propagation/)
- [OpenTelemetry: Collector Configuration](https://opentelemetry.io/docs/collector/configuration/)
- [OpenTelemetry: Sampling](https://opentelemetry.io/docs/concepts/sampling/)
- [OpenTelemetry: Resource Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/resource/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)

## Issues Found
- The ingestion sequence named only the BYOC endpoint, although Groundcover documents direct OTLP ingestion from Kubernetes pods through the `groundcover-sensor` service. The sequence now identifies the sensor or BYOC endpoint according to the integration path.
- The `service.name` advice did not account for direct pod ingestion. It now states that Groundcover documents replacing `service.name` with the owning Kubernetes Deployment name when the sensor directly ingests pod telemetry.
- The comparison table implied that eBPF enrichment adds coverage where no OpenTelemetry span exists, and the following sentence called the result a combined waterfall. Groundcover's public update documents data enrichment from sampled eBPF spans, not insertion of otherwise-missing spans into the OpenTelemetry waterfall. The table now lists the documented PII-status enrichment, and the result is called an enriched trace.
- The sampling discussion omitted Groundcover's separate sampling of OTLP traces sent directly to the Kubernetes sensor. It now records the documented 5% default for that path and distinguishes it from external Collector export to the BYOC endpoint, which Groundcover says performs no additional sampling.

## Review Notes
- Groundcover does not publicly document the internal matching key or algorithm used for eBPF-to-OpenTelemetry enrichment. The post correctly avoids asserting one.
- The force-sampling header applies to Groundcover's HTTP/gRPC eBPF sampling. The post correctly warns that it does not override independent OpenTelemetry SDK or Collector sampling decisions.
- The post contains no executable code, terminal commands, or configuration blocks. Its propagation, ingestion, sampling, and troubleshooting details nevertheless make it a technical implementation guide requiring full validation rather than `not-code-blog` classification.
