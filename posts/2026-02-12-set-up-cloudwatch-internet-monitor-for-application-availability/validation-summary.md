# Validation Summary: How to Set Up CloudWatch Internet Monitor for Application Availability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon CloudWatch Internet Monitor
- AWS CLI
- Amazon EventBridge
- Amazon CloudWatch Metrics, Alarms, and Dashboards
- Amazon S3
- Amazon Athena
- Amazon CloudFront
- Amazon VPC
- Network Load Balancers
- Amazon WorkSpaces
- Amazon CloudWatch Synthetics

## Sources Consulted
- AWS CLI Command Reference: create-monitor - https://docs.aws.amazon.com/cli/latest/reference/internetmonitor/create-monitor.html
- AWS CLI Command Reference: update-monitor - https://docs.aws.amazon.com/cli/latest/reference/internetmonitor/update-monitor.html
- AWS CLI Command Reference: list-health-events - https://docs.aws.amazon.com/cli/latest/reference/internetmonitor/list-health-events.html
- AWS CLI Command Reference: get-health-event - https://docs.aws.amazon.com/cli/latest/reference/internetmonitor/get-health-event.html
- Amazon CloudWatch: View Internet Monitor metrics or set alarms in CloudWatch Metrics - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-IM-view-cw-tools-metrics-dashboard.html
- Amazon CloudWatch: Create alarms with Internet Monitor - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-IM-create-alarm.html
- Amazon EventBridge: Amazon CloudWatch Internet Monitor events - https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-internetmonitor.html
- Amazon CloudWatch: Using Internet Monitor with Amazon EventBridge - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-IM-EventBridge-integration.html
- Amazon CloudWatch: Use Amazon Athena to query internet measurements in Amazon S3 log files - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-IM-view-cw-tools.S3_athena.html
- Amazon CloudWatch: Pricing for Internet Monitor - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-InternetMonitor.pricing.html
- Amazon CloudWatch: Get suggestions to optimize application performance in Internet Monitor - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-IM-insights.html

## Issues Found
- The post described supported monitored resources as CloudFront, VPCs, and WorkSpaces only. Updated the resource discussion to include Network Load Balancers and clarified AWS's resource-combination constraints indirectly by listing NLBs as their own supported resource type.
- The EventBridge rule used `Internet Monitor Health Event Created` as the detail type. AWS documents the direct service event detail type as `Health Event Created`, so the event pattern was corrected.
- The CloudWatch dashboard example used `TrafficMonitoredBytesIn`, which is not an Internet Monitor metric. Replaced it with the documented `BytesInMonitored` metric.
- The CloudWatch alarm examples used 10-minute and 15-minute lookback windows. AWS notes Internet Monitor metrics are typically published within 20 minutes and recommends at least a 25-minute lookback, so both examples now use five 5-minute evaluation periods.
- The Athena table schema did not match Internet Monitor S3 measurement logs. Replaced the schema, SerDe, partitioning, and S3 path shape with the documented Internet Monitor Athena table structure.
- The Athena query referenced non-existent top-level fields such as `city`, `as_name`, and `availability_score`. Rewrote it to extract city, network name, country, and availability impact from the JSON fields used by Internet Monitor logs.
- The CloudFront optimization section implied you can choose specific edge locations through cache behavior or origin configuration. Reworded it to match AWS guidance: evaluate CloudFront and AWS Region routing options for latency improvement.
- The pricing section said the first 100 city-networks are included at a base price. Corrected this to state that Internet Monitor pricing includes per-resource and per-city-network components and that the first 100 city-networks across all monitors in an account are included.

## Review Notes
- The AWS CLI was not installed in the local environment, so command verification was performed against current official AWS CLI and AWS service documentation rather than local `aws --help` output.
- CloudWatch metric dimensions can vary by how the metric is selected in the console. The metric names and namespace were validated against AWS documentation, but production alarm setup should confirm the exact emitted dimensions with `aws cloudwatch list-metrics` for the target monitor.
