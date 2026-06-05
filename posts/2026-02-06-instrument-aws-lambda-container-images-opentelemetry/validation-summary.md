# Validation Summary: How to Instrument AWS Lambda Container Images with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Lambda container images
- AWS Lambda layers and extensions
- Amazon ECR
- Docker
- AWS CLI
- Python 3.12
- OpenTelemetry Python SDK
- OpenTelemetry Python instrumentation for botocore and requests
- OpenTelemetry Collector Lambda extension
- OTLP/HTTP and OTLP/gRPC
- AWS X-Ray propagation

## Sources Consulted
- AWS Lambda documentation: Create a Lambda function using a container image - https://docs.aws.amazon.com/lambda/latest/dg/images-create.html
- AWS Lambda documentation: Managing Lambda dependencies with layers - https://docs.aws.amazon.com/lambda/latest/dg/chapter-layers.html
- AWS Lambda documentation: Using the Lambda Extensions API to create extensions - https://docs.aws.amazon.com/lambda/latest/dg/runtimes-extensions-api.html
- AWS CLI documentation: lambda create-function - https://docs.aws.amazon.com/cli/latest/reference/lambda/create-function.html
- Amazon ECR documentation: Moving an image through its lifecycle in Amazon ECR - https://docs.aws.amazon.com/AmazonECR/latest/userguide/getting-started-cli.html
- OpenTelemetry documentation: Lambda Collector Configuration - https://opentelemetry.io/docs/platforms/faas/lambda-collector/
- OpenTelemetry documentation: Instrumenting AWS Lambda semantic conventions - https://opentelemetry.io/docs/specs/semconv/faas/aws-lambda/
- OpenTelemetry Python documentation: opentelemetry.sdk.trace and span processor force_flush behavior - https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.html
- OpenTelemetry Python documentation: OTLP HTTP trace exporter - https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- OpenTelemetry Python Contrib documentation: AWS X-Ray propagator - https://opentelemetry-python-contrib.readthedocs.io/en/latest/propagator/aws/aws.html
- OpenTelemetry Lambda GitHub releases: collector layer 0.22.0 - https://github.com/open-telemetry/opentelemetry-lambda/releases/tag/layer-collector/0.22.0

## Issues Found
- The post described the zip-based OpenTelemetry Lambda setup as a single layer with a built-in collector sidecar. Updated the wording and diagram to refer to Lambda layers providing the SDK, auto-instrumentation, and collector extension, which matches AWS Lambda and OpenTelemetry terminology.
- The collector extension Dockerfile downloaded a non-existent `v0.10.0` `.tar.gz` asset. Updated it to the current OpenTelemetry Lambda collector release asset URL for `layer-collector/0.22.0`, which is published as a `.zip` file.
- The collector extension Dockerfile used `tar` to extract a ZIP-style Lambda layer asset. Updated the example to extract the ZIP with Python's `zipfile` module, which is available in the Python Lambda base image.
- The collector-image Dockerfile omitted `opentelemetry-instrumentation-requests`, `opentelemetry-semantic-conventions`, and `opentelemetry-propagator-aws-xray`, even though the earlier setup code imports semantic conventions and the X-Ray propagator. Added the missing packages so the final image can run the shown code.

## Review Notes
The Python OpenTelemetry setup code was checked with the pinned package versions and imports successfully. The test export attempted to connect to `localhost:4318`, which failed as expected because no collector was running in the review environment; this does not indicate a code syntax or API issue. The post's AWS CLI examples are structurally correct, but users must replace the example AWS account ID, ECR repository, IAM role ARN, region, DynamoDB table name, and backend collector endpoint for a real deployment.
