# Validation Summary: How to Use Lambda Powertools Logger for Structured Logging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda
- Powertools for AWS Lambda (Python) Logger
- Python
- Amazon CloudWatch Logs Insights
- Amazon SQS
- Boto3

## Sources Consulted
- AWS Powertools for AWS Lambda (Python) Logger documentation: https://docs.aws.amazon.com/powertools/python/latest/core/logger/
- Amazon CloudWatch Logs Insights query syntax documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html
- Amazon CloudWatch Logs Insights sample queries: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-examples.html
- Amazon CloudWatch Logs Insights stats function documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-Stats.html
- Boto3 SQS send_message documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/sqs/client/send_message.html

## Issues Found
- The post implied Lambda context fields and X-Ray trace ID are always included by basic logger setup. Powertools includes standard structured keys by default, adds Lambda context fields when `inject_lambda_context` is used, and includes `xray_trace_id` when tracing is enabled. Updated the explanation to reflect those conditions.
- The `inject_lambda_context` section said it adds all Lambda context information. Updated this to "key Lambda context information" to match the documented fields.
- The log sampling example used `sample_rate=0.1`, but the current Powertools for AWS Lambda (Python) constructor parameter is `sampling_rate`. Updated the code example.
- The CloudWatch Logs Insights query used `p99(@duration)`, but Logs Insights uses `pct(field, percent)` for percentiles. Updated the query to `pct(@duration, 99)`.

## Review Notes
- The SQS `send_message` example uses a valid `MessageAttributes` shape for string attributes.
- `append_keys`, `extra`, `clear_state=True`, `logger.exception()`, and custom `LambdaPowertoolsFormatter.serialize()` usage are consistent with current Powertools documentation.
