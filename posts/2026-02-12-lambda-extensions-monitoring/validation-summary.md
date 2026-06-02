# Validation Summary: How to Use Lambda Extensions for Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda Extensions
- AWS Lambda Extensions API
- AWS Lambda Telemetry API
- AWS Lambda Layers
- AWS CLI
- AWS CDK
- Node.js
- Datadog Lambda Extension
- New Relic Lambda Extension
- CloudWatch Embedded Metric Format

## Sources Consulted
- AWS Lambda Developer Guide: Augment Lambda functions using Lambda extensions - https://docs.aws.amazon.com/lambda/latest/dg/lambda-extensions.html
- AWS Lambda Developer Guide: Using the Lambda Extensions API to create extensions - https://docs.aws.amazon.com/lambda/latest/dg/runtimes-extensions-api.html
- AWS Lambda Developer Guide: Modifying the runtime environment - https://docs.aws.amazon.com/lambda/latest/dg/runtimes-modify.html
- AWS Lambda Developer Guide: Accessing real-time telemetry data for extensions using the Telemetry API - https://docs.aws.amazon.com/lambda/latest/dg/telemetry-api.html
- AWS Lambda Developer Guide: Lambda Telemetry API Event schema reference - https://docs.aws.amazon.com/lambda/latest/dg/telemetry-schema-reference.html
- AWS CLI Command Reference: update-function-configuration - https://docs.aws.amazon.com/cli/latest/reference/lambda/update-function-configuration.html
- AWS Lambda API Reference: PublishLayerVersion - https://docs.aws.amazon.com/lambda/latest/api/API_PublishLayerVersion.html
- AWS CDK API Reference: aws-lambda Function and LayerVersion - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda-readme.html
- Datadog Documentation: Datadog Lambda Extension - https://docs.datadoghq.com/serverless/libraries_integrations/extension/
- New Relic Documentation: AWS Lambda instrumentation and NewRelicLambdaExtension layer - https://docs.newrelic.com/docs/serverless-function-monitoring/aws-lambda-monitoring/instrument-lambda-function/sdk-based-instrumentation/
- New Relic Documentation: Environment variables for AWS Lambda - https://docs.newrelic.com/docs/serverless-function-monitoring/aws-lambda-monitoring/instrument-lambda-function/env-variables-lambda/
- AWS CloudWatch User Guide: Embedded metric format specification - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format_Specification.html
- Node.js CLI documentation: NODE_OPTIONS and --require preload behavior - https://nodejs.org/api/cli.html

## Issues Found
- The introduction said Lambda Extensions run as separate processes. AWS distinguishes external extensions, which run as independent processes, from internal extensions, which run inside the runtime process. Updated the wording to make that distinction.
- The internal extensions description said a Lambda Layer gets loaded before the handler. Layers only provide files under `/opt`; internal extension behavior must be activated through runtime mechanisms such as wrapper scripts or language-specific preload options. Updated the explanation to mention wrapper scripts and `NODE_OPTIONS`.
- The external extension lifecycle text implied post-invocation work happens during SHUTDOWN. AWS documents that external extensions can continue after the function code returns during the Invoke phase, and receive a SHUTDOWN event only when Lambda removes the execution environment. Updated that wording.
- The Datadog and New Relic layer examples used `:latest` as the layer ARN suffix. Lambda layer ARNs passed to `--layers` must include a concrete version number. Replaced `:latest` with `<version>`.
- The New Relic example used `NewRelicNodeJS20X`, which is a runtime instrumentation layer name rather than the extension layer pattern documented by New Relic. Updated it to `NewRelicLambdaExtension:<version>`.
- The New Relic environment variables omitted required monitoring configuration. Added `NEW_RELIC_LICENSE_KEY` and `NEW_RELIC_APM_LAMBDA_MODE=true` to the example.
- The Telemetry API subscription example used the older `schemaVersion` value. Updated it to `2025-01-29`, matching the current AWS Telemetry API documentation.
- The internal extension JavaScript attempted to modify `process.env._HANDLER` from a JavaScript module. That would not reliably change the handler Lambda has already selected. Replaced the example with a CommonJS preload module loaded via `NODE_OPTIONS="--require /opt/tracing/wrapper.js"` that wraps the exported handler when the handler module is loaded.

## Review Notes
- JavaScript snippets were syntax-checked with `node --check`.
- The AWS CLI is not installed in the local workspace, so CLI command validation was performed against the official AWS CLI command reference.
- The internal extension example is explicitly CommonJS. ES module handlers need a different preload/instrumentation approach.
