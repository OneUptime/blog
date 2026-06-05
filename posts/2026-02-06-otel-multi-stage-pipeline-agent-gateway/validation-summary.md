# Validation Summary: How to Build a Multi-Stage Pipeline: Agent Collector for Sampling, Gateway

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP receiver and exporter
- OpenTelemetry Collector processors: memory_limiter, probabilistic_sampler, filter, attributes, k8sattributes, tail_sampling, transform, batch, cumulativetodelta, metricstransform
- OpenTelemetry Collector load_balancing exporter
- Kubernetes metadata enrichment
- Head sampling and tail sampling

## Sources Consulted
- OpenTelemetry Collector processor list: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OTLP receiver README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OTLP gRPC exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md
- gRPC configuration README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configgrpc/README.md
- Filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- Probabilistic sampler processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/probabilisticsamplerprocessor/README.md
- Load balancing exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/loadbalancingexporter/README.md
- Kubernetes attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/k8sattributesprocessor/README.md
- Tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- Transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- Cumulative to delta processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/cumulativetodeltaprocessor/README.md
- Metrics transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/metricstransformprocessor/README.md
- Attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md

## Issues Found
- The agent filter processor snippet used the older `traces.span` configuration shape. Updated it to the current documented `trace_conditions` form, added `error_mode: ignore`, and used explicit `span.attributes[...]` OTTL paths.
- The load balancing exporter was configured as `loadbalancing`, which is now documented as a deprecated alias. Updated the exporter ID and pipeline reference to `load_balancing`.
- The load balancing DNS resolver used a numeric `port`; Collector v0.153.0 expects this field to decode as a string. Quoted the value as `"4317"`.
- The gateway-side Kubernetes enrichment snippet relied implicitly on connection-IP association, which is not correct after telemetry is forwarded through agents. Added `pod_association` rules using pod resource attributes so gateway enrichment can work in a multi-stage topology.
- The transform processor snippet used unqualified resource attribute paths. Updated the OTTL statements to use `resource.attributes[...]` and added `error_mode: ignore`, matching current transform processor documentation.
- The metrics section said the agent performs delta-to-cumulative conversion, but the configured `cumulativetodelta` processor converts cumulative metrics to delta. Corrected the wording.
- The metrics aggregation wording implied broad gateway aggregation. Clarified that `metricstransform` performs label-set aggregation within each batch, matching its documented limitation.

## Review Notes
The trace sampling math is correct for traces that survive agent head sampling. The post now notes the key caveat for 100% error retention: head sampling at the agent can drop error traces before the gateway tail sampler sees them. The Kubernetes enrichment example assumes incoming telemetry already includes pod-identifying resource attributes such as `k8s.pod.ip` or `k8s.pod.name` plus `k8s.namespace.name`.
