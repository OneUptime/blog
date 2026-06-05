# Validation Summary: How to Send OpenTelemetry Trace Data to Sentry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Sentry JavaScript/Node.js SDK
- OpenTelemetry JavaScript API
- Express
- Distributed tracing
- Trace sampling

## Sources Consulted
- Sentry Node.js OpenTelemetry Support: https://docs.sentry.io/platforms/javascript/guides/node/opentelemetry/
- Sentry Node.js Using Your Existing OpenTelemetry Setup: https://docs.sentry.io/platforms/javascript/guides/node/opentelemetry/custom-setup/
- Sentry Node.js Using OpenTelemetry APIs: https://docs.sentry.io/platforms/javascript/guides/node/opentelemetry/using-opentelemetry-apis/
- Sentry Express Tracing setup: https://docs.sentry.io/platforms/javascript/guides/express/tracing/
- Sentry JavaScript sampling configuration: https://docs.sentry.io/platforms/javascript/guides/bun/tracing/configure-sampling/
- Sentry Node.js configuration options: https://docs.sentry.io/platforms/javascript/guides/node/configuration/environments/
- Sentry JavaScript SDK v8 to v9 migration notes for `tracesSampler`: https://docs.sentry.io/platforms/javascript/guides/hono/migration/v8-to-v9/
- `@sentry/opentelemetry` npm package metadata and TypeScript exports for version 10.56.0: https://www.npmjs.com/package/@sentry/opentelemetry
- `@sentry/node` npm package metadata for version 10.56.0: https://www.npmjs.com/package/@sentry/node
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry JavaScript API `SpanStatusCode` reference: https://open-telemetry.github.io/opentelemetry-js/enums/_opentelemetry_api._opentelemetry_api.SpanStatusCode.html

## Issues Found
- The post described a JavaScript SDK `OTLPIntegration` exported by `@sentry/opentelemetry`, but current Sentry Node.js documentation and the package exports do not provide that integration. Replaced the setup with Sentry's documented built-in OpenTelemetry support through `@sentry/node`.
- The install command included `@sentry/opentelemetry` but the example imported `@opentelemetry/api` and `express`. Updated the command to install the packages used by the code snippet.
- The setup snippet configured a hard-coded OTLP endpoint under an SDK integration that does not exist. Removed the endpoint and enabled tracing with `tracesSampleRate`, matching Sentry's documented Node.js setup.
- The application snippet did not initialize Sentry before importing and using Express. Added `require("./sentry")` at the top of the app example so Sentry is initialized first.
- The span status example used numeric status codes. Replaced them with `SpanStatusCode.OK` and `SpanStatusCode.ERROR` from `@opentelemetry/api` to match the OpenTelemetry JavaScript API.
- The data-flow section incorrectly said the SDK serializes completed spans into OTLP format. Reworded it to explain that Sentry configures OpenTelemetry, processes completed spans, converts them to Sentry trace data, and sends them through the Sentry SDK transport.
- The sampling example configured both `tracesSampleRate` and `tracesSampler`, even though Sentry documents them as mutually exclusive with `tracesSampler` taking precedence. Removed `tracesSampleRate` from that example.
- The sampling example used `samplingContext.transactionContext.name`, which has been removed from current JavaScript SDK sampling context. Updated it to use `samplingContext.name` and `inheritOrSampleWith`.
- The debug example used the nonexistent `OTLPIntegration` and did not enable tracing. Updated it to use `tracesSampleRate: 1.0`.
- Replaced placeholder DSNs with the current Sentry documentation style: `https://examplePublicKey@o0.ingest.sentry.io/0`.

## Review Notes
The corrected post now covers Sentry's built-in Node.js OpenTelemetry support rather than OTLP ingestion. Sentry does expose OTLP ingestion URLs in project client keys, but that is separate from the JavaScript SDK integration model described in the tutorial.
