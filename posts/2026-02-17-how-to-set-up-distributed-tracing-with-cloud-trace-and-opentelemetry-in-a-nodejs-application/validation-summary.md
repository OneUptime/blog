# Validation Summary: How to Set Up Distributed Tracing with Cloud Trace

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Trace
- Google Cloud IAM
- OpenTelemetry JavaScript SDK
- OpenTelemetry Node.js auto-instrumentation
- Node.js
- Express
- Docker
- npm

## Sources Consulted
- Google Cloud Trace Node.js instrumentation sample: https://docs.cloud.google.com/trace/docs/setup/nodejs-ot
- Google Cloud Trace instrumentation overview: https://docs.cloud.google.com/trace/docs/setup
- Google Cloud Trace IAM documentation: https://docs.cloud.google.com/trace/docs/iam
- Google Cloud OpenTelemetry Operations JavaScript exporter README: https://github.com/GoogleCloudPlatform/opentelemetry-operations-js
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry SDK Node API documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry API package declarations for SpanStatusCode: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_api.html
- npm CLI help for `npm ci`
- Node.js CLI help for `--require`

## Issues Found
- The tracing setup used `new Resource(...)` from `@opentelemetry/resources`. In current OpenTelemetry JavaScript, `Resource` is an interface/type and resources should be created with `resourceFromAttributes(...)`. Updated the import and SDK resource configuration.
- The custom span example used `trace.SpanStatusCode.ERROR`, but `SpanStatusCode` is a top-level export from `@opentelemetry/api`. Updated the import and `setStatus` call.
- The HTTP instrumentation example used `ignoreIncomingPaths`, which is not part of the current `@opentelemetry/instrumentation-http` configuration. Replaced it with `ignoreIncomingRequestHook`.
- The Dockerfile used `npm ci --only=production`, while current npm help documents `--omit=dev` for omitting development dependencies. Updated the command.

## Review Notes
Google Cloud documentation now recommends using an OpenTelemetry Collector when the environment supports it, and documents direct in-process export as an option for environments where a collector is not used. The post remains technically valid because it specifically demonstrates the Cloud Trace exporter path. A smoke check against current npm packages passed for the corrected OpenTelemetry imports and SDK configuration.
