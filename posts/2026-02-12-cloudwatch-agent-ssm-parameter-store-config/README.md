# How to Use CloudWatch Agent with SSM Parameter Store for Config

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudWatch, SSM, EC2, Configuration Management

Description: Learn how to store CloudWatch Agent configuration in SSM Parameter Store for centralized management, versioning, and automatic deployment across your EC2 fleet.

---

Managing CloudWatch Agent configurations across dozens or hundreds of EC2 instances is a headache if you're doing it file-by-file. Every time you want to add a new log file to collect, change a metric interval, or adjust retention settings, you'd have to update the config on every instance individually.

SSM Parameter Store solves this by giving you a central place to store your agent configuration. Instances fetch the config from Parameter Store when the agent starts, and you can push updates to all instances at once using SSM Run Command. It's the difference between manual configuration management and automated, fleet-wide control.

## Why Parameter Store for Agent Config

There are several advantages over storing configs as local files:

- **Single source of truth**: One config in Parameter Store, used by all instances
- **Version history**: Parameter Store keeps previous versions, so you can roll back
- **Access control**: IAM policies control who can modify configs
- **No file distribution**: No need to copy files to S3 or bake them into AMIs
- **Dynamic updates**: Push config changes to running instances without redeploying

## Storing the Configuration

First, create your CloudWatch Agent configuration as a JSON file. Then store it in Parameter Store:

```bash
# Store the agent config in SSM Parameter Store
aws ssm put-parameter \
  --name "AmazonCloudWatch-linux-config" \
  --type "String" \
  --value '{
    "agent": {
      "metrics_collection_interval": 60,
      "run_as_user": "cwagent"
    },
    "metrics": {
      "namespace": "CWAgent",
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
          "measurement": ["disk_used_percent"],
          "ignore_file_system_types": ["sysfs", "devtmpfs", "tmpfs"]
        },
        "swap": {
          "measurement": ["swap_used_percent"]
        }
      }
    },
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
  }' \
  --description "CloudWatch Agent config for production Linux instances"
```

For larger configurations, load from a file:

```bash
# Store config from a JSON file
aws ssm put-parameter \
  --name "AmazonCloudWatch-linux-config" \
  --type "String" \
  --value file://cloudwatch-agent-config.json \
  --description "CloudWatch Agent config for production Linux instances"
```

## Parameter Naming Conventions

The CloudWatch Agent wizard and documentation use a naming convention that starts with `AmazonCloudWatch-`. While you can use any parameter name, sticking with this convention keeps things organized:

```bash
# Different configs for different roles
AmazonCloudWatch-linux-webserver      # Web server instances
AmazonCloudWatch-linux-worker         # Background workers
AmazonCloudWatch-linux-database       # Database servers
AmazonCloudWatch-windows-iis          # Windows IIS servers
AmazonCloudWatch-linux-minimal        # Minimal monitoring for dev/staging
```

## Starting the Agent with Parameter Store Config

Instead of pointing the agent at a local file, point it at the SSM parameter:

```bash
# Start the agent using config from Parameter Store
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c ssm:AmazonCloudWatch-linux-config
```

Notice the `ssm:` prefix instead of `file:`. The agent fetches the configuration from Parameter Store, writes it locally, and starts.

On Windows:

```powershell
# Start the agent using config from Parameter Store
& "C:\Program Files\Amazon\AmazonCloudWatchAgent\amazon-cloudwatch-agent-ctl.ps1" `
  -a fetch-config `
  -m ec2 `
  -s `
  -c "ssm:AmazonCloudWatch-windows-iis"
```

## Updating Configuration Across All Instances

When you need to change the configuration, update the parameter and then tell all instances to reload:

```bash
# Step 1: Update the parameter
aws ssm put-parameter \
  --name "AmazonCloudWatch-linux-config" \
  --type "String" \
  --value file://updated-config.json \
  --overwrite

# Step 2: Push the update to all instances using SSM Run Command
aws ssm send-command \
  --document-name "AmazonCloudWatch-ManageAgent" \
  --parameters '{"action":["configure"],"mode":["ec2"],"optionalConfigurationSource":["ssm"],"optionalConfigurationLocation":["AmazonCloudWatch-linux-config"],"optionalRestart":["yes"]}' \
  --targets "Key=tag:Role,Values=webserver" \
  --comment "Update CloudWatch Agent config"
```

The `--targets` parameter lets you scope the update. You can target by tag, instance IDs, or resource groups:

```bash
# Target all instances with a specific tag
--targets "Key=tag:Environment,Values=production"

# Target specific instances
--targets "Key=instanceids,Values=i-abc123,i-def456"

# Target all instances in a resource group
--targets "Key=resource-groups:Name,Values=production-fleet"
```

