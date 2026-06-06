# Validation Summary: How to Set Up Composite Sampling (Head + Tail) for Cost Optimization

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry JavaScript SDK
- OpenTelemetry SDK sampling
- OpenTelemetry Collector
- Tail sampling processor
- OTLP trace exporting
- Collector internal telemetry
- OneUptime OTLP ingestion

## Sources Consulted
- OpenTelemetry JavaScript `@opentelemetry/sdk-trace-base` sampling documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-trace-base.html
- OpenTelemetry JavaScript `Sampler` interface documentation: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk-trace-base.Sampler.html
- OpenTelemetry JavaScript `SamplingDecision` enum documentation: https://open-telemetry.github.io/opentelemetry-js/enums/_opentelemetry_sdk-trace-base.SamplingDecision.html
- OpenTelemetry JavaScript resources documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry Collector tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector tail sampling internal telemetry documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/documentation.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry

## Issues Found
- The Node.js setup used `new Resource(...)` from `@opentelemetry/resources`. Current OpenTelemetry JavaScript docs expose resource creation through `resourceFromAttributes(...)`, so the import and SDK resource configuration were updated.
- The custom sampler imported `Sampler`, `SamplingResult`, and `SamplingDecision` from `@opentelemetry/api`, but those are SDK trace-base exports in current OpenTelemetry JavaScript. Updated the imports to use `@opentelemetry/sdk-trace-base`.
- The custom sampler returned `SamplingDecision.RECORD_AND_SAMPLE`, which is not the current JavaScript enum member. Updated it to `SamplingDecision.RECORD_AND_SAMPLED`.
- The tail sampling explanation said policies are evaluated "in order" and that any policy match keeps the trace. Current tail sampling combines policy decisions and drop decisions can override sample decisions, so the explanation was corrected.
- The Collector internal telemetry example used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Updated it to configure a Prometheus `pull` reader and retained `without_type_suffix` and `without_units` for the documented metric names.
- The monitoring list included `otelcol_processor_tail_sampling_count_traces_dropped`, which is not documented as a current tail sampling metric. Updated it to use `otelcol_processor_tail_sampling_count_traces_sampled{sampled="false"}`.
- The early tail sampling wording implied the Collector always waits for a fully assembled trace. Adjusted it to say the processor waits for trace spans during the configured decision window and decides based on the trace data it has seen.
- The error-aware sampler text did not mention preserving parent-based sampling behavior. Added a note to use that sampler as the root sampler inside `ParentBasedSampler`.

## Review Notes
The tail sampling processor is a contrib Collector component with beta stability for traces, and several of its internal metrics are marked development stability. Future Collector releases may change some telemetry names or attributes.
