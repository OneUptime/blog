# Validation Summary: How to Export Redis Metrics to CloudWatch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (self-hosted and Amazon ElastiCache)
- AWS CloudWatch (metrics, alarms, dashboards)
- AWS CLI (`cloudwatch` subcommands)
- Python (`boto3`, `redis-py`)
- AWS Lambda (mentioned as deployment target)

## Sources Consulted
- AWS ElastiCache CloudWatch Metrics documentation (https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/CacheMetrics.Redis.html)
- AWS CloudWatch `put_metric_data` API reference (https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_PutMetricData.html)
- AWS CloudWatch valid Unit values (https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_MetricDatum.html)
- AWS CLI `cloudwatch put-metric-alarm` reference (https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html)
- AWS CLI `cloudwatch put-dashboard` reference (https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-dashboard.html)
- boto3 CloudWatch client documentation (https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/cloudwatch.html)
- redis-py documentation (https://redis-py.readthedocs.io/en/stable/)

## Issues Found

1. **NetworkBytesIn/NetworkBytesOut descriptions incorrect** (metric list in Option 1): The descriptions stated "Bytes received per second" and "Bytes sent per second", but these ElastiCache metrics report raw byte counts, not per-second rates. Fixed to "Bytes read from the network" and "Bytes sent to the network".

2. **Incorrect CloudWatch Unit for custom metrics** (Python code in Option 2): All six custom metrics used `"Unit": "Count"`, but this is only correct for counter-type metrics. Fixed by adding per-metric units: `OpsPerSecond` now uses `"Count/Second"`, `UsedMemoryMB` now uses `"Megabytes"`, and the remaining four counters correctly use `"Count"`. Using wrong units would cause incorrect aggregation and misleading dashboard visualizations.

## Review Notes
- `datetime.datetime.utcnow()` is deprecated since Python 3.12 in favor of `datetime.datetime.now(datetime.timezone.utc)`. The current code still works but may trigger deprecation warnings on Python 3.12+. This was not changed to keep the fix minimal.
- All ElastiCache metric names (`CurrConnections`, `CacheHits`, `CacheMisses`, `Evictions`, `CurrItems`, `EngineCPUUtilization`, `DatabaseMemoryUsagePercentage`, `ReplicationLag`) are verified correct.
- All AWS CLI commands (`get-metric-statistics`, `put-metric-alarm`, `put-dashboard`) use correct syntax and valid flag values.
- The `redis-py` usage (`r.info("all")` and the INFO field names) is correct.
