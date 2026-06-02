# Validation Summary: How to Monitor DynamoDB with CloudWatch Alarms

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon DynamoDB
- Amazon CloudWatch metrics and alarms
- AWS CLI
- Boto3 for Python
- Amazon SNS alarm actions

## Sources Consulted
- Amazon DynamoDB Developer Guide: Metrics and dimensions - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/metrics-dimensions.html
- Amazon DynamoDB Developer Guide: Creating CloudWatch alarms in DynamoDB - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Monitoring-metrics-creating-cloudwatch-alarms.html
- AWS CLI Command Reference: cloudwatch put-metric-alarm - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- AWS CLI Command Reference: cloudwatch put-composite-alarm - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-composite-alarm.html
- Boto3 CloudWatch client put_metric_alarm reference - https://docs.aws.amazon.com/boto3/latest/reference/services/cloudwatch/client/put_metric_alarm.html

## Issues Found
- The metric diagram used shortened/nonexistent metric names (`ConsumedReadCapacity`, `ConsumedWriteCapacity`, and `AccountProvisionedReadCapacity`). Updated them to the documented DynamoDB metric names: `ConsumedReadCapacityUnits`, `ConsumedWriteCapacityUnits`, and `AccountProvisionedReadCapacityUnits`.
- The post claimed `treat-missing-data notBreaching` is important for DynamoDB throttle alarms and that missing data means zero throttle events. AWS documents that CloudWatch alarms for the `AWS/DynamoDB` namespace always ignore missing data regardless of the configured `TreatMissingData` value. Removed the misleading options from examples and corrected the explanation.
- The `SystemErrors` alarm omitted the required `Operation` dimension. Added `Name=Operation,Value=GetItem` and updated the alarm name/description to make the operation scope explicit.
- The capacity alarm section first showed an incorrect 80% threshold before correcting it. Removed the incorrect command and kept the accurate threshold calculation for a 300-second period.
- The Python automation example applied `TableName` dimensions to every alarm, which was incorrect for `SystemErrors` and `UserErrors`. Added the required `Operation` dimension for `SystemErrors` and removed the per-table `UserErrors` alarm because AWS documents `UserErrors` as an account/Region aggregate metric without table dimensions.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI options were verified against the official AWS CLI command reference instead of local `--help`. The Python example was syntax-checked with `python3`, and the linked Contributor Insights post path exists locally.
