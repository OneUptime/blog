# How to Set Up CloudWatch Alarms for RDS Metrics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, RDS, CloudWatch, Monitoring, Alerting

Description: A practical guide to creating CloudWatch alarms for critical RDS metrics including CPU, storage, connections, and replication lag with recommended thresholds.

---

Running an RDS database without alarms is like driving without a dashboard. Everything feels fine until it suddenly isn't. By the time your users start complaining about slow queries or failed connections, the problem has been building for a while.

CloudWatch alarms let you catch issues before they become outages. You set thresholds on key metrics, and AWS notifies you when something crosses the line. The trick is knowing which metrics matter and what thresholds to set. Too sensitive and you'll get alert fatigue. Too loose and you'll miss real problems.

## Setting Up SNS for Alarm Notifications

Before creating alarms, you need somewhere to send the notifications. Create an SNS topic and subscribe your team:

```bash
# Create an SNS topic for database alerts
aws sns create-topic --name rds-critical-alerts

# Subscribe an email address to the topic
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:rds-critical-alerts \
  --protocol email \
  --notification-endpoint dba-team@example.com

# You can also subscribe a Slack webhook via Lambda, PagerDuty, etc.
```

Confirm the email subscription when you get the confirmation message.

## Essential RDS Alarms

Here are the alarms every production RDS instance should have, along with recommended thresholds and the reasoning behind them.

### 1. High CPU Utilization

Sustained high CPU means the database can't keep up with query load. Brief spikes are normal, but if CPU stays elevated, you've got a problem.

```bash
# Alert when CPU stays above 80% for 15 minutes
aws cloudwatch put-metric-alarm \
  --alarm-name "rds-mydb-cpu-high" \
  --alarm-description "RDS CPU utilization above 80% for 15 minutes" \
  --metric-name CPUUtilization \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 3 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=DBInstanceIdentifier,Value=my-database \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:rds-critical-alerts \
  --ok-actions arn:aws:sns:us-east-1:123456789012:rds-critical-alerts
```

Why 80%? You want headroom. At 100%, new queries queue up and latency spikes. Setting the alarm at 80% gives you time to investigate and act before users are affected.

### 2. Low Free Storage Space

Running out of disk space will crash your database. RDS doesn't auto-expand storage by default (though you can enable it), so this alarm is critical.

```bash
# Alert when free storage drops below 10 GB
aws cloudwatch put-metric-alarm \
  --alarm-name "rds-mydb-storage-low" \
  --alarm-description "RDS free storage below 10 GB" \
  --metric-name FreeStorageSpace \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 10737418240 \
  --comparison-operator LessThanThreshold \
  --dimensions Name=DBInstanceIdentifier,Value=my-database \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:rds-critical-alerts
```

Note: The threshold is in bytes (10 GB = 10,737,418,240 bytes). Adjust based on your database size and growth rate. For a 500 GB database, 10 GB might only give you hours of runway.

### 3. Low Freeable Memory

When RDS runs low on memory, the OS starts swapping to disk, which destroys database performance.

```bash
# Alert when freeable memory drops below 500 MB
aws cloudwatch put-metric-alarm \
  --alarm-name "rds-mydb-memory-low" \
  --alarm-description "RDS freeable memory below 500 MB" \
  --metric-name FreeableMemory \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 3 \
  --threshold 524288000 \
  --comparison-operator LessThanThreshold \
  --dimensions Name=DBInstanceIdentifier,Value=my-database \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:rds-critical-alerts
```

### 4. High Database Connections

Every database connection consumes memory. Too many connections can exhaust memory or hit the configured max_connections limit, causing connection failures.

```bash
# Alert when connection count exceeds 80% of max_connections
# For db.r6g.large with default max_connections around 700
aws cloudwatch put-metric-alarm \
  --alarm-name "rds-mydb-connections-high" \
  --alarm-description "RDS connection count above 560" \
  --metric-name DatabaseConnections \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 560 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=DBInstanceIdentifier,Value=my-database \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:rds-critical-alerts
```

### 5. High Read and Write Latency

Latency spikes indicate I/O problems. This could be caused by under-provisioned storage, unoptimized queries, or reaching the IOPS limit.

```bash
# Alert when read latency exceeds 20ms
aws cloudwatch put-metric-alarm \
  --alarm-name "rds-mydb-read-latency-high" \
  --alarm-description "RDS read latency above 20ms" \
  --metric-name ReadLatency \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 3 \
  --threshold 0.02 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=DBInstanceIdentifier,Value=my-database \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:rds-critical-alerts

# Alert when write latency exceeds 20ms
aws cloudwatch put-metric-alarm \
  --alarm-name "rds-mydb-write-latency-high" \
  --alarm-description "RDS write latency above 20ms" \
  --metric-name WriteLatency \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 3 \
  --threshold 0.02 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=DBInstanceIdentifier,Value=my-database \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:rds-critical-alerts
```