## Using Multiple Configuration Layers

The CloudWatch Agent supports merging multiple configurations. This lets you have a base config that's shared across all instances, plus role-specific additions:

```bash
# Start with the base config, then append the role-specific config
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c ssm:AmazonCloudWatch-base-config

sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a append-config \
  -m ec2 \
  -s \
  -c ssm:AmazonCloudWatch-webserver-additions
```

The `append-config` action merges the second configuration into the first. This is powerful for layered configurations:

```
AmazonCloudWatch-base-config           # CPU, memory, disk, swap (all instances)
AmazonCloudWatch-webserver-additions    # Nginx logs, HTTP metrics (web servers)
AmazonCloudWatch-worker-additions       # Queue metrics, worker logs (workers)
AmazonCloudWatch-database-additions     # Database logs, query metrics (DB servers)
```

## Automating with User Data

In your launch template, set up the agent to pull config from Parameter Store automatically:

```bash
#!/bin/bash
# EC2 User Data script

# Install the CloudWatch Agent
yum install -y amazon-cloudwatch-agent

# Determine which config to use based on instance tags
INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
REGION=$(curl -s http://169.254.169.254/latest/meta-data/placement/region)
ROLE=$(aws ec2 describe-tags \
  --filters "Name=resource-id,Values=$INSTANCE_ID" "Name=key,Values=Role" \
  --query 'Tags[0].Value' --output text --region $REGION)

# Map the role to a config parameter
case "$ROLE" in
  webserver) CONFIG_PARAM="AmazonCloudWatch-linux-webserver" ;;
  worker)    CONFIG_PARAM="AmazonCloudWatch-linux-worker" ;;
  database)  CONFIG_PARAM="AmazonCloudWatch-linux-database" ;;
  *)         CONFIG_PARAM="AmazonCloudWatch-linux-minimal" ;;
esac

# Start the agent with the appropriate config
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -s -c "ssm:$CONFIG_PARAM"
```

This automatically selects the right config based on the instance's `Role` tag.

## IAM Permissions

The EC2 instance role needs permission to read from Parameter Store:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters"
      ],
      "Resource": "arn:aws:ssm:*:*:parameter/AmazonCloudWatch-*"
    }
  ]
}
```

The `AmazonSSMManagedInstanceCore` managed policy includes this permission, along with the other SSM permissions the agent needs.

## Version Management

Parameter Store keeps a history of parameter versions. You can check what changed:

```bash
# List parameter versions
aws ssm get-parameter-history \
  --name "AmazonCloudWatch-linux-config" \
  --query 'Parameters[*].[Version,LastModifiedDate,Description]' \
  --output table

# Get a specific version
aws ssm get-parameter \
  --name "AmazonCloudWatch-linux-config:3" \
  --query 'Parameter.Value' \
  --output text | python3 -m json.tool
```

To roll back to a previous version, fetch it and put it as the current value:

```bash
# Roll back to version 2
OLD_CONFIG=$(aws ssm get-parameter \
  --name "AmazonCloudWatch-linux-config:2" \
  --query 'Parameter.Value' --output text)

aws ssm put-parameter \
  --name "AmazonCloudWatch-linux-config" \
  --type "String" \
  --value "$OLD_CONFIG" \
  --overwrite
```

## SecureString for Sensitive Configs

If your config contains sensitive values (like API keys for custom destinations), use SecureString parameters encrypted with KMS:

```bash
# Store config as encrypted SecureString
aws ssm put-parameter \
  --name "AmazonCloudWatch-secure-config" \
  --type "SecureString" \
  --key-id "alias/cloudwatch-agent-key" \
  --value file://config-with-secrets.json
```

The agent can read SecureString parameters automatically, as long as the instance role has `kms:Decrypt` permission on the KMS key.

## Wrapping Up

SSM Parameter Store turns CloudWatch Agent configuration from a manual, per-instance task into a centralized, automated fleet management operation. Store your configs, tag your instances, and let automation handle the rest. Combined with SSM Run Command for pushing updates, you can manage monitoring configuration across hundreds of instances without touching a single one directly. For the actual configuration content, see our posts on [collecting memory and disk metrics](https://oneuptime.com/blog/post/2026-02-12-collect-memory-disk-metrics-cloudwatch-agent/view), [collecting application logs](https://oneuptime.com/blog/post/2026-02-12-collect-application-logs-cloudwatch-agent/view), and [configuring custom metrics](https://oneuptime.com/blog/post/2026-02-12-configure-cloudwatch-agent-custom-metrics/view).
