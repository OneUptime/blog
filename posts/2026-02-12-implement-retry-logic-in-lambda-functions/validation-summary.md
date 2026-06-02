# Validation Summary: How to Implement Retry Logic in Lambda Functions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda
- AWS CLI
- AWS SDK for JavaScript v3
- Amazon DynamoDB
- Amazon S3
- Amazon CloudWatch
- JavaScript / Node.js
- Python

## Sources Consulted
- AWS Lambda documentation: Understanding retry behavior in Lambda: https://docs.aws.amazon.com/lambda/latest/dg/invocation-retries.html
- AWS Lambda documentation: How Lambda handles errors and retries with asynchronous invocation: https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-error-handling.html
- AWS Lambda documentation: Configuring error handling settings for asynchronous invocations: https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-configuring.html
- AWS CLI v2 command reference: put-function-event-invoke-config: https://docs.aws.amazon.com/cli/latest/reference/lambda/put-function-event-invoke-config.html
- AWS Lambda Node.js context object documentation: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-context.html
- AWS Lambda documentation: How Lambda processes records from stream and queue-based event sources: https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventsourcemapping.html
- Amazon DynamoDB API reference: PutItem: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html
- Amazon DynamoDB documentation: Computing Time to Live in DynamoDB: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/time-to-live-ttl-before-you-start.html
- AWS SDK for JavaScript v3 Developer Guide: DynamoDB examples: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_dynamodb_code_examples.html
- Amazon S3 User Guide: data consistency model: https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html

## Issues Found
- The AWS CLI async invocation configuration command used `--maximum-event-age-seconds`, which is not the documented flag. Changed it to `--maximum-event-age-in-seconds`.
- The S3 retry helper comment said to handle eventual consistency. Amazon S3 now provides strong read-after-write consistency for GET, PUT, LIST, and related operations, so the comment was changed to refer to throttling and transient service errors.
- The DynamoDB retry helper comment said it respected a `RetryAfterSeconds` hint, but the sample did not implement that behavior and DynamoDB throttling guidance does not require that wording. Changed the comment to accurately describe using short backoff delays for throttling.
- The Python retry example used `requests.get()` without importing `requests`. Added `import requests`.
- The idempotency example implied the whole block runs at most once for each order ID. Because the sample marks failed attempts as retryable, partial side effects can still be repeated after a failure. Updated the wording and inline comment to clarify successful-result reuse and the need for idempotency keys or checkpoints on downstream side effects.

## Review Notes
The JavaScript retry samples are intentionally minimal and do not replace the AWS SDK's built-in retry behavior. In production, retry settings should account for Lambda timeout, downstream service limits, and whether side effects are independently idempotent.
