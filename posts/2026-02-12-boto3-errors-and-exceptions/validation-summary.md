# Validation Summary: How to Handle Boto3 Errors and Exceptions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Python
- Boto3
- Botocore
- AWS service exceptions
- AWS retry configuration
- Amazon S3
- Amazon DynamoDB
- Amazon SQS
- AWS Lambda
- Amazon EC2
- AWS STS

## Sources Consulted
- Boto3 Error handling guide: https://docs.aws.amazon.com/boto3/latest/guide/error-handling.html
- Boto3 Retries guide: https://docs.aws.amazon.com/boto3/latest/guide/retries.html
- Botocore Config reference: https://docs.aws.amazon.com/botocore/latest/reference/config.html
- Boto3 SQS sample tutorial: https://docs.aws.amazon.com/boto3/latest/guide/sqs.html
- Boto3 SQS reference: https://docs.aws.amazon.com/boto3/latest/reference/services/sqs.html
- Amazon S3 error responses: https://docs.aws.amazon.com/AmazonS3/latest/API/ErrorResponses.html
- DynamoDB error handling guide: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Programming.Errors.html
- DynamoDB PutItem API reference: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html
- AWS Lambda Invoke API reference: https://docs.aws.amazon.com/lambda/latest/api/API_Invoke.html
- Amazon EC2 API error codes: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/errors-overview.html
- Botocore STS reference: https://docs.aws.amazon.com/botocore/latest/reference/services/sts.html

## Issues Found
- The retry configuration section incorrectly implied that standard retry mode is the Boto3 default. Updated the prose to state that unconfigured Boto3 clients use legacy retry mode, while adaptive mode adds client-side rate limiting and is marked experimental by AWS.
- The retry configuration examples used `max_attempts` in a `Config` object as if it represented total attempts. In botocore `Config`, `max_attempts` excludes the initial request. Updated the examples to use `total_max_attempts`, which represents total attempts including the initial request.
- The SQS resource example caught an exception through a newly constructed `boto3.client('sqs')`. Updated it to use `sqs.meta.client.exceptions.QueueDoesNotExist`, matching Boto3's documented resource exception access pattern.
- The decorator example used `boto3.client('s3')` without importing `boto3` in that code block. Added the missing import.

## Review Notes
The remaining examples and error-code references are technically consistent with the current Boto3, botocore, and AWS service documentation. The manual retry helper is acceptable as an illustrative pattern, but production code should usually rely on configured SDK retries unless it needs service-specific retry behavior.
