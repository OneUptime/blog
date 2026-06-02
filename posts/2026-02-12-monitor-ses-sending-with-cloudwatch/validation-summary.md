# Validation Summary: How to Monitor SES Sending with CloudWatch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon SES
- Amazon CloudWatch metrics, alarms, and dashboards
- Amazon SNS
- AWS CLI
- Python
- boto3

## Sources Consulted
- Amazon SES Developer Guide: Monitoring your Amazon SES sending activity - https://docs.aws.amazon.com/ses/latest/dg/monitor-sending-activity.html
- Amazon SES Developer Guide: Retrieving Amazon SES event data from CloudWatch - https://docs.aws.amazon.com/ses/latest/dg/event-publishing-retrieving-cloudwatch.html
- Amazon SES Developer Guide: Configuring custom domains to handle open and click tracking - https://docs.aws.amazon.com/ses/latest/dg/configure-custom-open-click-domains.html
- AWS CLI Command Reference: sesv2 create-configuration-set-event-destination - https://docs.aws.amazon.com/cli/latest/reference/sesv2/create-configuration-set-event-destination.html
- Boto3 documentation: SES send_email - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/ses/client/send_email.html
- Boto3 documentation: CloudWatch put_metric_data - https://docs.aws.amazon.com/boto3/latest/reference/services/cloudwatch/client/put_metric_data.html
- Boto3 documentation: CloudWatch get_metric_statistics - https://docs.aws.amazon.com/boto3/latest/reference/services/cloudwatch/client/get_metric_statistics.html
- AWS CLI Command Reference: CloudWatch put-metric-alarm - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- Amazon CloudWatch User Guide: Configuring how CloudWatch alarms treat missing data - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarms-and-missing-data.html
- AWS CLI User Guide: Accessing Amazon SNS in the AWS CLI - https://docs.aws.amazon.com/cli/latest/userguide/cli-services-sns.html

## Issues Found
- The post listed `Reject` as a configuration-set-only additional metric and described it as emails rejected by SES before sending. Updated the default metrics list to include `Reject` and corrected the definition to match SES documentation: SES accepted the email but did not attempt delivery because it determined the email contained a virus.
- The post used `Rendering Failure` as a CloudWatch metric name. Updated it to `RenderingFailure`, which is the documented CloudWatch metric name for SES template rendering failures.
- The post used account reputation metrics in CloudWatch alarms without listing them in the metrics overview. Added `Reputation.BounceRate` and `Reputation.ComplaintRate` to the default metrics list.
- The programmatic metrics query snippet used `boto3` without importing it. Added the missing `import boto3` line so the snippet is syntactically complete.

## Review Notes
- The AWS CLI examples for SES configuration sets, CloudWatch alarms, CloudWatch dashboards, and SNS subscriptions match current AWS CLI command shapes.
- The boto3 SES, CloudWatch `put_metric_data`, and CloudWatch `get_metric_statistics` examples use current APIs and valid parameter names.
- Open and click metrics require SES event publishing through a configuration set; custom tracking domains are optional unless a sender wants to use their own tracking domain.
- The OneUptime cross-links referenced in the post returned HTTP 200 during review.
