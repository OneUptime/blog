# Validation Summary: How to implement Grafana Tempo with tail-based sampling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Tempo
- OpenTelemetry Collector
- OpenTelemetry Collector tail sampling processor
- OpenTelemetry Collector load-balancing exporter
- Prometheus / PromQL
- Kubernetes

## Sources Consulted
- Grafana Tempo configuration documentation: https://grafana.com/docs/tempo/latest/configuration/
- Grafana Tempo OpenTelemetry Collector setup documentation: https://grafana.com/docs/tempo/latest/set-up-for-tracing/instrument-send/set-up-collector/otel-collector/
- Grafana Tempo span metrics / metrics-generator documentation: https://grafana.com/docs/tempo/latest/metrics-from-traces/span-metrics/span-metrics-metrics-generator/
- OpenTelemetry Collector tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector tail sampling processor telemetry documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/documentation.md
- OpenTelemetry Collector load-balancing exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/loadbalancingexporter/README.md
- OpenTelemetry Collector gateway deployment pattern: https://opentelemetry.io/docs/collector/deploy/gateway/

## Issues Found
- The introduction implied tail sampling always waits for a complete trace. Updated the wording to include the configured decision wait, because the tail sampling processor can decide after `decision_wait` even if later spans arrive.
- The Tempo setup section described tail sampling as Tempo configuration. Clarified that tail sampling runs in the OpenTelemetry Collector and Tempo stores the traces exported after sampling.
- The Tempo metrics-generator override used the older flat `metrics_generator_processors` form. Updated it to `overrides.defaults.metrics_generator.processors`.
- OTLP receiver examples omitted explicit listen endpoints. Added `0.0.0.0:4317` and `0.0.0.0:4318` where the examples describe Docker/Kubernetes-style networked components.
- The advanced policy example used `type: or`, which is not a current tail sampling processor policy type. Replaced it with separate top-level latency and status-code policies, which provides OR-style sampling behavior.
- The `decision_cache` comments incorrectly said it makes decisions on partial spans. Updated the comments to explain that sampled decision cache entries help late spans reuse an existing keep decision.
- Several PromQL examples used non-existent tail sampling metric names. Replaced them with documented current metric names for new trace IDs, per-policy trace decisions, late span age, and in-memory traces.
- The scaling example configured load balancing as a processor and placed it in the same pipeline after tail sampling. Updated it to use the current `load_balancing` exporter name and a two-tier Collector pattern so trace-ID routing happens before downstream tail sampling.
- The combined head/tail sampling example mixed shell exports into a YAML code block. Split the shell environment variables into a `bash` block and kept the Collector config in YAML.
- The debugging example implied `decision_cache` enables decision logging. Reworded it and noted the `processor.tailsamplingprocessor.recordpolicy` feature gate for recording the policy name on sampled spans.
- The Kubernetes Deployment snippet was missing required `selector` and template labels. Added matching labels so the manifest is structurally valid for `apps/v1`.

## Review Notes
- The post now aligns with current OpenTelemetry Collector contrib documentation. The load-balancing exporter README notes that the older `loadbalancing` component name remains as a deprecated alias; the post now uses `load_balancing`.
- The examples are still illustrative and omit production details such as authentication, S3 region/credentials, TLS hardening, and full Kubernetes Service/ConfigMap wiring.
