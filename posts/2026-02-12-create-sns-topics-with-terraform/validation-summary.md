# Validation Summary: How to Create SNS Topics with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon SNS
- Amazon SQS
- AWS Lambda
- AWS KMS
- Terraform
- HashiCorp AWS Provider

## Sources Consulted
- HashiCorp Terraform AWS Provider documentation for `aws_sns_topic`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic
- HashiCorp Terraform AWS Provider documentation for `aws_sns_topic_subscription`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_subscription
- AWS SNS message filtering documentation: https://docs.aws.amazon.com/sns/latest/dg/sns-message-filtering.html
- AWS SNS raw message delivery documentation: https://docs.aws.amazon.com/sns/latest/dg/large-payload-raw-message.html
- AWS SNS FIFO message delivery documentation: https://docs.aws.amazon.com/sns/latest/dg/fifo-message-delivery.html
- AWS SNS FIFO high-throughput documentation: https://docs.aws.amazon.com/sns/latest/dg/fifo-high-throughput.html
- AWS SNS server-side encryption documentation: https://docs.aws.amazon.com/sns/latest/dg/sns-server-side-encryption.html
- AWS SNS dead-letter queue documentation: https://docs.aws.amazon.com/sns/latest/dg/sns-dead-letter-queues.html
- AWS Lambda SNS trigger documentation: https://docs.aws.amazon.com/lambda/latest/dg/with-sns.html

## Issues Found
- The HTTPS subscription example set `endpoint_auto_confirms = true` without noting that this only works for endpoints that automatically confirm SNS subscriptions. I added a clarifying comment.
- The first filter policy example said it filtered on message attributes but set `filter_policy_scope = "MessageBody"`, which changes the policy to inspect the JSON message body. I removed the body-scope setting so the example matches the surrounding explanation.
- The FIFO subscription section claimed FIFO SNS topics can only subscribe to FIFO SQS queues. AWS now supports SNS FIFO delivery to both standard and FIFO SQS queues; FIFO queues are still required for strict end-to-end ordering. I corrected the wording and code comment.
- The FIFO throughput statement used outdated/simple limits. I replaced it with current guidance that default FIFO throughput is topic-scoped and high throughput uses `fifo_throughput_scope = "MessageGroup"` with many message group IDs.
- The encryption section described KMS encryption as protecting messages "in transit through SNS" and said subscribers need decrypt permission. SNS KMS SSE protects message bodies while stored by SNS and SNS decrypts messages before delivery; customer managed keys require the SNS service principal and publishers to have appropriate KMS permissions. I corrected that explanation.

## Review Notes
- The examples assume referenced resources such as SQS queues, Lambda functions, and KMS keys are defined elsewhere.
- Raw message delivery for SQS subscriptions has a 10-message-attribute limit; messages with more attributes are not delivered to SQS raw subscriptions. This caveat was not added to keep the article focused.
