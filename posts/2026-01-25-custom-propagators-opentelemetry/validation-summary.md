# Validation Summary: How to Implement Custom Propagators in OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry context propagation
- OpenTelemetry JavaScript API and propagators
- OpenTelemetry Python API and propagators
- OpenTelemetry Go API and propagators
- W3C Trace Context
- B3 and Jaeger propagation formats

## Sources Consulted
- OpenTelemetry specification: Propagators API - https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- OpenTelemetry JavaScript propagation documentation - https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/propagation.md
- OpenTelemetry JavaScript propagation guide - https://opentelemetry.io/docs/languages/js/propagation/
- OpenTelemetry Python TextMapPropagator API - https://opentelemetry-python.readthedocs.io/en/latest/api/propagators.textmap.html
- OpenTelemetry Python CompositePropagator API - https://opentelemetry-python.readthedocs.io/en/latest/api/propagators.composite.html
- OpenTelemetry Python trace API - https://opentelemetry-python.readthedocs.io/en/latest/api/trace.html
- OpenTelemetry Go propagation package - https://pkg.go.dev/go.opentelemetry.io/otel/propagation
- OpenTelemetry Go trace package - https://pkg.go.dev/go.opentelemetry.io/otel/trace
- OpenTelemetry JavaScript Jaeger propagator README - https://github.com/open-telemetry/opentelemetry-js/blob/main/packages/opentelemetry-propagator-jaeger/README.md

## Issues Found
- The JavaScript custom propagator examples imported and extended `TextMapPropagator` from `@opentelemetry/api`, but this is a TypeScript interface, not a runtime superclass exported by the CommonJS package. Changed the JavaScript examples to plain classes implementing `inject`, `extract`, and `fields`.
- The JavaScript examples imported `Context` from `@opentelemetry/api`, but `Context` is a TypeScript type and not needed in CommonJS runtime examples. Removed the runtime import and corrected the business context example to import the `context` API object.
- The JavaScript extraction examples assumed `getter.get()` always returns a string. Official OpenTelemetry examples handle string arrays as well, so extraction now normalizes array values before parsing.
- The Python sample imported unused symbols and used `TraceFlags.NONE`, which is not part of the current Python API. Replaced it with `TraceFlags.DEFAULT` and removed unused imports.
- The Python sample treated custom getter return values as scalar strings, but the official getter API may return a list of strings. Added normalization for list values.
- The Python `fields` property returned a list, while the current API documents a `set[str]`. Changed it to return a set.
- The Go sample imported `strconv` without using it, which would fail compilation. Removed the unused import.
- The Go sample used `trace.FlagsDeferred`, which is not present in the current Go trace API. Replaced it with the zero-value `trace.TraceFlags(0)` and retained `trace.FlagsSampled` for sampled contexts.

## Review Notes
The post is technically relevant and now aligns with the current documented OpenTelemetry APIs. JavaScript code blocks were syntax-checked with Node.js, and Python code blocks were checked with Python `compile()`. A local Go compile check could not be run because the `go` toolchain is not installed in this environment; the Go changes were checked against the official package documentation.
