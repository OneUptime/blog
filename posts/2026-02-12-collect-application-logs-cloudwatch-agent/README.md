# How to Collect Application Logs with CloudWatch Agent

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudWatch, Logging, EC2, Monitoring

Description: Learn how to configure the CloudWatch Agent to collect application log files from EC2 instances and ship them to CloudWatch Logs for centralized analysis.

---

If your applications run on EC2 instances (or on-premises servers), getting logs into CloudWatch Logs is essential for centralized monitoring. The CloudWatch Agent handles this by tailing your log files and shipping new entries to CloudWatch in near-real-time. You configure it once, and it handles log rotation, multi-line entries, timestamps, and retries automatically.

This post covers the practical details - config structure, common patterns, multi-line log handling, log formatting, and troubleshooting tips you'll need when things don't work as expected.

## Basic Log Collection Configuration

The logs section of the CloudWatch Agent config specifies which files to collect and where to send them:

```json
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/myapp/application.log",
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

The key fields are:

- `file_path`: The path to the log file. Supports wildcards like `/var/log/myapp/*.log`.
- `log_group_name`: The CloudWatch Log Group to send events to. Created automatically if it doesn't exist.
- `log_stream_name`: The Log Stream name. Supports placeholders like `{instance_id}`, `{hostname}`, and `{ip_address}`.
- `retention_in_days`: Sets the retention policy on the log group when it's created.

## Collecting Multiple Log Files

Most applications produce multiple log files. Here's a config that covers a typical web application:

```json
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/myapp/application.log",
            "log_group_name": "/myapp/production/app",
            "log_stream_name": "{instance_id}",
            "retention_in_days": 30,
            "timezone": "UTC"
          },
          {
            "file_path": "/var/log/myapp/error.log",
            "log_group_name": "/myapp/production/errors",
            "log_stream_name": "{instance_id}",
            "retention_in_days": 90
          },
          {
            "file_path": "/var/log/myapp/access.log",
            "log_group_name": "/myapp/production/access",
            "log_stream_name": "{instance_id}",
            "retention_in_days": 14
          },
          {
            "file_path": "/var/log/nginx/access.log",
            "log_group_name": "/nginx/production/access",
            "log_stream_name": "{instance_id}",
            "retention_in_days": 14
          },
          {
            "file_path": "/var/log/nginx/error.log",
            "log_group_name": "/nginx/production/errors",
            "log_stream_name": "{instance_id}",
            "retention_in_days": 30
          }
        ]
      }
    }
  }
}
```

## Wildcard Patterns

You can use wildcards to collect from rotating log files or multiple services:

```json
{
  "file_path": "/var/log/myapp/*.log",
  "log_group_name": "/myapp/production/all",
  "log_stream_name": "{instance_id}"
}
```

Or for date-based log rotation:

```json
{
  "file_path": "/var/log/myapp/app-*.log",
  "log_group_name": "/myapp/production/app",
  "log_stream_name": "{instance_id}"
}
```

The agent handles log rotation correctly. If a file is rotated (renamed) and a new file appears at the same path, the agent picks up the new file and continues.

## Handling Multi-Line Log Entries

Stack traces and other multi-line log entries need special handling. Without configuration, each line would become a separate log event, making stack traces nearly impossible to read.

Use `multi_line_start_pattern` to tell the agent where a new log entry begins:

```json
{
  "file_path": "/var/log/myapp/application.log",
  "log_group_name": "/myapp/production/app",
  "log_stream_name": "{instance_id}",
  "multi_line_start_pattern": "^\\d{4}-\\d{2}-\\d{2}",
  "retention_in_days": 30
}
```

This regex says "a new log entry starts with a date like 2026-02-12." Everything between two date-prefixed lines gets combined into a single log event.

For Java applications with stack traces:

```json
{
  "file_path": "/var/log/myapp/java-app.log",
  "log_group_name": "/myapp/production/java",
  "log_stream_name": "{instance_id}",
  "multi_line_start_pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}",
  "retention_in_days": 30
}
```

A sample log where this pattern works:

```
2026-02-12T10:30:15 ERROR com.myapp.OrderService - Failed to process order
java.lang.NullPointerException: null
    at com.myapp.OrderService.processOrder(OrderService.java:42)
    at com.myapp.OrderController.handleRequest(OrderController.java:18)
    at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
```

The entire block (timestamp line + stack trace) becomes one log event.

For JSON-formatted logs (one JSON object per line), multi-line handling usually isn't needed since each line is self-contained. But if your JSON spans multiple lines:

```json
{
  "file_path": "/var/log/myapp/structured.log",
  "log_group_name": "/myapp/production/structured",
  "log_stream_name": "{instance_id}",
  "multi_line_start_pattern": "^\\{",
  "retention_in_days": 30
}
```

## Timestamp Extraction

By default, the agent uses the time it reads the log line as the event timestamp. For more accurate timestamps, extract them from the log content:

```json
{
  "file_path": "/var/log/myapp/application.log",
  "log_group_name": "/myapp/production/app",
  "log_stream_name": "{instance_id}",
  "timestamp_format": "%Y-%m-%dT%H:%M:%S%z",
  "retention_in_days": 30
}
```

Common timestamp formats:

| Log Format | timestamp_format |
|-----------|-----------------|
| `2026-02-12T10:30:15Z` | `%Y-%m-%dT%H:%M:%S%z` |
| `2026-02-12 10:30:15` | `%Y-%m-%d %H:%M:%S` |
| `Feb 12 10:30:15` | `%b %d %H:%M:%S` |
| `12/Feb/2026:10:30:15 +0000` | `%d/%b/%Y:%H:%M:%S %z` |
| `1707734415` | `%s` |

## Log Encoding

If your log files use a non-UTF-8 encoding:

```json
{
  "file_path": "/var/log/legacy-app/output.log",
  "log_group_name": "/legacy/production",
  "log_stream_name": "{instance_id}",
  "encoding": "utf-16"
}
```

Supported encodings include `utf-8` (default), `utf-16`, `ascii`, and various ISO encodings.

## Filtering Log Events

You can filter which log events get sent to CloudWatch using `filters`:

```json
{
  "file_path": "/var/log/myapp/application.log",
  "log_group_name": "/myapp/production/errors-only",
  "log_stream_name": "{instance_id}",
  "filters": [
    {
      "type": "include",
      "expression": "ERROR|WARN|FATAL"
    }
  ],
  "retention_in_days": 90
}
```

Or exclude noisy lines:

```json
{
  "file_path": "/var/log/nginx/access.log",
  "log_group_name": "/nginx/production/access",
  "log_stream_name": "{instance_id}",
  "filters": [
    {
      "type": "exclude",
      "expression": "health-check|/favicon.ico|/robots.txt"
    }
  ]
}
```

This reduces the volume of logs sent to CloudWatch, which directly impacts your costs.

## Combining with System Logs

A complete configuration typically includes both application logs and system logs:

```json
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/myapp/application.log",
            "log_group_name": "/myapp/production/app",
            "log_stream_name": "{instance_id}",
            "multi_line_start_pattern": "^\\d{4}-\\d{2}-\\d{2}",
            "timestamp_format": "%Y-%m-%dT%H:%M:%S",
            "retention_in_days": 30
          },
          {
            "file_path": "/var/log/syslog",
            "log_group_name": "/system/syslog",
            "log_stream_name": "{instance_id}",
            "retention_in_days": 14
          },
          {
            "file_path": "/var/log/auth.log",
            "log_group_name": "/system/auth",
            "log_stream_name": "{instance_id}",
            "retention_in_days": 90
          },
          {
            "file_path": "/var/log/kern.log",
            "log_group_name": "/system/kernel",
            "log_stream_name": "{instance_id}",
            "retention_in_days": 14
          }
        ]
      }
    },
    "force_flush_interval": 15,
    "log_stream_name": "default"
  }
}
```

The `force_flush_interval` (in seconds) controls how often the agent sends buffered log events. A lower value means less delay but more API calls.

## Permissions for Log Collection

The IAM role needs CloudWatch Logs permissions. The `CloudWatchAgentServerPolicy` managed policy covers this, but if you need a custom policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:PutRetentionPolicy",
        "logs:DescribeLogStreams",
        "logs:DescribeLogGroups"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/myapp/*"
    }
  ]
}
```

## Troubleshooting

**Logs not appearing in CloudWatch**: Check the agent log at `/opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log`. Look for permission errors or connection issues.

**File not found errors**: Make sure the `cwagent` user has read access to the log files. Run `sudo -u cwagent cat /path/to/logfile` to test.

**Duplicate log entries**: This can happen if you restart the agent frequently. The agent tracks its position in each file using a state file at `/opt/aws/amazon-cloudwatch-agent/logs/state/`.

**Large delay in log delivery**: Increase the `force_flush_interval` setting (lower number = more frequent flushes). Also check your network connectivity to CloudWatch Logs endpoints.

## Wrapping Up

Getting application logs into CloudWatch is one of the most impactful things you can do for your EC2-based applications. Once your logs are centralized, you can set up [metric filters](https://oneuptime.com/blog/post/2026-02-12-create-cloudwatch-metric-filters-log-data/view) to extract metrics, run [Logs Insights queries](https://oneuptime.com/blog/post/2026-02-12-cloudwatch-logs-insights-query-syntax/view) for analysis, and stream logs to other destinations for long-term storage or advanced analytics. Start with your most critical application logs, get the configuration working, then expand to cover all your log sources.
