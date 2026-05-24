# Validation Summary: How to Create EventBridge Pipes with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HashiCorp Configuration Language)
- AWS Provider for Terraform (`aws_pipes_pipe`, `aws_iam_role`, `aws_iam_role_policy`, `aws_sqs_queue`, `aws_lambda_function`, `aws_dynamodb_table`, `aws_kinesis_stream`)
- Amazon EventBridge Pipes
- Amazon SQS
- AWS Lambda
- Amazon DynamoDB Streams
- Amazon Kinesis Data Streams
- AWS Step Functions
- Amazon SNS
- AWS IAM

## Sources Consulted
- Terraform AWS Provider docs for `aws_pipes_pipe`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/pipes_pipe
- AWS EventBridge Pipes documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-pipes.html
- EventBridge Pipes IAM service principal: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-pipes-permissions.html
- AWS provider `aws_sqs_queue`, `aws_lambda_function`, `aws_dynamodb_table`, `aws_kinesis_stream` resource docs
- EventBridge Pipes source/target/enrichment parameters reference (AWS API: CreatePipe)

## Issues Found
- **IAM policy resource reference mismatch**: The IAM source policy referenced `aws_sqs_queue.source_queue.arn`, but the SQS queue resource defined in the SQS-to-Lambda example is named `aws_sqs_queue.order_queue`. This would cause a Terraform "Reference to undeclared resource" error. Fixed by changing the reference to `aws_sqs_queue.order_queue.arn` for consistency with the rest of the post.

## Review Notes
- The `pipes.amazonaws.com` service principal is the correct trust principal for EventBridge Pipes.
- All `source_parameters`, `target_parameters`, and `enrichment_parameters` nested blocks and arguments used (e.g., `sqs_queue_parameters`, `dynamodb_stream_parameters`, `kinesis_stream_parameters`, `lambda_function_parameters`, `step_function_state_machine_parameters`, `filter_criteria`, `dead_letter_config`, `input_template`) match the current `aws_pipes_pipe` schema.
- `FIRE_AND_FORGET` is the only valid invocation type for Standard Step Functions state machines (Express workflows additionally allow `REQUEST_RESPONSE`). The post's usage is correct since it does not specify Express explicitly.
- `nodejs18.x` Lambda runtime is still supported as of the review date, though `nodejs20.x` is now also available — users may wish to migrate in the future.
- The DynamoDB and Kinesis examples would each require additional IAM permissions (e.g., `dynamodb:DescribeStream`, `dynamodb:GetRecords`, `dynamodb:GetShardIterator`, `dynamodb:ListStreams` for DynamoDB Streams; `kinesis:DescribeStream`, `kinesis:GetRecords`, `kinesis:GetShardIterator`, `kinesis:ListStreams` for Kinesis) that are not shown in the IAM section. The IAM section focuses only on the SQS-to-Step-Functions scenario; this is a scope choice rather than a technical error.
- `aws_kinesis_stream.retention_period` is in hours; the value `24` is within the valid range (24–8760).
- `parallelization_factor` for Kinesis is capped at 10; the value `5` is valid.
