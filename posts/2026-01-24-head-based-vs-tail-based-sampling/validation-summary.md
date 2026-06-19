# Validation Summary: How to Handle Head-Based vs Tail-Based Sampling

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry JavaScript SDK for Node.js
- OpenTelemetry Python SDK
- OpenTelemetry Collector
- Tail sampling processor
- OTLP HTTP exporter
- Memory limiter and batch processors

## Sources Consulted
- OpenTelemetry JavaScript sampling documentation: https://opentelemetry.io/docs/languages/js/sampling/
- OpenTelemetry JavaScript NodeSDK documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry JavaScript resources documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry Python sampling API documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.sampling.html
- OpenTelemetry Collector tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector OTLP HTTP exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- OpenTelemetry Collector memory limiter processor documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OneUptime related reading links listed in the post: https://oneuptime.com/blog/post/2025-08-25-how-to-reduce-noise-in-opentelemetry/view, https://oneuptime.com/blog/post/2025-08-27-traces-and-spans-in-opentelemetry/view, https://oneuptime.com/blog/post/2025-09-18-what-is-opentelemetry-collector-and-why-use-one/view

## Issues Found
- The Node.js example used `new Resource(...)` from `@opentelemetry/resources`. Current OpenTelemetry JavaScript resource documentation shows `resourceFromAttributes(...)`, so the example was updated to import and use `resourceFromAttributes`.
- The Collector exporter configuration used the deprecated `otlphttp` component alias. Current OpenTelemetry Collector documentation identifies `otlp_http` as the non-deprecated component name, so the exporter key and pipeline reference were changed to `otlp_http`.
- The hybrid sampling section claimed error traces would be kept close to 100% after a 20% head sampler. Tail sampling cannot recover traces already dropped by head sampling, so the explanation was corrected to state that errors are kept only from the traces that reach the collector and that the effective error retention is about 20% with the shown simple head sampler.
- The post described tail sampling error capture as guaranteed. This was softened to policy-based/error-aware capture because tail sampling depends on spans reaching the same collector and arriving within the decision window.

## Review Notes
The Python sampler example and tail sampling policy fields match current OpenTelemetry documentation. The related reading links resolve to plausible OneUptime blog pages. The examples remain version-sensitive because OpenTelemetry JavaScript APIs continue to evolve; future reviews should re-check imports and package names against the current SDK documentation.
