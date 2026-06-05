# Validation Summary: How to Configure the Tail Sampling Processor in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- Tail Sampling Processor
- OTLP receiver and exporter
- Batch Processor
- Load Balancing Exporter
- OpenTelemetry Collector internal telemetry

## Sources Consulted
- OpenTelemetry Collector Contrib Tail Sampling Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector Contrib Tail Sampling Processor config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/config.go
- OpenTelemetry Collector Contrib Tail Sampling Processor generated telemetry docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/documentation.md
- OpenTelemetry Collector Contrib Load Balancing Exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/loadbalancingexporter/README.md
- OpenTelemetry Collector Gateway deployment pattern: https://opentelemetry.io/docs/collector/deploy/gateway/
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/

## Issues Found
- The post described head-based sampling as random. Changed this to say it makes decisions at the source before the full trace is known, because head sampling can be probabilistic, parent-based, or custom.
- The explanation claimed tail sampling batches incoming spans and evaluates when all spans are received. Updated it to match the Collector behavior: spans are grouped by trace ID and evaluated after `decision_wait`, with earlier root-span-based acceleration only when configured.
- The basic configuration comments said policies are evaluated in order and the first match wins. Replaced this with the default behavior: policies contribute decisions to a final sampling result.
- The latency example used `upper_threshold_ms: true`, but the Collector schema expects an integer millisecond value. Changed it to `upper_threshold_ms: 10`.
- The rate limiting section described trace-per-second limiting. Corrected it to span-per-second limiting, matching the `spans_per_second` setting.
- The AND-policy example matched `span.kind` with `string_attribute`, but `span.kind` is not a normal span attribute. Changed the example to use the HTTP span attribute `http.request.method`.
- The always-sample fallback comment said it sampled at a low rate while using `always_sample`. Updated the comment to say it keeps all remaining traces.
- The production example placed `batch` before `tail_sampling` and described that as reducing tail-sampling memory usage. Changed the pipeline to run `tail_sampling` before `batch`, with wording focused on export throughput after sampling.
- The production policy comments implied priority ordering. Changed them to neutral policy labels because default policy order is not priority-based.
- The load balancing exporter example used the deprecated `loadbalancing` component name and set an OTLP sub-exporter endpoint directly. Updated it to `load_balancing` and used the DNS resolver as the endpoint source.
- The policy ordering section incorrectly recommended ordering policies by priority. Replaced it with guidance on default final-decision behavior and when to use `drop`, `not`, `composite`, or `sample_on_first_match`.
- The monitoring section listed stale or incorrect metric names. Replaced them with current generated tail sampling processor metrics.
- The troubleshooting section recommended probabilistic sampling before tail sampling without caveat. Added the caveat that this can drop traces before tail-sampling policies evaluate them.

## Review Notes
All YAML snippets were parsed successfully after editing. The post does not pin an OpenTelemetry Collector version, so this review used the current official upstream documentation as of 2026-06-05.
