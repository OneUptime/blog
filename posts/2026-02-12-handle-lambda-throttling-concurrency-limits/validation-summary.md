# Validation Summary: How to Handle Lambda Throttling and Concurrency Limits

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda
- Lambda concurrency, reserved concurrency, and throttling
- Amazon CloudWatch metrics and dashboards
- AWS CLI
- AWS SDK for Python / boto3 / botocore retry configuration
- Amazon SQS
- Amazon API Gateway
- AWS Step Functions
- Lambda asynchronous invocation destinations and dead-letter queues
- Lambda event source mappings for SQS, Kinesis, and DynamoDB Streams

## Sources Consulted
- AWS Lambda: Understanding Lambda function scaling: https://docs.aws.amazon.com/lambda/latest/dg/lambda-concurrency.html
- AWS Lambda: Lambda scaling behavior: https://docs.aws.amazon.com/lambda/latest/dg/scaling-behavior.html
- AWS Lambda: Lambda quotas: https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
- AWS Lambda API Reference: Invoke: https://docs.aws.amazon.com/lambda/latest/api/API_Invoke.html
- AWS Lambda: How Lambda handles errors and retries with asynchronous invocation: https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-error-handling.html
- AWS Lambda: Understanding retry behavior in Lambda: https://docs.aws.amazon.com/lambda/latest/dg/invocation-retries.html
- AWS Lambda: Handling errors for an SQS event source in Lambda: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html
- AWS Lambda: Retain discarded records for a DynamoDB event source in Lambda: https://docs.aws.amazon.com/lambda/latest/dg/services-dynamodb-errors.html
- AWS Lambda: Types of metrics for Lambda functions: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html
- AWS Lambda: Viewing metrics for Lambda functions: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-view.html
- AWS CLI Command Reference: cloudwatch get-metric-statistics: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html
- AWS CLI Command Reference: lambda put-function-event-invoke-config: https://docs.aws.amazon.com/cli/latest/reference/lambda/put-function-event-invoke-config.html
- AWS CLI Command Reference: lambda update-function-configuration: https://docs.aws.amazon.com/cli/latest/reference/lambda/update-function-configuration.html
- AWS CLI Command Reference: lambda put-function-concurrency: https://docs.aws.amazon.com/cli/latest/reference/lambda/put-function-concurrency.html
- Boto3 documentation: Retries: https://docs.aws.amazon.com/boto3/latest/guide/retries.html
- Botocore documentation: Config reference: https://docs.aws.amazon.com/botocore/latest/reference/config.html
- AWS Step Functions: Handling errors in Step Functions workflows: https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html
- Amazon API Gateway: Gateway response types: https://docs.aws.amazon.com/apigateway/latest/developerguide/supported-gateway-response-types.html
- Amazon API Gateway: Set up usage plans for REST APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-create-usage-plans.html

## Issues Found
- The Lambda burst scaling description used the older "3,000 immediately, then 500 per minute" model. AWS now documents a per-function concurrency scaling rate of 1,000 execution environments every 10 seconds, so the post was updated.
- The synchronous invocation section implied API Gateway always returns Lambda throttling as a 429. Direct Lambda API calls and function URLs return `TooManyRequestsException`/429, while API Gateway throttling and Lambda integration throttling can surface differently. The wording was corrected.
- The asynchronous retry section said Lambda retries twice for throttling. AWS documents two retries for function errors, but throttling and system errors are retried from the async queue for up to 6 hours by default. The section was corrected.
- The "stream-based" section grouped SQS with streams and overstated uniform retry behavior. It was changed to event source mappings, with separate SQS and Kinesis/DynamoDB Streams retry behavior.
- Several `date` commands used BSD/macOS `date -v-1d`, which does not work in typical Linux/AWS CloudShell bash environments. They were changed to GNU-compatible `date -u -d '1 day ago'`.
- The boto3 Lambda invoke example used `json.dumps` without importing `json`. The missing import was added.
- The SQS buffer API example used `os.environ` and `datetime` without imports, and used deprecated `datetime.utcnow()`. The missing imports were added and the timestamp now uses `datetime.now(timezone.utc)`.
- The SQS processor snippet used `json.loads` in a separate code fence without importing `json`. The import was added.
- The duration metric command used `--statistics Average p99`, but CloudWatch percentile statistics must be requested with `--extended-statistics` and cannot be combined with `--statistics`. The command now requests valid standard statistics.
- The dashboard used `Sum` for `ConcurrentExecutions`, which is misleading for concurrency. The metric was changed to use `Maximum` while leaving count metrics as `Sum`.
- The SQS buffer comment said the API function is "never throttled." Because the API function itself and SQS API calls can still be throttled or fail, the comment was changed to describe the actual benefit: preventing processor throttling from dropping work.

## Review Notes
The remaining AWS CLI examples use current command names and option structures. The Step Functions retry example uses the documented `Lambda.TooManyRequestsException` error name. The API Gateway usage plan command is valid for REST APIs; HTTP APIs use API Gateway v2 stage or route throttling instead.
