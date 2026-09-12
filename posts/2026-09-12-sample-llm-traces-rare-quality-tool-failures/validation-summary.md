# Validation Summary: Sample LLM Traces Without Hiding Hallucinations and Tool Failures

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Collector
- Tail sampling processor
- Head and tail trace sampling
- LLM observability and monitoring

## Sources Consulted
- [OpenTelemetry sampling concepts](https://opentelemetry.io/docs/concepts/sampling/)
- [OpenTelemetry tail sampling processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor)
- [Tail sampling processor internal telemetry and feature gates](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/documentation.md)
- [OpenTelemetry Collector configuration](https://opentelemetry.io/docs/collector/configuration/)
- [OpenTelemetry TraceState probability sampling specification](https://opentelemetry.io/docs/specs/otel/trace/tracestate-probability-sampling/)

## Issues Found
No technical issues found.

## Review Notes
The tail sampling processor is a beta, stateful contrib component, so the post correctly advises readers to verify behavior against their deployed Collector version. Its example values are syntactically valid and explicitly presented as starting examples rather than capacity recommendations. The `Python` tag is present, but the post does not contain Python-specific implementation content.
