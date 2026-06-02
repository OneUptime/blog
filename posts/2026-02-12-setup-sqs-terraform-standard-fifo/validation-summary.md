# Validation Summary: How to Set Up SQS with Terraform (Standard and FIFO)

## Status
validated

## Post Type
Tutorial / Infrastructure as Code guide

## Technologies Covered
- Amazon SQS Standard queues
- Amazon SQS FIFO queues
- Amazon SQS dead-letter queues and redrive policies
- Amazon SQS server-side encryption and AWS KMS
- AWS IAM queue access policies
- AWS Lambda SQS event source mappings
- Terraform AWS provider
- HashiCorp Configuration Language (HCL)

## Sources Consulted
- Terraform AWS provider `aws_sqs_queue` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue
- Terraform AWS provider `aws_sqs_queue_redrive_allow_policy` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue_redrive_allow_policy
- Terraform AWS provider `aws_sqs_queue_policy` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue_policy
- Terraform AWS provider `aws_lambda_event_source_mapping` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_event_source_mapping
- AWS SQS FAQ, maximum message size: https://aws.amazon.com/sqs/faqs/
- AWS SQS FIFO exactly-once processing documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-exactly-once-processing.html
- AWS SQS FIFO queue quotas: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-fifo.html
- AWS SQS message quotas and FIFO high throughput quotas: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-messages.html
- AWS Lambda SQS event source mapping parameters: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-parameters.html
- AWS Lambda SQS event source mapping configuration: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html
- AWS managed policy `AWSLambdaSQSQueueExecutionRole`: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSLambdaSQSQueueExecutionRole.html
- Terraform language syntax documentation: https://developer.hashicorp.com/terraform/language/syntax/configuration

## Issues Found
- The Standard queue example described 256 KB as both the default and maximum SQS message size. AWS now supports SQS message payloads up to 1 MiB, while Terraform still documents the default `max_message_size` value as 262144 bytes. Updated the comment to say the default is 256 KiB and SQS supports up to 1 MiB.
- The FIFO high-throughput explanation gave a universal 70,000 messages per second limit and described the default `perQueue` limit as 3,000 messages per second. AWS FIFO throughput quotas vary by Region and batching, and the default non-high-throughput FIFO quota is 300 transactions per second per API action, or up to 3,000 messages per second with batching. Updated the comment and explanatory paragraph accordingly.
- The reusable module used single-line `variable` blocks containing multiple arguments separated by semicolons. Terraform HCL requires argument definitions in block bodies to be separated by newlines, so those examples would not validate as written. Expanded the variable declarations into valid multi-line HCL.

## Review Notes
- The Lambda event source mapping example targets a Standard queue, so `maximum_batching_window_in_seconds = 5` is valid. AWS documentation notes that batching windows are not supported for FIFO SQS event source mappings.
- The Lambda IAM example follows the actions included in the AWS-managed `AWSLambdaSQSQueueExecutionRole` policy for reading from SQS. The example also grants access to the DLQ, which is broader than needed for the shown event source mapping but is not technically invalid.
- The linked related OneUptime blog URLs were checked and returned HTTP 200.
