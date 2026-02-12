# How to Monitor EFS with CloudWatch

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EFS, CloudWatch, Monitoring

Description: Set up comprehensive CloudWatch monitoring for Amazon EFS including throughput, IOPS, burst credits, client connections, and storage metrics with practical alarms.

---

EFS is a managed service, so you don't have to worry about hardware failures or capacity planning. But "managed" doesn't mean "no monitoring needed." You still need to know if your file system is running out of burst credits, if throughput is saturated, how many clients are connected, and how fast your storage is growing. CloudWatch gives you all of this.

Let's set up a practical monitoring approach that catches problems before they impact your applications.

## Key EFS Metrics

EFS publishes several CloudWatch metrics. Here are the ones that actually matter:

| Metric | What It Tells You | Why It Matters |
|--------|-------------------|----------------|
| BurstCreditBalance | Remaining burst credits (bytes) | When this hits zero, throughput drops to baseline |
| PercentIOLimit | % of General Purpose IOPS limit used | Tells you if you need Max I/O mode |
| TotalIOBytes | Total bytes transferred per period | Your actual throughput |
| DataReadIOBytes | Bytes read per period | Read throughput |
| DataWriteIOBytes | Bytes written per period | Write throughput |
| MetadataIOBytes | Bytes for metadata operations | High values suggest lots of small file operations |
| ClientConnections | Number of active NFS connections | Client count per mount target |
| StorageBytes | Total data stored by storage class | Track storage growth and IA effectiveness |

## Setting Up Essential Alarms

### Burst Credit Alarm

This is the most important alarm for file systems using bursting throughput mode. When burst credits run out, your throughput drops dramatically.

```bash
# Alert when burst credits fall below 1 TB
aws cloudwatch put-metric-alarm \
  --alarm-name "efs-burst-credits-critical" \
  --alarm-description "EFS burst credits below 1 TB - throughput may degrade soon" \
  --namespace "AWS/EFS" \
  --metric-name "BurstCreditBalance" \
  --dimensions "Name=FileSystemId,Value=fs-0abc123def456789" \
  --statistic Average \
  --period 300 \
  --evaluation-periods 6 \
  --threshold 1099511627776 \
  --comparison-operator LessThanThreshold \
  --alarm-actions "arn:aws:sns:us-east-1:123456789012:ops-critical" \
  --treat-missing-data "breaching"
```

Add a warning alarm at a higher threshold so you have time to react:

```bash
# Warning at 2 TB
aws cloudwatch put-metric-alarm \
  --alarm-name "efs-burst-credits-warning" \
  --alarm-description "EFS burst credits below 2 TB - investigate throughput usage" \
  --namespace "AWS/EFS" \
  --metric-name "BurstCreditBalance" \
  --dimensions "Name=FileSystemId,Value=fs-0abc123def456789" \
  --statistic Average \
  --period 300 \
  --evaluation-periods 12 \
  --threshold 2199023255552 \
  --comparison-operator LessThanThreshold \
  --alarm-actions "arn:aws:sns:us-east-1:123456789012:ops-warning"
```

### IOPS Limit Alarm

For General Purpose performance mode, monitor how close you are to the IOPS ceiling:

```bash
# Alert when approaching IOPS limit
aws cloudwatch put-metric-alarm \
  --alarm-name "efs-iops-limit-warning" \
  --alarm-description "EFS approaching General Purpose IOPS limit" \
  --namespace "AWS/EFS" \
  --metric-name "PercentIOLimit" \
  --dimensions "Name=FileSystemId,Value=fs-0abc123def456789" \
  --statistic Maximum \
  --period 300 \
  --evaluation-periods 6 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions "arn:aws:sns:us-east-1:123456789012:ops-warning"
```

If this alarm fires consistently, it's time to consider Max I/O performance mode. See our post on [EFS performance modes](https://oneuptime.com/blog/post/efs-performance-modes-general-purpose-max-io/view) for guidance.

### Client Connection Alarm

Track unexpected changes in client connections:

