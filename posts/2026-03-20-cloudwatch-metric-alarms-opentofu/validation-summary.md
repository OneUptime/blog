# Validation Summary: How to Create CloudWatch Metric Alarms with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu CLI
- AWS CloudWatch metric alarms
- AWS SNS
- AWS Lambda metrics
- Amazon EC2 metrics
- Amazon RDS metrics
- AWS CLI

## Sources Consulted
- OpenTofu CLI init docs: https://opentofu.org/docs/cli/init/
- AWS provider docs for `aws_cloudwatch_metric_alarm`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_metric_alarm.html.markdown
- AWS provider docs for `aws_sns_topic_subscription`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/sns_topic_subscription.html.markdown
- Amazon CloudWatch alarms overview: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Alarms.html
- CloudWatch missing data behavior: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarms-and-missing-data.html
- CloudWatch metric math: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/using-metric-math.html
- AWS Lambda metrics reference: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html
- Amazon EC2 metrics reference: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/viewing_metrics_with_cloudwatch.html
- Amazon RDS metrics reference: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-metrics.html
- Amazon RDS metric dimensions: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/dimensions.html
- AWS CLI `set-alarm-state` reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/set-alarm-state.html

## Issues Found
- The Step 2 heading and alarm description called the Lambda `Errors` metric an error-rate alarm, but the configuration actually alarmed on raw error count. I updated the heading and description to match the metric being monitored.
- The metric math example used `MAX([errors, invocations])`, which did not match AWS's documented error-rate calculation of `Errors / Invocations`. I replaced it with `(errors / invocations) * 100` and added `treat_missing_data = "notBreaching"` so idle periods do not create misleading alarm behavior.
- The SNS email subscription example omitted the required confirmation step for email endpoints. I added a note that the subscription must be confirmed from the verification email before notifications will be delivered.
- The prerequisites listed only CloudWatch permissions even though the tutorial also creates SNS resources. I updated the prerequisites to include SNS permissions.
- The conclusion gave overly broad guidance about `treat_missing_data = "breaching"`. I narrowed that guidance so it recommends `breaching` only when missing data itself should indicate a problem.

## Review Notes
- The `aws cloudwatch set-alarm-state` example is valid for testing the Lambda alarm shown in Step 2. For alarms that trigger Auto Scaling policies, AWS requires `--state-reason-data` when manually setting alarm state for testing.
- The EC2 CPU example uses a 300-second period, which is compatible with default EC2 monitoring. A 60-second period would require detailed monitoring.
