# Validation Summary: How to Set Up SNS Cross-Account Subscriptions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS SNS
- AWS SQS
- AWS IAM resource policies and identity-based permissions
- AWS CLI
- Python with boto3
- AWS CDK
- AWS CloudFormation outputs
- Mermaid diagrams

## Sources Consulted
- AWS SNS Developer Guide: Sending Amazon SNS messages to an Amazon SQS queue in a different account - https://docs.aws.amazon.com/sns/latest/dg/sns-send-message-to-sqs-cross-account.html
- AWS SNS Developer Guide: Subscribing an Amazon SQS queue to an Amazon SNS topic - https://docs.aws.amazon.com/sns/latest/dg/subscribe-sqs-queue-to-sns-topic.html
- AWS SQS Developer Guide: Subscribing a queue to an Amazon SNS topic using the Amazon SQS console - https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-configure-subscribe-queue-sns-topic.html
- AWS SNS API Reference: Subscribe - https://docs.aws.amazon.com/sns/latest/api/API_Subscribe.html
- AWS CLI Command Reference: sns subscribe - https://docs.aws.amazon.com/cli/latest/reference/sns/subscribe.html
- AWS CLI Command Reference: sqs set-queue-attributes - https://docs.aws.amazon.com/cli/latest/reference/sqs/set-queue-attributes.html
- AWS Service Authorization Reference: Actions, resources, and condition keys for Amazon SNS - https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsns.html
- AWS CDK API Reference: Amazon SNS construct library - https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_sns/README.html
- AWS CDK API Reference: Amazon SNS subscriptions construct library - https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_sns_subscriptions/README.html
- AWS CloudFormation Template Reference: Fn::ImportValue - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-importvalue.html

## Issues Found
- The topic policies used `sns:Receive`, but the current Amazon SNS service authorization reference does not list `sns:Receive` as an SNS action. Removed `sns:Receive` from all topic policy and CDK examples, leaving `sns:Subscribe` for subscription permission.
- The post said the topic policy allowed the other account to "subscribe and receive messages." For SNS-to-SQS delivery, the topic policy allows subscription; delivery is controlled by the endpoint resource policy, such as the SQS queue policy. Updated the wording.
- The post did not mention that the IAM principal creating the subscription also needs identity-based `sns:Subscribe` permission. Added that clarification based on AWS cross-account subscription guidance.
- The Mermaid diagram used subgraph labels with spaces and punctuation directly in the subgraph identifier. Updated the syntax to use stable subgraph IDs with quoted display labels.
- The Python section described the script as handling both sides generally, but the example specifically handles an SQS subscription. Narrowed the wording to avoid implying Lambda setup is covered.
- The CDK section was titled as cross-stack references and used a CloudFormation export name in a cross-account setup. CloudFormation `Export` and `Fn::ImportValue` references are limited to the same account and Region, so the example now outputs the ARN as a value to pass as a parameter or configuration value and no longer sets `exportName`.
- Added a CDK-specific caveat that a cross-account SQS subscription may be left pending and need confirmation from the queue's initial confirmation message.

## Review Notes
- The AWS CLI command shapes for `sns subscribe`, `sns set-topic-attributes`, and `sqs set-queue-attributes` are consistent with current AWS CLI documentation, although the local environment did not have the AWS CLI installed for local `--help` verification.
- The SQS queue policy pattern using the SNS service principal and `aws:SourceArn` condition matches AWS guidance and helps mitigate confused deputy risk.
- The existing OneUptime KMS link is plausible and relevant, but it was not an official AWS source.
