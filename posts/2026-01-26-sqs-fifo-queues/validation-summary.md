# Validation Summary: How to Configure SQS FIFO Queues

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon SQS FIFO queues
- AWS CLI
- AWS CloudFormation
- Terraform AWS provider
- Python boto3
- AWS Lambda SQS event source mappings
- AWS SDK for JavaScript v3
- Amazon DynamoDB conditional updates
- Amazon CloudWatch alarms and custom metrics

## Sources Consulted
- Amazon SQS queue types: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-queue-types.html
- Amazon SQS FIFO queue and message identifiers: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-fifo-queue-message-identifiers.html
- Amazon SQS FIFO delivery logic: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-understanding-logic.html
- Amazon SQS high throughput FIFO queues: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/high-throughput-fifo.html
- Amazon SQS service quotas: https://docs.aws.amazon.com/general/latest/gr/sqs-service.html
- AWS CloudFormation AWS::SQS::Queue reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-sqs-queue.html
- AWS CLI sqs create-queue reference: https://docs.aws.amazon.com/cli/latest/reference/sqs/create-queue.html
- AWS CLI sqs set-queue-attributes reference: https://docs.aws.amazon.com/cli/latest/reference/sqs/set-queue-attributes.html
- AWS Lambda SQS error handling and partial batch responses: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html
- AWS SDK for JavaScript v3 DynamoDB UpdateItemCommand reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-dynamodb/Class/UpdateItemCommand/
- AWS SDK for JavaScript v3 DynamoDB UpdateCommand reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/Class/UpdateCommand/
- DynamoDB condition expressions: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html
- Terraform AWS provider aws_sqs_queue resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue

## Issues Found
- The high-throughput FIFO section used outdated and inaccurate throughput numbers, describing high throughput as 3,000 messages per second per message group with a 30,000 messages per second total. Updated the text and limits table to describe current regional high-throughput quotas, including up to 70,000 non-batched TPS per API action and 700,000 messages per second with batching in the highest-throughput Regions.
- The high-throughput diagram and requirement list implied each unique Message Group ID receives its own throughput allocation. Updated this to match SQS partition behavior: message group IDs are hashed to partitions, and many distinct group IDs help SQS distribute load.
- The Lambda partial batch response example continued processing records after the first failure. For FIFO queues, AWS recommends stopping after the first failure and returning failed plus unprocessed records in `batchItemFailures`; the code was updated accordingly.
- The JavaScript DynamoDB example imported `UpdateCommand` from `@aws-sdk/client-dynamodb`, but that command belongs to `@aws-sdk/lib-dynamodb`. Since the snippet uses low-level DynamoDB AttributeValue maps, it was corrected to use `UpdateItemCommand`.
- The DynamoDB condition expression used `#status IN (:valid_states)` with a list value placeholder, which is not valid DynamoDB expression syntax. Updated the code to expand individual state placeholders and to allow `order_created` only when the status attribute does not yet exist.
- The Python examples used `datetime.utcnow()`, which is deprecated in modern Python. Updated them to use timezone-aware UTC timestamps with `datetime.now(timezone.utc)`.
- The order event examples used event names that did not match the later consumer/state-machine examples. Updated them to `order_created` and `order_shipped`.
- The custom message-group metrics snippet receives messages from the queue; this increments `ApproximateReceiveCount` and can affect DLQ redrive. Added an explicit diagnostic-use warning to avoid presenting it as a safe production polling metric.
- Removed unused Python imports from examples.

## Review Notes
- Python and JavaScript snippets were syntax-checked after edits.
- CLI JSON attribute payloads were parsed successfully.
- Generic YAML validation could not be completed with Ruby because Ruby is not installed in this environment; the CloudFormation snippets include valid CloudFormation intrinsic tags such as `!Ref` and `!GetAtt`, which generic YAML parsers need custom constructors to load.
