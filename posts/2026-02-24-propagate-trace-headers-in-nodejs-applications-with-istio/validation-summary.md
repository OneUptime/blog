# Validation Summary: How to Propagate Trace Headers in Node.js Applications with Istio

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Istio distributed tracing
- Envoy trace header propagation
- Node.js
- Express
- Fastify
- AsyncLocalStorage
- Axios
- Native fetch
- Got
- gRPC for Node.js
- OpenTelemetry JavaScript SDK and auto-instrumentation

## Sources Consulted
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio distributed tracing FAQ: https://istio.io/latest/about/faq/distributed-tracing/
- Node.js AsyncLocalStorage documentation: https://nodejs.org/api/async_context.html
- Node.js 18 globals documentation for fetch: https://nodejs.org/dist/latest-v18.x/docs/api/globals.html
- Fastify hooks documentation: https://fastify.dev/docs/latest/Reference/Hooks/
- Fastify decorators documentation: https://fastify.dev/docs/latest/Reference/Decorators/
- Axios interceptor documentation: https://github.com/axios/axios
- Got package documentation: https://www.npmjs.com/package/got
- gRPC metadata guide: https://grpc.io/docs/guides/metadata/
- gRPC Node Metadata API documentation: https://grpc.github.io/grpc/node/grpc.Metadata.html
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/libraries/
- OpenTelemetry JavaScript NodeSDK documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry context propagation documentation: https://opentelemetry.io/docs/concepts/context-propagation/
- OpenTelemetry propagators specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/

## Issues Found
- The Fastify example assigned `request.traceHeaders` without first declaring a request decoration. Added `fastify.decorateRequest('traceHeaders', null);` and removed unused `AsyncLocalStorage` setup from that snippet to align with Fastify's documented decorator pattern.
- The Got example used `require('got')`, but current Got releases are native ESM and no longer provide a CommonJS export. Updated the snippet to use ESM `import` syntax.
- The OpenTelemetry example relied on default propagation/export behavior while claiming Istio handled exporting. Current OpenTelemetry JavaScript defaults to W3C Trace Context plus Baggage propagation and can auto-configure an OTLP trace exporter when no exporter or span processor is configured. Updated the snippet to explicitly configure W3C and B3 multi-header propagation, and added an empty `spanProcessors` setting for the proxy-span-only use case.

## Review Notes
The manual header propagation examples are technically valid for HTTP services in an Istio mesh, and the header list matches Istio's documented W3C and B3 propagation guidance. The OpenTelemetry example now assumes `@opentelemetry/propagator-b3` is installed in addition to the SDK and auto-instrumentation packages.
