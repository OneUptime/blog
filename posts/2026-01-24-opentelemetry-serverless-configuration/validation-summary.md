# Validation Summary: How to Configure OpenTelemetry for Serverless

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry JavaScript SDK
- OpenTelemetry semantic conventions
- OpenTelemetry AWS Lambda instrumentation and Lambda layer
- AWS Lambda
- Azure Functions for Node.js
- Google Cloud Functions / Cloud Run functions
- Google Cloud Trace exporter and propagator
- OTLP HTTP exporter
- Serverless Framework configuration

## Sources Consulted
- OpenTelemetry Lambda auto-instrumentation documentation: https://opentelemetry.io/docs/platforms/faas/lambda-auto-instrument/
- OpenTelemetry JS SDK 2.x upgrade guide: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OpenTelemetry JS resources package API: https://www.npmjs.com/package/@opentelemetry/resources
- OpenTelemetry JS semantic conventions package API: https://github.com/open-telemetry/opentelemetry-js/blob/main/semantic-conventions/README.md
- OpenTelemetry AWS Lambda instrumentation for Node.js: https://www.npmjs.com/package/@opentelemetry/instrumentation-aws-lambda
- OpenTelemetry AWS SDK instrumentation for Node.js: https://www.npmjs.com/package/@opentelemetry/instrumentation-aws-sdk
- OpenTelemetry HTTP instrumentation for Node.js: https://www.npmjs.com/package/@opentelemetry/instrumentation-http
- AWS Lambda runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda Node.js runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html
- Azure Functions OpenTelemetry documentation: https://learn.microsoft.com/en-us/azure/azure-functions/opentelemetry-howto
- Azure Functions Node.js developer guide: https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node
- Azure Functions OpenTelemetry instrumentation for Node.js: https://github.com/Azure/azure-functions-nodejs-opentelemetry
- Google Cloud Trace Node.js OpenTelemetry documentation: https://docs.cloud.google.com/trace/docs/setup/nodejs-ot
- Google Cloud OpenTelemetry operations exporters for JavaScript: https://github.com/GoogleCloudPlatform/opentelemetry-operations-js

## Issues Found
- The AWS Lambda Serverless Framework example used `nodejs18.x`, which is outdated for a 2026 guide. Updated it to `nodejs22.x`.
- The AWS Lambda layer ARN pinned an old layer version. Replaced it with a version placeholder and clarified that readers should use the current layer ARN for their region and architecture.
- The JavaScript SDK examples used `new Resource(...)`, which is no longer the current OpenTelemetry JS 2.x resource API. Updated examples to use `resourceFromAttributes(...)`.
- The examples used deprecated `SemanticResourceAttributes` constants. Updated them to current `ATTR_*` constants, using the incubating entry point for cloud and FaaS resource attributes.
- The examples used `provider.addSpanProcessor(...)`, which is not available in current OpenTelemetry JS 2.x provider types. Updated provider construction to pass `spanProcessors` in the provider config.
- The AWS Lambda instrumentation example used the removed `disableAwsContextPropagation` option. Removed that option from the example.
- The Azure HTTP instrumentation example used `ignoreIncomingPaths`, which is not a current `@opentelemetry/instrumentation-http` option. Updated it to `ignoreIncomingRequestHook`.
- The Google Cloud Functions example used older function environment variables only. Updated the resource naming/versioning to prefer `K_SERVICE` and `K_REVISION`, while keeping `FUNCTION_NAME` as a fallback.
- One troubleshooting code block used top-level `await` in an otherwise CommonJS-style article. Wrapped it in an async function so the snippet is syntactically valid.

## Review Notes
The post is now technically valid for current OpenTelemetry JavaScript APIs. Azure Functions also has host-level OpenTelemetry support through `host.json` `telemetryMode: "OpenTelemetry"`; this post focuses on application-code instrumentation rather than adding a separate host configuration section.
