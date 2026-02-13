# How to Enable RDS Enhanced Monitoring

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, RDS, Monitoring, CloudWatch, Database

Description: Learn how to enable and configure RDS Enhanced Monitoring to get granular OS-level metrics for CPU, memory, file system, and process information.

---

Standard CloudWatch metrics for RDS update every 60 seconds and cover the basics - CPU utilization, free memory, disk I/O. That's fine for general health checks, but when you're debugging a production issue at 3 AM, you need more granularity. You need to know what's happening at the operating system level, second by second.

That's what RDS Enhanced Monitoring provides. It gives you OS-level metrics at intervals as low as 1 second, published to CloudWatch Logs. You get detailed breakdowns of CPU usage by process, memory allocation, file system utilization, and network throughput - all the stuff that standard CloudWatch metrics don't cover.

## What Enhanced Monitoring Gives You That Standard Metrics Don't

Standard CloudWatch metrics come from the hypervisor - they're an outside-in view of your instance. Enhanced Monitoring runs an agent on the instance itself, giving you an inside-out perspective.

Here's a comparison:

| Metric | Standard CloudWatch | Enhanced Monitoring |
|---|---|---|
| CPU | Total utilization % | Per-process CPU, user/system/idle/wait breakdown |
| Memory | Freeable memory only | Total, free, cached, buffered, active, inactive |
| Disk | Read/write IOPS and throughput | Per-filesystem usage, read/write latency |
| Network | Basic throughput | Detailed per-interface statistics |
| Processes | Not available | Top processes by CPU and memory |
| Granularity | 60 seconds | 1, 5, 10, 15, 30, or 60 seconds |

The process-level information is particularly valuable. You can see if the database engine process is consuming most of the CPU, or if it's something else like a backup process or OS maintenance task eating resources.

## Prerequisites: The Enhanced Monitoring IAM Role

Before enabling Enhanced Monitoring, you need an IAM role that allows RDS to publish metrics to CloudWatch Logs. AWS provides a managed policy for this.

Create the role using the CLI:

```bash
# Create the trust policy document for the Enhanced Monitoring role
cat > /tmp/em-trust-policy.json << 'TRUST'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "monitoring.rds.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
TRUST

# Create the IAM role
aws iam create-role \
  --role-name rds-enhanced-monitoring-role \
  --assume-role-policy-document file:///tmp/em-trust-policy.json

# Attach the AWS managed policy for Enhanced Monitoring
aws iam attach-role-policy \
  --role-name rds-enhanced-monitoring-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole
```

## Enabling Enhanced Monitoring on a New Instance

When creating a new RDS instance, include the monitoring parameters:

```bash
# Create an RDS instance with Enhanced Monitoring enabled at 10-second intervals
aws rds create-db-instance \
  --db-instance-identifier my-monitored-db \
  --db-instance-class db.r6g.large \
  --engine postgres \
  --master-username admin \
  --master-user-password "$DB_PASSWORD" \
  --allocated-storage 100 \
  --monitoring-interval 10 \
  --monitoring-role-arn arn:aws:iam::123456789012:role/rds-enhanced-monitoring-role
```

The `--monitoring-interval` accepts values of 0 (disabled), 1, 5, 10, 15, 30, or 60 seconds. Lower intervals give you more detail but generate more data and cost more.

## Enabling Enhanced Monitoring on an Existing Instance

For an instance that's already running:

```bash
# Enable Enhanced Monitoring on an existing RDS instance
aws rds modify-db-instance \
  --db-instance-identifier my-existing-db \
  --monitoring-interval 10 \
  --monitoring-role-arn arn:aws:iam::123456789012:role/rds-enhanced-monitoring-role \
  --apply-immediately
```

This change takes effect within a few minutes. There's no downtime or restart required.

## Reading Enhanced Monitoring Data

Enhanced Monitoring data goes to CloudWatch Logs in the `/aws/rds/enhanced-monitoring` log group. Each RDS instance gets its own log stream named after the DBI resource ID.

You can view it in the RDS console - select your instance, then click the "Monitoring" tab and switch to "Enhanced monitoring" from the dropdown.

To pull the data programmatically:

```python
import boto3
import json
from datetime import datetime, timedelta

logs_client = boto3.client('logs')

# Get the latest Enhanced Monitoring data
response = logs_client.get_log_events(
    logGroupName='/aws/rds/enhanced-monitoring',
    logStreamName='db-ABCDEFGHIJKLMNOP',  # Your DBI resource ID
    startTime=int((datetime.utcnow() - timedelta(minutes=5)).timestamp() * 1000),
    endTime=int(datetime.utcnow().timestamp() * 1000),
    limit=10
)

for event in response['events']:
    data = json.loads(event['message'])

    # Extract key OS metrics
    cpu = data['cpuUtilization']
    memory = data['memory']

    print(f"Timestamp: {data['timestamp']}")
    print(f"CPU - User: {cpu['user']}%, System: {cpu['system']}%, "
          f"Wait: {cpu['wait']}%, Idle: {cpu['idle']}%")
    print(f"Memory - Total: {memory['total']}KB, "
          f"Free: {memory['free']}KB, "
          f"Cached: {memory['cached']}KB")
    print("---")
```

