# Validation Summary: How to Create CloudWatch Metric Alarms

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon CloudWatch metric alarms
- AWS CLI `cloudwatch put-metric-alarm`
- Amazon SNS alarm actions
- EC2, Application Load Balancer, and RDS CloudWatch metrics
- CloudWatch metric math

## Sources Consulted
- AWS CLI Command Reference: `cloudwatch put-metric-alarm` - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- Amazon CloudWatch User Guide: Alarm evaluation - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarm-evaluation.html
- Amazon CloudWatch User Guide: Configuring how CloudWatch alarms treat missing data - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarms-and-missing-data.html
- Elastic Load Balancing User Guide: CloudWatch metrics for your Application Load Balancer - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html
- Amazon RDS User Guide: Amazon CloudWatch metrics for Amazon RDS - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-metrics.html
- Amazon RDS User Guide: Amazon CloudWatch dimensions for Amazon RDS - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/dimensions.html
- Amazon EC2 User Guide: CloudWatch metrics that are available for your instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/viewing_metrics_with_cloudwatch.html
- Amazon CloudWatch User Guide: Percentile-based alarms and low data samples - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/percentiles-with-low-samples.html

## Issues Found
- The `period` explanation said CloudWatch evaluates the metric every 5 minutes. AWS documentation defines `Period` as the time used to create each datapoint; standard-resolution alarms with periods of one minute or longer are evaluated every minute. Changed the wording to say the 300-second period creates each evaluation datapoint from 5 minutes of metric data.
- The `treat-missing-data` explanation for `missing` said it does not change state when data is missing. AWS documentation says `missing` treats missing points as missing and can move the alarm to `INSUFFICIENT_DATA` when there is not enough real data to evaluate. Updated the explanation.
- The missing-data table described `ignore` as skipping the data point. AWS documentation describes `ignore` as retaining the current alarm state when missing data must be filled. Updated the table.

## Review Notes
The AWS CLI examples use current `put-metric-alarm` parameters, and the ALB, EC2, and RDS metric names and dimensions checked are consistent with official AWS documentation. The AWS CLI was not installed locally, so command validation was performed against the official AWS CLI reference instead of local `--help` output.
