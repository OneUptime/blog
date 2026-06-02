# Validation Summary: How to Monitor ECS Tasks with CloudWatch Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS
- Amazon CloudWatch metrics and alarms
- Amazon ECS Container Insights
- AWS CLI
- Application Auto Scaling
- IAM policies
- Python
- Boto3

## Sources Consulted
- Amazon ECS Developer Guide: Monitor Amazon ECS using CloudWatch: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/cloudwatch-metrics.html
- Amazon ECS Developer Guide: Amazon ECS CloudWatch metrics: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/available-metrics.html
- Amazon CloudWatch User Guide: Amazon ECS Container Insights metrics: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-metrics-ECS.html
- AWS CLI Command Reference: cloudwatch get-metric-statistics: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html
- AWS CLI Command Reference: cloudwatch put-metric-alarm: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- Amazon ECS Developer Guide: Create a target tracking scaling policy for Amazon ECS service auto scaling: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/target-tracking-create-policy.html
- Boto3 documentation: CloudWatch.Client.put_metric_data: https://docs.aws.amazon.com/boto3/latest/reference/services/cloudwatch/client/put_metric_data.html
- Amazon CloudWatch User Guide: Using condition keys to limit access to CloudWatch namespaces: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/iam-cw-condition-keys-namespace.html
- Amazon CloudWatch Pricing: https://aws.amazon.com/cloudwatch/pricing/

## Issues Found
- The original post said ECS metrics are available by default without caveats. AWS documents that metrics are sent for resources with tasks in the RUNNING state, Fargate services receive CPU and memory metrics automatically, and EC2-backed services require supported ECS agent telemetry configuration and permissions. Updated the paragraph to include these caveats.
- The original metric list was introduced as "The default metrics are," but AWS/ECS includes other metrics depending on launch type and feature configuration. Changed this to "The core service-level metrics used in this guide are" to keep the post accurate without expanding its scope.
- The original CLI examples used `date -u -v-3H`, which is a BSD/macOS `date` option and fails on GNU/Linux. Replaced it with `date -u -d '3 hours ago'`, which works in typical Linux AWS CLI environments.
- The Python example used `datetime.utcnow()`, which is deprecated in modern Python. Updated it to `datetime.now(timezone.utc)` and imported `timezone`.
- The original resolution wording implied custom metrics are simply "published at" 1-second or 1-minute intervals. CloudWatch's `StorageResolution` controls whether custom metrics are stored at high resolution down to one second or at standard one-minute resolution, so the wording was corrected.

## Review Notes
- The AWS CLI is not installed in this workspace, so CLI syntax was validated against the official AWS CLI command references instead of by executing the commands locally.
- Pricing values in the post match the common US East examples shown by AWS at review time, but CloudWatch pricing varies by Region and usage tier.
