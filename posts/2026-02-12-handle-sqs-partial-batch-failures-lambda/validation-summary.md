# Validation Summary: How to Handle SQS Partial Batch Failures in Lambda

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Lambda
- Amazon SQS
- SQS FIFO queues
- AWS CLI
- Terraform AWS provider
- Python
- TypeScript / Node.js Lambda handlers
- CloudWatch monitoring

## Sources Consulted
- AWS Lambda Developer Guide: Handling errors for an SQS event source in Lambda: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html
- AWS Lambda Developer Guide: Using Lambda with Amazon SQS: https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
- AWS Lambda API Reference: CreateEventSourceMapping / FunctionResponseTypes: https://docs.aws.amazon.com/lambda/latest/api/API_CreateEventSourceMapping.html
- Terraform Registry: aws_lambda_event_source_mapping resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_event_source_mapping
- AWS announcement: Lambda support for partial batch response for SQS event sources: https://aws.amazon.com/about-aws/whats-new/2021/11/aws-lambda-partial-batch-response-sqs-event-source/

## Issues Found
- The FIFO queue example continued processing later records from other message groups after a failure. AWS documents that when using partial batch responses with FIFO queues, the function should stop processing messages after the first failure and return all failed and unprocessed messages in `batchItemFailures` to preserve ordering. Updated the FIFO explanation and Python sample to stop after the first failure and mark subsequent batch records as failed.
- The FIFO Python sample imported `defaultdict` but did not use it. Removed the unused import while correcting the FIFO handler.

## Review Notes
- The `ReportBatchItemFailures` event source mapping setting, AWS CLI flag, Terraform attribute, and `batchItemFailures` / `itemIdentifier` response format match current AWS documentation.
- The standard queue Python and TypeScript examples are syntactically valid for the intended illustrative use. The TypeScript sample relies on the `aws-lambda` type package for `SQSEvent`, `SQSBatchResponse`, and `SQSBatchItemFailure`.
- The monitoring section is directionally correct. AWS specifically recommends watching SQS `NumberOfMessagesDeleted` and `ApproximateAgeOfOldestMessage` when validating batch item failure reporting, which could be added in a future content update.
