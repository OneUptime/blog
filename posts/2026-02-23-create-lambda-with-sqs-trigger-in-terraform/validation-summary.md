# Validation Summary: How to Create Lambda with SQS Trigger in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- AWS Lambda
- Amazon SQS
- AWS IAM
- Amazon CloudWatch
- Python

## Sources Consulted
- AWS Lambda Developer Guide: Using Lambda with Amazon SQS: https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
- AWS Lambda Developer Guide: Creating and configuring an Amazon SQS event source mapping: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html
- AWS Lambda Developer Guide: Handling errors for an SQS event source in Lambda: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html
- AWS Lambda Developer Guide: Configuring scaling behavior for SQS event source mappings: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-scaling.html
- AWS Lambda API Reference: CreateEventSourceMapping: https://docs.aws.amazon.com/lambda/latest/api/API_CreateEventSourceMapping.html
- Terraform AWS Provider: aws_lambda_event_source_mapping: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_event_source_mapping
- Terraform AWS Provider: aws_sqs_queue: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue

## Issues Found
- The introduction described SQS as providing "guaranteed delivery." This was changed to "at-least-once delivery" to match SQS/Lambda duplicate-processing behavior documented by AWS.
- The queue visibility timeout examples only satisfied the hard Lambda validation rule that visibility timeout must be greater than or equal to the function timeout. AWS recommends at least six times the Lambda timeout, plus the batching window. The standard queue example was updated from 900 seconds to 1805 seconds, and the FIFO example was updated from 900 seconds to 1800 seconds.
- The FIFO queue section enabled partial batch failure reporting without noting the FIFO-specific handling requirement. Added a concise comment that FIFO handlers should stop after the first failure and report failed and unprocessed messages to preserve ordering.
- The concurrency section said Lambda can scale to thousands of concurrent executions without maximum concurrency. This was revised to reference account concurrency quota and SQS event source mapping limits, which is more accurate for current AWS Lambda scaling behavior.

## Review Notes
The Terraform resource names and arguments used in the examples are current and valid in the AWS provider documentation. The IAM example uses an inline least-privilege SQS policy instead of the AWS managed AWSLambdaSQSQueueExecutionRole policy, which is technically valid. The snippets assume variables such as `var.dynamodb_table_name` and `var.sns_topic_arn`, and the archive provider configuration, are defined elsewhere.
