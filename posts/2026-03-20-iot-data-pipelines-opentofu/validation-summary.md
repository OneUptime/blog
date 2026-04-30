# Validation Summary: How to Set Up IoT Data Pipelines with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS IoT Core
- Amazon Kinesis Data Streams
- AWS Lambda
- Amazon Data Firehose
- Amazon S3
- Amazon DynamoDB
- AWS Glue Data Catalog
- HCL

## Sources Consulted
- OpenTofu Strings and Templates: https://opentofu.org/docs/language/expressions/strings/
- OpenTofu `init` command: https://opentofu.org/docs/v1.8/cli/commands/init/
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command: https://opentofu.org/docs/v1.11/cli/commands/apply/
- AWS Lambda CreateEventSourceMapping API: https://docs.aws.amazon.com/lambda/latest/api/API_CreateEventSourceMapping.html
- AWS Lambda with Kinesis Data Streams: https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis.html
- AWS IoT Core Kinesis Data Streams rule action: https://docs.aws.amazon.com/iot/latest/developerguide/kinesis-rule-action.html
- AWS IoT Core substitution templates: https://docs.aws.amazon.com/iot/latest/developerguide/iot-substitution-templates.html
- AWS IoT Core SQL functions: https://docs.aws.amazon.com/iot/latest/developerguide/iot-sql-functions.html
- Amazon Kinesis Data Streams quotas and limits: https://docs.aws.amazon.com/streams/latest/dev/service-sizes-and-limits.html
- Amazon Data Firehose record format conversion: https://docs.aws.amazon.com/firehose/latest/dev/record-format-conversion.html
- AWS provider `aws_kinesis_stream` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/kinesis_stream.html.markdown
- AWS provider `aws_iot_topic_rule` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iot_topic_rule.html.markdown
- AWS provider `aws_lambda_event_source_mapping` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lambda_event_source_mapping.html.markdown
- AWS provider `aws_kinesis_firehose_delivery_stream` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/kinesis_firehose_delivery_stream.html.markdown

## Issues Found
- The `aws_lambda_event_source_mapping` example configured `batch_size = 100` without `maximum_batching_window_in_seconds`. AWS requires a batching window of at least 1 second for Kinesis, DynamoDB Streams, and SQS when `BatchSize` is greater than 10. I added `maximum_batching_window_in_seconds = 1` so the example matches the documented API requirements.

## Review Notes
- AWS now brands Firehose as Amazon Data Firehose, but the provider resource name `aws_kinesis_firehose_delivery_stream` remains correct.
- The infrastructure snippets are technically valid but not standalone; they assume the surrounding IAM roles, S3 buckets, DynamoDB table, and Glue catalog resources are defined elsewhere in the configuration.
