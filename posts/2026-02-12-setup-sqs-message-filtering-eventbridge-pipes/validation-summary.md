# Validation Summary: How to Set Up SQS Message Filtering with EventBridge Pipes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon EventBridge Pipes
- Amazon SQS
- AWS Lambda
- AWS IAM
- Amazon CloudWatch metrics
- AWS CLI
- Terraform AWS provider
- Python with boto3

## Sources Consulted
- AWS EventBridge Pipes event filtering documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-pipes-event-filtering.html
- AWS EventBridge Pipes input transformation documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-pipes-input-transformation.html
- AWS EventBridge Pipes monitoring documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-pipes-monitoring.html
- AWS EventBridge pricing page: https://aws.amazon.com/eventbridge/pricing/
- Terraform AWS provider `aws_pipes_pipe` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/pipes_pipe
- AWS CLI `cloudwatch get-metric-statistics` command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html
- boto3 DynamoDB `Table.get_item` documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb/table/get_item.html

## Issues Found
- The monitoring section listed `Ingestion` as a key EventBridge Pipes CloudWatch metric. AWS documentation lists `EventCount`, `ExecutionThrottled`, `ExecutionTimeout`, and `ExecutionFailed`, so `Ingestion` was changed to `EventCount`.
- The input transformation example used FIFO-only SQS target parameters while naming the target queue generically as `processed_orders`. The target reference was changed to `processed_orders_fifo` to make the FIFO requirement clear.
- The cost wording described Pipes as costing `$0.40 per million invocations`. AWS pricing describes Pipes billing as requests after filtering, with payloads billed in 64 KB chunks, so the wording was changed to `$0.40 per million requests after filtering in supported Regions`.
- The latency statement claimed Pipes typically add under 100ms of latency. I did not find an official AWS source for that specific number, so the statement was softened to say Pipes add a small amount of latency.

## Review Notes
The Terraform snippets match the current Terraform AWS provider shape for `aws_pipes_pipe`, including `source_parameters`, `filter_criteria`, `target_parameters`, and Lambda invocation type values. The SQS filtering examples are valid when the SQS message body is valid JSON, which is consistent with AWS EventBridge Pipes filtering behavior.
