# Validation Summary: How to Implement Session Replay Correlation with OpenTelemetry Traces

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry JavaScript browser tracing
- OpenTelemetry SpanProcessor and BatchSpanProcessor
- OpenTelemetry resources
- OpenTelemetry Python span attributes
- rrweb session recording
- Browser Fetch API custom headers
- Jaeger-compatible trace query API
- JavaScript, Python, and shell commands

## Sources Consulted
- OpenTelemetry Trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry JavaScript documentation: https://opentelemetry.io/docs/languages/js/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript SpanProcessor API reference: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk-trace-base.SpanProcessor.html
- OpenTelemetry JavaScript resources API reference: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry JavaScript Resource API reference: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_resources.Resource.html
- rrweb guide and record options: https://rrweb.com/docs/guide
- rrweb plugin documentation: https://rrweb.com/docs/recipes/plugin
- Jaeger APIs documentation: https://www.jaegertracing.io/docs/1.76/architecture/apis/
- npm package metadata and published type definitions for `@opentelemetry/sdk-trace-web@2.7.1`, `@opentelemetry/sdk-trace-base@2.7.1`, `@opentelemetry/resources@2.7.1`, `rrweb@2.0.1`, and `@rrweb/record@2.0.1`

## Issues Found
- The rrweb example used `recordNetwork: true`, but `recordNetwork` is not a current rrweb 2.0 record option. Removed that option and changed the surrounding claim from network-request recording to browser-side event recording.
- The session replay offset used `Date.now() - performance.timeOrigin`, which resets on navigation while the session ID persists in `sessionStorage`. Added a persisted session start timestamp and changed the offset calculation to use it.
- The OpenTelemetry JavaScript initialization used `new Resource(...)`, but current `@opentelemetry/resources` exposes `Resource` as an interface and documents `resourceFromAttributes(...)` for creating resources. Updated the import and provider resource configuration.
- The OpenTelemetry JavaScript initialization used `provider.addSpanProcessor(...)`, which is not available on the current `WebTracerProvider`/`BasicTracerProvider` type definitions. Updated the code to pass `spanProcessors` in the provider constructor.
- The custom `SpanProcessor` `onStart` method omitted the `parentContext` parameter from the current OpenTelemetry JavaScript interface. Added `_parentContext` to match the interface.
- The replay recorder was started after automatic instrumentations were registered, which could produce early spans without a replay ID. Moved `startRecording()` before `registerInstrumentations(...)`.
- The session propagation snippet was not imported by the tracing initialization code. Added `import './session-propagator';` so the fetch header injection is actually installed.
- The fetch wrapper only merged `init.headers` and did not preserve headers from a `Request` object passed as the fetch input. Updated it to copy headers from `init.headers` or `input.headers` when appropriate.
- The backend propagation explanation claimed every backend span in the request chain would carry the identifiers. The shown middleware only sets attributes on the current server span that receives the headers, so the wording was corrected.
- The correlation lookup checked `data.replayId` even though the example response reads attributes from `data.attributes`. Updated it to read `data.attributes['session.replay.id']`.
- The trace lookup URL interpolated the session ID into a query filter without encoding the full filter value. Added `encodeURIComponent(...)`.
- The Jaeger verification command used a `tag=session.id` query parameter against an internal JSON API. Replaced it with a service query plus `jq` filtering of returned tags, avoiding reliance on unsupported tag-filter syntax.

## Review Notes
- The custom `session.id`, `session.replay.id`, and `session.replay.offset_ms` attributes are practical correlation attributes but are not OpenTelemetry semantic convention attributes.
- Custom `X-Session-Id` and `X-Replay-Id` headers require appropriate CORS configuration for cross-origin APIs.
- Jaeger's HTTP JSON query API is documented as internal and subject to change; production tooling should prefer the stable Jaeger gRPC QueryService or the trace backend's documented query API.
