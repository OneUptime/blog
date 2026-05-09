# Validation Summary: How to Create CloudWatch Event Rules with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS EventBridge / CloudWatch Events
- AWS Lambda
- Amazon SNS
- AWS CloudTrail
- Amazon ECS
- AWS CLI

## Sources Consulted
- Terraform Registry: `aws_cloudwatch_event_rule` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_rule
- Terraform Registry: `aws_cloudwatch_event_target` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target
- Amazon EventBridge User Guide: Creating a scheduled rule (legacy) - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html
- Amazon EventBridge User Guide: Setting a schedule pattern for scheduled rules (legacy) - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-scheduled-rule-pattern.html
- Amazon EventBridge User Guide: AWS service events delivered via AWS CloudTrail - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-service-event-cloudtrail.html
- Amazon EventBridge Events Reference: AWS Sign-In events - https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-signin.html
- Amazon EventBridge User Guide: Using resource-based policies for Amazon EventBridge - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html
- Amazon EventBridge User Guide: Amazon EventBridge input transformation - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-transform-target-input.html
- Amazon ECS Developer Guide: Amazon ECS task state change events - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs_task_events.html
- AWS CLI Command Reference: `describe-rule` - https://docs.aws.amazon.com/cli/latest/reference/events/describe-rule.html

## Issues Found
- CloudTrail-backed rules were missing the required `state = "ENABLED_WITH_ALL_CLOUDTRAIL_MANAGEMENT_EVENTS"`. I added that to the root-login and unauthorized-API examples so they match CloudTrail management events as documented.
- The SNS target examples were missing the required SNS topic policies that allow `events.amazonaws.com` to publish. I added `aws_sns_topic_policy` examples for both SNS topics.
- The unauthorized API call rule incorrectly filtered on `source = ["aws.cloudtrail"]`, which would only match CloudTrail service events rather than general AWS API calls delivered via CloudTrail. I removed that source filter.
- The unauthorized API call example defined a rule but no target, so it would not actually alert. I added an SNS target.
- The ECS example said it would alert on stopped tasks but only defined a rule. I added an SNS target so the example now matches the description.
- The deploy section incorrectly used `aws events put-events` to "test" a scheduled rule. Scheduled rules are time-based and are not triggered by `put-events`, so I replaced that with a `describe-rule` verification command.
- The prerequisites did not mention that CloudTrail-based EventBridge rules require a CloudTrail trail with management event logging enabled. I added that requirement.
- AWS documentation is inconsistent about the console sign-in detail type spelling (`AWS Console Sign In via CloudTrail` vs `AWS Console Signin via CloudTrail`). I updated the example to match either spelling and added `eventSource` and `eventName` filters for precision.

## Review Notes
- AWS currently recommends EventBridge Scheduler for new scheduling use cases, while scheduled EventBridge rules remain supported as legacy functionality. The post is still technically correct after the fixes because it is specifically about CloudWatch/EventBridge rules.
- If the SNS topics are encrypted with a customer-managed KMS key, additional KMS permissions for `events.amazonaws.com` may be required beyond the topic policy.
