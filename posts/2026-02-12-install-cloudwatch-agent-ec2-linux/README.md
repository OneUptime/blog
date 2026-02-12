# How to Install the CloudWatch Agent on EC2 Linux Instances

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudWatch, EC2, Linux, Monitoring

Description: Step-by-step guide to installing and configuring the CloudWatch Agent on EC2 Linux instances for collecting system metrics, custom metrics, and application logs.

---

EC2 instances come with basic CloudWatch metrics out of the box - CPU utilization, network I/O, disk I/O, and status checks. But you don't get memory utilization, disk space usage, or any application-level metrics without the CloudWatch Agent. You also don't get logs shipped to CloudWatch unless you set something up.

The CloudWatch Agent handles all of this. It's a lightweight process that runs on your instance and sends metrics and logs to CloudWatch. Let's walk through the complete installation and configuration process on Linux.

## Prerequisites

Before installing the agent, your EC2 instance needs an IAM role with the right permissions. Create a role with the `CloudWatchAgentServerPolicy` managed policy:

```bash
# Create the IAM role for EC2 instances running the CloudWatch Agent
aws iam create-role \
  --role-name CloudWatchAgentRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": { "Service": "ec2.amazonaws.com" },
        "Action": "sts:AssumeRole"
      }
    ]
  }'

# Attach the managed policy
aws iam attach-role-policy \
  --role-name CloudWatchAgentRole \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy

# If you plan to store the config in SSM Parameter Store, add this too
aws iam attach-role-policy \
  --role-name CloudWatchAgentRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore

# Create an instance profile and add the role
aws iam create-instance-profile --instance-profile-name CloudWatchAgentProfile
aws iam add-role-to-instance-profile \
  --instance-profile-name CloudWatchAgentProfile \
  --role-name CloudWatchAgentRole
```

Attach this instance profile to your EC2 instance (you can do this at launch or by modifying a running instance).

## Installation Method 1: Using Systems Manager

The easiest way to install the agent on existing instances is through Systems Manager (SSM):

```bash
# Install the CloudWatch Agent via SSM Run Command
aws ssm send-command \
  --document-name "AWS-ConfigureAWSPackage" \
  --parameters '{"action":["Install"],"name":["AmazonCloudWatchAgent"]}' \
  --targets "Key=instanceids,Values=i-1234567890abcdef0" \
  --comment "Install CloudWatch Agent"
```

This works on any instance with the SSM agent installed (which comes pre-installed on Amazon Linux 2 and most recent AMIs).

## Installation Method 2: Using the Package Manager

For Amazon Linux 2 / Amazon Linux 2023:

```bash
# Download and install the CloudWatch Agent package
sudo yum install amazon-cloudwatch-agent -y
```

For Ubuntu/Debian:

```bash
# Download the CloudWatch Agent .deb package
wget https://amazoncloudwatch-agent.s3.amazonaws.com/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb

# Install it
sudo dpkg -i amazon-cloudwatch-agent.deb
```

For RHEL/CentOS:

```bash
# Download the CloudWatch Agent .rpm package
wget https://amazoncloudwatch-agent.s3.amazonaws.com/redhat/amd64/latest/amazon-cloudwatch-agent.rpm

# Install it
sudo rpm -U amazon-cloudwatch-agent.rpm
```

## Creating the Agent Configuration

The agent configuration is a JSON file that tells the agent what to collect and where to send it. You can use the configuration wizard or write the JSON directly.

### Using the configuration wizard

```bash
# Run the interactive configuration wizard
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
```

This walks you through a series of questions about what metrics and logs to collect. It generates a configuration file at `/opt/aws/amazon-cloudwatch-agent/bin/config.json`.

### Writing the configuration manually

