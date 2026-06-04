# Validation Summary: How to Use Head-Based Trace Sampling Strategies in the OpenTelemetry Collector

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib processors
- Probabilistic sampling processor
- Tail sampling processor
- Transform processor and OTTL
- Routing connector
- Kubernetes Deployments and ConfigMaps
- Prometheus / PromQL
- Grafana Tempo OTLP export

## Sources Consulted
- OpenTelemetry sampling concepts: https://opentelemetry.io/docs/concepts/sampling/
- OpenTelemetry Collector processor list: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector internal telemetry: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector Contrib probabilistic sampler processor: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/probabilisticsamplerprocessor
- OpenTelemetry Collector Contrib tail sampling processor: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector Contrib transform processor: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector Contrib routing connector: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/connector/routingconnector
- OpenTelemetry Collector Contrib filter processor: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/filterprocessor
- OpenTelemetry Collector releases: https://github.com/open-telemetry/opentelemetry-collector-releases/releases/tag/v0.153.0

## Issues Found
- The introduction stated that Collector-based head sampling reduces data at the source. I clarified that SDK sampling reduces data at the source, while Collector probabilistic sampling reduces data before export.
- The rate-limiting section presented tail sampling as head-based sampling and claimed a per-service trace limit. I clarified that the rate-limiting policy is part of the tail sampling processor, uses spans per second, and requires all spans for a trace to reach the same Collector instance.
- The attribute-based sampling example used the filter processor as if matching spans were kept. The filter processor drops matching telemetry, so I replaced it with a transform processor that sets `sampling.priority` before the probabilistic sampler.
- The probabilistic sampler example used `attribute_source: record` for traces. Current docs state trace sampling randomness always comes from the TraceID; `attribute_source` and `from_attribute` apply to log records. I removed that field.
- The service-specific sampling example used the deprecated routing processor pattern and defined multiple pipelines receiving the same OTLP data, which would duplicate processing rather than route it. I replaced it with the routing connector and downstream sampling pipelines.
- The parent-based sampling section implied that parent-based sampling is configured in the Collector. I clarified that parent-based sampling is an SDK sampler pattern and kept the Collector example focused on deterministic TraceID sampling with a consistent `hash_seed`.
- The critical path sampling example used the filter processor and an unset `critical_path` routing attribute. I replaced it with transform rules that set `sampling.priority` for critical spans before probabilistic sampling.
- The environment-based sampling example used the deprecated routing processor style and did not wire complete routing pipelines. I replaced it with a routing connector configuration that routes by `deployment.environment`.
- The monitoring examples used outdated or incorrect Collector metric names such as `otelcol_processor_accepted_spans` and `otelcol_processor_received_spans`. I updated them to current Collector processor, receiver/exporter, and Prometheus counter names.
- The Kubernetes deployment used the floating `latest` Collector image tag. I pinned it to the current official Collector Contrib release, `0.153.0`, to make the example reproducible.

## Review Notes
Some snippets remain partial Collector configurations and assume the surrounding receiver, exporter, and processor definitions from earlier examples. For production, keep the pinned Collector image version aligned with your tested Collector configuration.
