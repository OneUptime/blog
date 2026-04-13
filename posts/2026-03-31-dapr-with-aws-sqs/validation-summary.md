# Validation Summary: How to Use Dapr with AWS SQS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block)
- AWS SQS (Simple Queue Service)
- AWS CLI
- Python (requests, Flask)
- YAML (Dapr component configuration)

## Sources Consulted
- Dapr pub/sub AWS SQS component specification (https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-aws-sqs/)
- Dapr pub/sub API reference (https://docs.dapr.io/reference/api/pubsub_api/)
- Dapr pub/sub message TTL documentation (https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-message-ttl/)
- AWS CLI SQS reference (https://docs.aws.amazon.com/cli/latest/reference/sqs/)
- Cross-referenced with other validated Dapr blog posts in this repository (dapr-pubsub-aws-sns-sqs, dapr-message-expiration-ttl, dapr-pubsub-publish-message)

## Issues Found
- **Incorrect TTL header** (line 154): The post used the HTTP header `"dapr-ttlinseconds": "300"` for per-message TTL. This is not a valid Dapr header. The correct approach is to pass TTL as a query parameter using `metadata.ttlInSeconds`. Fixed by changing the publish URL to include `?metadata.ttlInSeconds=300` and removing the invalid header.

## Review Notes
- The component type `pubsub.aws.sqs` is correct for SQS-only pub/sub (as opposed to `pubsub.aws.snssqs` for SNS+SQS fan-out).
- All metadata field names (region, accessKey, secretKey, messageVisibilityTimeout, messageMaxNumber, messageWaitTimeSeconds, disableEntityManagement, sqsDeadLettersQueueName) are correct.
- The programmatic subscribe endpoint (`GET /dapr/subscribe`) and response status codes (SUCCESS, RETRY, DROP) are accurate.
- The AWS CLI commands for creating queues and configuring redrive policies are correct, though the hardcoded account ID `123456789012` is a placeholder (acceptable for a tutorial).
- The `json` import in the publish example is unused but harmless.
