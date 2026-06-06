# Validation Summary: How to Use Consistent Probability Sampling to Achieve Predictable Observability

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry SDK sampling
- OpenTelemetry Collector probabilistic sampler processor
- OpenTelemetry Collector routing connector
- W3C Trace Context and tracestate
- PromQL
- Kubernetes ConfigMap
- Python
- Java

## Sources Consulted
- OpenTelemetry TraceState probability sampling specification: https://opentelemetry.io/docs/specs/otel/trace/tracestate-probability-sampling/
- OpenTelemetry TraceState handling specification: https://opentelemetry.io/docs/specs/otel/trace/tracestate-handling/
- OpenTelemetry tracing SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry Python sampling documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/trace.sampling.html
- OpenTelemetry Java SDK sampler Javadoc: https://javadoc.io/doc/io.opentelemetry/opentelemetry-sdk-trace/latest/io/opentelemetry/sdk/trace/samplers/Sampler.html
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector probabilistic sampler processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/probabilisticsamplerprocessor
- OpenTelemetry Collector routing connector documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/connector/routingconnector
- OpenTelemetry Collector OTTL span context documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottlspan
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/

## Issues Found
- The post described OpenTelemetry consistent probability sampling as using a `p` field in `tracestate`. Updated this to the current OpenTelemetry `ot` tracestate entry with the `th` sampling threshold sub-key and optional `rv` randomness sub-key.
- The sequence diagram showed `p=0.1` and hash-based comparisons. Updated it to show threshold propagation with `ot=th:<threshold>` and the correct `randomness >= threshold` decision.
- The Python SDK example imported `TraceIdRatioBased` but used `ParentBasedTraceIdRatio`, which did not match the surrounding explanation. Updated it to explicitly combine `ParentBased` with `TraceIdRatioBased`.
- The Collector processor name was written as `probabilisticsampler`. Updated it to the documented `probabilistic_sampler` component ID.
- The Collector sampling comments claimed the processor matched the SDK sampler algorithm. Updated the wording because the OpenTelemetry spec notes that `TraceIdRatioBased` algorithm compatibility is not guaranteed across SDKs, while the Collector's `proportional` mode follows the OpenTelemetry/W3C consistent sampling model.
- The Collector examples omitted `mode: proportional`, which is the mode intended for OpenTelemetry/W3C probability sampling semantics. Added it to the relevant processor examples.
- The routing connector example used span fields without setting the OTTL context. Added `context: span` to the routing table entries.
- The routing conditions used invalid or ambiguous span paths (`status.code` and `duration`). Updated them to `span.status.code == STATUS_CODE_ERROR` and `span.end_time_unix_nano - span.start_time_unix_nano > 5000000000`.

## Review Notes
- `TraceIdRatioBased` is still available in current SDK APIs, but the OpenTelemetry specification is phasing it out in favor of newer probability sampler designs. The post now avoids claiming cross-SDK algorithm identity.