## Understanding the Metrics

### CPU Breakdown

Enhanced Monitoring splits CPU into several categories:

- **user**: Time spent running user-space processes (your database engine)
- **system**: Time spent on kernel operations
- **wait**: Time waiting for I/O operations to complete
- **idle**: CPU not doing anything
- **steal**: Time the virtual CPU waited because the hypervisor was busy serving other instances
- **nice**: Time spent on low-priority processes

High `wait` percentages indicate I/O bottlenecks - the CPU is ready to work but stuck waiting for disk. High `steal` percentages suggest your instance is on a noisy neighbor and you might want to try stopping and starting it to get placed on different hardware.

### Memory Details

The memory section gives you a complete picture:

```json
{
  "total": 16384000,
  "free": 1024000,
  "cached": 8192000,
  "buffers": 512000,
  "active": 10240000,
  "inactive": 4096000
}
```

Don't panic if `free` memory is low. Linux aggressively caches data in memory, so `cached` memory is effectively available. The real concern is when `free + cached + buffers` drops below a reasonable threshold.

### Process List

One of the most useful features is the process list. It shows you the top processes sorted by CPU and memory:

```json
{
  "processList": [
    {
      "name": "mysqld",
      "pid": 1234,
      "cpuUsedPc": 45.2,
      "memoryUsedPc": 62.1,
      "vss": 8388608,
      "rss": 6291456
    },
    {
      "name": "innobackupex",
      "pid": 5678,
      "cpuUsedPc": 30.1,
      "memoryUsedPc": 5.2,
      "vss": 524288,
      "rss": 262144
    }
  ]
}
```

In this example, you can immediately see that both the MySQL daemon and a backup process are consuming significant CPU. If you weren't expecting a backup to run at this time, you've found your problem.

## Creating Custom CloudWatch Metrics from Enhanced Monitoring

You can extract specific metrics from Enhanced Monitoring and publish them as custom CloudWatch metrics for alerting:

```python
import boto3
import json

cloudwatch = boto3.client('cloudwatch')

def process_enhanced_monitoring(event, context):
    """Lambda function triggered by Enhanced Monitoring log events."""
    for record in event['Records']:
        data = json.loads(record['body'])

        # Publish CPU wait percentage as a custom metric
        cloudwatch.put_metric_data(
            Namespace='Custom/RDS/Enhanced',
            MetricData=[
                {
                    'MetricName': 'CPUWaitPercent',
                    'Value': data['cpuUtilization']['wait'],
                    'Unit': 'Percent',
                    'Dimensions': [
                        {
                            'Name': 'DBInstanceIdentifier',
                            'Value': data['instanceID']
                        }
                    ]
                },
                {
                    'MetricName': 'CPUStealPercent',
                    'Value': data['cpuUtilization']['steal'],
                    'Unit': 'Percent',
                    'Dimensions': [
                        {
                            'Name': 'DBInstanceIdentifier',
                            'Value': data['instanceID']
                        }
                    ]
                }
            ]
        )
```

## Cost Considerations

Enhanced Monitoring data is stored in CloudWatch Logs, so you pay for:

- **Data ingestion**: The amount of log data published per month
- **Data storage**: How long you retain the logs

For a single instance with 10-second granularity, expect roughly 2-3 GB of log data per month. At standard CloudWatch Logs pricing, that's about $1.50-2.00/month per instance. Not expensive, but it adds up if you have dozens of instances at 1-second intervals.

To control costs, consider:
- Using 10 or 15-second intervals for most instances (1-second is rarely needed)
- Setting a CloudWatch Logs retention period so old data gets cleaned up automatically
- Only enabling Enhanced Monitoring on production instances

## Best Practices

Use Enhanced Monitoring alongside [Performance Insights](https://oneuptime.com/blog/post/2026-02-12-monitor-rds-with-performance-insights/view). They complement each other perfectly. Performance Insights shows you what the database engine is doing (queries, waits, locks), while Enhanced Monitoring shows you what the OS is doing (CPU, memory, disk, processes).

Set up [CloudWatch alarms](https://oneuptime.com/blog/post/2026-02-12-set-up-cloudwatch-alarms-for-rds-metrics/view) on the custom metrics you extract from Enhanced Monitoring. Alerting on CPU steal or I/O wait is much more actionable than alerting on total CPU utilization.

During incidents, start with Enhanced Monitoring to determine if the problem is CPU-bound, I/O-bound, or memory-bound. Then switch to Performance Insights to identify the specific queries causing the load. This two-tool approach gets you from symptom to root cause faster than either tool alone.
