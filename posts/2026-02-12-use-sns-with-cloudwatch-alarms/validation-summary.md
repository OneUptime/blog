# Validation Summary: How to Use SNS with CloudWatch Alarms

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon CloudWatch alarms
- Amazon SNS
- AWS CLI
- Boto3 for Python
- AWS Lambda
- Slack incoming webhooks
- AWS CDK v2
- Amazon EC2, Amazon RDS, Application Load Balancer, and AWS Lambda CloudWatch metrics

## Sources Consulted
- AWS CLI `cloudwatch put-metric-alarm` command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- AWS CLI `sns subscribe` command reference: https://docs.aws.amazon.com/cli/v1/reference/sns/subscribe.html
- Boto3 CloudWatch `put_metric_alarm` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/cloudwatch/client/put_metric_alarm.html
- AWS Lambda documentation for SNS event sources: https://docs.aws.amazon.com/lambda/latest/dg/with-sns.html
- AWS CDK v2 `aws_cloudwatch.Alarm` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudwatch.Alarm.html
- AWS CDK v2 CloudWatch actions reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudwatch_actions-readme.html
- Elastic Load Balancing CloudWatch metrics for Application Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html
- Amazon RDS CloudWatch metrics reference: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-metrics.html
- Amazon EC2 CloudWatch metrics reference: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/viewing_metrics_with_cloudwatch.html
- AWS Lambda CloudWatch metrics reference: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html
- Slack incoming webhooks documentation: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/
- Slack message attachment reference: https://docs.slack.dev/tools/node-slack-sdk/reference/web-api/interfaces/MessageAttachment/

## Issues Found
- The introduction implied SNS could directly fan out CloudWatch notifications to Slack webhooks. SNS can deliver to HTTPS endpoints, but Slack incoming webhooks expect Slack-formatted JSON rather than the SNS notification envelope. Changed this to "Lambda functions that call Slack webhooks," matching the working pattern shown later in the post.
- The EC2 CPU alarm comment said it would alarm after 5 minutes, but `--period 300` with `--evaluation-periods 2` evaluates two 5-minute periods. Updated the comment to describe two 5-minute evaluation periods.
- The RDS `DatabaseConnections` example described the threshold as "80% of max," but the CloudWatch metric is a connection count and the threshold value was `80`. Updated the comment to "80 connections."
- The Slack Lambda example passed CloudWatch's `StateChangeTime` directly to the Slack attachment `ts` field. Slack expects a Unix timestamp for attachment `ts`, so the example now converts the CloudWatch ISO timestamp before adding it to the message.

## Review Notes
- The AWS CLI examples use valid current options for SNS subscriptions and CloudWatch alarm actions.
- The Boto3 example uses current `put_metric_alarm` parameter names, including `AlarmActions`, `OKActions`, and `TreatMissingData`.
- The CDK example uses valid CDK v2 constructs and APIs for SNS subscriptions and CloudWatch alarm actions.
- The Slack example uses legacy attachments, which Slack states are not deprecated but may have reduced visibility or utility in the future. A future improvement could use Block Kit instead.
