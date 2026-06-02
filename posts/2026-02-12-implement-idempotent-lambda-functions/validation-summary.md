# Validation Summary: How to Implement Idempotent Lambda Functions

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- AWS Lambda
- Amazon SQS
- Amazon SNS
- Amazon Kinesis
- Amazon DynamoDB and DynamoDB Streams
- Amazon EventBridge
- Amazon S3 Event Notifications
- AWS Step Functions
- AWS Lambda Powertools for Python
- AWS CLI
- Python

## Sources Consulted
- AWS Lambda retry behavior: https://docs.aws.amazon.com/lambda/latest/dg/invocation-retries.html
- AWS Lambda asynchronous invocation error handling: https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-error-handling.html
- AWS Lambda with Amazon SQS: https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
- AWS Lambda SQS error handling and partial batch responses: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html
- AWS Lambda event source mappings: https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventsourcemapping.html
- Amazon DynamoDB Streams with Lambda best practices: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.Lambda.BestPracticesWithDynamoDB.html
- Amazon S3 Event Notifications: https://docs.aws.amazon.com/AmazonS3/latest/userguide/EventNotifications.html
- Amazon S3 event message structure: https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-content-structure.html
- Amazon EventBridge delivery levels: https://docs.aws.amazon.com/eventbridge/latest/ref/event-delivery-level.html
- AWS Step Functions error handling and retries: https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html
- AWS Lambda Powertools for Python idempotency utility: https://docs.aws.amazon.com/powertools/python/develop/utilities/idempotency/
- AWS CLI DynamoDB create-table command reference: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/create-table.html
- AWS CLI DynamoDB update-time-to-live command reference: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/update-time-to-live.html
- Amazon SQS queue and message identifiers: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-queue-message-identifiers.html
- AWS Lambda with Amazon SNS: https://docs.aws.amazon.com/lambda/latest/dg/with-sns.html

## Issues Found
- API Gateway was described as resending requests due to timeouts. API Gateway invokes Lambda synchronously for request/response APIs; duplicate requests are primarily a client retry concern. Updated the wording and delivery table to reflect client retries.
- EventBridge was described broadly as at-least-once. Official documentation distinguishes source delivery levels and target retry behavior. Updated the table and introduction to avoid overgeneralizing EventBridge delivery.
- The AWS Lambda Powertools example used the same DynamoDB table created earlier, but Powertools defaults to a partition key named `id`, not `idempotencyKey`. Updated `DynamoDBPersistenceLayer` with `key_attr='idempotencyKey'` and `expiry_attr='ttl'`.
- The Powertools code example used `json.loads` without importing `json`. Added the missing import.
- The S3 idempotency-key guidance said to use object key and version ID, but the code used object key and sequencer. Updated the guidance and code to include event name, object key, optional version ID, and sequencer.
- The SQS partial batch response section implied returning `batchItemFailures` is sufficient by itself. Updated the text to state that `ReportBatchItemFailures` must be enabled on the event source mapping.
- The custom decorator example implied a payment operation would execute only once per message ID in all retry scenarios. Added a caveat that side effects completed before a failed invocation must also be safe to retry.
- The wrap-up stated that every event source can deliver duplicates. Updated this to "many event sources and clients" to avoid overclaiming.

## Review Notes
- The Python snippets were checked with `ast.parse` under `python3` and are syntactically valid.
- The hand-rolled idempotency decorator is acceptable as an illustrative example, but AWS Lambda Powertools remains the better production recommendation because it handles in-progress expiry, result persistence, and concurrency edge cases more comprehensively.
