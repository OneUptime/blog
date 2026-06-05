# Validation Summary: How to Debug W3C TraceContext Propagation Failures

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- W3C Trace Context
- OpenTelemetry context propagation
- OpenTelemetry JavaScript API and SDK
- OpenTelemetry propagators
- B3 propagation
- HTTP headers
- curl
- Node.js async context propagation
- Browser fetch instrumentation

## Sources Consulted
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/
- OpenTelemetry Propagators API specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- OpenTelemetry Environment Variable Specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry JS `@opentelemetry/sdk-node` documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry JS `@opentelemetry/core` documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_core.html
- OpenTelemetry JS `PropagationAPI` documentation: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_api._opentelemetry_api.PropagationAPI.html
- OpenTelemetry JS `CompositePropagator` documentation: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_core.CompositePropagator.html
- OpenTelemetry JS `ContextAPI` documentation: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_api._opentelemetry_api.ContextAPI.html
- OpenTelemetry JS fetch instrumentation documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_instrumentation-fetch.html
- OpenTelemetry JS HTTP instrumentation documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_instrumentation-http.html
- curl local help/version output for `curl -v` and `-H` usage.

## Issues Found
- The introduction described W3C TraceContext as using two HTTP headers unconditionally. Changed this to state that `traceparent` is used and `tracestate` is optional, matching the W3C specification.
- The Service A to Service B explanation said the extracted trace ID becomes the parent. Changed this to say the extracted remote span context becomes the parent and the new span shares the same trace ID.
- The Mermaid sequence diagram used invalid `traceparent` examples such as `00-abc123-span1-01`. Replaced them with valid lowercase hex trace IDs and parent IDs.
- Removed an unused `context` import from the first JavaScript snippet.
- Clarified that matching trace IDs confirms propagation at the trace level.
- The propagator example said every service must use the same propagator. Changed this to the more accurate requirement that downstream services must be able to extract the format emitted upstream.
- The composite propagator explanation said it would "try to extract from either." Clarified that it injects both configured formats and extracts from configured formats.
- The HTTP client instrumentation note grouped browser `fetch`, Node.js `fetch`, and `http.request` together too broadly. Added the current OpenTelemetry JS distinction between `@opentelemetry/instrumentation-http`, `@opentelemetry/instrumentation-undici`, and browser `@opentelemetry/instrumentation-fetch`.
- The `traceparent` validator interpreted sampling with `flags === '01'`. Changed it to mask the sampled bit with `parseInt(flags, 16) & 0x01`, as `trace-flags` is an 8-bit field.
- The async context example implied ordinary `setTimeout` necessarily loses context. Revised the example to focus on callbacks that escape and are later invoked outside the active context, then showed `context.bind` as the fix.

## Review Notes
The post is technically sound after the targeted corrections. The JavaScript snippets are illustrative and assume OpenTelemetry has already been initialized before application modules are loaded, which the post correctly calls out in the instrumentation section.
