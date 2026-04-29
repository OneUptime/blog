# Validation Summary: How to Create Kinesis Streams with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / HCL
- AWS provider for OpenTofu / Terraform
- Amazon Kinesis Data Streams
- AWS IAM
- AWS Lambda event source mappings
- AWS KMS
- Amazon CloudWatch

## Sources Consulted
- Terraform Registry, `aws_kinesis_stream`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kinesis_stream
- Terraform Registry, `aws_lambda_event_source_mapping`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_event_source_mapping
- Amazon Kinesis Data Streams, Create and manage streams: https://docs.aws.amazon.com/streams/latest/dev/working-with-streams.html
- Amazon Kinesis Data Streams, Quotas and limits: https://docs.aws.amazon.com/streams/latest/dev/service-sizes-and-limits.html
- Amazon Kinesis Data Streams, Enhanced fan-out consumers: https://docs.aws.amazon.com/streams/latest/dev/enhanced-consumers.html
- Amazon Kinesis Data Streams, Monitor with CloudWatch: https://docs.aws.amazon.com/streams/latest/dev/monitoring-with-cloudwatch.html
- AWS Lambda, Process Amazon Kinesis Data Streams records with Lambda: https://docs.aws.amazon.com/lambda/latest/dg/services-kinesis-create.html
- AWS Lambda, Using Lambda to process records from Amazon Kinesis Data Streams: https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis.html
- AWS Lambda, Lambda parameters for Amazon Kinesis Data Streams event source mappings: https://docs.aws.amazon.com/lambda/latest/dg/services-kinesis-parameters.html
- AWS Lambda, Using event filtering with a Kinesis event source: https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis-filtering.html
- Amazon Kinesis Data Streams Service Authorization Reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonkinesisdatastreams.html
- AWS IAM, IAM identifiers: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_identifiers.html

## Issues Found
- The consumer IAM policy incorrectly scoped `kinesis:ListStreams` and `kinesis:SubscribeToShard` to the stream ARN. AWS documents `ListStreams` as a list action without a resource ARN and `SubscribeToShard` as a consumer-scoped action. I split the policy into separate statements and scoped `SubscribeToShard` to `aws_kinesis_stream_consumer.analytics.arn`.
- The IAM policy names were fixed strings even though the example is otherwise environment-scoped. IAM friendly names must be unique within an account, so I prefixed both managed policy names with `var.environment` to avoid collisions across environments.
- The Lambda event source mapping comment for `bisect_batch_on_function_error` was inaccurate. AWS documents that it splits a failed batch in half and retries the smaller batches; it does not directly retry individual records. I corrected the comment.
- The CloudWatch alarm used `GetRecords.IteratorAgeMilliseconds`, which tracks shared-throughput `GetRecords` consumers. The post's consumer example uses an enhanced fan-out consumer, so I changed the alarm to `SubscribeToShardEvent.MillisBehindLatest` and added the required `ConsumerName` dimension. I also updated the best-practices note to distinguish the correct lag metric for shared-throughput versus enhanced fan-out consumers.

## Review Notes
- The AWS provider constraint `~> 5.30` is still valid syntax for OpenTofu, but it is not the latest provider major version as of April 29, 2026.
- The post's explanations for shard throughput, retention limits, KMS encryption, provisioned vs. on-demand stream mode, and Lambda event filtering on the `data` key are otherwise technically accurate.
- The snippets are partial examples rather than a complete deployable stack; they still assume surrounding variable definitions and supporting resources such as the Lambda function.
- Local checks: `validation.json` was validated with `jq`. Runtime validation with `tofu` or `terraform` was not possible in this workspace because neither CLI is installed, and no live AWS account was available for deployment tests.
