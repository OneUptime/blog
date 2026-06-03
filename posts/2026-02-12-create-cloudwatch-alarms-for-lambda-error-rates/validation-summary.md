# Validation Summary: How to Create CloudWatch Alarms for Lambda Error Rates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda
- Amazon CloudWatch metrics and alarms
- CloudWatch metric math
- CloudWatch anomaly detection
- CloudWatch composite alarms
- AWS CLI
- AWS CloudFormation
- Amazon SNS alarm actions

## Sources Consulted
- AWS CLI Command Reference: `cloudwatch put-metric-alarm` - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- AWS CLI Command Reference: `cloudwatch put-composite-alarm` - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-composite-alarm.html
- AWS Lambda Developer Guide: Types of metrics for Lambda functions - https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html
- Amazon CloudWatch User Guide: Using math expressions with CloudWatch metrics - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/using-metric-math.html
- Amazon CloudWatch User Guide: Create a CloudWatch alarm based on anomaly detection - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Create_Anomaly_Detection_Alarm.html
- Amazon CloudWatch User Guide: Using CloudWatch anomaly detection - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Anomaly_Detection.html
- AWS CloudFormation Template Reference: `AWS::CloudWatch::Alarm` - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cloudwatch-alarm.html
- AWS CloudFormation Template Reference: `AWS::CloudWatch::Alarm MetricDataQuery` - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cloudwatch-alarm-metricdataquery.html

## Issues Found
- The Mermaid diagram implied that the Lambda `Invocations` metric increments only for successful invocations. AWS documents that `Invocations` includes successful invocations and invocations that result in function errors, but not throttled invocation requests or other invocation errors. Updated the diagram so `Invocations` increments for the invocation path independently of success or error.
- The guarded metric math example described "at least 100 invocations" but used `invocations > 100`, which excludes exactly 100 invocations. Changed the expression and explanatory text to `invocations >= 100`.
- The anomaly detection alarm example set `ReturnData` to `true` on both the source metric and the `ANOMALY_DETECTION_BAND` expression. For `PutMetricAlarm`, AWS requires `ReturnData: true` only for the one expression result used by the alarm and `false` for the other metrics and expressions. Changed the source metric's `ReturnData` to `false`.

## Review Notes
The AWS CLI commands and CloudFormation resource properties otherwise match current AWS documentation. The examples use placeholder ARNs and function names, which readers must replace with values from their own AWS account and Region.
