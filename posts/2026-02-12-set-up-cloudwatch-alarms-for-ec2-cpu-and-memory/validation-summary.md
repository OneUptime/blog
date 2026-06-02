# Validation Summary: How to Set Up CloudWatch Alarms for EC2 CPU and Memory

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon EC2
- Amazon CloudWatch metrics and alarms
- CloudWatch composite alarms
- CloudWatch agent
- Amazon SNS
- Amazon EC2 Auto Scaling
- EC2 auto recovery
- AWS CLI
- Terraform AWS provider

## Sources Consulted
- AWS CLI Command Reference: `cloudwatch put-metric-alarm` - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- AWS CLI Command Reference: `cloudwatch put-composite-alarm` - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-composite-alarm.html
- Amazon CloudWatch User Guide: Alarm actions - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarm-actions.html
- Amazon CloudWatch User Guide: Composite alarms - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarm-combining.html
- Amazon CloudWatch User Guide: Configuring how CloudWatch alarms treat missing data - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarms-and-missing-data.html
- Amazon CloudWatch User Guide: Metrics collected by the CloudWatch agent - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/metrics-collected-by-CloudWatch-agent.html
- Amazon CloudWatch User Guide: CloudWatch agent configuration file details - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-Configuration-File-Details.html
- Amazon EC2 User Guide: CloudWatch metrics available for EC2 instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/viewing_metrics_with_cloudwatch.html
- Amazon CloudWatch User Guide: Stop, terminate, reboot, or recover an EC2 instance - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/UsingAlarmActions.html
- Amazon EC2 User Guide: Configure CloudWatch action based recovery - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/cloudwatch-recovery.html
- Amazon SNS API Reference: Subscribe - https://docs.aws.amazon.com/sns/latest/api/API_Subscribe.html
- Terraform Registry: `aws_cloudwatch_metric_alarm` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm

## Issues Found
- The SNS example showed a raw Slack incoming webhook as an HTTPS subscription endpoint. SNS HTTP/S endpoints must confirm the subscription, and Slack webhooks do not act as SNS subscription endpoints. Changed the example to use a Slack bridge endpoint and clarified that Lambda, API Gateway, or another HTTPS bridge should confirm the SNS subscription and transform messages for Slack.
- Several example ARNs used a 9-digit account ID (`123456789`). AWS account IDs are 12 digits, so those examples were corrected to `123456789012`.
- The memory alarm example assumed the `InstanceId` dimension was present on the CloudWatch agent metric. Clarified that the alarm applies when the agent reports memory metrics with `InstanceId` as a dimension, and that both the metric name and dimension come from the agent configuration.

## Review Notes
The AWS CLI command structures, alarm operators, `datapoints-to-alarm`, `treat-missing-data`, CloudWatch agent namespace and memory metric, composite alarm rules, Auto Scaling policy alarm actions, and EC2 recovery action are consistent with current official documentation. The local environment did not have the AWS CLI or Terraform installed, so command validation was performed against official documentation rather than local `--help` output.