```bash
# Alert if connections drop to zero (no clients connected)
aws cloudwatch put-metric-alarm \
  --alarm-name "efs-no-connections" \
  --alarm-description "No clients connected to EFS - possible mount issue" \
  --namespace "AWS/EFS" \
  --metric-name "ClientConnections" \
  --dimensions "Name=FileSystemId,Value=fs-0abc123def456789" \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 0 \
  --comparison-operator LessThanOrEqualToThreshold \
  --alarm-actions "arn:aws:sns:us-east-1:123456789012:ops-warning"
```

## Building a CloudWatch Dashboard

Create a dashboard that gives you a single-pane view of your EFS health:

```bash
# Create a comprehensive EFS dashboard
aws cloudwatch put-dashboard \
  --dashboard-name "EFS-Monitoring" \
  --dashboard-body '{
    "widgets": [
      {
        "type": "metric",
        "x": 0, "y": 0, "width": 12, "height": 6,
        "properties": {
          "title": "Throughput (MB/s)",
          "metrics": [
            ["AWS/EFS", "DataReadIOBytes", "FileSystemId", "fs-0abc123def456789", {"stat": "Sum", "period": 60, "label": "Read", "id": "read"}],
            ["AWS/EFS", "DataWriteIOBytes", "FileSystemId", "fs-0abc123def456789", {"stat": "Sum", "period": 60, "label": "Write", "id": "write"}],
            [{"expression": "(read+write)/1048576/60", "label": "Total MB/s", "id": "total"}]
          ],
          "view": "timeSeries",
          "region": "us-east-1",
          "period": 60
        }
      },
      {
        "type": "metric",
        "x": 12, "y": 0, "width": 12, "height": 6,
        "properties": {
          "title": "Burst Credit Balance (GB)",
          "metrics": [
            ["AWS/EFS", "BurstCreditBalance", "FileSystemId", "fs-0abc123def456789", {"stat": "Average", "period": 300}]
          ],
          "view": "timeSeries",
          "region": "us-east-1",
          "yAxis": {"left": {"min": 0}}
        }
      },
      {
        "type": "metric",
        "x": 0, "y": 6, "width": 12, "height": 6,
        "properties": {
          "title": "IO Limit Utilization (%)",
          "metrics": [
            ["AWS/EFS", "PercentIOLimit", "FileSystemId", "fs-0abc123def456789", {"stat": "Maximum", "period": 60}]
          ],
          "view": "timeSeries",
          "region": "us-east-1",
          "yAxis": {"left": {"min": 0, "max": 100}},
          "annotations": {
            "horizontal": [{"value": 80, "label": "Warning", "color": "#FF9900"}]
          }
        }
      },
      {
        "type": "metric",
        "x": 12, "y": 6, "width": 12, "height": 6,
        "properties": {
          "title": "Client Connections",
          "metrics": [
            ["AWS/EFS", "ClientConnections", "FileSystemId", "fs-0abc123def456789", {"stat": "Sum", "period": 60}]
          ],
          "view": "timeSeries",
          "region": "us-east-1"
        }
      },
      {
        "type": "metric",
        "x": 0, "y": 12, "width": 12, "height": 6,
        "properties": {
          "title": "Storage by Class (GB)",
          "metrics": [
            ["AWS/EFS", "StorageBytes", "FileSystemId", "fs-0abc123def456789", "StorageClass", "Standard", {"stat": "Average", "period": 86400}],
            ["AWS/EFS", "StorageBytes", "FileSystemId", "fs-0abc123def456789", "StorageClass", "IA", {"stat": "Average", "period": 86400}]
          ],
          "view": "timeSeries",
          "region": "us-east-1"
        }
      },
      {
        "type": "metric",
        "x": 12, "y": 12, "width": 12, "height": 6,
        "properties": {
          "title": "Metadata vs Data IO",
          "metrics": [
            ["AWS/EFS", "MetadataIOBytes", "FileSystemId", "fs-0abc123def456789", {"stat": "Sum", "period": 300, "label": "Metadata"}],
            ["AWS/EFS", "DataReadIOBytes", "FileSystemId", "fs-0abc123def456789", {"stat": "Sum", "period": 300, "label": "Data Read"}],
            ["AWS/EFS", "DataWriteIOBytes", "FileSystemId", "fs-0abc123def456789", {"stat": "Sum", "period": 300, "label": "Data Write"}]
          ],
          "view": "timeSeries",
          "region": "us-east-1"
        }
      }
    ]
  }'
```

