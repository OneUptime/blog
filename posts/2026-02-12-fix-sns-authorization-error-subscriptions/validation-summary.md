# Validation Summary: How to Fix SNS 'Authorization Error' for Subscriptions

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- AWS Simple Notification Service (SNS)
- AWS Identity and Access Management (IAM)
- AWS Simple Queue Service (SQS)
- AWS Key Management Service (KMS)
- AWS Organizations Service Control Policies (SCPs)
- AWS CloudTrail
- AWS CLI

## Sources Consulted
- Amazon SNS Subscribe API Reference: https://docs.aws.amazon.com/sns/latest/api/API_Subscribe.html
- Amazon SNS access control use cases: https://docs.aws.amazon.com/sns/latest/dg/sns-access-policy-use-cases.html
- Amazon SNS encryption key management: https://docs.aws.amazon.com/sns/latest/dg/sns-key-management.html
- Amazon SNS topic encryption setup: https://docs.aws.amazon.com/sns/latest/dg/sns-enable-encryption-for-topic.html
- Amazon SNS encrypted topic with encrypted SQS queue subscriptions: https://docs.aws.amazon.com/sns/latest/dg/sns-enable-encryption-for-topic-sqs-queue-subscriptions.html
- Amazon SQS guide for subscribing queues to SNS topics: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-configure-subscribe-queue-sns-topic.html
- AWS CLI get-topic-attributes reference: https://docs.aws.amazon.com/cli/latest/reference/sns/get-topic-attributes.html
- AWS Organizations ListPoliciesForTarget API reference: https://docs.aws.amazon.com/organizations/latest/APIReference/API_ListPoliciesForTarget.html
- IAM permissions boundaries documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html
- AWS CLI filtering output guide: https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-filter.html

## Issues Found
- The KMS section incorrectly said that an SNS subscriber needs `kms:Decrypt` and `kms:GenerateDataKey` on the SNS topic's KMS key. AWS SNS documentation states that encrypted topic consumption is transparent to subscribers, while publishers or publishing AWS service principals need KMS permissions on the topic key. I updated the section to assign the topic-key permissions to the publisher or publishing principal.
- The same section did not distinguish encrypted SNS topics from encrypted SQS subscription endpoints. I added a short note that encrypted SQS queues need their own KMS key policy allowing the Amazon SNS service principal to use `kms:Decrypt` and `kms:GenerateDataKey` for delivery.

## Review Notes
The CloudTrail example uses GNU `date -d`, which works on Linux but requires adjustment on macOS/BSD shells. The AWS CLI and IAM/SNS/SQS policy snippets otherwise match the documented APIs and policy patterns.
