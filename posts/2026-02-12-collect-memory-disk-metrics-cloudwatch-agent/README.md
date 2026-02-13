# How to Collect Memory and Disk Metrics with CloudWatch Agent

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudWatch, EC2, Monitoring, Metrics

Description: Practical guide to collecting memory utilization, disk space, swap usage, and inode metrics from EC2 instances using the CloudWatch Agent.

---

If you've ever wondered why CloudWatch doesn't show memory or disk space metrics for your EC2 instances, you're not alone. It's one of the most frequently asked questions about AWS monitoring. The reason is that these are OS-level metrics - the hypervisor (which provides the built-in metrics) can see CPU, network, and disk I/O at the hardware level, but it can't see inside the OS to know how much memory is actually in use versus cached, or how full a filesystem is.

The CloudWatch Agent solves this. Once installed, it reports memory, disk, swap, and many other OS-level metrics to CloudWatch. This post focuses specifically on memory and disk metrics - the configuration, the alarm thresholds, and the dashboard patterns that work well in production.

## Installing the Agent

If you haven't installed the CloudWatch Agent yet, check our guides for [Linux](https://oneuptime.com/blog/post/2026-02-12-install-cloudwatch-agent-ec2-linux/view) and [Windows](https://oneuptime.com/blog/post/2026-02-12-install-cloudwatch-agent-ec2-windows/view). This post assumes the agent is installed and you need to configure it for memory and disk collection.

## Memory Metrics Configuration (Linux)

Here's the memory section of the agent config:

```json
{
  "metrics": {
    "namespace": "CWAgent",
    "append_dimensions": {
      "InstanceId": "${aws:InstanceId}",
      "AutoScalingGroupName": "${aws:AutoScalingGroupName}"
    },
    "metrics_collected": {
      "mem": {
        "measurement": [
          "mem_used_percent",
          "mem_available_percent",
          "mem_used",
          "mem_available",
          "mem_total",
          "mem_cached",
          "mem_buffered",
          "mem_free"
        ],
        "metrics_collection_interval": 60
      },
      "swap": {
        "measurement": [
          "swap_used_percent",
          "swap_used",
          "swap_free"
        ],
        "metrics_collection_interval": 60
      }
    }
  }
}
```

The most important metric here is `mem_used_percent`. It tells you what percentage of your total memory is actually in use by applications (excluding caches and buffers). Linux aggressively caches disk data in memory, which is good for performance but can make raw `free` output confusing. The CloudWatch Agent calculates usage correctly, excluding the cached and buffered memory.

Here's what each metric means:

| Metric | Description |
|--------|-------------|
| `mem_used_percent` | Percentage of memory used by applications |
| `mem_available_percent` | Percentage of memory available (including cache that can be reclaimed) |
| `mem_used` | Absolute memory used in bytes |
| `mem_available` | Absolute memory available in bytes |
| `mem_total` | Total physical memory |
| `mem_cached` | Memory used for disk caching |
| `mem_buffered` | Memory used for I/O buffers |
| `mem_free` | Truly free memory (not the same as available) |
| `swap_used_percent` | Percentage of swap space in use |

## Disk Metrics Configuration (Linux)

```json
{
  "metrics": {
    "metrics_collected": {
      "disk": {
        "resources": ["/", "/data", "/var/log"],
        "measurement": [
          "disk_used_percent",
          "disk_free",
          "disk_used",
          "disk_total",
          "disk_inodes_free",
          "disk_inodes_used",
          "disk_inodes_total"
        ],
        "ignore_file_system_types": [
          "sysfs", "devtmpfs", "tmpfs", "squashfs", "overlay"
        ],
        "metrics_collection_interval": 60
      },
      "diskio": {
        "resources": ["nvme0n1", "nvme1n1"],
        "measurement": [
          "diskio_reads",
          "diskio_writes",
          "diskio_read_bytes",
          "diskio_write_bytes",
          "diskio_read_time",
          "diskio_write_time",
          "diskio_io_time",
          "diskio_iops_in_progress"
        ],
        "metrics_collection_interval": 60
      }
    }
  }
}
```

The `resources` array in the `disk` section specifies which mount points to monitor. You can use `["*"]` to monitor all mount points, but the `ignore_file_system_types` filter helps exclude virtual filesystems that aren't meaningful to monitor.

Inode metrics (`disk_inodes_free`, `disk_inodes_used`) are easy to overlook but critical. A filesystem can run out of inodes even when there's plenty of disk space, especially if your application creates many small files. When inodes are exhausted, no new files can be created, and things break in confusing ways.

## Memory Metrics Configuration (Windows)

Windows uses performance counters instead of Linux metric names:

```json
{
  "metrics": {
    "metrics_collected": {
      "Memory": {
        "measurement": [
          "% Committed Bytes In Use",
          "Available MBytes",
          "Committed Bytes",
          "Cache Bytes",
          "Pool Nonpaged Bytes",
          "Pool Paged Bytes"
        ],
        "metrics_collection_interval": 60
      },
      "Paging File": {
        "measurement": [
          "% Usage",
          "% Usage Peak"
        ],
        "resources": ["_Total"]
      }
    }
  }
}
```

`% Committed Bytes In Use` is the Windows equivalent of `mem_used_percent`. `Paging File % Usage` is the equivalent of swap usage.

## Disk Metrics Configuration (Windows)