## Automated Monitoring Script

Here's a Python script that generates a comprehensive health report:

```python
import boto3
from datetime import datetime, timedelta

def efs_health_report(file_system_id, region='us-east-1'):
    """Generate a health report for an EFS file system."""
    efs = boto3.client('efs', region_name=region)
    cw = boto3.client('cloudwatch', region_name=region)

    # Get file system info
    fs = efs.describe_file_systems(FileSystemId=file_system_id)['FileSystems'][0]

    print(f"EFS Health Report: {file_system_id}")
    print(f"Name: {next((t['Value'] for t in fs.get('Tags', []) if t['Key'] == 'Name'), 'N/A')}")
    print(f"Performance Mode: {fs['PerformanceMode']}")
    print(f"Throughput Mode: {fs['ThroughputMode']}")
    print(f"Encrypted: {fs['Encrypted']}")
    print(f"{'=' * 60}")

    # Storage breakdown
    size = fs['SizeInBytes']
    total_gb = size['Value'] / (1024**3)
    standard_gb = size.get('ValueInStandard', 0) / (1024**3)
    ia_gb = size.get('ValueInIA', 0) / (1024**3)

    print(f"\nStorage:")
    print(f"  Total:    {total_gb:.2f} GB")
    print(f"  Standard: {standard_gb:.2f} GB")
    print(f"  IA:       {ia_gb:.2f} GB")
    if total_gb > 0:
        print(f"  IA ratio: {ia_gb/total_gb*100:.1f}%")

    # Get metrics for the last hour
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(hours=1)
    dimensions = [{'Name': 'FileSystemId', 'Value': file_system_id}]

    metrics_to_check = [
        ('BurstCreditBalance', 'Average', 'Burst Credits'),
        ('PercentIOLimit', 'Maximum', 'IO Limit %'),
        ('ClientConnections', 'Sum', 'Connections'),
        ('TotalIOBytes', 'Sum', 'Total IO Bytes'),
    ]

    print(f"\nMetrics (last hour):")
    for metric_name, stat, label in metrics_to_check:
        try:
            result = cw.get_metric_statistics(
                Namespace='AWS/EFS',
                MetricName=metric_name,
                Dimensions=dimensions,
                StartTime=start_time,
                EndTime=end_time,
                Period=3600,
                Statistics=[stat]
            )
            if result['Datapoints']:
                value = result['Datapoints'][0][stat]
                if 'Bytes' in metric_name and metric_name != 'PercentIOLimit':
                    print(f"  {label}: {value / (1024**3):.2f} GB")
                elif metric_name == 'PercentIOLimit':
                    print(f"  {label}: {value:.1f}%")
                else:
                    print(f"  {label}: {value:,.0f}")
            else:
                print(f"  {label}: No data")
        except Exception as e:
            print(f"  {label}: Error - {e}")

    # Check mount targets
    mts = efs.describe_mount_targets(FileSystemId=file_system_id)
    print(f"\nMount Targets:")
    for mt in mts['MountTargets']:
        print(f"  {mt['AvailabilityZoneName']}: {mt['LifeCycleState']} ({mt['IpAddress']})")

    # Check for active alarms
    alarms = cw.describe_alarms(
        AlarmNamePrefix=f"efs-",
        StateValue='ALARM'
    )
    if alarms['MetricAlarms']:
        print(f"\nACTIVE ALARMS:")
        for alarm in alarms['MetricAlarms']:
            print(f"  {alarm['AlarmName']}: {alarm['StateReason'][:80]}")
    else:
        print(f"\nNo active alarms.")

# Run the report
efs_health_report('fs-0abc123def456789')
```

## CloudWatch Anomaly Detection

