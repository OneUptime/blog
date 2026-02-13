# How to Configure the CloudWatch Agent for Custom Metrics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudWatch, Monitoring, Metrics, EC2

Description: Learn how to configure the CloudWatch Agent to collect custom application metrics, StatsD metrics, and collectd metrics from your EC2 instances.

---

The CloudWatch Agent doesn't just collect system metrics like CPU and memory. It can also act as a custom metrics collector, accepting data from your applications via StatsD or collectd protocols, running custom scripts to gather metrics, and publishing everything to CloudWatch under your own namespaces.

This unlocks application-level monitoring without changing your code's metric publishing approach. If your application already emits StatsD metrics (many frameworks do), you just point it at the local CloudWatch Agent instead of a StatsD server. Let's walk through all the custom metric collection options.

## StatsD Integration

StatsD is a simple text-based protocol for emitting metrics. Many application frameworks have built-in StatsD support. The CloudWatch Agent can listen for StatsD metrics on a local UDP port and forward them to CloudWatch.

Add this to your agent configuration:

```json
{
  "metrics": {
    "namespace": "MyApp/Custom",
    "metrics_collected": {
      "statsd": {
        "service_address": ":8125",
        "metrics_collection_interval": 60,
        "metrics_aggregation_interval": 60
      }
    }
  }
}
```

With this config, the agent listens on UDP port 8125. Your application sends metrics using the standard StatsD format:

```python
import socket

# Simple StatsD client - no libraries needed
def send_statsd(metric_name, value, metric_type='c'):
    """Send a metric to the local CloudWatch Agent via StatsD."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    # Format: metric_name:value|type
    # Types: c=counter, g=gauge, ms=timer, s=set
    message = f"{metric_name}:{value}|{metric_type}"
    sock.sendto(message.encode(), ('localhost', 8125))
    sock.close()

# Examples
send_statsd('orders.processed', 1, 'c')          # Counter: increment by 1
send_statsd('queue.depth', 42, 'g')                # Gauge: set to 42
send_statsd('request.latency', 234, 'ms')          # Timer: 234ms
send_statsd('active.users', 'user123', 's')         # Set: count unique values
```

In Node.js using the `hot-shots` StatsD client:

```javascript
const StatsD = require('hot-shots');

// Point the StatsD client at the local CloudWatch Agent
const client = new StatsD({
  host: 'localhost',
  port: 8125,
  prefix: 'myapp.',
  globalTags: { environment: 'production' },
});

// Send metrics throughout your application
client.increment('orders.processed');
client.gauge('queue.depth', 42);
client.timing('request.latency', 234);
client.histogram('payload.size', 1024);
```

StatsD tags get converted to CloudWatch dimensions, so `environment:production` becomes a dimension you can filter by.

## collectd Integration

If you're already using collectd for metrics collection, the CloudWatch Agent can receive metrics from it:

```json
{
  "metrics": {
    "namespace": "MyApp/Custom",
    "metrics_collected": {
      "collectd": {
        "service_address": "udp://127.0.0.1:25826",
        "name_prefix": "collectd_",
        "collectd_security_level": "none",
        "metrics_aggregation_interval": 60
      }
    }
  }
}
```

Configure collectd to send to the CloudWatch Agent by adding this to your collectd config:

```
LoadPlugin network
<Plugin network>
  Server "127.0.0.1" "25826"
</Plugin>
```

## Procstat: Process-Level Metrics

The `procstat` plugin collects metrics for specific processes running on your instance. This is incredibly useful for monitoring your application processes:

```json
{
  "metrics": {
    "namespace": "CWAgent",
    "metrics_collected": {
      "procstat": [
        {
          "exe": "nginx",
          "measurement": [
            "cpu_usage",
            "memory_rss",
            "memory_vms",
            "read_bytes",
            "write_bytes",
            "num_threads",
            "pid_count"
          ]
        },
        {
          "exe": "java",
          "measurement": [
            "cpu_usage",
            "memory_rss",
            "memory_vms",
            "num_threads"
          ]
        },
        {
          "pattern": "myapp.*worker",
          "measurement": [
            "cpu_usage",
            "memory_rss",
            "pid_count"
          ]
        },
        {
          "pid_file": "/var/run/myapp.pid",
          "measurement": [
            "cpu_usage",
            "memory_rss"
          ]
        }
      ]
    }
  }
}
```

You can match processes by `exe` (executable name), `pattern` (regex on the full command line), or `pid_file` (a file containing the PID).

## Custom Script Metrics with ethtool and nvidia_smi

The agent has built-in support for some specialty metric sources:

