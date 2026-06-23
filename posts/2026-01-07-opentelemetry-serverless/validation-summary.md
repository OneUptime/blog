# Validation Summary: How to Instrument Serverless Functions with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry JavaScript SDK and API
- OpenTelemetry Python SDK
- OpenTelemetry Collector
- AWS Lambda and AWS Distro for OpenTelemetry Lambda layers
- AWS SDK for JavaScript v3
- Azure Functions for Node.js
- Azure Monitor OpenTelemetry Distro
- Serverless Framework and AWS CloudFormation

## Sources Consulted
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript SDK 2.x upgrade guide: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry FaaS semantic conventions: https://opentelemetry.io/docs/specs/semconv/faas/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector troubleshooting/debug exporter documentation: https://opentelemetry.io/docs/collector/troubleshooting/
- AWS managed OpenTelemetry Lambda layers repository: https://github.com/aws-observability/aws-otel-lambda
- AWS Lambda Node.js 18 runtime and AWS SDK v3 guidance: https://aws.amazon.com/blogs/compute/node-js-18-x-runtime-now-available-in-aws-lambda/
- AWS SDK for JavaScript v2 end-of-support announcement: https://aws.amazon.com/blogs/developer/announcing-end-of-support-for-aws-sdk-for-javascript-v2/
- Azure Monitor OpenTelemetry for JavaScript documentation: https://learn.microsoft.com/en-us/javascript/api/overview/azure/monitor-opentelemetry-readme
- Azure Functions OpenTelemetry documentation: https://learn.microsoft.com/en-us/azure/azure-functions/opentelemetry-howto
- Azure Functions Node.js developer reference: https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node

## Issues Found
- The AWS ADOT Lambda layer ARNs were outdated. Updated the Node.js layer to `aws-otel-nodejs-amd64-ver-1-30-0` and the collector layer to `aws-otel-collector-amd64-ver-0-117-0`, matching the current AWS managed OpenTelemetry Lambda layer repository.
- The AWS examples used `nodejs18.x`. Updated the deployment snippets to `nodejs22.x` for a current Lambda Node.js runtime.
- The JavaScript examples used `new Resource(...)`, which is no longer exported by current `@opentelemetry/resources`. Replaced it with `resourceFromAttributes(...)`.
- The NodeSDK examples used the older single `spanProcessor` option. Updated them to use `spanProcessors: [...]`.
- The collector configuration used the removed `logging` exporter. Replaced it with the current `debug` exporter and `verbosity: detailed`.
- The CloudFormation example referenced `${OTEL_COLLECTOR_ENDPOINT}` in collector config without setting that environment variable. Added `OTEL_COLLECTOR_ENDPOINT: !Ref OtelCollectorEndpoint` and used the current `${env:OTEL_COLLECTOR_ENDPOINT}` collector environment provider syntax.
- The Azure Monitor example passed a plain object as `resource`. Updated it to use `resourceFromAttributes(...)`, as shown in the Azure Monitor OpenTelemetry JavaScript documentation.
- Fixed a typo in the Azure cold-start helper (`wasColStart` to `wasColdStart`).
- Removed invalid parent-span usage from `tracer.startActiveSpan('parseRequest', { parent: parentSpan }, ...)`; the active span context already creates the child span in this example.
- The AWS examples used the end-of-support AWS SDK for JavaScript v2 (`aws-sdk`, `.promise()`, `sendMessage`). Replaced them with modular AWS SDK v3 clients and added the required install command.
- Updated several semantic-convention attribute names, including `faas.execution` to `faas.invocation_id`, `http.status_code` to `http.response.status_code`, and older database/messaging names to current equivalents.
- Added `SpanStatusCode` imports where examples used it but did not import it.
- Added a caveat that JavaScript SDK sampling is head-based, so attributes used by a sampler must be present when the span is created.

## Review Notes
The article is technically relevant and remains valid after the corrections. JavaScript and Python fenced code blocks were syntax-checked successfully. Some examples are intentionally illustrative and still require real collector endpoints, credentials, package bundling, and production-specific sampling/export choices before deployment.
