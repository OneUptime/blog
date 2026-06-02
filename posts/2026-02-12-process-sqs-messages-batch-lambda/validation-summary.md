# Validation Summary: How to Process SQS Messages in Batch with Lambda

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Lambda
- Amazon SQS
- Terraform AWS Provider
- Python
- CloudWatch metrics

## Sources Consulted
- AWS Lambda Developer Guide, Using Lambda with Amazon SQS: https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
- AWS Lambda Developer Guide, Lambda parameters for Amazon SQS event source mappings: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-parameters.html
- AWS Lambda Developer Guide, Handling errors for an SQS event source in Lambda: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html
- AWS Lambda API Reference, CreateEventSourceMapping: https://docs.aws.amazon.com/lambda/latest/api/API_CreateEventSourceMapping.html
- Amazon SQS Developer Guide, Amazon SQS visibility timeout: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html
- Terraform Registry, aws_lambda_event_source_mapping resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_event_source_mapping

## Issues Found
- The post reversed the Lambda SQS batch-size limits, saying standard queues were limited to 10 and FIFO queues could use 10,000 with batching windows. AWS documents that standard queues can use up to 10,000 messages per batch, FIFO queues are limited to 10, and batching windows are not supported for FIFO queues. I corrected the introduction, Terraform comment, and batching-window explanation.
- The performance tuning table implied that 10 was the maximum high-throughput and cost-optimization batch size. I changed those entries to "10 or higher for standard queues" so they align with the documented standard queue limit.

## Review Notes
- The Python examples are syntactically valid, but they intentionally omit production details such as defining `process_order`, validating JSON payloads, and using structured logging.
- The partial batch failure response shape and `function_response_types = ["ReportBatchItemFailures"]` setting are correct for standard SQS queues. For FIFO queues, AWS recommends stopping after the first failure and returning failed and unprocessed messages to preserve ordering.
