# Validation Summary: How to Implement Head-Based Sampling

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry tracing and sampling
- W3C Trace Context
- Node.js / TypeScript OpenTelemetry SDK
- Python OpenTelemetry SDK
- OpenTelemetry Collector
- Kubernetes Deployment and Service configuration

## Sources Consulted
- OpenTelemetry JavaScript sampling documentation: https://opentelemetry.io/docs/languages/js/sampling/
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript SDK 2.x package definitions for `@opentelemetry/resources`, `@opentelemetry/sdk-trace-base`, `@opentelemetry/sdk-trace-node`, and `@opentelemetry/sdk-node`
- OpenTelemetry Python sampling documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.sampling.html
- OpenTelemetry Python resources documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/resources.html
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector logging-to-debug exporter migration notice: https://github.com/open-telemetry/opentelemetry-collector/issues/11337
- OpenTelemetry trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/

## Issues Found
- The introduction said head-based sampling happens before any spans are created. Updated this to say the decision happens when the trace starts, before spans are recorded/exported, which matches OpenTelemetry sampler behavior.
- The W3C trace flags explanation treated the whole flags byte as only `00` or `01`. Updated it to identify the least significant sampled bit, since other flags may exist.
- The post said SDK-dropped traces cost nothing and that tail sampling can rescue interesting traces after head sampling. Updated wording to clarify that dropped traces avoid exportable span data but still have minimal context overhead, and tail sampling can only act on traces that reach the collector.
- Custom TypeScript sampler examples imported `Sampler`, `SamplingDecision`, and `SamplingResult` from `@opentelemetry/api`. Moved those imports to SDK trace packages, where the current JS SDK exports them.
- TypeScript resource examples used `new Resource(...)`, which is not the current JS SDK 2.x resource construction API. Updated them to `resourceFromAttributes(...)`.
- TypeScript semantic convention examples used `ATTR_DEPLOYMENT_ENVIRONMENT`; updated to the stable `ATTR_DEPLOYMENT_ENVIRONMENT_NAME`.
- Python custom sampler examples used the non-existent `Decision.RECORD_AND_SAMPLED`. Updated to `Decision.RECORD_AND_SAMPLE`.
- The Python probability sampler used upper trace ID bits, while the current Python SDK ratio sampler uses low-order 64 bits for compatibility. Updated the custom example to use low-order 64 bits.
- Python resource examples imported `SERVICE_NAME` and `SERVICE_VERSION` from `opentelemetry.sdk.resources`. Updated examples to use `Resource.create(...)` with string resource attribute names.
- The Collector filter processor example used an older `spans.exclude.span_names` shape. Updated it to current OTTL `traces.span` conditions with `error_mode: ignore`.
- The Collector example used the removed `logging` exporter. Updated it to the current `debug` exporter and changed the pipeline reference.
- The Collector environment variable expansion used `${ONEUPTIME_TOKEN}`. Updated it to the documented `${env:ONEUPTIME_TOKEN}` form.
- The Express context middleware extracted upstream context but did not make the newly-created span current for downstream request handling. Updated it to call `context.with(trace.setSpan(...), next)`.
- The advanced sampler checked the legacy `http.target` attribute. Updated it to use `url.path`.
- The TypeScript test used the removed `addSpanProcessor` method. Updated it to configure `spanProcessors` in `NodeTracerProvider`.
- The deterministic sampling test created new random trace IDs each loop. Rewrote it to call the sampler repeatedly with the same trace ID.

## Review Notes
TraceIdRatioBased remains available in current SDKs, but the OpenTelemetry trace SDK specification notes it is being phased out in favor of newer probability sampling work and should generally be used as the root sampler under ParentBased sampling. The post now keeps that usage pattern.
