# Validation Summary: Expose Backoff Loops with Retry Metrics and Traces

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Retry, backoff, retry-budget, and request-hedging telemetry
- OpenTelemetry metrics, traces, context propagation, and HTTP semantic conventions
- gRPC retries, transparent retries, hedging, and OpenTelemetry metrics
- Service-mesh and proxy retry observability

## Sources Consulted
- OpenTelemetry semantic conventions for HTTP spans: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry error attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/error/
- OpenTelemetry recording-errors guidance: https://opentelemetry.io/docs/specs/semconv/general/recording-errors/
- OpenTelemetry Trace API: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Propagators API: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- OpenTelemetry Metrics API: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Metrics Data Model: https://opentelemetry.io/docs/specs/otel/metrics/data-model/
- gRPC OpenTelemetry Metrics guide: https://grpc.io/docs/guides/opentelemetry-metrics/
- gRPC Retry guide: https://grpc.io/docs/guides/retry/
- gRPC Request Hedging guide: https://grpc.io/docs/guides/request-hedging/
- gRPC A66 OpenTelemetry Metrics proposal: https://github.com/grpc/proposal/blob/master/A66-otel-stats.md
- gRPC A96 OpenTelemetry Metrics for Retries proposal: https://github.com/grpc/proposal/blob/master/A96-retry-otel-stats.md
- gRPC A45 Retry Stats proposal: https://github.com/grpc/proposal/blob/master/A45-retry-stats.md
- Envoy router retry and attempt-count documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter.html

## Issues Found
- The post said a logical call always has an attempt unless admission fails. Calls can also fail or be canceled before any send for other reasons, so the wording now covers all pre-send failures and cancellations.
- It recommended segmenting counters emitted when calls and attempts start by final outcome. That outcome is not known when those measurements are recorded, so the post now limits start-counter dimensions to values known at recording time and explains that outcome-specific analysis must be recorded at call completion or derived from completed traces.
- It said amplification of 1.0 means one send for every call. The ratio only establishes an average over the measurement window and can be affected by zero-attempt calls and in-flight work at window boundaries, so the interpretation was corrected.
- It defined a hedge as necessarily starting before another attempt fails. gRPC can also start the next hedge immediately after a non-fatal failure, so the post now says a hedge can start while another attempt remains in flight.
- The custom retry-delay histogram measured scheduled delay even though later latency analysis requires elapsed wait time, especially when cancellation interrupts backoff. The metric descriptions now measure elapsed waits; scheduled delay remains appropriate as a trace-event field.
- The post could imply that gRPC per-attempt instruments are exact wire-send and transport-latency measurements. gRPC creates an attempt before the load-balancer pick, and its attempt duration includes subchannel-pick time. A caveat now distinguishes those library-attempt metrics from exact downstream sends and also distinguishes gRPC's cumulative call retry-delay metric from one observation per backoff wait.
- The gRPC default-enable statement was qualified to apply after its OpenTelemetry plugin is configured, and the enablement instruction now applies specifically to experimental instruments.
- It stated that all attempts belong to one logical trace. OpenTelemetry's HTTP examples permit separate root traces when no parent context exists, so the post now explains the parent-context requirement, per-attempt context injection, and unique span IDs.

## Review Notes
All four official-documentation links in the post resolved successfully to the intended pages. OpenTelemetry recommends `http.request.resend_count` on repeated HTTP attempt spans, but omitting it from this focused guide is not an error. The standard gRPC metric set documented here does not expose retry-token balance or budget-rejection counts, and later-attempt success analysis requires attempt-ordinal outcome data; those signals need custom instrumentation or another telemetry source. Language support for the experimental gRPC retry instruments remains implementation- and version-specific.
