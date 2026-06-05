# Validation Summary: How to Instrument AWS Lambda Functions with OpenTelemetry Layers

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Lambda
- AWS Lambda Layers
- AWS Distro for OpenTelemetry (ADOT)
- OpenTelemetry SDK and auto-instrumentation
- OpenTelemetry Collector configuration
- AWS X-Ray and CloudWatch Application Signals
- AWS CLI
- AWS SAM
- Python

## Sources Consulted
- AWS Distro for OpenTelemetry Lambda documentation: https://aws-otel.github.io/docs/getting-started/lambda/
- AWS Lambda Python tracing documentation: https://docs.aws.amazon.com/lambda/latest/dg/python-tracing.html
- OpenTelemetry Lambda Collector configuration documentation: https://opentelemetry.io/docs/platforms/faas/lambda-collector/
- ADOT custom collector configuration for Lambda: https://aws-otel.github.io/docs/getting-started/lambda/lambda-custom-configuration/
- AWS CLI `lambda invoke` command reference: https://docs.aws.amazon.com/cli/latest/reference/lambda/invoke.html
- AWS Lambda layer packaging documentation: https://docs.aws.amazon.com/lambda/latest/dg/packaging-layers.html
- AWS CDK `AdotLambdaExecWrapper` reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.AdotLambdaExecWrapper.html
- OpenTelemetry Python urllib instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/urllib/urllib3.html

## Issues Found
- The post used legacy ADOT layer names and ARNs such as `aws-otel-python-amd64-ver-1-25-0` and a separate collector layer. Updated the Python examples to use the current AWS-managed `AWSOpenTelemetryDistroPython` layer ARN shown in the ADOT documentation for `us-east-1`.
- The wrapper path was listed as `/opt/otel-handler`. Updated it to `/opt/otel-instrument`, which is the ADOT Lambda wrapper path in the current AWS documentation.
- The collector configuration environment variable was listed as `OPENTELEMETRY_COLLECTOR_CONFIG_FILE`. Updated it to `OPENTELEMETRY_COLLECTOR_CONFIG_URI`, matching current ADOT and OpenTelemetry Lambda collector documentation.
- The post implied that a collector configuration file is required for the basic AWS-managed ADOT setup. Updated the text to explain that current ADOT Lambda layers export to CloudWatch X-Ray by default and only need custom collector configuration for collector-based/custom-export scenarios.
- The collector YAML omitted the OTLP HTTP receiver shown in the current collector examples and included an unnecessary `region` field under `awsxray`. Updated the sample to match the documented collector shape more closely.
- The AWS CLI `lambda invoke` example omitted `--cli-binary-format raw-in-base64-out`, which is required for literal JSON payloads with AWS CLI v2. Added the flag.
- The deployment zip command included `collector.yaml` even after the collector config became optional, which would fail if the file does not exist. Updated the command to zip `lambda_function.py` and mention adding `collector.yaml` only when used.
- The SAM example used legacy layer ARNs, the old wrapper path, and inline X-Ray-only permissions. Updated it to the current ADOT Python layer ARN, `/opt/otel-instrument`, and the managed policy recommended for ADOT Lambda instrumentation with Application Signals.
- The troubleshooting section referenced the old wrapper and collector config variable. Updated both to the current values.

## Review Notes
The post now follows the current recommended ADOT Lambda layer flow for Python. The cold-start overhead values remain framed as the author's own testing rather than a universal benchmark, so they were left unchanged.
