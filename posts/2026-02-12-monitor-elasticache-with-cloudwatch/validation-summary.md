# Validation Summary: How to Monitor ElastiCache with CloudWatch

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Amazon ElastiCache
- Amazon CloudWatch metrics, alarms, and dashboards
- AWS CLI
- AWS CloudFormation
- Python
- Boto3
- Redis OSS / Valkey metrics
- Memcached metrics

## Sources Consulted
- Amazon ElastiCache: Monitoring use with CloudWatch Metrics: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CacheMetrics.html
- Amazon ElastiCache: Monitoring CloudWatch Cluster and Node Metrics: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CloudWatchMetrics.html
- Amazon ElastiCache: Which Metrics Should I Monitor?: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CacheMetrics.WhichShouldIMonitor.html
- Amazon ElastiCache: Host-Level Metrics: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CacheMetrics.HostLevel.html
- Amazon ElastiCache: Metrics for Valkey and Redis OSS: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CacheMetrics.Redis.html
- Amazon ElastiCache: Metrics for Memcached: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CacheMetrics.Memcached.html
- AWS CLI Command Reference: cloudwatch get-metric-statistics: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html
- AWS CloudFormation Template Reference: AWS::CloudWatch::Dashboard: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cloudwatch-dashboard.html
- Boto3 CloudWatch client get_metric_statistics: https://docs.aws.amazon.com/boto3/latest/reference/services/cloudwatch/client/get_metric_statistics.html

## Issues Found
- ElastiCache metric examples used only the `CacheClusterId` dimension. AWS documents node-based ElastiCache CloudWatch metrics with both `CacheClusterId` and `CacheNodeId`, and CloudWatch requires the same dimension combination used when the metric was published. Updated the AWS CLI commands, alarm examples, CloudWatch dashboard metrics, and Python script to include `CacheNodeId`.
- The first CPU command said it checked CPU utilization "across all nodes" while the metric query is node-scoped. Updated the comment to say it checks a specific node.
- The Python health-check helper accepted only cluster IDs, which would not query the documented ElastiCache node metric dimension set. Updated it to accept `cluster_id` and `node_id` pairs and include both dimensions in Boto3 calls.
- The Memcached section labeled a single `GetHits` query as "Get/Set ratio." Updated the comment to "Get hit count" because `GetHits` reports successful get requests, not a get/set ratio.

## Review Notes
- AWS now documents Valkey alongside Redis OSS for these ElastiCache metrics; the post's Redis wording remains technically valid for Redis OSS-focused examples.
- The AWS CLI was not installed in the local workspace, so CLI option validation was performed against the official AWS CLI reference rather than local `--help` output.
- The embedded CloudWatch dashboard body JSON and Python code snippet were parsed locally after edits.
- The GitHub author URL and related OneUptime URLs returned HTTP 200 during review.