Here's a practical configuration file that collects system metrics, custom metrics, and application logs:

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
      "cpu": {
        "resources": ["*"],
        "measurement": [
          "cpu_usage_idle",
          "cpu_usage_user",
          "cpu_usage_system",
          "cpu_usage_iowait"
        ],
        "totalcpu": true,
        "metrics_collection_interval": 60
      },
      "mem": {
        "measurement": [
          "mem_used_percent",
          "mem_available_percent",
          "mem_used",
          "mem_total"
        ]
      },
      "disk": {
        "resources": ["/", "/data"],
        "measurement": [
          "disk_used_percent",
          "disk_free",
          "disk_used",
          "disk_inodes_free"
        ],
        "ignore_file_system_types": ["sysfs", "devtmpfs", "tmpfs"]
      },
      "diskio": {
        "resources": ["*"],
        "measurement": [
          "diskio_reads",
          "diskio_writes",
          "diskio_read_bytes",
          "diskio_write_bytes"
        ]
      },
      "net": {
        "resources": ["eth0"],
        "measurement": [
          "net_bytes_sent",
          "net_bytes_recv",
          "net_packets_sent",
          "net_packets_recv",
          "net_err_in",
          "net_err_out"
        ]
      },
      "swap": {
        "measurement": ["swap_used_percent"]
      },
      "processes": {
        "measurement": ["processes_running", "processes_blocked", "processes_zombies"]
      }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/myapp/application.log",
            "log_group_name": "/myapp/production/api",
            "log_stream_name": "{instance_id}/{ip_address}",
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
            "file_path": "/var/log/syslog",
            "log_group_name": "/system/syslog",
            "log_stream_name": "{instance_id}",
            "retention_in_days": 14
          }
        ]
      }
    }
  }
}
```

Save this as `/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json`.

## Starting the Agent

Start the agent with the configuration file:

```bash
# Start the CloudWatch Agent with your config
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
```

The flags mean:
- `-a fetch-config` - load the configuration
- `-m ec2` - running on EC2 (vs on-premises)
- `-s` - start the agent after loading config
- `-c file:...` - path to the config file

Check the status:

```bash
# Check the agent status
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a status

# Check the agent log for errors
sudo tail -f /opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log
```

## Verifying Metrics Are Flowing

After a few minutes, verify metrics in CloudWatch:

```bash
# List the metrics being published by the agent
aws cloudwatch list-metrics --namespace CWAgent --query 'Metrics[*].[MetricName]' --output table
```

You should see metrics like `mem_used_percent`, `disk_used_percent`, `cpu_usage_idle`, etc.

## Managing the Agent as a Service

The agent runs as a systemd service:

```bash
# Check service status
sudo systemctl status amazon-cloudwatch-agent

# Restart the agent
sudo systemctl restart amazon-cloudwatch-agent

# Enable auto-start on boot
sudo systemctl enable amazon-cloudwatch-agent

# Stop the agent
sudo systemctl stop amazon-cloudwatch-agent
```

## Installing on Multiple Instances with User Data

For auto-scaling groups, include the installation in your launch template user data:

```bash
#!/bin/bash
# User data script to install and start CloudWatch Agent

# Install the agent
yum install -y amazon-cloudwatch-agent

# Download the config from S3 (or use SSM Parameter Store)
aws s3 cp s3://my-config-bucket/cloudwatch-agent-config.json \
  /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

# Start the agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
```

Or better yet, store the config in SSM Parameter Store and reference it. See our post on [using CloudWatch Agent with SSM Parameter Store](https://oneuptime.com/blog/post/cloudwatch-agent-ssm-parameter-store-config/view) for that approach.

## Troubleshooting

Common issues and how to fix them:

**Metrics not appearing**: Check that the IAM role has `CloudWatchAgentServerPolicy`. Check the agent log at `/opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log`.

**Permission denied on log files**: The agent runs as the `cwagent` user. Make sure it has read access to the log files you configured. You might need to add `cwagent` to a group or adjust file permissions.

**Agent won't start**: Check for JSON syntax errors in the config file. Use `python3 -m json.tool < config.json` to validate it.

**High CPU usage**: Reduce the metrics collection interval or remove metrics you don't need. Collecting metrics every 1 second for 50 metrics adds up.

## Wrapping Up

The CloudWatch Agent is essential for getting full visibility into your EC2 instances. The built-in metrics only scratch the surface - memory, disk, and process metrics require the agent. Once installed, you can [configure custom metrics collection](https://oneuptime.com/blog/post/configure-cloudwatch-agent-custom-metrics/view) and set up alarms on everything from memory pressure to application-specific counters. For Windows instances, the setup is similar but with some key differences - see our [Windows installation guide](https://oneuptime.com/blog/post/install-cloudwatch-agent-ec2-windows/view).