```json
{
  "metrics": {
    "metrics_collected": {
      "LogicalDisk": {
        "measurement": [
          "% Free Space",
          "Free Megabytes",
          "% Disk Read Time",
          "% Disk Write Time"
        ],
        "resources": ["C:", "D:"]
      }
    }
  }
}
```

## Setting Up Alarms

The whole point of collecting these metrics is to alarm before problems occur. Here are the alarms that every production instance should have:

### Memory utilization alarm

```bash
# Alert when memory usage exceeds 85% for 5 minutes
aws cloudwatch put-metric-alarm \
  --alarm-name "HighMemoryUsage-i-1234567890" \
  --namespace "CWAgent" \
  --metric-name "mem_used_percent" \
  --dimensions Name=InstanceId,Value=i-1234567890abcdef0 \
  --statistic Average \
  --period 300 \
  --threshold 85 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:ops-alerts \
  --alarm-description "Memory utilization above 85% for 5 minutes"
```

### Disk space alarm

```bash
# Alert when root volume is more than 80% full
aws cloudwatch put-metric-alarm \
  --alarm-name "LowDiskSpace-root-i-1234567890" \
  --namespace "CWAgent" \
  --metric-name "disk_used_percent" \
  --dimensions Name=InstanceId,Value=i-1234567890abcdef0 Name=path,Value=/ Name=fstype,Value=ext4 Name=device,Value=nvme0n1p1 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:ops-alerts \
  --alarm-description "Root disk usage above 80%"
```

### Swap usage alarm

```bash
# Alert if swap usage exceeds 50% - usually means the system is under memory pressure
aws cloudwatch put-metric-alarm \
  --alarm-name "HighSwapUsage-i-1234567890" \
  --namespace "CWAgent" \
  --metric-name "swap_used_percent" \
  --dimensions Name=InstanceId,Value=i-1234567890abcdef0 \
  --statistic Average \
  --period 300 \
  --threshold 50 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:ops-alerts
```

### Low inode alarm

```bash
# Alert when free inodes drop below 100,000
aws cloudwatch put-metric-alarm \
  --alarm-name "LowInodes-root-i-1234567890" \
  --namespace "CWAgent" \
  --metric-name "disk_inodes_free" \
  --dimensions Name=InstanceId,Value=i-1234567890abcdef0 Name=path,Value=/ Name=fstype,Value=ext4 Name=device,Value=nvme0n1p1 \
  --statistic Average \
  --period 300 \
  --threshold 100000 \
  --comparison-operator LessThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:ops-alerts
```

## Dashboard Widget Examples

Add these metrics to a CloudWatch dashboard for visual monitoring:

```json
{
  "widgets": [
    {
      "type": "metric",
      "x": 0, "y": 0, "width": 12, "height": 6,
      "properties": {
        "metrics": [
          ["CWAgent", "mem_used_percent", "InstanceId", "i-1234567890",
            { "stat": "Average", "label": "Memory Used %" }]
        ],
        "title": "Memory Utilization",
        "annotations": {
          "horizontal": [
            { "label": "Warning", "value": 80, "color": "#ff9900" },
            { "label": "Critical", "value": 90, "color": "#d62728" }
          ]
        },
        "yAxis": { "left": { "min": 0, "max": 100 } }
      }
    },
    {
      "type": "metric",
      "x": 12, "y": 0, "width": 12, "height": 6,
      "properties": {
        "metrics": [
          ["CWAgent", "disk_used_percent", "InstanceId", "i-1234567890", "path", "/",
            { "stat": "Average", "label": "Root (/)" }],
          ["CWAgent", "disk_used_percent", "InstanceId", "i-1234567890", "path", "/data",
            { "stat": "Average", "label": "Data (/data)" }]
        ],
        "title": "Disk Utilization",
        "annotations": {
          "horizontal": [
            { "label": "Warning", "value": 80, "color": "#ff9900" }
          ]
        },
        "yAxis": { "left": { "min": 0, "max": 100 } }
      }
    }
  ]
}
```

## Fleet-Wide Aggregation

For Auto Scaling groups, you often want to see memory and disk metrics aggregated across all instances in the group. Use the `aggregation_dimensions` config:

```json
{
  "metrics": {
    "append_dimensions": {
      "InstanceId": "${aws:InstanceId}",
      "AutoScalingGroupName": "${aws:AutoScalingGroupName}"
    },
    "aggregation_dimensions": [
      ["AutoScalingGroupName"],
      ["InstanceId"]
    ]
  }
}
```

This publishes metrics at both the individual instance level and the ASG level. The ASG-level metric shows the average across all instances in the group.

## Recommended Thresholds

These are starting-point thresholds - adjust based on your workload:

| Metric | Warning | Critical | Notes |
|--------|---------|----------|-------|
| Memory used % | 80% | 90% | Application-dependent; some apps legitimately use 80%+ |
| Disk used % | 75% | 90% | Depends on disk growth rate |
| Swap used % | 25% | 50% | Any significant swap usage indicates memory pressure |
| Inodes free | 200K | 50K | Varies by filesystem size |

## Wrapping Up

Memory and disk metrics are the most commonly missing pieces in EC2 monitoring. Without them, you're flying blind on two of the most important resources. Install the agent, configure the right metrics, set up alarms with sensible thresholds, and add the metrics to your dashboards. It takes 30 minutes to set up and can save you hours of downtime investigation. For more advanced metric collection, check out our post on [configuring the CloudWatch Agent for custom metrics](https://oneuptime.com/blog/post/2026-02-12-configure-cloudwatch-agent-custom-metrics/view).
