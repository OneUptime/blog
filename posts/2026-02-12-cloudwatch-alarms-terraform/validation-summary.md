# Validation Summary: How to Configure CloudWatch Alarms with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CloudWatch alarms
- Terraform AWS provider
- Amazon SNS
- Amazon EC2 CloudWatch metrics
- Amazon RDS CloudWatch metrics
- Application Load Balancer CloudWatch metrics
- AWS Lambda CloudWatch metrics
- CloudWatch metric math
- CloudWatch composite alarms

## Sources Consulted
- Terraform AWS provider documentation for `aws_cloudwatch_metric_alarm`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Terraform AWS provider documentation for `aws_cloudwatch_composite_alarm`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_composite_alarm
- Terraform AWS provider documentation for `aws_sns_topic_subscription`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_subscription
- Terraform AWS provider documentation for `aws_lb` and `aws_lb_target_group` CloudWatch metric ARN suffix attributes: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- Amazon CloudWatch `PutMetricAlarm` API reference: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_PutMetricAlarm.html
- Amazon CloudWatch alarm missing data documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarms-and-missing-data.html
- Amazon CloudWatch composite alarms documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarm-combining.html
- Amazon EC2 CloudWatch metrics documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/viewing_metrics_with_cloudwatch.html
- Amazon RDS CloudWatch metrics documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-metrics.html
- Application Load Balancer CloudWatch metrics documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html
- AWS Lambda CloudWatch metrics documentation: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html
- OneUptime linked CloudWatch dashboards post: https://oneuptime.com/blog/post/2026-02-12-cloudwatch-dashboards-terraform/view

## Issues Found
- The ALB `HTTPCode_Target_5XX_Count` example was labeled as an "error rate" alarm, but the metric and threshold shown monitor a count of target 5xx responses, not a rate. Updated the code comment to say "ALB 5xx error count alarm."

## Review Notes
The Terraform examples use current AWS provider resources and arguments. The CloudWatch metric names, namespaces, dimensions, metric math structure, percentile statistics, missing-data values, and composite alarm rule syntax were checked against official documentation. Terraform CLI was not installed in the local environment, so `terraform fmt` or `terraform validate` could not be run locally.
