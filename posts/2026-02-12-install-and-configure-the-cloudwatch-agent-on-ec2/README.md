# How to Install and Configure the CloudWatch Agent on EC2

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, CloudWatch, CloudWatch Agent, Monitoring, Logs, Metrics

Description: Install and configure the CloudWatch agent on EC2 instances to collect memory, disk, and custom metrics along with log files for comprehensive monitoring.

---

The default CloudWatch metrics for EC2 are useful but incomplete. You get CPU, network, and disk I/O out of the box, but not memory usage, disk space percentage, or any application-level metrics. The CloudWatch agent fills those gaps. It runs on your instance, collects system and application metrics, forwards log files, and sends everything to CloudWatch where you can alert on it and build dashboards.

## Why You Need the CloudWatch Agent

Without the agent, you can't answer basic questions like:
- How much memory is my instance using?
- Is my disk about to fill up?
- What's in my application log files?
- What processes are consuming the most CPU?

These are pretty fundamental for operations. The agent makes them all available in CloudWatch.

## Installing the Agent

The installation method depends on your OS. Here are the most common approaches.

On Amazon Linux 2023 or Amazon Linux 2:

```bash
# Install the CloudWatch agent on Amazon Linux
sudo yum install -y amazon-cloudwatch-agent
```

On Ubuntu/Debian:

```bash
# Install the CloudWatch agent on Ubuntu
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb
```

On Red Hat/CentOS:

```bash
# Install the CloudWatch agent on RHEL/CentOS
sudo yum install -y https://s3.amazonaws.com/amazoncloudwatch-agent/redhat/amd64/latest/amazon-cloudwatch-agent.rpm
```

Using Systems Manager (recommended for fleet management):

```bash
# Install via SSM Run Command across multiple instances
aws ssm send-command \
  --document-name "AWS-ConfigureAWSPackage" \
  --targets "Key=tag:Environment,Values=production" \
  --parameters '{
    "action": ["Install"],
    "name": ["AmazonCloudWatchAgent"],
    "version": ["latest"]
  }'
```

## IAM Permissions

The instance needs an IAM role with permissions to write metrics and logs to CloudWatch. Here's the minimum policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricData",
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogStreams",
        "ec2:DescribeVolumes",
        "ec2:DescribeTags",
        "ssm:GetParameter"
      ],
      "Resource": "*"
    }
  ]
}
```

You can also use the AWS managed policy `CloudWatchAgentServerPolicy` which covers all of these.

## Configuring the Agent

The agent configuration is a JSON file that defines what metrics to collect, what logs to forward, and where to send everything. You can create it manually or use the configuration wizard.

The wizard approach (interactive):

```bash
# Run the configuration wizard
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
```

But for repeatable setups, write the config file directly. Here's a comprehensive configuration:

```json
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "cwagent",
    "logfile": "/opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log"
  },
  "metrics": {
    "namespace": "CWAgent",
    "append_dimensions": {
      "InstanceId": "${aws:InstanceId}",
      "InstanceType": "${aws:InstanceType}",
      "AutoScalingGroupName": "${aws:AutoScalingGroupName}"
    },
    "aggregation_dimensions": [
      ["InstanceId"],
      ["AutoScalingGroupName"]
    ],
    "metrics_collected": {
      "mem": {
        "measurement": [
          "mem_used_percent",
          "mem_available",
          "mem_total",
          "mem_used"
        ],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": [
          "disk_used_percent",
          "disk_free",
          "disk_total",
          "disk_inodes_free"
        ],
        "resources": ["/", "/data"],
        "metrics_collection_interval": 60,
        "ignore_file_system_types": [
          "sysfs", "devtmpfs", "tmpfs", "overlay"
        ]
      },
      "diskio": {
        "measurement": [
          "diskio_io_time",
          "diskio_read_bytes",
          "diskio_write_bytes",
          "diskio_reads",
          "diskio_writes"
        ],
        "resources": ["*"],
        "metrics_collection_interval": 60
      },
      "swap": {
        "measurement": ["swap_used_percent"],
        "metrics_collection_interval": 60
      },
      "net": {
        "measurement": [
          "net_bytes_recv",
          "net_bytes_sent",
          "net_packets_recv",
          "net_packets_sent",
          "net_err_in",
          "net_err_out"
        ],
        "resources": ["eth0"],
        "metrics_collection_interval": 60
      },
      "processes": {
        "measurement": [
          "processes_running",
          "processes_sleeping",
          "processes_zombies",
          "processes_total"
        ],
        "metrics_collection_interval": 60
      },
      "cpu": {
        "measurement": [
          "cpu_usage_idle",
          "cpu_usage_user",
          "cpu_usage_system",
          "cpu_usage_iowait",
          "cpu_usage_steal"
        ],
        "totalcpu": true,
        "metrics_collection_interval": 60
      }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/messages",
            "log_group_name": "/ec2/system/messages",
            "log_stream_name": "{instance_id}",
            "retention_in_days": 30
          },
          {
            "file_path": "/var/log/secure",
            "log_group_name": "/ec2/system/secure",
            "log_stream_name": "{instance_id}",
            "retention_in_days": 90
          },
          {
            "file_path": "/var/log/cloud-init.log",
            "log_group_name": "/ec2/system/cloud-init",
            "log_stream_name": "{instance_id}",
            "retention_in_days": 14
          },
          {
            "file_path": "/opt/app/logs/*.log",
            "log_group_name": "/ec2/app/logs",
            "log_stream_name": "{instance_id}",
            "retention_in_days": 30,
            "multi_line_start_pattern": "^\\d{4}-\\d{2}-\\d{2}"
          }
        ]
      }
    }
  }
}
```

Save this to `/opt/aws/amazon-cloudwatch-agent/etc/config.json`.

## Key Configuration Sections Explained

**append_dimensions**: Automatically tags every metric with instance ID, type, and ASG name. This lets you filter dashboards and alarms by these dimensions.

**aggregation_dimensions**: Lets you view metrics aggregated across dimensions. By including `AutoScalingGroupName`, you can see average memory usage across an entire ASG.

**metrics_collected**: Each section collects specific system metrics. The `resources` field in `disk` specifies which mount points to monitor.

**logs section**: The `collect_list` defines which log files to send to CloudWatch Logs. The `multi_line_start_pattern` handles stack traces that span multiple lines.

## Starting the Agent

Apply the config and start the agent:

```bash
# Start the agent with your configuration
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json

