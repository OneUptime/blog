# Validation Summary: How to Propagate Context Through Serverless Function Chains

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry context propagation
- OpenTelemetry JavaScript SDK and API
- OpenTelemetry Python API
- AWS Lambda
- AWS Distro for OpenTelemetry Lambda layer
- Amazon SQS message attributes
- Amazon SNS message attributes and Lambda events
- AWS Step Functions
- AWS CLI

## Sources Consulted
- AWS Distro for OpenTelemetry Lambda Support for JavaScript: https://aws-otel.github.io/docs/getting-started/lambda/lambda-js
- AWS Distro for OpenTelemetry Lambda configuration: https://aws-otel.github.io/docs/getting-started/lambda/
- AWS CLI `lambda update-function-configuration`: https://docs.aws.amazon.com/cli/latest/reference/lambda/update-function-configuration.html
- AWS Lambda with Amazon SQS event format: https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
- Amazon SQS message attributes / SendMessage shape: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_SendMessage.html
- Amazon SNS message attributes: https://docs.aws.amazon.com/sns/latest/dg/sns-message-attributes.html
- AWS Lambda with Amazon SNS event format: https://docs.aws.amazon.com/lambda/latest/dg/with-sns.html
- AWS Step Functions input and output processing: https://docs.aws.amazon.com/step-functions/latest/dg/concepts-input-output-filtering.html
- OpenTelemetry JavaScript propagation documentation: https://opentelemetry.io/docs/languages/js/propagation/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/

## Issues Found
- The ADOT Node.js Lambda layer ARN used an older `aws-otel-nodejs-amd64-ver-1-18-1` version. Updated it to the current documented `aws-otel-nodejs-amd64-ver-1-30-2` ARN pattern for `us-east-1`.
- The manual JavaScript SDK setup used `provider.addSpanProcessor(...)`, which is not available in current OpenTelemetry JS 2.x packages. Updated the snippet to pass `spanProcessors` to the `NodeTracerProvider` constructor.
- Several JavaScript snippets ended spans only on successful completion. Wrapped the SQS send, SQS receive, Step Functions start, and Step Functions task spans in `try`/`finally` so spans are ended when application work throws.
- The SNS Lambda Python handler used `json.loads(...)` without importing `json`. Added the missing import.
- The flush example attempted to call `forceFlush` through `trace.getTracerProvider()` without showing access to the concrete SDK provider. Updated the setup snippet to export `provider` and the flush snippet to call `provider.forceFlush()` directly.

## Review Notes
- The post intentionally uses application-specific placeholders such as `processPayment`, `send_email`, `validateOrder`, and environment variables. Those are acceptable for a tutorial and are not expected to run without surrounding application code.
- The Step Functions pattern depends on state input/output configuration preserving `_traceContext`; `InputPath`, `OutputPath`, `ResultPath`, or JSONata transformations can remove it if configured differently.
