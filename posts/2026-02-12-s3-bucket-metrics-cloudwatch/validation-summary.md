# Validation Summary: How to Configure S3 Bucket Metrics in CloudWatch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon S3
- Amazon CloudWatch metrics, alarms, dashboards, and metric math
- AWS CLI
- S3 request metrics, storage metrics, and replication metrics

## Sources Consulted
- Amazon S3 User Guide: Monitoring metrics with Amazon CloudWatch - https://docs.aws.amazon.com/AmazonS3/latest/userguide/cloudwatch-monitoring.html
- Amazon S3 User Guide: Metrics and dimensions - https://docs.aws.amazon.com/AmazonS3/latest/userguide/metrics-dimensions.html
- Amazon S3 User Guide: Creating a CloudWatch metrics configuration for all the objects in your bucket - https://docs.aws.amazon.com/AmazonS3/latest/userguide/configure-request-metrics-bucket.html
- Amazon S3 User Guide: Creating a metrics configuration that filters by prefix, object tag, or access point - https://docs.aws.amazon.com/AmazonS3/latest/userguide/metrics-configurations-filter.html
- AWS CLI Command Reference: put-bucket-metrics-configuration - https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-metrics-configuration.html
- AWS CLI Command Reference: put-metric-alarm - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- Amazon CloudWatch User Guide: Dashboard Body Structure and Syntax - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Dashboard-Body-Structure.html
- Amazon CloudWatch User Guide: Metric Widget Structure and Syntax - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Metric-Widget-Structure.html
- Amazon S3 User Guide: Using S3 Replication metrics - https://docs.aws.amazon.com/AmazonS3/latest/userguide/repl-metrics.html

## Issues Found
- The opening described S3 CloudWatch metrics as only two categories. AWS also documents replication metrics and S3 Storage Lens metrics; the post itself discusses replication metrics. Updated the wording to distinguish bucket storage/request metrics from separately enabled replication metrics.
- The storage metrics section said to query each storage class separately without clarifying that this applies to **BucketSizeBytes**. AWS documents **NumberOfObjects** with the **AllStorageTypes** storage type filter. Updated the explanation and CLI comment accordingly.
- The high-latency alarm used `--statistic p99`. AWS CLI `put-metric-alarm` requires `--extended-statistic p99` for percentile statistics. Updated the command.
- The dashboard example used the compact `["...", {"stat": "p99"}]` metric shorthand. AWS dashboard documentation shows `.` placeholders per metric field, so the example was changed to explicit `.` placeholders for the repeated namespace, metric name, and dimensions.

## Review Notes
The S3 request metric configuration examples, request metric names, storage metric dimensions, replication metric names, CloudWatch alarm dimensions, and metric math alarm structure were otherwise consistent with AWS documentation. S3 request metrics are delivered on a best-effort basis and can be delayed, which is already compatible with the post's operational monitoring framing.
