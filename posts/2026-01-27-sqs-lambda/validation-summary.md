# Validation Summary: How to Use SQS with Lambda

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon SQS (Standard queues, dead-letter queues, redrive policy, visibility timeout, long polling)
- AWS Lambda (Node.js 20.x runtime, Python runtime, handler patterns)
- AWS Lambda Event Source Mapping (batching, partial batch failure reporting, maximum concurrency)
- AWS CLI (`aws sqs create-queue`, `aws lambda create-event-source-mapping`)
- Terraform (`aws_sqs_queue`, `aws_lambda_event_source_mapping`, `aws_lambda_function`, `aws_iam_role`, `aws_iam_role_policy`)
- AWS SDK for JavaScript v3 (`@aws-sdk/client-sqs`)
- OpenTelemetry (`@opentelemetry/sdk-node`, OTLP HTTP exporters, AWS Lambda/AWS SDK instrumentations)
- Python concurrency (`concurrent.futures.ThreadPoolExecutor`)
- CloudWatch metrics for SQS and Lambda

## Sources Consulted
- AWS Lambda Developer Guide — Using AWS Lambda with Amazon SQS: https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
- AWS SQS API Reference — CreateQueue / queue attributes: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_CreateQueue.html
- AWS CLI Reference — `aws sqs create-queue` and `aws lambda create-event-source-mapping`
- Terraform AWS provider docs — `aws_sqs_queue`, `aws_lambda_event_source_mapping` (including `scaling_config.maximum_concurrency` and `function_response_types`), `aws_lambda_function`
- AWS Lambda partial batch response / `ReportBatchItemFailures` documentation
- AWS CloudWatch metrics for SQS and Lambda
- OpenTelemetry JS docs (`@opentelemetry/sdk-node`, `@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/exporter-metrics-otlp-http`, `@opentelemetry/instrumentation-aws-lambda`, `@opentelemetry/instrumentation-aws-sdk`)
- AWS SDK for JavaScript v3 — `@aws-sdk/client-sqs` (`SQSClient`, `SendMessageCommand`)

## Issues Found
No technical issues found.

All command flags, Terraform resource arguments, AWS SDK imports, event/payload field names, metric names, IAM action names, retention/visibility numeric values, and runtime identifiers (e.g., `nodejs20.x`) check out against current official documentation. The "visibility timeout = 6x Lambda timeout" guidance matches AWS's published recommendation, the partial-batch-failure return shape (`{ batchItemFailures: [{ itemIdentifier }] }`) is correct, and the `scaling_config { maximum_concurrency }` nesting in `aws_lambda_event_source_mapping` is valid Terraform syntax.

## Review Notes
- `SemanticResourceAttributes` from `@opentelemetry/semantic-conventions` still works but has been deprecated in favor of named constants (e.g., `ATTR_SERVICE_NAME`) in newer versions of the package. Not incorrect, but readers using the latest SemConv package may see deprecation warnings.
- The token-bucket `RateLimiter` example uses fractional token counts with a `> 0` check and recursive `acquire()`; functional as an illustration but not production-hardened (potential deep call stacks under sustained backpressure, and tokens can dip slightly negative). Left as-is since it's clearly an example.
- The post's `Description:` front-matter sentence is grammatically truncated ("…for building reliable.") — this is a copy/style issue rather than a technical error, so not modified per the task scope.
- The IAM policy in the example grants the minimum SQS actions Lambda needs (`ReceiveMessage`, `DeleteMessage`, `GetQueueAttributes`); production users with redrive-to-source or change-visibility-on-retry patterns may also want `sqs:ChangeMessageVisibility`. Not incorrect for the scenario shown.
