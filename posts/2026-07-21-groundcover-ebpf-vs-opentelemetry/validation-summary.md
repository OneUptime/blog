# Validation Summary: Groundcover eBPF vs. OpenTelemetry: When App Instrumentation Matters

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Groundcover eBPF sensor and APM
- OpenTelemetry APIs, SDKs, zero-code instrumentation, and manual instrumentation
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Collector
- Distributed tracing and W3C Trace Context
- Kubernetes
- Prometheus metrics

## Sources Consulted
- Groundcover architecture overview: https://docs.groundcover.com/architecture/overview
- Groundcover APM overview: https://docs.groundcover.com/capabilities/application-performance-monitoring-apm
- Groundcover traces documentation: https://docs.groundcover.com/capabilities/application-performance-monitoring-apm/traces
- Groundcover supported technologies: https://docs.groundcover.com/capabilities/application-performance-monitoring-apm/supported-technologies
- Groundcover OpenTelemetry integration: https://docs.groundcover.com/integrations/data-sources/opentelemetry
- Groundcover OpenTelemetry from Kubernetes pods: https://docs.groundcover.com/integrations/data-sources/opentelemetry/sending-from-kubernetes-pods
- Groundcover OpenTelemetry from a Collector: https://docs.groundcover.com/integrations/data-sources/opentelemetry/sending-from-an-opentelemetry-collector
- Groundcover OpenTelemetry from standalone applications: https://docs.groundcover.com/integrations/data-sources/opentelemetry/sending-from-standalone-hosts
- Groundcover eBPF trace sampling controls: https://docs.groundcover.com/customization/customize-usage/controlling-the-ebpf-sampling-mechanism
- Groundcover Java SSL tracing: https://docs.groundcover.com/customization/customize-deployment/enabling-ssl-tracing-in-java-applications
- Groundcover OpenTelemetry data enrichment product update: https://www.groundcover.com/blog/otel-data-enrichment
- Groundcover OpenTelemetry as an APM data source: https://www.groundcover.com/blog/opentelemetry-first-class-apm-groundcover
- OpenTelemetry instrumentation concepts: https://opentelemetry.io/docs/concepts/instrumentation/
- OpenTelemetry zero-code instrumentation: https://opentelemetry.io/docs/concepts/instrumentation/zero-code/
- OpenTelemetry context propagation: https://opentelemetry.io/docs/concepts/context-propagation/
- OpenTelemetry sampling: https://opentelemetry.io/docs/concepts/sampling/
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry semantic conventions: https://opentelemetry.io/docs/specs/semconv/
- OpenTelemetry service resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/service/
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/

## Issues Found
- The introduction called Groundcover eBPF and OpenTelemetry "tracing products," although eBPF is a Linux kernel capability and OpenTelemetry is a telemetry framework. Reworded this as two complementary approaches.
- The layer-comparison table listed the OpenTelemetry Collector as a place where application instrumentation observes activity. Removed the Collector from that row because it receives, processes, and exports telemetry rather than instrumenting arbitrary application code.
- The hybrid-ingestion description implied that sensor enrichment applied uniformly to every ingestion path. Scoped Kubernetes metadata enrichment to spans and logs exported through Groundcover's Kubernetes sensor.
- The sampling guidance omitted Groundcover's sampling of incoming OTel traces at the Kubernetes sensor. Added the documented 5% default for sensor-ingested OTel traces and clarified that the direct BYOC endpoint does not sample incoming OTel data.
- The duplicate-telemetry advice focused on duplicate span display. Updated it to Groundcover's current documented behavior: eBPF and OpenTelemetry APM measurements can double-count the same traffic, so queries should select `source:ebpf` or `source:opentelemetry` when appropriate.
- The production-validation advice said logs correlate only when the application includes trace context. Clarified that exact trace-log correlation depends on trace and span IDs being present in the log record; OpenTelemetry logging integrations can inject these IDs automatically.
- The cited Groundcover November 2024 documentation URL returned HTTP 404. Replaced it with Groundcover's live official product-update article describing eBPF enrichment of OpenTelemetry traces.

## Review Notes
The post contains no executable code, commands, or configuration snippets, but it is a technically detailed comparison of instrumentation, propagation, sampling, enrichment, and telemetry-source behavior, so it was reviewed as a technical comparison rather than classified as a non-code blog. Groundcover's supported protocols, runtimes, sampling defaults, enrichment behavior, and plan availability can change; the post appropriately advises readers to validate current behavior for their deployment.
