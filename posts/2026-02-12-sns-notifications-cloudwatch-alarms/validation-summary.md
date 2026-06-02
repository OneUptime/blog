# Validation Summary: How to Set Up SNS Notifications from CloudWatch Alarms

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon CloudWatch alarms
- Amazon SNS topics and subscriptions
- AWS CLI
- AWS CloudFormation
- AWS Lambda
- SNS subscription filter policies
- SNS topic access policies

## Sources Consulted
- AWS CLI Command Reference: `aws sns subscribe` - https://docs.aws.amazon.com/cli/latest/reference/sns/subscribe.html
- AWS CLI Command Reference: `aws cloudwatch put-metric-alarm` - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- AWS CLI Command Reference: `aws sns set-topic-attributes` - https://docs.aws.amazon.com/cli/latest/reference/sns/set-topic-attributes.html
- Amazon CloudWatch User Guide: Notifying users on alarm changes - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Notify_Users_Alarm_Changes.html
- Amazon CloudWatch User Guide: Alarm actions - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarm-actions.html
- Amazon SNS Developer Guide: Applying a subscription filter policy - https://docs.aws.amazon.com/sns/latest/dg/message-filtering-apply.html
- AWS Lambda Developer Guide: Using AWS Lambda with Amazon SNS - https://docs.aws.amazon.com/lambda/latest/dg/with-sns-example.html
- AWS CloudFormation Reference: `AWS::CloudWatch::Alarm` - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cloudwatch-alarm.html
- AWS CloudFormation Reference: `AWS::SNS::Topic` - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-sns-topic.html
- Amazon CloudWatch User Guide: Metrics collected by the CloudWatch agent - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/metrics-collected-by-CloudWatch-agent.html

## Issues Found
- The Lambda subscription example subscribed the function to SNS but did not grant SNS permission to invoke the Lambda function. Added an `aws lambda add-permission` command with `lambda:InvokeFunction`, `sns.amazonaws.com`, and the SNS topic source ARN.
- The SNS filtering example filtered on `NewStateValue`, which is a field in the CloudWatch alarm notification body, not a message attribute. Added `FilterPolicyScope: MessageBody` so the filter policy applies to the CloudWatch alarm JSON payload.
- The SNS topic policy snippet was labeled as `json` but included a JavaScript-style comment, making it invalid JSON. Removed the comment from the fenced JSON snippet.

## Review Notes
The remaining AWS CLI flags, CloudFormation property names, SNS subscription protocols, CloudWatch alarm state actions, CloudWatch alarm notification schema fields, and CloudWatch agent `mem_used_percent` metric were consistent with official AWS documentation. The AWS CLI was not installed in the local workspace, so command validation was performed against official AWS CLI documentation rather than local `--help` output.
