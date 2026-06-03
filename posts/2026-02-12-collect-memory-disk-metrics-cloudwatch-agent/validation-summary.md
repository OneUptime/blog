# Validation Summary: How to Collect Memory and Disk Metrics with CloudWatch Agent

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon CloudWatch Agent
- Amazon CloudWatch metrics, alarms, and dashboards
- Amazon EC2
- AWS CLI
- Linux memory, swap, disk, disk I/O, and inode metrics
- Windows Performance Counters

## Sources Consulted
- Amazon CloudWatch: Metrics collected by the CloudWatch agent: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/metrics-collected-by-CloudWatch-agent.html
- Amazon CloudWatch: Manually create or edit the CloudWatch agent configuration file: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-Configuration-File-Details.html
- AWS CLI Command Reference: cloudwatch put-metric-alarm: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- Amazon CloudWatch: Metric Widget Structure and Syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Metric-Widget-Structure.html
- Amazon CloudWatch: Metrics concepts and dimension combinations: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_concepts.html

## Issues Found
- The first Linux memory configuration appended both `InstanceId` and `AutoScalingGroupName`, but the later per-instance alarm examples only specified `InstanceId`. CloudWatch treats each unique dimension combination as a separate metric, so those alarms would not match metrics published with both dimensions. Removed `AutoScalingGroupName` from the initial per-instance snippet and left ASG dimensions for the fleet-wide aggregation section.
- The Windows section described `% Committed Bytes In Use` as the direct equivalent of Linux `mem_used_percent`. This is not exact because the Windows counter measures committed bytes as a percentage of the commit limit, not Linux physical memory usage. Updated the wording to describe it as the closest Windows memory-pressure counter.
- The dashboard disk metric examples specified only `InstanceId` and `path`. CloudWatch Agent disk metrics are distinguished by `device`, `fstype`, and `path` dimensions, so the dashboard entries could fail to match the published metrics. Added the missing `fstype` and `device` dimensions and normalized the sample instance ID.

## Review Notes
The CloudWatch Agent metric names, Linux and Windows configuration structure, alarm CLI syntax, and dashboard annotation syntax were otherwise consistent with AWS documentation. The alarm examples assume the per-instance dimension set shown earlier in the post; if readers also append `AutoScalingGroupName` or custom dimensions, those same dimensions must be included in alarms and dashboard widgets.
