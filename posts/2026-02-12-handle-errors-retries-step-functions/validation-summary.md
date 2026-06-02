# Validation Summary: Handle Errors and Retries in Step Functions

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- AWS Step Functions
- Amazon States Language Retry and Catch fields
- AWS Lambda
- JavaScript / Node.js Lambda handlers
- Amazon CloudWatch metrics and alarms

## Sources Consulted
- AWS Step Functions Developer Guide, "Handling errors in Step Functions workflows": https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html
- AWS Step Functions Developer Guide, "Handling error conditions in a Step Functions state machine": https://docs.aws.amazon.com/step-functions/latest/dg/tutorial-handling-error-conditions.html
- AWS Compute Blog, "Automating AWS Lambda Function Error Handling with AWS Step Functions": https://aws.amazon.com/blogs/compute/automating-aws-lambda-function-error-handling-with-aws-step-functions/
- AWS Step Functions Developer Guide, "Monitoring Step Functions metrics using Amazon CloudWatch": https://docs.aws.amazon.com/step-functions/latest/dg/procedure-cw-metrics.html
- Referenced OneUptime monitoring post checked locally: posts/2026-02-12-monitor-step-functions-executions-console/README.md

## Issues Found
- The post said `States.ALL` "matches any error" and described `States.TaskFailed` as only a Lambda exception. I updated the wording to match AWS documentation: `States.ALL` is a wildcard for known errors but does not catch terminal errors such as `States.Runtime` or `States.DataLimitExceeded` through the wildcard, and `States.TaskFailed` is a Task-state failure that also works as a wildcard in Retry/Catch except for `States.Timeout`.
- The retry explanation used "2 attempts" and "2-shot attempt" in places where `MaxAttempts` means retry attempts, not total task invocations. I changed those references to "retry attempts" to avoid implying the original attempt is counted.
- The post said Step Functions does not have built-in jitter. Current Step Functions Retry policies support `JitterStrategy` with `"FULL"` or `"NONE"`. I replaced that claim with an Amazon States Language retry snippet using `JitterStrategy: "FULL"` and kept the Lambda jitter example only for retry loops implemented inside the function.

## Review Notes
- The direct Lambda function ARN examples are still valid for Step Functions Task states, though AWS's optimized Lambda integration (`arn:aws:states:::lambda:invoke`) is commonly used in newer examples.
- Production Lambda Task retries should usually include Lambda service exception names such as `Lambda.ServiceException`, `Lambda.SdkClientException`, and `Lambda.TooManyRequestsException` where appropriate. The post's simplified examples remain technically valid.
