# Validation Summary: AWS CloudWatch Alerting Best Practices

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon CloudWatch alarms
- AWS CLI
- AWS CloudFormation
- CloudWatch anomaly detection
- CloudWatch composite alarms
- AWS Lambda alarm actions
- Amazon EventBridge
- AWS Systems Manager OpsCenter and Incident Manager

## Sources Consulted
- AWS CLI Command Reference: `cloudwatch get-metric-statistics` - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html
- Amazon CloudWatch User Guide: Alarm actions - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarm-actions.html
- Amazon CloudWatch User Guide: Invoke a Lambda function from an alarm - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarms-and-actions-Lambda.html
- Amazon CloudWatch User Guide: Configuring how CloudWatch alarms treat missing data - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarms-and-missing-data.html
- Amazon CloudWatch User Guide: Alarm suppression - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarm-suppression.html
- AWS CloudFormation Template Reference: `AWS::CloudWatch::Alarm` - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-cloudwatch-alarm.html
- AWS CloudFormation Template Reference: `AWS::CloudWatch::AnomalyDetector` - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cloudwatch-anomalydetector.html
- Amazon CloudWatch API Reference: `DescribeAlarmHistory` - https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_DescribeAlarmHistory.html

## Issues Found
- The AWS CLI example used `--statistics p99`. Percentile statistics such as `p99` must be requested with `--extended-statistics`, so the command was corrected.
- The `TreatMissingData` table described `missing` as maintaining the current state and `ignore` as skipping evaluation. AWS documents `missing` as transitioning to `INSUFFICIENT_DATA` when all data points in the evaluation range are missing, and `ignore` as maintaining the current alarm state. The table was corrected.
- The remediation example used an SSM Automation document ARN directly in `AlarmActions`. CloudWatch alarm actions support SNS, Lambda, EC2 actions, Auto Scaling actions, Systems Manager OpsItems or incidents, investigations, and EventBridge state-change events, but not direct SSM Automation document execution as an alarm action. The example was changed to a Lambda alarm action with the required Lambda permission, and the text now notes EventBridge as the route for Systems Manager Automation.
- The monitoring section said to use CloudWatch metrics and Metrics Insights to query alarm state changes. Alarm state changes are available through alarm history APIs and EventBridge events, not Metrics Insights. The section was corrected to reference `DescribeAlarms`, `DescribeAlarmHistory`, and EventBridge.

## Review Notes
The anomaly detection and composite alarm CloudFormation snippets use current CloudFormation resource types and properties. The post gives threshold-selection heuristics, such as two weeks of baseline data and 2 out of 3 datapoints, that are operational recommendations rather than AWS requirements.
