# Validation Summary: How to Implement Security Alerting with EventBridge and SNS

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon EventBridge
- Amazon SNS
- AWS CloudTrail
- Amazon GuardDuty
- AWS CloudFormation
- AWS CLI
- AWS Lambda with Python
- Slack incoming webhooks

## Sources Consulted
- AWS CLI Command Reference: `aws events put-rule` - https://docs.aws.amazon.com/cli/latest/reference/events/put-rule.html
- AWS CLI Command Reference: `aws events put-targets` - https://docs.aws.amazon.com/cli/latest/reference/events/put-targets.html
- AWS CLI Command Reference: `aws sns create-topic` - https://docs.aws.amazon.com/cli/latest/reference/sns/create-topic.html
- AWS CLI Command Reference: `aws sns subscribe` - https://docs.aws.amazon.com/cli/latest/reference/sns/subscribe.html
- Amazon EventBridge User Guide: Event patterns - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html
- Amazon EventBridge User Guide: EventBridge event pattern content filtering - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-pattern.html
- Amazon EventBridge User Guide: Amazon SNS target permissions - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html#eb-sns-permissions
- AWS CloudFormation Reference: `AWS::Events::Rule` - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-events-rule.html
- AWS CloudFormation Reference: `AWS::SNS::TopicPolicy` - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-sns-topicpolicy.html
- AWS Lambda Developer Guide: SNS event structure - https://docs.aws.amazon.com/lambda/latest/dg/with-sns.html
- Amazon GuardDuty User Guide: Finding severity levels - https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_findings-severity.html
- Python Standard Library: `json` - https://docs.python.org/3/library/json.html
- Python Standard Library: `urllib.request` - https://docs.python.org/3/library/urllib.request.html

## Issues Found
- The architecture text implied CloudTrail events would always flow to EventBridge automatically. Added a caveat that CloudTrail-based API call and console sign-in rules require an active trail logging the relevant events.
- The CloudTrail-backed EventBridge CLI examples used `--state ENABLED`. Updated them to `ENABLED_WITH_ALL_CLOUDTRAIL_MANAGEMENT_EVENTS` so management events delivered through CloudTrail are explicitly included.
- The CLI setup created the SNS topic but did not grant EventBridge permission to publish to it. Added an SNS topic policy command allowing the `events.amazonaws.com` service principal to call `sns:Publish`.
- The unauthorized API event pattern used `source: ["aws.cloudtrail"]`, which would only match API calls made to CloudTrail itself. Removed that filter so the rule can match authorization failures from any service delivered via CloudTrail.
- The unauthorized API call, security group change, and GuardDuty examples created rules but did not attach the SNS target. Added matching `aws events put-targets` commands.
- The Slack Lambda example assumed it would receive the original EventBridge event directly, but an SNS subscription invokes Lambda with an SNS `Records[].Sns.Message` envelope. Updated the handler to unwrap the SNS message and parse JSON when possible.
- The CloudFormation section claimed to be a complete implementation but only defined part of the discussed stack. Adjusted the wording to describe it as the core EventBridge-to-SNS alerting pieces.
- The CloudFormation security group rule omitted the revoke ingress and revoke egress events used in the CLI example. Added `RevokeSecurityGroupIngress` and `RevokeSecurityGroupEgress`.
- The CloudFormation template did not include the unauthorized API and high-severity GuardDuty rules discussed earlier. Added those rules with SNS targets.
- The SNS topic policy lacked an explicit IAM policy version. Added `Version: '2012-10-17'`.

## Review Notes
The examples still use placeholder account IDs, email addresses, and a Slack webhook environment variable, which is appropriate for a tutorial. The SNS topic policy in the CloudFormation template correctly allows EventBridge to publish to the topic; teams may want to add source-account or source-ARN conditions in production.
