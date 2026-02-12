# How to Monitor ElastiCache with CloudWatch

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ElastiCache, CloudWatch, Monitoring, Redis

Description: A comprehensive guide to monitoring ElastiCache Redis and Memcached with CloudWatch, covering essential metrics, alarms, dashboards, and troubleshooting strategies.

---

A cache that silently degrades is worse than no cache at all. When ElastiCache starts evicting keys, running out of memory, or experiencing high latency, your application suffers and you might not even realize why. CloudWatch gives you the metrics to catch these problems before users notice them.

Let's set up proper monitoring for your ElastiCache clusters.

## Essential Metrics to Monitor

Not all CloudWatch metrics are equally important. Here are the ones that actually matter, ranked by criticality.

### Tier 1: Critical (Alert Immediately)

**CPUUtilization** - If CPU hits 90%+ consistently, your node is overloaded.

```bash
# Check CPU utilization across all nodes
aws cloudwatch get-metric-statistics \
  --namespace AWS/ElastiCache \
  --metric-name CPUUtilization \
  --dimensions Name=CacheClusterId,Value=my-redis-001 \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Average Maximum
```

**EngineCPUUtilization** (Redis only) - This is the Redis process CPU specifically. More accurate than total CPUUtilization because Redis is single-threaded.

```bash
# Check Redis engine CPU (more accurate for Redis workloads)
aws cloudwatch get-metric-statistics \
  --namespace AWS/ElastiCache \
  --metric-name EngineCPUUtilization \
  --dimensions Name=CacheClusterId,Value=my-redis-001 \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Average Maximum
```

**DatabaseMemoryUsagePercentage** (Redis only) - How much of your available memory is used by data.

```bash
# Check memory usage percentage
aws cloudwatch get-metric-statistics \
  --namespace AWS/ElastiCache \
  --metric-name DatabaseMemoryUsagePercentage \
  --dimensions Name=CacheClusterId,Value=my-redis-001 \
  --start-time $(date -u -d '6 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average Maximum
```

### Tier 2: Important (Alert Within Minutes)

**Evictions** - Keys being removed to make room for new data. A sustained high eviction rate means your cache is too small.

**CurrConnections** - Current number of client connections. Approaching the connection limit means applications will start failing to connect.

**ReplicationLag** (Redis only) - Lag between primary and replica. High lag means replicas are serving stale data.

### Tier 3: Operational (Monitor on Dashboard)

**CacheHitRate** - Percentage of requests that find data in the cache. Low hit rate means your caching strategy needs work.

**NetworkBytesIn/NetworkBytesOut** - Network throughput. Watch for approaching bandwidth limits.

**SaveInProgress** - Whether a backup is currently running.

## Setting Up Alarms

Here's a complete set of CloudWatch alarms for a production ElastiCache Redis cluster:

```bash
# Alarm: High CPU Utilization
aws cloudwatch put-metric-alarm \
  --alarm-name elasticache-high-cpu \
  --alarm-description "ElastiCache CPU above 80%" \
  --metric-name EngineCPUUtilization \
  --namespace AWS/ElastiCache \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=CacheClusterId,Value=my-redis-001 \
  --evaluation-periods 3 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:cache-alerts

# Alarm: High Memory Usage
aws cloudwatch put-metric-alarm \
  --alarm-name elasticache-high-memory \
  --alarm-description "ElastiCache memory above 80%" \
  --metric-name DatabaseMemoryUsagePercentage \
  --namespace AWS/ElastiCache \
  --statistic Maximum \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=CacheClusterId,Value=my-redis-001 \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:cache-alerts

# Alarm: High Evictions
aws cloudwatch put-metric-alarm \
  --alarm-name elasticache-high-evictions \
  --alarm-description "ElastiCache evictions exceeding threshold" \
  --metric-name Evictions \
  --namespace AWS/ElastiCache \
  --statistic Sum \
  --period 300 \
  --threshold 1000 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=CacheClusterId,Value=my-redis-001 \
  --evaluation-periods 3 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:cache-alerts

# Alarm: Replication Lag (Redis)
aws cloudwatch put-metric-alarm \
  --alarm-name elasticache-replication-lag \
  --alarm-description "ElastiCache replication lag above 1 second" \
  --metric-name ReplicationLag \
  --namespace AWS/ElastiCache \
  --statistic Maximum \
  --period 60 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=CacheClusterId,Value=my-redis-002 \
  --evaluation-periods 5 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:cache-alerts

# Alarm: Connection Count Approaching Limit
aws cloudwatch put-metric-alarm \
  --alarm-name elasticache-high-connections \
  --alarm-description "ElastiCache connections approaching limit" \
  --metric-name CurrConnections \
  --namespace AWS/ElastiCache \
  --statistic Maximum \
  --period 300 \
  --threshold 60000 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=CacheClusterId,Value=my-redis-001 \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:cache-alerts
```

