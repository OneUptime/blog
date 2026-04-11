# How to Export Redis Metrics to CloudWatch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, CloudWatch, AWS, Monitoring, Metric

Description: Export Redis metrics to AWS CloudWatch using ElastiCache built-in metrics or a custom Lambda exporter for self-hosted Redis on EC2.

---

AWS CloudWatch is the native monitoring solution for workloads on AWS. Whether you use ElastiCache for Redis or run Redis on EC2, you can push Redis metrics to CloudWatch for unified dashboards and alarms.

## Option 1 - ElastiCache Metrics (Managed Redis)

If you use Amazon ElastiCache for Redis, metrics are published to CloudWatch automatically under the `AWS/ElastiCache` namespace. No additional configuration is needed.

Key metrics available:

```text
CurrConnections        - Current client connections
CacheHits              - Successful key lookups
CacheMisses            - Failed key lookups
Evictions              - Keys evicted due to maxmemory
CurrItems              - Total keys across all databases
NetworkBytesIn         - Bytes read from the network
NetworkBytesOut        - Bytes sent to the network
EngineCPUUtilization   - CPU used by Redis process
DatabaseMemoryUsagePercentage - Memory as % of available
ReplicationLag         - Replica lag in seconds
```

Query them with the AWS CLI:

```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/ElastiCache \
  --metric-name CacheHits \
  --dimensions Name=CacheClusterId,Value=my-redis-cluster \
  --start-time 2026-03-31T00:00:00Z \
  --end-time 2026-03-31T01:00:00Z \
  --period 60 \
  --statistics Average
```

## Option 2 - Custom Metrics from Self-Hosted Redis

For Redis running on EC2 or ECS, write a Lambda function or a cron job that reads `INFO` and pushes custom metrics:

```python
import boto3
import redis
import datetime

def push_redis_metrics(host: str, port: int, namespace: str = "Custom/Redis"):
    r = redis.Redis(host=host, port=port, decode_responses=True)
    info = r.info("all")
    cw = boto3.client("cloudwatch", region_name="us-east-1")

    metrics = [
        ("OpsPerSecond", info["instantaneous_ops_per_sec"], "Count/Second"),
        ("UsedMemoryMB", info["used_memory"] / 1024 / 1024, "Megabytes"),
        ("ConnectedClients", info["connected_clients"], "Count"),
        ("KeyspaceHits", info["keyspace_hits"], "Count"),
        ("KeyspaceMisses", info["keyspace_misses"], "Count"),
        ("EvictedKeys", info["evicted_keys"], "Count"),
    ]

    metric_data = [
        {
            "MetricName": name,
            "Value": value,
            "Unit": unit,
            "Timestamp": datetime.datetime.utcnow(),
            "Dimensions": [{"Name": "Host", "Value": host}],
        }
        for name, value, unit in metrics
    ]

    cw.put_metric_data(Namespace=namespace, MetricData=metric_data)
    print(f"Pushed {len(metric_data)} metrics to CloudWatch")

push_redis_metrics("localhost", 6379)
```

## Creating CloudWatch Alarms

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "Redis-High-Evictions" \
  --namespace "AWS/ElastiCache" \
  --metric-name Evictions \
  --dimensions Name=CacheClusterId,Value=my-redis-cluster \
  --statistic Sum \
  --period 300 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:redis-alerts
```

## Building a CloudWatch Dashboard

Use the AWS Console or define dashboards as code:

```bash
aws cloudwatch put-dashboard \
  --dashboard-name "Redis-Overview" \
  --dashboard-body file://redis-dashboard.json
```

Where `redis-dashboard.json` contains widget definitions referencing `AWS/ElastiCache` metrics.

## Summary

ElastiCache publishes Redis metrics to CloudWatch automatically, while self-hosted Redis requires a custom exporter (Lambda or cron) using the Python boto3 SDK. Either way, you get CloudWatch Alarms for threshold-based alerting and dashboard widgets for real-time visibility into Redis health on AWS.
