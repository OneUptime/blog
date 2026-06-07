# Validation Summary: How to Configure SQS Access Policies

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Amazon SQS (Simple Queue Service)
- AWS IAM (identity-based and resource-based policies)
- AWS KMS (server-side encryption for SQS)
- Amazon SNS (fan-out to SQS pattern)
- Amazon S3 (event notifications to SQS)
- AWS VPC Endpoints (for SQS)
- AWS CLI (sqs, sts, iam, cloudtrail commands)
- Terraform (hashicorp/aws provider for SQS, KMS, IAM)
- AWS CloudTrail (for auditing SQS API calls)
- Dead-letter queue (DLQ) patterns

## Sources Consulted
- AWS SQS Developer Guide — Identity-based policy examples: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-using-identity-based-policies.html
- AWS SQS Developer Guide — Basic examples of SQS policies: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-basic-examples-of-sqs-policies.html
- AWS SQS API Reference — Actions list (SendMessage, ReceiveMessage, ChangeMessageVisibility, etc.): https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_Operations.html
- AWS SQS Developer Guide — Key management (KMS): https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-key-management.html
- AWS IAM Reference — Global condition context keys (aws:SourceArn, aws:SourceAccount, aws:SourceVpce, aws:SecureTransport, aws:SourceIp, aws:MultiFactorAuthPresent): https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- AWS CLI Reference — sqs create-queue, set-queue-attributes, get-queue-attributes: https://docs.aws.amazon.com/cli/latest/reference/sqs/
- AWS CLI Reference — iam simulate-principal-policy: https://docs.aws.amazon.com/cli/latest/reference/iam/simulate-principal-policy.html
- AWS CLI Reference — cloudtrail lookup-events: https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/lookup-events.html
- Terraform AWS Provider — aws_sqs_queue resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue
- Terraform AWS Provider — aws_sqs_queue_policy resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue_policy
- Terraform AWS Provider — aws_kms_key resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kms_key
- AWS SNS Developer Guide — Subscribing SQS queues to SNS topics: https://docs.aws.amazon.com/sns/latest/dg/subscribe-sqs-queue-to-sns-topic.html
- AWS S3 User Guide — Granting permissions to publish event notifications: https://docs.aws.amazon.com/AmazonS3/latest/userguide/grant-destinations-permissions-to-s3.html

## Issues Found
No technical issues found. All IAM action names, condition keys, ARN formats, JSON policy structure, AWS CLI flags, and Terraform attributes were verified against the official documentation listed above and are correct.

## Review Notes
- Line 124 ("Resource-Based Policies") is missing the `##` heading prefix in markdown — this is a rendering/formatting issue rather than a technical inaccuracy, so it was not modified per the review scope. It will render as plain text rather than a section header.
- The "KMS Key Policy for SQS" section grants `kms:GenerateDataKey` / `kms:Decrypt` to the `sqs.amazonaws.com` service principal. For the basic producer/consumer scenario shown (IAM-authenticated callers invoking SendMessage/ReceiveMessage), SQS calls KMS using the *caller's* IAM identity, not the SQS service principal — so this statement is not strictly required in that case. It IS required when AWS services such as SNS, S3 event notifications, EventBridge, Lambda triggers, or CloudWatch alarms publish to an encrypted SQS queue (per the SQS key-management docs). The policy as written is valid and harmless; future revisions could clarify when this principal is needed.
- The "Policy Types Comparison" table marks resource-based policies as "Cross-Account: Yes, standalone." Strictly, AWS still requires an identity policy in the caller's account allowing the action — the post's later "IAM Policy for Cross-Account Producer" example correctly demonstrates this, so the table is a reasonable simplification rather than an error.
- The DLQ policy example uses `Principal: { "Service": "sqs.amazonaws.com" }` to allow the source queue to send to the DLQ. In practice, SQS handles redrive internally based on the source queue's `RedrivePolicy` attribute and does not require an explicit DLQ resource policy granting send permission — but this defensive policy is harmless and reflects a pattern shown in some AWS examples.
- The Mermaid flowchart for SQS access control evaluation (lines 21–31) is a simplified depiction. The actual AWS IAM policy evaluation logic involves explicit-deny precedence and the same-account "either-or" rule. The diagram conveys the high-level idea adequately for a tutorial.
- All ARN formats, Terraform `jsonencode` patterns, and resource attribute references (e.g., `aws_sqs_queue.order_queue.id` for queue URL, `aws_sqs_queue.order_queue.arn` for ARN, `aws_kms_key.sqs_key.id` for key ID) are correct for the current Terraform AWS provider.
