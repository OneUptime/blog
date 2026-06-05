# Validation Summary: How to Monitor AWS Lambda Concurrency and Throttling with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda
- AWS Lambda concurrency, reserved concurrency, and provisioned concurrency
- Amazon CloudWatch Lambda metrics
- OpenTelemetry JavaScript metrics API
- AWS Distro for OpenTelemetry Lambda layer for JavaScript
- OpenTelemetry Collector Contrib AWS CloudWatch receiver
- Serverless Framework
- Node.js

## Sources Consulted
- AWS Lambda runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda Node.js runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html
- AWS Lambda concurrency configuration documentation: https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html
- AWS Lambda concurrency monitoring documentation: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-concurrency.html
- AWS Lambda metrics documentation: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html
- AWS Lambda GetFunctionConcurrency API reference: https://docs.aws.amazon.com/lambda/latest/api/API_GetFunctionConcurrency.html
- AWS Distro for OpenTelemetry Lambda JavaScript documentation: https://aws-otel.github.io/docs/getting-started/lambda/lambda-js/
- OpenTelemetry JavaScript instrumentation and metrics documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry Collector Contrib AWS CloudWatch receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/awscloudwatchreceiver
- Serverless Framework AWS Lambda function configuration documentation: https://www.serverless.com/framework/docs/providers/aws/guide/functions

## Issues Found
- The Serverless Framework example used the deprecated `nodejs18.x` Lambda runtime. Updated it to `nodejs22.x`, which is a current AWS Lambda Node.js runtime.
- The ADOT JavaScript Lambda layer ARN used an outdated layer version. Updated the example from `aws-otel-nodejs-amd64-ver-1-18-1` to the documented `aws-otel-nodejs-amd64-ver-1-30-2` format for `us-east-1`.
- The ADOT environment example pointed `OTEL_EXPORTER_OTLP_ENDPOINT` at an external HTTPS collector. Adjusted it to `http://localhost:4318`, matching the ADOT JavaScript Lambda layer guidance that the layer uses the local Collector extension endpoint for OTLP over HTTP.
- The concurrency middleware imported `Resource` from `@opentelemetry/resources` but never used it. Removed the unused import.
- The text described the custom metric as a gauge and implied exact cross-instance real-time concurrency from code. Updated the wording to describe an up-down metric that approximates in-function concurrency context and should be compared with Lambda's official CloudWatch metrics.
- The OpenTelemetry Collector `awscloudwatch` receiver configuration used the old/incorrect `metrics.named`, `poll_interval`, and `statistics` shape for metric scraping. Updated it to the current `metrics.collection_interval`, `period`, `queries`, `stats`, and map-style `dimensions` format.
- The provisioned concurrency example used `GetFunctionConcurrencyCommand`, which returns reserved concurrency, not provisioned concurrency utilization, and referenced an undefined `currentActive` variable. Replaced it with a CloudWatch receiver query for Lambda's official `ProvisionedConcurrencyUtilization` metric and explained AWS's calculation.

## Review Notes
- JavaScript snippets were syntax-checked with Node.js 22. YAML snippets were reviewed manually against the current AWS CloudWatch receiver documentation because Ruby/YAML tooling was not installed in the workspace.
- The custom `lambda.concurrency.active` metric can be useful as application-side context, but AWS CloudWatch `ConcurrentExecutions` remains the authoritative source for Lambda concurrency across execution environments.
