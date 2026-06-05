# Validation Summary: How to Replace AWS X-Ray SDK with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- AWS X-Ray SDK
- AWS Distro for OpenTelemetry (ADOT)
- OpenTelemetry JavaScript / Node.js SDK
- OpenTelemetry Python SDK
- OpenTelemetry Collector / Collector Contrib
- AWS X-Ray exporter
- AWS Lambda layers
- Express, Flask, AWS SDK for JavaScript, boto3/botocore

## Sources Consulted
- AWS X-Ray SDK and Daemon support timeline: https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-daemon-timeline.html
- AWS X-Ray migration guide for Node.js/OpenTelemetry: https://docs.aws.amazon.com/xray/latest/devguide/migrate-xray-to-opentelemetry-nodejs.html
- AWS Distro for OpenTelemetry X-Ray exporter guide: https://aws-otel.github.io/docs/getting-started/x-ray/
- AWS Distro for OpenTelemetry Lambda JavaScript layer documentation: https://aws-otel.github.io/docs/getting-started/lambda/lambda-js/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript overview and support status: https://opentelemetry.io/docs/languages/js/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python botocore instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/_modules/opentelemetry/instrumentation/botocore.html
- OpenTelemetry Collector exporter component documentation: https://opentelemetry.io/docs/collector/components/exporter/
- npm package metadata for @opentelemetry/resource-detector-aws: https://www.npmjs.com/package/@opentelemetry/resource-detector-aws

## Issues Found
- The Node.js setup imported `Resource` and used `new Resource(...)`, which is not the current documented JavaScript resource creation API. Changed it to `resourceFromAttributes(...)` and added `@opentelemetry/resources` to the install command.
- The Node.js AWS resource detector example used class-style names and constructors (`AwsEcsDetector`, `AwsEc2Detector`). The current package exports detector instances such as `awsEcsDetector` and `awsEc2Detector`, so the imports and `resourceDetectors` list were corrected.
- The manual Node.js span example referenced `trace.SpanStatusCode`, but `SpanStatusCode` is exported directly from `@opentelemetry/api`. Updated the import and status calls.
- The Python example used `opentelemetry-instrumentation-boto3` and `Boto3Instrumentor`, which are not the correct OpenTelemetry Python contrib instrumentation for boto3 clients. Changed the package and code to `opentelemetry-instrumentation-botocore` and `BotocoreInstrumentor`, which instruments botocore used by boto3.
- The Python install command included `opentelemetry-resource-detector-aws`, which is not the appropriate Python package in this context and was not used by the example. Removed it.
- The X-Ray annotation/metadata mapping implied all OpenTelemetry span attributes have indexed/non-indexed semantics. Clarified that X-Ray indexing requires exporter configuration, while metadata remains non-indexed by default.
- The Collector paragraph did not state that the AWS X-Ray exporter requires ADOT Collector or an OpenTelemetry Collector distribution that includes contrib components. Added that requirement.
- The Lambda layer example used an outdated Node.js layer version and a gRPC endpoint. Updated the ARN format to the documented Node.js layer version and switched the endpoint to OTLP/HTTP port 4318, which the legacy ADOT Node.js Lambda layer supports.

## Review Notes
- The post is now technically valid as a migration guide. The Lambda section uses the documented legacy ADOT Node.js Lambda layer because it shows custom OTLP export; AWS's newer Lambda documentation recommends optimized Application Signals layers for the default CloudWatch/X-Ray path.