Note: Latency is measured in seconds in CloudWatch, so 0.02 = 20 milliseconds.

### 6. Replication Lag (For Read Replicas)

If you're using read replicas, replication lag tells you how far behind the replica is from the primary. High lag means reads from replicas return stale data.

```bash
# Alert when replication lag exceeds 30 seconds
aws cloudwatch put-metric-alarm \
  --alarm-name "rds-replica-lag-high" \
  --alarm-description "RDS replication lag above 30 seconds" \
  --metric-name ReplicaLag \
  --namespace AWS/RDS \
  --statistic Average \
  --period 60 \
  --evaluation-periods 5 \
  --threshold 30 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=DBInstanceIdentifier,Value=my-read-replica \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:rds-critical-alerts
```

### 7. Swap Usage

Any swap usage on an RDS instance is a bad sign. It means the database has run out of RAM and is using disk as memory, which is catastrophically slow.

```bash
# Alert when swap usage exceeds 100 MB
aws cloudwatch put-metric-alarm \
  --alarm-name "rds-mydb-swap-high" \
  --alarm-description "RDS swap usage above 100 MB" \
  --metric-name SwapUsage \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 104857600 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=DBInstanceIdentifier,Value=my-database \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:rds-critical-alerts
```

## Automating Alarm Creation with a Script

If you have multiple RDS instances, creating alarms manually is tedious. Here's a script that sets up the essential alarms for all instances:

```python
import boto3

def create_standard_alarms(instance_id, sns_topic_arn):
    """Create a standard set of CloudWatch alarms for an RDS instance."""
    cloudwatch = boto3.client('cloudwatch')

    alarms = [
        {
            'name': f'rds-{instance_id}-cpu-high',
            'metric': 'CPUUtilization',
            'threshold': 80,
            'operator': 'GreaterThanThreshold',
            'periods': 3,
            'description': f'CPU above 80% on {instance_id}'
        },
        {
            'name': f'rds-{instance_id}-storage-low',
            'metric': 'FreeStorageSpace',
            'threshold': 10737418240,
            'operator': 'LessThanThreshold',
            'periods': 1,
            'description': f'Free storage below 10GB on {instance_id}'
        },
        {
            'name': f'rds-{instance_id}-memory-low',
            'metric': 'FreeableMemory',
            'threshold': 524288000,
            'operator': 'LessThanThreshold',
            'periods': 3,
            'description': f'Freeable memory below 500MB on {instance_id}'
        },
        {
            'name': f'rds-{instance_id}-connections-high',
            'metric': 'DatabaseConnections',
            'threshold': 500,
            'operator': 'GreaterThanThreshold',
            'periods': 2,
            'description': f'Connection count above 500 on {instance_id}'
        }
    ]

    for alarm in alarms:
        cloudwatch.put_metric_alarm(
            AlarmName=alarm['name'],
            AlarmDescription=alarm['description'],
            MetricName=alarm['metric'],
            Namespace='AWS/RDS',
            Statistic='Average',
            Period=300,
            EvaluationPeriods=alarm['periods'],
            Threshold=alarm['threshold'],
            ComparisonOperator=alarm['operator'],
            Dimensions=[
                {'Name': 'DBInstanceIdentifier', 'Value': instance_id}
            ],
            AlarmActions=[sns_topic_arn],
            OKActions=[sns_topic_arn]
        )
        print(f"Created alarm: {alarm['name']}")

# Create alarms for all RDS instances
rds = boto3.client('rds')
instances = rds.describe_db_instances()['DBInstances']
topic = 'arn:aws:sns:us-east-1:123456789012:rds-critical-alerts'

for instance in instances:
    create_standard_alarms(instance['DBInstanceIdentifier'], topic)
```

## Testing Your Alarms

After setting up alarms, test them. You can use the `set-alarm-state` command to temporarily trigger an alarm and verify notifications are working:

```bash
# Temporarily trigger an alarm to test notification delivery
aws cloudwatch set-alarm-state \
  --alarm-name "rds-mydb-cpu-high" \
  --state-value ALARM \
  --state-reason "Testing alarm notification"
```

This doesn't affect your actual metrics. It just fires the alarm action so you can confirm that emails, Slack messages, or PagerDuty alerts come through.

## Tuning Thresholds Over Time

The thresholds I've suggested here are reasonable starting points, but every workload is different. After running for a few weeks, review your alarm history. If an alarm fires frequently during normal operation, increase the threshold or evaluation period. If you've had incidents that the alarms didn't catch, lower the threshold.

For more advanced monitoring, consider combining CloudWatch alarms with [RDS Performance Insights](https://oneuptime.com/blog/post/monitor-rds-with-performance-insights/view) and [Enhanced Monitoring](https://oneuptime.com/blog/post/enable-rds-enhanced-monitoring/view). CloudWatch alarms tell you something is wrong, while Performance Insights and Enhanced Monitoring help you figure out why.
