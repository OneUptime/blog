# Validation Summary: How to Implement the Saga Pattern with SQS and SNS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS SNS
- AWS SQS
- AWS Lambda
- AWS DynamoDB
- Terraform AWS provider
- Python
- Boto3
- Saga pattern

## Sources Consulted
- AWS Prescriptive Guidance: Saga patterns - https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/saga.html
- AWS Step Functions Developer Guide: What is Step Functions? - https://docs.aws.amazon.com/step-functions/latest/dg/welcome.html
- Amazon SNS Developer Guide: Subscribing an Amazon SQS queue to an Amazon SNS topic - https://docs.aws.amazon.com/sns/latest/dg/subscribe-sqs-queue-to-sns-topic.html
- Amazon SNS Developer Guide: Amazon SNS message attributes - https://docs.aws.amazon.com/sns/latest/dg/sns-message-attributes.html
- AWS Lambda Developer Guide: Using Lambda with Amazon SQS - https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
- Boto3 documentation: SNS publish - https://docs.aws.amazon.com/boto3/latest/reference/services/sns/topic/publish.html
- Boto3 documentation: DynamoDB Table.put_item - https://docs.aws.amazon.com/boto3/latest/reference/services/dynamodb/table/put_item.html
- Terraform AWS provider documentation: aws_sns_topic_subscription - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_subscription
- Terraform AWS provider documentation: aws_sqs_queue_policy - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue_policy
- Python documentation: datetime - https://docs.python.org/3/library/datetime.html

## Issues Found
- The Terraform SNS-to-SQS subscriptions were missing SQS queue policies. Added `aws_sqs_queue_policy` resources so SNS topics are allowed to call `sqs:SendMessage` on the subscribed queues.
- The inventory failure compensation path was incorrectly wired to the `order-cancelled` topic, so payment refunds would not be triggered by inventory failure. Changed inventory failure publication and subscriptions to use the `inventory-failed` topic.
- The payment refund handler needed its own queue to avoid competing with the order-created payment handler on the same SQS queue. Added a `payment-refund` queue and routed `inventory-failed` events to it.
- The order service did not subscribe to `inventory-reserved`, so successful orders were never confirmed. Added the subscription and handler branch that marks orders as `CONFIRMED`.
- The `order-confirmed` and `order-cancelled` SNS topics were defined but not published by the code. Added publishes after the order status updates.
- The order service used `datetime.utcnow()`, which is deprecated in current Python documentation. Replaced it with `datetime.now(timezone.utc)`.

## Review Notes
Python code blocks were syntax-checked with `python3` AST parsing. The example still uses placeholder business functions and exception classes such as `process_payment`, `reserve_item`, and `PaymentError`, which is acceptable for a tutorial but would need concrete implementations in production.