```json
{
  "metrics": {
    "metrics_collected": {
      "ethtool": {
        "interface_include": ["eth0"],
        "metrics_include": [
          "rx_packets",
          "tx_packets",
          "rx_errors",
          "tx_errors",
          "bw_in_allowance_exceeded",
          "bw_out_allowance_exceeded"
        ]
      },
      "nvidia_gpu": {
        "measurement": [
          "utilization_gpu",
          "utilization_memory",
          "temperature_gpu",
          "memory_total",
          "memory_used",
          "memory_free",
          "power_draw"
        ]
      }
    }
  }
}
```

The `ethtool` metrics are particularly useful for detecting network performance issues on high-throughput instances, and `nvidia_gpu` is essential for GPU-accelerated workloads.

## Combining System and Custom Metrics

Here's a complete configuration that combines system metrics, StatsD, process monitoring, and log collection:

```json
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "cwagent"
  },
  "metrics": {
    "namespace": "MyApp/Production",
    "append_dimensions": {
      "InstanceId": "${aws:InstanceId}",
      "AutoScalingGroupName": "${aws:AutoScalingGroupName}"
    },
    "metrics_collected": {
      "cpu": {
        "resources": ["*"],
        "measurement": ["cpu_usage_idle", "cpu_usage_user", "cpu_usage_system"],
        "totalcpu": true
      },
      "mem": {
        "measurement": ["mem_used_percent", "mem_available_percent"]
      },
      "disk": {
        "resources": ["/"],
        "measurement": ["disk_used_percent"]
      },
      "statsd": {
        "service_address": ":8125",
        "metrics_collection_interval": 60,
        "metrics_aggregation_interval": 60
      },
      "procstat": [
        {
          "exe": "node",
          "measurement": ["cpu_usage", "memory_rss", "num_threads", "pid_count"]
        }
      ]
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/myapp/*.log",
            "log_group_name": "/myapp/production/app",
            "log_stream_name": "{instance_id}",
            "retention_in_days": 30
          }
        ]
      }
    }
  }
}
```

## High-Resolution Custom Metrics

For time-sensitive metrics, you can collect at 1-second intervals:

```json
{
  "metrics": {
    "namespace": "MyApp/HighRes",
    "metrics_collected": {
      "statsd": {
        "service_address": ":8125",
        "metrics_collection_interval": 1,
        "metrics_aggregation_interval": 1
      },
      "cpu": {
        "resources": ["*"],
        "measurement": ["cpu_usage_idle"],
        "totalcpu": true,
        "metrics_collection_interval": 1
      }
    }
  }
}
```

Remember that high-resolution metrics (1-second) cost more than standard resolution (60-second). Use them selectively for metrics where sub-minute granularity actually matters.

## Metric Dimensions and Aggregation

You can control how metrics are dimensioned and aggregated:

```json
{
  "metrics": {
    "append_dimensions": {
      "InstanceId": "${aws:InstanceId}",
      "InstanceType": "${aws:InstanceType}",
      "AutoScalingGroupName": "${aws:AutoScalingGroupName}",
      "ImageId": "${aws:ImageId}"
    },
    "aggregation_dimensions": [
      ["AutoScalingGroupName"],
      ["InstanceId", "InstanceType"],
      []
    ]
  }
}
```

The `aggregation_dimensions` array creates different aggregation views:
- `["AutoScalingGroupName"]` - metrics aggregated per ASG
- `["InstanceId", "InstanceType"]` - metrics per instance
- `[]` - metrics aggregated across all instances (no dimensions)

This is useful when you want to see both per-instance and fleet-wide views in your dashboards.

## Applying Configuration Changes

After modifying the config, restart the agent:

```bash
# Reload configuration and restart
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
```

Check the agent log to verify there are no errors with the new configuration:

```bash
# Watch the agent log for errors
sudo tail -f /opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log
```

## Wrapping Up

The CloudWatch Agent is much more than a system metrics collector. With StatsD integration, process monitoring, and collectd support, it can serve as your central metrics collection point on each instance. The key advantage over publishing metrics directly via the CloudWatch API is simplicity - your application just sends to localhost, and the agent handles batching, authentication, and delivery. For the most commonly needed system metrics, check out our guide on [collecting memory and disk metrics](https://oneuptime.com/blog/post/2026-02-12-collect-memory-disk-metrics-cloudwatch-agent/view). And for managing configs across a fleet, see [using the CloudWatch Agent with SSM Parameter Store](https://oneuptime.com/blog/post/2026-02-12-cloudwatch-agent-ssm-parameter-store-config/view).
