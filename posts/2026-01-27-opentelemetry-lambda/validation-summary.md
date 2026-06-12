# Validation Summary: How to Use OpenTelemetry with Lambda Functions

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry
- AWS Lambda
- AWS Distro for OpenTelemetry Lambda layers
- OpenTelemetry Collector
- Python
- Node.js
- AWS SDK for JavaScript v3
- AWS SDK for Python (boto3)
- AWS X-Ray propagation and export
- OTLP exporters
- AWS SAM / CloudFormation
- Terraform

## Sources Consulted
- AWS Distro for OpenTelemetry Lambda documentation: https://aws-otel.github.io/docs/getting-started/lambda/
- AWS Distro for OpenTelemetry Python Lambda support: https://aws-otel.github.io/docs/getting-started/lambda/lambda-python/
- AWS Distro for OpenTelemetry JavaScript Lambda support: https://aws-otel.github.io/docs/getting-started/lambda/lambda-js/
- AWS Lambda Node.js tracing documentation: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-tracing.html
- OpenTelemetry Lambda Collector configuration: https://opentelemetry.io/docs/platforms/faas/lambda-collector/
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- OpenTelemetry FaaS semantic conventions: https://opentelemetry.io/docs/specs/semconv/faas/
- OpenTelemetry FaaS attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/faas/
- OpenTelemetry Python AWS X-Ray propagator documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/propagator/aws/aws.html
- OpenTelemetry Python AWS SDK extension documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/sdk-extension/aws/aws.html
- AWS X-Ray exporter for OpenTelemetry Collector: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/awsxrayexporter/README.md
- AWS OpenTelemetry Python instrumentation releases: https://github.com/aws-observability/aws-otel-python-instrumentation/releases
- AWS OpenTelemetry JavaScript instrumentation releases: https://github.com/aws-observability/aws-otel-js-instrumentation/releases

## Issues Found
- The layer table and examples used legacy `aws-otel-*` layer ARN patterns and a separate collector layer as the default setup. Updated the text and examples to use current ADOT layer names, including current `us-east-1` Python and Node.js layer examples.
- The post implied the ADOT Lambda layer always bundles the collector. Updated the language to distinguish current instrumentation layers from the separate collector layer used for custom collector pipelines.
- The Node.js example used the current `/opt/otel-instrument` wrapper with a legacy Node.js layer ARN. Updated the ARN to the current `AWSOpenTelemetryDistroJs` layer family so the wrapper path matches the layer model.
- The auto-instrumentation lists overstated default Python and Node.js instrumentation coverage for database and web framework libraries. Updated those bullets to clarify that extra libraries require the relevant instrumentation to be enabled and available.
- The Node.js auto-instrumentation example used `fetch`, which is not covered by the default HTTP instrumentation in the documented ADOT Node.js layer configuration. Replaced it with a `node:https` request helper.
- The collector example used the generic `otlp` exporter for an HTTP/protobuf endpoint. Changed it to `otlphttp`, which matches an HTTP OTLP endpoint with a URL path.
- The collector config environment variable used `OPENTELEMETRY_COLLECTOR_CONFIG_FILE`, but current Lambda collector documentation uses `OPENTELEMETRY_COLLECTOR_CONFIG_URI`. Updated the custom config and troubleshooting references.
- The dual-export X-Ray collector example showed X-Ray as a generic OTLP exporter. Replaced it with the official `awsxray` exporter configuration.
- Two standalone Python snippets omitted required imports for `trace`, `Resource`, and `os`. Added those imports.

## Review Notes
- JavaScript code blocks were extracted individually and passed `node --check`.
- Python snippets were reviewed for syntax and API correctness, but not executed because the OpenTelemetry and AWS packages are not installed in this repository.
- OpenTelemetry FaaS semantic conventions are still marked Development, so attributes such as `faas.coldstart` are correct but may continue to evolve.