For metrics where static thresholds don't work well, use CloudWatch anomaly detection:

```bash
# Enable anomaly detection on throughput
aws cloudwatch put-anomaly-detector \
  --namespace "AWS/EFS" \
  --metric-name "TotalIOBytes" \
  --dimensions "Name=FileSystemId,Value=fs-0abc123def456789" \
  --stat "Sum"

# Create alarm based on anomaly band
aws cloudwatch put-metric-alarm \
  --alarm-name "efs-throughput-anomaly" \
  --alarm-description "EFS throughput outside normal range" \
  --metrics '[
    {
      "Id": "actual",
      "MetricStat": {
        "Metric": {
          "Namespace": "AWS/EFS",
          "MetricName": "TotalIOBytes",
          "Dimensions": [{"Name": "FileSystemId", "Value": "fs-0abc123def456789"}]
        },
        "Period": 300,
        "Stat": "Sum"
      },
      "ReturnData": true
    },
    {
      "Id": "anomaly",
      "Expression": "ANOMALY_DETECTION_BAND(actual, 2)",
      "ReturnData": false
    }
  ]' \
  --comparison-operator "LessThanLowerOrGreaterThanUpperThreshold" \
  --threshold-metric-id "anomaly" \
  --evaluation-periods 3 \
  --alarm-actions "arn:aws:sns:us-east-1:123456789012:ops-warning"
```

## Terraform Monitoring Setup

Here's a Terraform module for EFS monitoring:

```hcl
variable "file_system_id" {
  type = string
}

variable "sns_topic_arn" {
  type = string
}

resource "aws_cloudwatch_metric_alarm" "burst_credits" {
  alarm_name          = "efs-${var.file_system_id}-burst-credits"
  alarm_description   = "EFS burst credits low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 6
  metric_name         = "BurstCreditBalance"
  namespace           = "AWS/EFS"
  period              = 300
  statistic           = "Average"
  threshold           = 1099511627776  # 1 TB

  dimensions = {
    FileSystemId = var.file_system_id
  }

  alarm_actions = [var.sns_topic_arn]
}

resource "aws_cloudwatch_metric_alarm" "io_limit" {
  alarm_name          = "efs-${var.file_system_id}-io-limit"
  alarm_description   = "EFS approaching IOPS limit"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 6
  metric_name         = "PercentIOLimit"
  namespace           = "AWS/EFS"
  period              = 300
  statistic           = "Maximum"
  threshold           = 80

  dimensions = {
    FileSystemId = var.file_system_id
  }

  alarm_actions = [var.sns_topic_arn]
}

resource "aws_cloudwatch_dashboard" "efs" {
  dashboard_name = "EFS-${var.file_system_id}"
  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 24
        height = 6
        properties = {
          title   = "Throughput"
          metrics = [
            ["AWS/EFS", "DataReadIOBytes", "FileSystemId", var.file_system_id],
            ["AWS/EFS", "DataWriteIOBytes", "FileSystemId", var.file_system_id]
          ]
          period = 60
          region = "us-east-1"
        }
      }
    ]
  })
}
```

## Best Practices

1. **Always monitor burst credits** if using bursting throughput mode. It's the number one cause of unexpected EFS performance drops.
2. **Set up both warning and critical alarms** - give yourself time to react before things break.
3. **Track storage growth trends** - a file system growing faster than expected could blow your budget.
4. **Monitor metadata IO** - high metadata IO relative to data IO often indicates inefficient access patterns (too many small files, excessive directory listings).
5. **Use anomaly detection** for throughput metrics - normal throughput varies too much for static thresholds.
6. **Include EFS metrics in your application dashboards** - don't monitor EFS in isolation.

## Wrapping Up

Monitoring EFS with CloudWatch is about watching the metrics that predict problems before they happen. Burst credit depletion, IOPS limits, and throughput saturation are all visible in CloudWatch long before your users notice degraded performance. Set up the alarms, build the dashboard, and check in regularly. Your future self will appreciate it when you catch a burst credit issue at 80% instead of at zero.
