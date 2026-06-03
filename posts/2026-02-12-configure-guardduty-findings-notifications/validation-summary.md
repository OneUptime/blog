# Validation Summary: How to Configure GuardDuty Findings Notifications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon GuardDuty
- Amazon EventBridge / CloudWatch Events
- Amazon SNS
- AWS Lambda
- AWS CLI
- Terraform AWS provider
- Slack incoming webhooks / message attachments

## Sources Consulted
- Amazon GuardDuty: Processing GuardDuty findings with Amazon EventBridge - https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_findings_eventbridge.html
- Amazon GuardDuty: Severity levels of GuardDuty findings - https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_findings-severity.html
- Amazon GuardDuty: EC2 finding types - https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_finding-types-ec2.html
- Amazon EventBridge: Comparison operators for event patterns - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-pattern-operators.html
- Amazon EventBridge: Resource-based policies - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html
- Amazon EventBridge: Permissions for event buses - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-bus-perms.html
- AWS CLI Command Reference: sns subscribe - https://docs.aws.amazon.com/cli/latest/reference/sns/subscribe.html
- AWS CLI Command Reference: sns set-topic-attributes - https://docs.aws.amazon.com/cli/latest/reference/sns/set-topic-attributes.html
- AWS CLI Command Reference: events put-rule - https://docs.aws.amazon.com/cli/latest/reference/events/put-rule.html
- AWS CLI Command Reference: events put-targets - https://docs.aws.amazon.com/cli/latest/reference/events/put-targets.html
- AWS CLI Command Reference: guardduty create-sample-findings - https://docs.aws.amazon.com/cli/latest/reference/guardduty/create-sample-findings.html
- AWS Lambda: Python 3.12 runtime support - https://aws.amazon.com/about-aws/whats-new/2023/12/aws-lambda-support-python-3-12/
- Slack Developer Docs: MessageAttachment timestamp field - https://docs.slack.dev/tools/node-slack-sdk/reference/web-api/interfaces/MessageAttachment/
- Terraform AWS provider: aws_cloudwatch_event_rule - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_rule

## Issues Found
- The medium-severity EventBridge rule used two separate numeric matcher objects, which EventBridge treats as alternatives. This would match nearly all numeric severities instead of only `4.0-6.9`. Updated the AWS CLI and Terraform examples to use a single numeric range matcher: `{ "numeric": [">=", 4, "<", 7] }`.
- The SNS CLI example added the SNS topic as an EventBridge target but did not grant EventBridge permission to publish to the topic. Added an `aws sns set-topic-attributes` policy example allowing the `events.amazonaws.com` service principal to call `sns:Publish`.
- The Slack Lambda converted the EventBridge `time` value into a `YYYYMMDDHHMMSS` integer, but Slack attachment `ts` expects a Unix timestamp. Updated the Lambda to parse the ISO timestamp with `datetime.fromisoformat(...).timestamp()` and send it as a string.
- The post described all severities `>= 7` as high severity. GuardDuty now defines Critical as `9.0-10.0` and High as `7.0-8.9`. Updated comments and Slack severity labels to distinguish Critical from High while keeping the `>= 7` routing behavior for immediate alerting.
- The low severity comment said `0-3.9`, but GuardDuty severity values are in the `1.0-10.0` range. Updated the comment to `1-3.9`.
- The cross-Region EventBridge forwarding example pointed at a target event bus but did not show the sender role that AWS recommends for event-bus targets. Added `RoleArn` to the `put-targets` example and clarified that both target bus permissions and a sender role are needed.

## Review Notes
- The AWS CLI is not installed in this workspace, so CLI validation was performed against the official AWS CLI Command Reference rather than local `--help` output.
- Slack message attachments are still supported, but Slack documentation treats Block Kit as the more modern message layout approach. The attachment-based example remains technically valid.
