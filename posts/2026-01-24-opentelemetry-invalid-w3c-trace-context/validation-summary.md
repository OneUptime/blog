# Validation Summary: How to Fix 'Invalid W3C Trace Context' Errors

## Status
validated

## Post Type
Technical guide / troubleshooting tutorial

## Technologies Covered
- OpenTelemetry JavaScript
- W3C Trace Context
- `traceparent` and `tracestate` headers
- B3 propagation
- Jaeger propagation
- Express middleware
- Jest

## Sources Consulted
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/
- OpenTelemetry JavaScript propagation documentation: https://opentelemetry.io/docs/languages/js/propagation/
- OpenTelemetry JavaScript `@opentelemetry/core` API reference: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_core.html
- OpenTelemetry JavaScript `W3CTraceContextPropagator` source: https://github.com/open-telemetry/opentelemetry-js/blob/main/packages/opentelemetry-core/src/trace/W3CTraceContextPropagator.ts
- OpenTelemetry JavaScript B3 propagator source: https://github.com/open-telemetry/opentelemetry-js/blob/main/packages/opentelemetry-propagator-b3/src/B3Propagator.ts
- OpenZipkin B3 propagation specification: https://github.com/openzipkin/b3-propagation
- OpenTelemetry propagators specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/

## Issues Found
- The post stated that only `traceparent` version `00` is supported and marked version `01` as invalid. W3C Trace Context forbids `ff`, but higher versions are reserved for future versions and should be parsed when the core fields are valid. Updated the section to distinguish defined, invalid, and future versions.
- The comprehensive `traceparent` validator required exactly four dash-separated fields for every version. W3C version `00` must have exactly four fields, but future versions can add fields. Updated the validator to enforce exactly four fields only for version `00`.
- The B3-to-W3C conversion helpers only checked ID lengths. This could convert non-hex or all-zero B3 IDs into invalid W3C `traceparent` headers. Added lower-hex validation, all-zero rejection, sampling-only single-header handling, and support for B3 debug flags via `X-B3-Flags: 1`.

## Review Notes
The code snippets remain illustrative and assume surrounding Express/OpenTelemetry setup such as `app` initialization and package installation. For production code, using OpenTelemetry's built-in composite propagator is preferable to hand-written conversion middleware unless there is a specific edge case to handle.
