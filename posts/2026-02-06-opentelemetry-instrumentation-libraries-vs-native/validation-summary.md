# Validation Summary: Understand OpenTelemetry Instrumentation Libraries vs Native Instrumentation

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry JavaScript API and SDK
- OpenTelemetry Node.js auto-instrumentation
- OpenTelemetry HTTP, Express, and MongoDB instrumentation libraries
- OpenTelemetry Python API
- OpenTelemetry Go API
- OpenTelemetry Go net/http instrumentation
- OpenTelemetry semantic conventions

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript instrumentation libraries documentation: https://opentelemetry.io/docs/languages/js/libraries/
- OpenTelemetry JavaScript HTTP instrumentation API reference: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_instrumentation-http.html
- OpenTelemetry JavaScript HTTP instrumentation config reference: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_instrumentation-http.HttpInstrumentationConfig.html
- OpenTelemetry JavaScript NodeSDK configuration reference: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk-node.NodeSDKConfiguration.html
- OpenTelemetry JavaScript zero-code instrumentation configuration: https://opentelemetry.io/docs/zero-code/js/configuration/
- OpenTelemetry instrumentation concepts: https://opentelemetry.io/docs/concepts/instrumentation/
- OpenTelemetry library instrumentation concepts: https://opentelemetry.io/docs/concepts/instrumentation/libraries/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Go getting started documentation: https://opentelemetry.io/docs/languages/go/getting-started/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/

## Issues Found
- The Node.js manual instrumentation example used `SpanStatusCode` without importing it. Added `SpanStatusCode` to the `@opentelemetry/api` import and corrected the nearby comment to refer to API components.
- The definition of native instrumentation said application code directly uses the SDK. Updated it to distinguish OpenTelemetry API calls from the SDK that processes and exports telemetry.
- The Node.js HTTP instrumentation example used `ignoreIncomingPaths`, which is not a current `HttpInstrumentationConfig` option. Replaced it with `ignoreIncomingRequestHook`.
- The performance section asserted that instrumentation overhead is typically microseconds. Reworded this to a workload-dependent statement because the exact overhead varies by instrumentation, configuration, and application behavior.
- The Go example imported `go.opentelemetry.io/otel/trace` without using it, which would fail compilation. Removed the unused import.
- The Go hybrid example reused the validation span context for later order processing. Changed the validation span context to `validateCtx` so later processing remains a child of the request context rather than a child of an ended validation span.
- The development configuration example used an unsupported top-level `enabled` option on `NodeSDK`. Replaced it with conditional instrumentation registration.

## Review Notes
- The examples are illustrative and still assume application-specific functions or values such as `fetchOrder`, `db`, `validateOrder`, and `selectWarehouse` are defined elsewhere.
- For production examples, future revisions could show SDK shutdown handling and exporter configuration, but those omissions do not make the current conceptual comparison incorrect.
