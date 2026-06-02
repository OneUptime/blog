# Validation Summary: How to Monitor ECS with Container Insights

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon ECS
- Amazon CloudWatch Container Insights
- Container Insights with enhanced observability
- AWS CLI
- AWS CloudFormation
- CloudWatch dashboards
- CloudWatch alarms
- CloudWatch Logs Insights

## Sources Consulted
- Amazon CloudWatch User Guide: Setting up Container Insights on Amazon ECS - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/deploy-container-insights-ECS-cluster.html
- Amazon ECS API Reference: ClusterSetting - https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ClusterSetting.html
- Amazon CloudWatch User Guide: Amazon ECS Container Insights metrics - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-metrics-ECS.html
- Amazon CloudWatch User Guide: Amazon ECS Container Insights with enhanced observability metrics - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-enhanced-observability-metrics-ECS.html
- Amazon ECS Developer Guide: Monitor Amazon ECS containers using Container Insights with enhanced observability - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/cloudwatch-container-insights.html
- Amazon CloudWatch User Guide: Container Insights performance log events for Amazon ECS - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-reference-performance-logs-ECS.html
- AWS CloudFormation Template Reference: AWS::CloudWatch::Dashboard - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cloudwatch-dashboard.html
- Amazon CloudWatch User Guide: Dashboard body structure and syntax - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Dashboard-Body-Structure.html
- AWS CLI Command Reference: update-cluster-settings - https://docs.aws.amazon.com/cli/v1/reference/ecs/update-cluster-settings.html
- AWS CLI Command Reference: put-metric-alarm - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- Amazon CloudWatch Logs User Guide: Use aliases and comments in queries - https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-alias.html

## Issues Found
- The post described container-level visibility while enabling standard Container Insights with `value=enabled`. AWS distinguishes standard Container Insights from Container Insights with enhanced observability; container-level metrics require enhanced observability. Changed the setup commands to `value=enhanced` and adjusted surrounding wording.
- The post said EC2 launch type requires the CloudWatch agent. For ECS Container Insights setup, AWS requires an ECS agent version 1.29 or later on EC2 instances; the CloudWatch agent is only needed for additional EC2 instance-level metrics. Updated that note.
- The CloudFormation dashboard snippet used an object for `DashboardBody`, but CloudFormation requires `DashboardBody` to be a JSON-formatted string. Converted the dashboard body to a JSON string.
- The dashboard snippet graphed `RunningTaskCount` and `PendingTaskCount` with only `ClusterName`, but those metrics use `ServiceName` and `ClusterName` dimensions. Added the service dimension in that widget.
- The alarm comments described percentage thresholds, but the example alarms used absolute `CpuUtilized` CPU units and `MemoryUtilized` MiB values. Clarified that the thresholds are absolute values corresponding to example reservations.
- The Logs Insights examples used SQL-style `--` comments, but CloudWatch Logs Insights documents `#` comments. Changed the query comments to `#`.
- One Logs Insights query sorted by `@timestamp` after a `stats` aggregation. Changed it to alias the `bin(5m)` group as `time` and sort by that grouped field.
- The post listed `NetworkRxPackets` and `NetworkTxPackets` alongside CloudWatch metrics. AWS documents those fields in Container Insights performance log events, not as ECS Container Insights CloudWatch metrics. Clarified that packet counts are available in the performance logs.

## Review Notes
The post is technically current after edits. The cost section is directionally correct; AWS charges Container Insights metrics as custom metrics and CloudWatch Logs charges also apply, but exact cost depends on region, workload cardinality, and retention.