## Creating a CloudWatch Dashboard

Build a dashboard that gives you a quick overview of your cache health.

Here's a CloudFormation template for a monitoring dashboard:

```json
{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "ElastiCacheDashboard": {
      "Type": "AWS::CloudWatch::Dashboard",
      "Properties": {
        "DashboardName": "ElastiCache-Monitoring",
        "DashboardBody": "{\"widgets\":[{\"type\":\"metric\",\"x\":0,\"y\":0,\"width\":12,\"height\":6,\"properties\":{\"metrics\":[[\"AWS/ElastiCache\",\"EngineCPUUtilization\",\"CacheClusterId\",\"my-redis-001\"],[\".\",\".\",\".\",\"my-redis-002\"]],\"period\":60,\"stat\":\"Average\",\"region\":\"us-east-1\",\"title\":\"Engine CPU Utilization\"}},{\"type\":\"metric\",\"x\":12,\"y\":0,\"width\":12,\"height\":6,\"properties\":{\"metrics\":[[\"AWS/ElastiCache\",\"DatabaseMemoryUsagePercentage\",\"CacheClusterId\",\"my-redis-001\"],[\".\",\".\",\".\",\"my-redis-002\"]],\"period\":60,\"stat\":\"Average\",\"region\":\"us-east-1\",\"title\":\"Memory Usage %\"}},{\"type\":\"metric\",\"x\":0,\"y\":6,\"width\":12,\"height\":6,\"properties\":{\"metrics\":[[\"AWS/ElastiCache\",\"CacheHitRate\",\"CacheClusterId\",\"my-redis-001\"]],\"period\":60,\"stat\":\"Average\",\"region\":\"us-east-1\",\"title\":\"Cache Hit Rate\"}},{\"type\":\"metric\",\"x\":12,\"y\":6,\"width\":12,\"height\":6,\"properties\":{\"metrics\":[[\"AWS/ElastiCache\",\"Evictions\",\"CacheClusterId\",\"my-redis-001\"]],\"period\":300,\"stat\":\"Sum\",\"region\":\"us-east-1\",\"title\":\"Evictions\"}}]}"
      }
    }
  }
}
```

## Automated Monitoring Script

Here's a Python script that checks all critical metrics and generates a health report:

