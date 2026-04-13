# Validation Summary: How to Use Dapr with AWS SNS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block)
- AWS SNS (Simple Notification Service)
- AWS SQS (Simple Queue Service)
- Dapr SNS-SQS pub/sub component (`pubsub.snssqs`)
- Python (Flask, requests)
- Node.js (Express)
- AWS CLI

## Sources Consulted
- Dapr pub/sub component specification for AWS SNS/SQS: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-aws-snssqs/
- Dapr pub/sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr programmatic subscription docs: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/#programmatic-subscriptions
- AWS CLI SNS reference: https://docs.aws.amazon.com/cli/latest/reference/sns/
- AWS CLI SQS reference: https://docs.aws.amazon.com/cli/latest/reference/sqs/

## Issues Found
No technical issues found.

## Review Notes
- The `Content-Type: application/json` header in the Python publish example is redundant when using `requests.post(json=...)`, which sets the header automatically. This is not incorrect, just unnecessary.
- The manual creation of SNS topics and SQS queues in the first section is valid but worth noting that Dapr's SNS-SQS component can automatically manage topic/queue creation and subscription lifecycle. Users who prefer pre-created infrastructure may find this section useful, while others can let Dapr handle it.
- The f-string prefix on the publish URL (`f"http://localhost:3500/..."`) contains no interpolated variables, making the `f` prefix unnecessary but harmless.
