# Validation Summary: How to Set Up Lambda Event Source Mappings with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Lambda
- Amazon SQS
- DynamoDB Streams
- Amazon Kinesis Data Streams
- AWS IAM
- HCL

## Sources Consulted
- AWS Lambda: Creating and configuring an Amazon SQS event source mapping - https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html
- AWS Lambda: Lambda parameters for Amazon SQS event source mappings - https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-parameters.html
- AWS Lambda: Using event filtering with an Amazon SQS event source - https://docs.aws.amazon.com/lambda/latest/dg/with-sqs-filtering.html
- AWS Lambda: Lambda parameters for Amazon DynamoDB event source mappings - https://docs.aws.amazon.com/lambda/latest/dg/services-ddb-params.html
- AWS Lambda: Using event filtering with a DynamoDB event source - https://docs.aws.amazon.com/lambda/latest/dg/with-ddb-filtering.html
- AWS Lambda: Using AWS Lambda with Amazon DynamoDB - https://docs.aws.amazon.com/lambda/latest/dg/with-ddb.html
- AWS Lambda: Lambda parameters for Amazon Kinesis Data Streams event source mappings - https://docs.aws.amazon.com/lambda/latest/dg/services-kinesis-parameters.html
- AWS Lambda: Using Lambda to process records from Amazon Kinesis Data Streams - https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis.html
- AWS Managed Policy Reference: AWSLambdaKinesisExecutionRole - https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSLambdaKinesisExecutionRole.html
- HashiCorp AWS provider docs: `aws_lambda_event_source_mapping` - https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/lambda_event_source_mapping.html.markdown
- HashiCorp AWS provider docs: `aws_dynamodb_table` - https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/dynamodb_table.html.markdown

## Issues Found
- The SQS section described `scaling_config.maximum_concurrency` as scaling based on queue depth, but AWS documents it as a cap on concurrent invocations for that event source mapping. I updated the comment to reflect the actual behavior.
- The SQS filter comment referred to message attributes, while the example filter pattern targets the JSON message `body`. I corrected the comment so it matches the code and AWS filtering semantics.
- The SQS visibility-timeout guidance was incomplete for mappings that use a batching window. I updated the inline comment and best-practice note to reflect AWS guidance to account for both function timeout and `MaximumBatchingWindowInSeconds`.
- The DynamoDB Streams example used `eventName` in `filter_criteria`, but AWS documents DynamoDB event source filtering as supporting the `dynamodb` key. I replaced the filter with a valid `dynamodb.NewImage.eventType.S` pattern and updated the comment accordingly.
- The DynamoDB and Kinesis `parallelization_factor` comments were inaccurate. AWS defines this setting as concurrent batches per shard, not shards per function instance, so I corrected both comments.
- The Kinesis IAM example used a manually scoped inline policy that omitted permissions present in AWS's documented execution role policy. I replaced it with the AWS-managed `AWSLambdaKinesisExecutionRole` attachment so the example matches current documented permissions.
- The best-practice text for `bisect_batch_on_function_error` and `destination_config` overstated Lambda's behavior. I revised those lines to match how Lambda actually retries, discards, and forwards failed stream batches.

## Review Notes
- The example value `visibility_timeout_seconds = 300` is illustrative because the post does not show the Lambda function timeout. The surrounding guidance is now correct, but the right numeric value still depends on the function's configured timeout and batching window.
- AWS currently recommends setting SQS `maxReceiveCount` to at least 5 for Lambda-backed queues. The post's example uses 3, which is still valid, but it is more aggressive about moving messages to the DLQ.