```python
import boto3
from datetime import datetime, timedelta, timezone

def check_elasticache_health(cluster_ids, region='us-east-1'):
    """
    Generate a health report for ElastiCache clusters.
    """
    cw = boto3.client('cloudwatch', region_name=region)
    now = datetime.now(timezone.utc)
    start = now - timedelta(minutes=30)

    thresholds = {
        'EngineCPUUtilization': {'warning': 70, 'critical': 90},
        'DatabaseMemoryUsagePercentage': {'warning': 75, 'critical': 90},
        'CurrConnections': {'warning': 50000, 'critical': 60000},
        'ReplicationLag': {'warning': 0.5, 'critical': 2.0},
    }

    issues = []

    for cluster_id in cluster_ids:
        print(f"\nCluster: {cluster_id}")
        print("-" * 50)

        for metric_name, limits in thresholds.items():
            try:
                data = cw.get_metric_statistics(
                    Namespace='AWS/ElastiCache',
                    MetricName=metric_name,
                    Dimensions=[{
                        'Name': 'CacheClusterId',
                        'Value': cluster_id
                    }],
                    StartTime=start,
                    EndTime=now,
                    Period=60,
                    Statistics=['Average', 'Maximum']
                )

                if not data['Datapoints']:
                    print(f"  {metric_name}: No data")
                    continue

                latest = sorted(
                    data['Datapoints'],
                    key=lambda x: x['Timestamp']
                )[-1]
                avg = latest.get('Average', 0)
                mx = latest.get('Maximum', 0)

                status = 'OK'
                if mx >= limits['critical']:
                    status = 'CRITICAL'
                    issues.append(f"{cluster_id}: {metric_name} at {mx:.2f}")
                elif mx >= limits['warning']:
                    status = 'WARNING'
                    issues.append(f"{cluster_id}: {metric_name} at {mx:.2f}")

                print(f"  {metric_name}: avg={avg:.2f} max={mx:.2f} [{status}]")

            except Exception as e:
                print(f"  {metric_name}: Error - {e}")

    if issues:
        print(f"\nISSUES FOUND ({len(issues)}):")
        for issue in issues:
            print(f"  - {issue}")
    else:
        print("\nAll clusters healthy.")

    return issues

# Run the health check
check_elasticache_health([
    'my-redis-001',
    'my-redis-002',
    'my-redis-003'
])
```

## Monitoring Memcached-Specific Metrics

If you're running Memcached instead of Redis, these metrics are particularly important:

```bash
# Memcached: Check unused memory
aws cloudwatch get-metric-statistics \
  --namespace AWS/ElastiCache \
  --metric-name UnusedMemory \
  --dimensions Name=CacheClusterId,Value=my-memcached-001 \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average Minimum

# Memcached: Get/Set ratio
aws cloudwatch get-metric-statistics \
  --namespace AWS/ElastiCache \
  --metric-name GetHits \
  --dimensions Name=CacheClusterId,Value=my-memcached-001 \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

## Alerting Best Practices

**Don't alert on everything.** If every metric triggers an alarm, you'll get alert fatigue and start ignoring them. Focus on the Tier 1 metrics.

**Use multiple evaluation periods.** A brief CPU spike is normal. Sustained high CPU is a problem. Use evaluation periods of 3-5 minutes before alerting.

**Set different thresholds for warning and critical.** Warning at 75% gives you time to investigate. Critical at 90% means action is needed now.

**Include runbook links in alarm descriptions.** When someone gets paged at 3 AM, they need to know what to do:

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name elasticache-critical-memory \
  --alarm-description "CRITICAL: ElastiCache memory above 90%. Runbook: https://wiki.internal/runbooks/elasticache-memory" \
  --metric-name DatabaseMemoryUsagePercentage \
  --namespace AWS/ElastiCache \
  --statistic Maximum \
  --period 60 \
  --threshold 90 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=CacheClusterId,Value=my-redis-001 \
  --evaluation-periods 3 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:pagerduty-critical
```

## Wrapping Up

Good monitoring is the difference between catching a cache issue during business hours and getting paged at midnight when users are seeing errors. Set up the critical alarms first (CPU, memory, evictions), build a dashboard for daily observation, and use automated health checks for comprehensive coverage.

For more on managing your ElastiCache infrastructure, check out the guides on [scaling ElastiCache Redis clusters](https://oneuptime.com/blog/post/scale-elasticache-redis-clusters/view) when you need more capacity, and [setting up ElastiCache Redis backups](https://oneuptime.com/blog/post/set-up-elasticache-redis-backups/view) for disaster recovery.
