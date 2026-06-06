# Validation Summary: How to Use Consistent Probability Sampling for Predictable Overhead

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector probabilistic_sampler processor
- OpenTelemetry Collector tail_sampling processor
- OpenTelemetry Collector internal telemetry
- OpenTelemetry Go SDK tracing and sampling
- OpenTelemetry Python SDK tracing and sampling
- OpenTelemetry Java SDK tracing and sampling
- OTLP receiver and exporter configuration

## Sources Consulted
- OpenTelemetry Collector probabilistic sampler processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/probabilisticsamplerprocessor/README.md
- OpenTelemetry Collector probabilistic sampler processor generated telemetry documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/probabilisticsamplerprocessor/documentation.md
- OpenTelemetry Collector tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry Go sampling documentation: https://opentelemetry.io/docs/languages/go/sampling/
- OpenTelemetry Python SDK sampling documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/trace.sampling.html
- OpenTelemetry Java SDK configuration documentation: https://opentelemetry.io/docs/languages/java/configuration/

## Issues Found
- The introduction incorrectly contrasted consistent probability sampling with head-based sampling. Updated the wording to contrast it with independent random sampling in each service, because SDK trace ID ratio sampling is itself a head-sampling strategy.
- The explanation overstated that every service independently arrives at the same decision from the trace ID. Clarified that parent-based SDK sampling follows the propagated sampled flag, while Collector-side probabilistic sampling uses trace ID randomness and matching configuration.
- The Mermaid diagram said dropped traces have no telemetry overhead. Changed this to reduced export and storage overhead, because Collector-side sampling still receives and processes spans before dropping them.
- The math section described a concrete hash comparison as the universal algorithm. Adjusted it to frame the formula as conceptual deterministic trace randomness, matching current OpenTelemetry consistent sampling semantics.
- The Collector examples used the ignored `service.telemetry.metrics.address` setting and an unused Prometheus exporter for internal metrics. Updated them to the current `service.telemetry.metrics.readers.pull.exporter.prometheus` syntax.
- The Python SDK example imported `ParentBasedTraceIdRatioBased`, which is not the current documented class. Replaced it with `ParentBasedTraceIdRatio`.
- The tail sampling example tried to combine `latency` and `probabilistic` settings in one latency policy. Reworked it as an `and` policy with latency and probabilistic sub-policies.
- The monitoring section listed a non-existent dropped-traces metric. Updated it to use `otelcol_processor_probabilistic_sampler_count_traces_sampled` with `sampled="true"` and `sampled="false"` labels.
- The priority sampling snippet used an invalid/misleading attributes processor action and sampled on `sampling.priority`. Simplified it to a tail sampling string-attribute policy on `request.priority` plus a probabilistic baseline.
- The troubleshooting advice implied a hash seed setting applies to all SDK services. Clarified that hash seed consistency applies to Collector instances in the same tier, while SDK completeness depends on ParentBased sampling.

## Review Notes
The YAML snippets parse successfully with PyYAML, and the Python snippet parses with Python `ast`. The local environment did not include `go` or `javac`, so Go and Java snippets were checked against official OpenTelemetry API documentation rather than compiled locally. The post does not pin Collector or SDK versions, so this review used current upstream documentation as of 2026-06-06.
