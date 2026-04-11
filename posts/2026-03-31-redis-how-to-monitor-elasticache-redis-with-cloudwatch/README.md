# How to Monitor ElastiCache Redis with CloudWatch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, ElastiCache, CloudWatch, Monitoring, AWS Observability

Description: Learn how to monitor Amazon ElastiCache Redis using CloudWatch metrics, alarms, and dashboards to track performance and detect issues early.

---

## Key Metrics to Monitor

ElastiCache automatically publishes metrics to CloudWatch every 60 seconds. The most important metrics fall into four categories:

**Memory:**
- `FreeableMemory` - available memory in bytes (alert when below 10% of total)
- `BytesUsedForCache` - total bytes used for storing data
- `SwapUsage` - should stay near zero; high swap causes latency spikes
- `DatabaseMemoryUsagePercentage` - percentage of memory used (alert above 80%)

**Performance:**
- `CacheHits` and `CacheMisses` - track hit ratio
- `GetTypeCmds` and `SetTypeCmds` - command rates
- `CurrConnections` - active connections
- `NewConnections` - connection rate (spikes indicate connection storms)

**Replication:**
- `ReplicationLag` - replica lag in seconds (alert above 10 seconds)
- `ReplicationBytes` - replication traffic

**Eviction:**
- `Evictions` - keys evicted due to maxmemory policy (should usually be 0 for databases, acceptable for caches)
- `Reclaimed` - expired keys reclaimed

## Setting Up CloudWatch Alarms

```bash
# Alert when freeable memory drops below 100MB
aws cloudwatch put-metric-alarm \
  --alarm-name "ElastiCache-LowMemory" \
  --alarm-description "ElastiCache Redis low memory" \
  --metric-name FreeableMemory \
  --namespace AWS/ElastiCache \
  --statistic Average \
  --period 300 \
  --threshold 104857600 \
  --comparison-operator LessThanThreshold \
  --dimensions Name=ReplicationGroupId,Value=my-cluster \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:ops-alerts

# Alert on high replication lag
aws cloudwatch put-metric-alarm \
  --alarm-name "ElastiCache-ReplicationLag" \
  --alarm-description "Redis replica falling behind" \
  --metric-name ReplicationLag \
  --namespace AWS/ElastiCache \
  --statistic Maximum \
  --period 60 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ReplicationGroupId,Value=my-cluster \
  --evaluation-periods 3 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:ops-alerts

# Alert on swap usage
aws cloudwatch put-metric-alarm \
  --alarm-name "ElastiCache-SwapUsage" \
  --alarm-description "Redis is using swap - severe performance impact" \
  --metric-name SwapUsage \
  --namespace AWS/ElastiCache \
  --statistic Average \
  --period 60 \
  --threshold 52428800 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ReplicationGroupId,Value=my-cluster \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:ops-alerts
```

## Terraform Alarms Setup

```hcl
locals {
  cluster_id = "my-redis-cluster"
  sns_arn    = aws_sns_topic.ops_alerts.arn
}

resource "aws_cloudwatch_metric_alarm" "redis_low_memory" {
  alarm_name          = "redis-low-memory"
  alarm_description   = "Redis freeable memory below 100MB"
  namespace           = "AWS/ElastiCache"
  metric_name         = "FreeableMemory"
  statistic           = "Average"
  period              = 300
  threshold           = 104857600  # 100MB in bytes
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2

  dimensions = {
    ReplicationGroupId = local.cluster_id
  }

  alarm_actions = [local.sns_arn]
  ok_actions    = [local.sns_arn]
}

resource "aws_cloudwatch_metric_alarm" "redis_evictions" {
  alarm_name          = "redis-evictions"
  alarm_description   = "Redis is evicting keys - memory pressure"
  namespace           = "AWS/ElastiCache"
  metric_name         = "Evictions"
  statistic           = "Sum"
  period              = 300
  threshold           = 100
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3

  dimensions = {
    ReplicationGroupId = local.cluster_id
  }

  alarm_actions = [local.sns_arn]
}

resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "redis-high-cpu"
  alarm_description   = "Redis engine CPU above 80%"
  namespace           = "AWS/ElastiCache"
  metric_name         = "EngineCPUUtilization"
  statistic           = "Average"
  period              = 300
  threshold           = 80
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3

  dimensions = {
    ReplicationGroupId = local.cluster_id
  }

  alarm_actions = [local.sns_arn]
}
```

