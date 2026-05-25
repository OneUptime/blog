# Validation Summary: How to Create CloudWatch Anomaly Detection in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- AWS provider for Terraform
- Amazon CloudWatch metric alarms
- CloudWatch anomaly detection
- Amazon SNS
- Amazon EC2 metrics
- Elastic Load Balancing/Application Load Balancer metrics
- Amazon RDS metrics

## Sources Consulted
- AWS CloudWatch User Guide: Using CloudWatch anomaly detection - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Anomaly_Detection.html
- AWS CloudWatch User Guide: Create a CloudWatch alarm based on anomaly detection - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Create_Anomaly_Detection_Alarm.html
- AWS CloudWatch API Reference: PutMetricAlarm - https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_PutMetricAlarm.html
- AWS CloudFormation Template Reference: MetricDataQuery for CloudWatch anomaly detectors - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cloudwatch-anomalydetector-metricdataquery.html
- Terraform AWS provider documentation: aws_cloudwatch_metric_alarm - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- AWS Elastic Load Balancing documentation: CloudWatch metrics for Application Load Balancers - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html
- AWS RDS User Guide: Amazon CloudWatch metrics for Amazon RDS - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-metrics.html
- AWS CloudWatch User Guide: CloudWatch statistics definitions - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Statistics-definitions.html

## Issues Found
- The anomaly band metric queries set `return_data = true`. AWS's `PutMetricAlarm` anomaly detection example returns data for the underlying metric and uses the `ANOMALY_DETECTION_BAND` expression as `ThresholdMetricId`; non-watched expressions should not be returned as the alarm result. Removed `return_data = true` from each anomaly band query.
- The best practices section said anomaly detection requires at least two weeks of historical data. AWS documents that the model trains on up to two weeks of metric data and can be enabled without a full two weeks, though new models can take up to two weeks to become more accurate. Updated the wording accordingly.

## Review Notes
The Terraform examples use valid CloudWatch anomaly detection comparison operators, `threshold_metric_id`, `metric_query` blocks, CloudWatch metric namespaces, and metric dimensions for the examples shown. The post uses Terraform AWS provider `~> 5.0`, which remains valid, though newer 6.x provider releases are available.