# Check the agent status
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a status
```

The output should show `"status": "running"`.

## Using SSM Parameter Store for Configuration

For managing the config across a fleet, store it in SSM Parameter Store:

```bash
# Store the agent config in SSM Parameter Store
aws ssm put-parameter \
  --name "/cloudwatch-agent/config/linux" \
  --type String \
  --value file:///opt/aws/amazon-cloudwatch-agent/etc/config.json

# Then on each instance, fetch from SSM instead of a local file
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c ssm:/cloudwatch-agent/config/linux
```

This way, you update the config in one place and roll it out to all instances.

## Verifying Metrics Are Flowing

After starting the agent, give it a minute and then check that metrics are appearing:

```bash
# List the metrics being reported by the CWAgent namespace
aws cloudwatch list-metrics \
  --namespace CWAgent \
  --dimensions Name=InstanceId,Value=i-0abc123 \
  --query 'Metrics[*].MetricName' \
  --output table
```

You should see metrics like `mem_used_percent`, `disk_used_percent`, and others from your config.

## Troubleshooting

If metrics aren't showing up, check the agent log:

```bash
# Check the CloudWatch agent log for errors
sudo tail -100 /opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log
```

Common issues:
- **IAM permissions**: The instance role doesn't have `cloudwatch:PutMetricData`
- **Wrong config path**: The -c flag points to a nonexistent file
- **Agent not running**: Check with `systemctl status amazon-cloudwatch-agent`
- **Network issues**: The instance can't reach the CloudWatch endpoint (check VPC endpoints or NAT gateway)

For instances in private subnets, you'll need either a NAT gateway or VPC endpoints for CloudWatch and CloudWatch Logs. See [setting up EC2 instances in a private subnet with NAT](https://oneuptime.com/blog/post/2026-02-12-set-up-ec2-instances-in-a-private-subnet-with-nat/view) for details.

## Next Steps

Once the agent is collecting metrics, you'll want to:
- Set up [CloudWatch alarms for CPU and memory](https://oneuptime.com/blog/post/2026-02-12-set-up-cloudwatch-alarms-for-ec2-cpu-and-memory/view) to get alerted on issues
- Enable [detailed monitoring](https://oneuptime.com/blog/post/2026-02-12-monitor-ec2-instances-with-cloudwatch-detailed-monitoring/view) for 1-minute metric granularity on the built-in metrics
- Build CloudWatch dashboards to visualize your fleet's health

The CloudWatch agent is the foundation of EC2 monitoring. Without it, you're flying blind on memory and disk - two of the most common causes of instance problems.