## Creating a CloudWatch Dashboard

```bash
aws cloudwatch put-dashboard \
  --dashboard-name "ElastiCache-Redis-Overview" \
  --dashboard-body '{
    "widgets": [
      {
        "type": "metric",
        "properties": {
          "title": "Cache Hit Rate",
          "metrics": [
            ["AWS/ElastiCache", "CacheHits", "ReplicationGroupId", "my-cluster"],
            ["AWS/ElastiCache", "CacheMisses", "ReplicationGroupId", "my-cluster"]
          ],
          "period": 60,
          "stat": "Sum",
          "view": "timeSeries"
        }
      },
      {
        "type": "metric",
        "properties": {
          "title": "Memory Usage",
          "metrics": [
            ["AWS/ElastiCache", "FreeableMemory", "ReplicationGroupId", "my-cluster"],
            ["AWS/ElastiCache", "BytesUsedForCache", "ReplicationGroupId", "my-cluster"]
          ],
          "period": 60,
          "stat": "Average",
          "view": "timeSeries"
        }
      }
    ]
  }'
```

## Calculating Cache Hit Ratio in Python

```python
import boto3
from datetime import datetime, timedelta

def get_cache_hit_ratio(replication_group_id, hours=1):
    cw = boto3.client('cloudwatch', region_name='us-east-1')

    end_time = datetime.utcnow()
    start_time = end_time - timedelta(hours=hours)

    def get_metric_sum(metric_name):
        response = cw.get_metric_statistics(
            Namespace='AWS/ElastiCache',
            MetricName=metric_name,
            Dimensions=[{
                'Name': 'ReplicationGroupId',
                'Value': replication_group_id
            }],
            StartTime=start_time,
            EndTime=end_time,
            Period=3600,
            Statistics=['Sum']
        )
        if response['Datapoints']:
            return response['Datapoints'][0]['Sum']
        return 0

    hits = get_metric_sum('CacheHits')
    misses = get_metric_sum('CacheMisses')
    total = hits + misses

    if total == 0:
        return 0.0

    ratio = (hits / total) * 100
    print(f"Cache hits: {hits}, Misses: {misses}, Hit ratio: {ratio:.1f}%")
    return ratio

hit_ratio = get_cache_hit_ratio('my-cluster')
if hit_ratio < 80:
    print("WARNING: Low cache hit ratio - consider reviewing TTL settings")
```

## Enhanced Monitoring with CloudWatch Logs Insights

Enable ElastiCache slow log to CloudWatch Logs for command-level monitoring.

```bash
# Configure slow log in Redis
redis-cli -h your-endpoint -p 6379 --tls -a your-token \
  CONFIG SET slowlog-log-slower-than 10000  # Log commands slower than 10ms
redis-cli -h your-endpoint -p 6379 --tls -a your-token \
  CONFIG SET slowlog-max-len 128
```

```python
# Query CloudWatch Logs Insights for slow commands
logs_client = boto3.client('logs', region_name='us-east-1')

response = logs_client.start_query(
    logGroupName='/elasticache/redis/my-cluster/slowlogs',
    startTime=int((datetime.utcnow() - timedelta(hours=1)).timestamp()),
    endTime=int(datetime.utcnow().timestamp()),
    queryString="""
        fields @timestamp, Command, `Duration (us)`
        | filter `Duration (us)` > 10000
        | sort `Duration (us)` desc
        | limit 20
    """
)
```

## Setting Composite Alarms

```hcl
resource "aws_cloudwatch_composite_alarm" "redis_critical" {
  alarm_name        = "redis-critical"
  alarm_description = "Redis cluster is in critical state"

  alarm_rule = "ALARM(\"redis-low-memory\") OR ALARM(\"redis-high-cpu\") OR ALARM(\"redis-evictions\")"

  alarm_actions = [aws_sns_topic.critical_alerts.arn]
}
```

## Summary

Effective ElastiCache Redis monitoring centers on four key metric groups: memory (FreeableMemory, SwapUsage), performance (CacheHits/Misses, connections), replication (ReplicationLag), and evictions. Set up CloudWatch alarms for memory below 10% of total, replication lag above 10 seconds, any swap usage, and high eviction rates. A CloudWatch dashboard combining these metrics gives you at-a-glance cluster health and allows quick identification of the root cause when performance degrades.
