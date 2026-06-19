# Validation Summary: How to Configure OpenTelemetry for AWS Lambda

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry
- AWS Lambda
- AWS Distro for OpenTelemetry Lambda layers
- OpenTelemetry Collector Lambda extension
- Node.js OpenTelemetry SDK
- Python OpenTelemetry SDK
- AWS SDK for JavaScript and boto3/botocore
- AWS X-Ray
- OTLP exporters
- Serverless Framework and AWS SAM configuration

## Sources Consulted
- OpenTelemetry Lambda auto-instrumentation documentation: https://opentelemetry.io/docs/platforms/faas/lambda-auto-instrument/
- OpenTelemetry Lambda Collector configuration documentation: https://opentelemetry.io/docs/platforms/faas/lambda-collector/
- AWS Distro for OpenTelemetry Lambda documentation: https://aws-otel.github.io/docs/getting-started/lambda/
- AWS Distro for OpenTelemetry Lambda JavaScript documentation: https://aws-otel.github.io/docs/getting-started/lambda/lambda-js/
- AWS managed OpenTelemetry Lambda layers repository: https://github.com/aws-observability/aws-otel-lambda
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript SDK 2.x migration guide: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OpenTelemetry JavaScript semantic conventions README: https://github.com/open-telemetry/opentelemetry-js/blob/main/semantic-conventions/README.md
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics SDK documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.html
- OpenTelemetry OTLP exporter environment variable documentation: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- OpenTelemetry environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- AWS Lambda X-Ray tracing documentation: https://docs.aws.amazon.com/lambda/latest/dg/services-xray.html

## Issues Found
- The AWS-managed ADOT layer ARNs used older Node.js, Python, and Collector layer versions. Updated the examples to current documented layer names: Node.js `aws-otel-nodejs-amd64-ver-1-30-2`, Python `aws-otel-python-amd64-ver-1-32-0`, and Collector `aws-otel-collector-amd64-ver-0-117-0`.
- The Node.js manual setup used `SemanticResourceAttributes`, which is deprecated in OpenTelemetry JavaScript semantic conventions. Replaced it with literal semantic attribute names to avoid deprecated namespace exports and incubating entry-point ambiguity.
- The Node.js manual setup used `provider.addSpanProcessor(...)`, which was removed in OpenTelemetry JS SDK 2.x. Moved the `BatchSpanProcessor` into the `NodeTracerProvider` `spanProcessors` constructor option.
- The Node.js OTLP exporter example built a URL from a possibly undefined `OTEL_EXPORTER_OTLP_ENDPOINT` and always included an `Authorization` header key even when unset. Added a localhost OTLP/HTTP default and conditional header inclusion.
- The Python handler imported `boto3` before initializing OpenTelemetry, conflicting with the stated requirement to initialize before importing instrumented libraries. Moved the `boto3` import after `init_tracing()`.
- The Collector configuration comment said the `awsxray` exporter sends data to CloudWatch. Corrected the wording to AWS X-Ray.
- The context propagation example injected `_traceContext` into direct Lambda invocation payloads but did not extract that field. Added extraction support for `event._traceContext`.
- The Python metrics example created instruments before setting the `MeterProvider`, and the observable gauge callback returned a bare number rather than an iterable of `Observation` objects. Moved provider initialization before instrument creation and changed the callback to yield `Observation(get_memory_usage())`.

## Review Notes
Layer version ARNs are region-specific and may change after this review date, so readers should still check the ADOT Lambda layer documentation for the latest ARN in their target AWS Region. The examples remain illustrative and assume the necessary IAM permissions, dependency packages, and backend authentication are configured separately.
