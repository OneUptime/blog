# Validation Summary: How to Build a Real-Time Analytics Pipeline with Terraform

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- Terraform AWS provider
- Amazon Kinesis Data Streams
- AWS Lambda
- Amazon DynamoDB
- Amazon Data Firehose
- Amazon S3
- AWS Glue Data Catalog
- Amazon OpenSearch Service
- Amazon API Gateway HTTP APIs
- Amazon SQS
- AWS IAM

## Sources Consulted
- AWS Lambda documentation: Kinesis event source mapping on-failure destinations - https://docs.aws.amazon.com/lambda/latest/dg/kinesis-on-failure-destination.html
- AWS Lambda documentation: supported and deprecated runtimes - https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- Terraform AWS provider documentation: aws_kinesis_firehose_delivery_stream - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kinesis_firehose_delivery_stream
- AWS Data Firehose documentation: record format conversion restrictions - https://docs.aws.amazon.com/firehose/latest/dev/enable-record-format-conversion.html
- Terraform AWS provider documentation: aws_apigatewayv2_integration - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_integration
- Terraform AWS provider documentation: aws_dynamodb_table - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table.html
- Terraform AWS provider documentation: aws_s3_bucket_lifecycle_configuration - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- AWS Kinesis Data Streams documentation: quotas and limits - https://docs.aws.amazon.com/streams/latest/dev/service-sizes-and-limits.html

## Issues Found
- The Lambda event source mapping used a Kinesis stream as `destination_config.on_failure.destination_arn`. AWS Lambda event source mapping failure destinations support SNS, SQS, S3, or Kafka, not Kinesis Data Streams. I changed the managed failure destination to an SQS queue and kept the Kinesis dead-letter stream as an application-level stream for records the processor explicitly writes.
- The Lambda function used `nodejs20.x`, which is deprecated as of the review date. I updated the runtime to `nodejs24.x`, which is currently supported.
- The Lambda role did not include permission to send event source mapping failure records to the new SQS destination. I added `sqs:SendMessage`.
- The Lambda function included VPC configuration but the role did not include the standard VPC access managed policy. I added `AWSLambdaVPCAccessExecutionRole`, and also added `AWSLambdaBasicExecutionRole` for CloudWatch Logs.
- The Firehose S3 archive example enabled JSON-to-Parquet conversion while setting the S3 destination `compression_format` to `GZIP`. AWS requires the extended S3 destination compression format to be `UNCOMPRESSED` when record format conversion is enabled, with compression handled by the Parquet serializer. I changed it to `UNCOMPRESSED`.
- The API Gateway HTTP API example created an integration and route but omitted deployment and Lambda invoke permission. I added a `$default` stage with `auto_deploy = true`, `integration_method = "POST"`, and an `aws_lambda_permission` resource.
- The S3 lifecycle rule did not explicitly include a filter. I added `filter {}` so the rule clearly applies to all objects and aligns with current Terraform AWS provider examples.

## Review Notes
The post remains an illustrative Terraform guide rather than a complete drop-in module. It still references surrounding resources such as KMS keys, Glue catalog objects, Firehose IAM role permissions, OpenSearch domain configuration, security groups, variables, and Lambda packages that would need to be defined in a full implementation.
