# Validation Summary: Fix the Node.js OpenTelemetry instrumentation-http Memory Leak on Node 20+

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Node.js
- OpenTelemetry JavaScript
- `@opentelemetry/instrumentation-http`
- `@opentelemetry/auto-instrumentations-node`
- `@opentelemetry/sdk-trace-base`
- Node.js HTTP, process memory, and V8 heap snapshot APIs
- npm CLI

## Sources Consulted
- OpenTelemetry HTTP instrumentation README and configuration options: https://github.com/open-telemetry/opentelemetry-js/blob/main/experimental/packages/opentelemetry-instrumentation-http/README.md
- OpenTelemetry `HttpInstrumentationConfig` API reference: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_instrumentation-http.HttpInstrumentationConfig.html
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- npm package metadata for `@opentelemetry/instrumentation-http`: https://www.npmjs.com/package/@opentelemetry/instrumentation-http
- npm package metadata for `@opentelemetry/sdk-trace-base`: https://www.npmjs.com/package/@opentelemetry/sdk-trace-base
- Node.js `process.memoryUsage()` documentation: https://nodejs.org/api/process.html#processmemoryusage
- Node.js `v8.writeHeapSnapshot()` documentation: https://nodejs.org/api/v8.html#v8writeheapsnapshotfilenameoptions
- Node.js HTTP API documentation for `ClientRequest`, `IncomingMessage`, and `ServerResponse`: https://nodejs.org/api/http.html
- npm CLI `install`, `info`, and `view` behavior checked with local npm 10.9.4.

## Issues Found
- The post claimed a specific known Node.js 20+ OpenTelemetry HTTP memory leak caused by changed `close` event handling. I could not verify that specific root-cause claim in the official OpenTelemetry HTTP instrumentation docs, API reference, Node.js docs, or package metadata, so I changed the wording to a verifiable troubleshooting description of memory growth involving older instrumentation versions, custom hooks, exporter backlogs, and retained HTTP objects.
- The "Disable Keep-Alive in the Instrumentation" example did not disable keep-alive. `serverName`, `requireParentforOutgoingSpans`, and `requireParentforIncomingSpans` are documented options, but the shown values do not disable keep-alive or act as a leak workaround. I changed the section to use documented `disableIncomingRequestInstrumentation` and `disableOutgoingRequestInstrumentation` options for temporarily disabling the affected HTTP instrumentation path.
- The hook example assumed `request.headers` and `response.getHeader()` always exist. OpenTelemetry documents that request hooks can receive either `ClientRequest` or `IncomingMessage`, and response hooks can receive either `IncomingMessage` or `ServerResponse`. I changed the example to use optional access for both server-side and client-side HTTP objects.
- The post said span attributes could retain request or response objects. OpenTelemetry span attributes are primitive values or arrays of primitives, so the real risk is retaining objects in closures, globals, or other long-lived references. I corrected the explanation while keeping the advice to store only lightweight primitive attributes.
- The heap snapshot example imported `fs` and assigned the return value of `v8.writeHeapSnapshot()` to `stream`, but the API returns the written filename. I removed the unused import and unused variable.
- The BatchSpanProcessor queue explanation overstated that reducing the queue releases request-object references sooner. I changed it to say that a smaller queue limits ended spans waiting in memory and reduces memory pressure, but is not a root-cause fix for retained request objects.

## Review Notes
The diagnostic snippets using `process.memoryUsage()` and `v8.writeHeapSnapshot()` are valid Node.js APIs. The npm commands are valid. The post remains a troubleshooting guide, but future updates should link to a specific upstream OpenTelemetry issue or changelog entry if a concrete Node 20+ instrumentation leak is identified.
