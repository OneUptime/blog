# Validation Summary: How to Set Up CloudWatch Alarms with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS CloudWatch
- Amazon SNS
- Amazon EC2
- Amazon ECS
- Amazon RDS
- AWS CLI

## Sources Consulted
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu `for_each` meta-argument: https://opentofu.org/docs/v1.11/language/meta-arguments/for_each/
- Terraform AWS Provider `aws_cloudwatch_metric_alarm` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/cloudwatch_metric_alarm.html.markdown
- Terraform AWS Provider `aws_cloudwatch_composite_alarm` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/cloudwatch_composite_alarm.html.markdown
- Amazon CloudWatch alarm evaluation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarm-evaluation.html
- Configuring how CloudWatch alarms treat missing data: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarms-and-missing-data.html
- Composite alarms in Amazon CloudWatch: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarm-combining.html
- Amazon ECS CloudWatch metrics: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/available-metrics.html
- Amazon ECS service utilization metrics: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service_utilization.html
- Amazon RDS CloudWatch metrics: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-metrics.html
- Amazon RDS CloudWatch dimensions: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/dimensions.html
- AWS CLI `set-alarm-state` reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/set-alarm-state.html

## Issues Found
- Updated the opening sentence to refer specifically to CloudWatch metric alarms. AWS documentation distinguishes metric alarms from composite alarms, and the post covers both.
- Corrected the `services` variable description so it matches the object fields actually used in the example instead of incorrectly describing the values as ECS service ARNs.
- Replaced `aws_sns_topic.pagerduty.arn` in the composite alarm example with `aws_sns_topic.alerts.arn`, because the original topic resource was not defined anywhere in the post and made the snippet internally inconsistent.
- Softened the blanket recommendation to always use `evaluation_periods >= 2`. AWS supports valid one-period alarms and M-of-N alarms by combining `evaluation_periods` with `datapoints_to_alarm`, so the original best-practice statement was too absolute.

## Review Notes
- The AWS provider version constraint `~> 5.30` is older than the current 6.x provider line as of 2026-05-06, but the alarm resources and arguments used in the post are still compatible and non-deprecated.
- `aws cloudwatch set-alarm-state` is appropriate for testing notifications, but AWS notes that metric alarms usually return to their actual state quickly and composite alarms might not return to their actual state until a child alarm changes state.
