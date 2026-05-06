# Validation Summary: How to Configure CloudWatch Events and EventBridge with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS EventBridge
- AWS Lambda
- Amazon SQS
- Amazon EC2 events
- AWS provider resources for EventBridge and Lambda permissions

## Sources Consulted
- OpenTofu `jsonencode` function: https://opentofu.org/docs/language/functions/jsonencode/
- AWS provider `aws_cloudwatch_event_rule` docs (official provider source docs): https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/cloudwatch_event_rule.html.markdown
- AWS provider `aws_cloudwatch_event_target` docs (official provider source docs): https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/cloudwatch_event_target.html.markdown
- AWS provider `aws_cloudwatch_event_bus` docs (official provider source docs): https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/cloudwatch_event_bus.html.markdown
- AWS provider `aws_lambda_permission` docs (official provider source docs): https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/lambda_permission.html.markdown
- AWS provider `aws_sqs_queue_policy` docs (official provider source docs): https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/sqs_queue_policy.html.markdown
- Amazon EventBridge, Rules in Amazon EventBridge: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rules.html
- Amazon EventBridge, Creating a scheduled rule (legacy): https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html
- Amazon EventBridge, Event buses in Amazon EventBridge: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-bus.html
- Amazon EventBridge, Events in Amazon EventBridge: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-events.html
- Amazon EventBridge, Event bus targets in Amazon EventBridge: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-targets.html
- Amazon EventBridge, Using resource-based policies for Amazon EventBridge: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html
- Amazon EC2, State change events for Amazon EC2 instances: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/monitoring-instance-state-changes.html

## Issues Found
- The scheduled-rule section presented EventBridge scheduled rules without noting that AWS now documents them as a legacy feature and limits them to the default event bus. I added a short note in the scheduled-rule section and summary so the post reflects current AWS guidance while keeping the existing example, which is still valid.

## Review Notes
- The `aws_cloudwatch_event_rule`, `aws_cloudwatch_event_target`, `aws_cloudwatch_event_bus`, `aws_lambda_permission`, and `aws_sqs_queue_policy` examples match the current AWS provider documentation.
- The EC2 event pattern example is correct for `EC2 Instance State-change Notification` events, including the `source`, `detail-type`, and valid `detail.state` filtering.
- The `aws_cloudwatch_event_*` resource names remain correct even though the AWS service is now branded as EventBridge.
- I did not run `tofu validate` in this environment because `tofu` is not installed and the post contains illustrative snippets rather than a complete runnable module.
