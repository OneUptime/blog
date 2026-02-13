# How to Use AWS CLI to Manage EC2 Instances

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, CLI, Automation

Description: A comprehensive reference for managing EC2 instances with the AWS CLI, covering launching, monitoring, modifying, and automating common instance operations.

---

The AWS Management Console is fine for occasional tasks, but if you're managing EC2 instances regularly, the CLI is where real productivity lives. You can script repetitive tasks, pipe outputs into other commands, and automate workflows that would take dozens of clicks in the console.

This guide covers the most useful AWS CLI commands for EC2 management, organized by the tasks you'll actually need to do.

## Setting Up the CLI

If you haven't configured the AWS CLI yet, here's the quick setup.

Install and configure the AWS CLI:

```bash
# Install AWS CLI v2 (macOS)
brew install awscli

# Or on Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure with your credentials
aws configure
# AWS Access Key ID: YOUR_KEY
# AWS Secret Access Key: YOUR_SECRET
# Default region: us-east-1
# Default output format: json
```

Set up named profiles for multiple accounts:

```bash
# Configure a named profile
aws configure --profile production
aws configure --profile staging

# Use a specific profile
aws ec2 describe-instances --profile production

# Or set it as an environment variable
export AWS_PROFILE=production
```

## Launching Instances

The `run-instances` command is the CLI equivalent of the Launch Instance wizard.

Launch a basic instance:

```bash
# Launch a single t3.micro instance
aws ec2 run-instances \
  --image-id ami-0abc123def456 \
  --instance-type t3.micro \
  --key-name my-key \
  --security-group-ids sg-0abc123 \
  --subnet-id subnet-0abc123 \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=my-server}]'
```

Launch with more options:

```bash
# Launch with user data, IAM profile, and specific EBS config
aws ec2 run-instances \
  --image-id ami-0abc123def456 \
  --instance-type t3.medium \
  --key-name my-key \
  --security-group-ids sg-0abc123 \
  --subnet-id subnet-0abc123 \
  --iam-instance-profile Name=my-instance-profile \
  --user-data file://setup.sh \
  --block-device-mappings '[{
    "DeviceName": "/dev/xvda",
    "Ebs": {
      "VolumeSize": 30,
      "VolumeType": "gp3",
      "Encrypted": true
    }
  }]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=web-server},{Key=Environment,Value=production}]' \
  --count 3
```

The `--count 3` parameter launches 3 identical instances. Way faster than clicking through the console three times.

## Listing and Filtering Instances

The `describe-instances` command is your primary tool for querying instance information. The `--query` parameter with JMESPath lets you extract exactly the fields you need.

List all running instances with key details:

```bash
# List running instances with Name, ID, Type, IP, and State
aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running" \
  --query 'Reservations[].Instances[].{
    Name: Tags[?Key==`Name`].Value | [0],
    ID: InstanceId,
    Type: InstanceType,
    IP: PublicIpAddress,
    PrivateIP: PrivateIpAddress,
    State: State.Name
  }' \
  --output table
```

Filter by tags:

```bash
# Find instances by environment tag
aws ec2 describe-instances \
  --filters "Name=tag:Environment,Values=production" \
  --query 'Reservations[].Instances[].{
    Name: Tags[?Key==`Name`].Value | [0],
    ID: InstanceId,
    State: State.Name
  }' \
  --output table

# Find instances by multiple criteria
aws ec2 describe-instances \
  --filters \
    "Name=instance-type,Values=t3.micro,t3.small" \
    "Name=instance-state-name,Values=running" \
    "Name=tag:Team,Values=backend"
```

## Starting, Stopping, and Rebooting

Basic lifecycle management:

```bash
# Stop an instance
aws ec2 stop-instances --instance-ids i-0abc123

# Stop multiple instances at once
aws ec2 stop-instances --instance-ids i-0abc123 i-0def456 i-0ghi789

# Start an instance
aws ec2 start-instances --instance-ids i-0abc123

# Reboot an instance (no state change, just restarts)
aws ec2 reboot-instances --instance-ids i-0abc123

# Terminate an instance (permanent deletion)
aws ec2 terminate-instances --instance-ids i-0abc123
```

Wait for state changes to complete:

```bash
# Wait for instance to be fully running
aws ec2 start-instances --instance-ids i-0abc123
aws ec2 wait instance-running --instance-ids i-0abc123
echo "Instance is now running"

# Wait for instance to stop
aws ec2 stop-instances --instance-ids i-0abc123
aws ec2 wait instance-stopped --instance-ids i-0abc123
echo "Instance has stopped"
```

## Modifying Instances

Change instance attributes without recreating them:

```bash
# Change instance type (must be stopped first)
aws ec2 stop-instances --instance-ids i-0abc123
aws ec2 wait instance-stopped --instance-ids i-0abc123
aws ec2 modify-instance-attribute \
  --instance-id i-0abc123 \
  --instance-type "{\"Value\": \"t3.large\"}"
aws ec2 start-instances --instance-ids i-0abc123

# Enable/disable termination protection
aws ec2 modify-instance-attribute \
  --instance-id i-0abc123 \
  --disable-api-termination

# Enable detailed monitoring
aws ec2 monitor-instances --instance-ids i-0abc123
```

## Working with Security Groups

Manage security group rules from the CLI:

```bash
# Create a security group
aws ec2 create-security-group \
  --group-name web-server-sg \
  --description "Web server security group" \
  --vpc-id vpc-0abc123

# Add an inbound rule
aws ec2 authorize-security-group-ingress \
  --group-id sg-0abc123 \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Remove an inbound rule
aws ec2 revoke-security-group-ingress \
  --group-id sg-0abc123 \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0

# List rules for a security group
aws ec2 describe-security-groups \
  --group-ids sg-0abc123 \
  --query 'SecurityGroups[].IpPermissions'
```

## Creating and Managing AMIs

Create snapshots of your instances for backup or duplication:

```bash
# Create an AMI from a running instance
aws ec2 create-image \
  --instance-id i-0abc123 \
  --name "web-server-backup-$(date +%Y%m%d)" \
  --description "Weekly backup of web server" \
  --no-reboot

# List your AMIs
aws ec2 describe-images \
  --owners self \
  --query 'Images[].{Name: Name, ID: ImageId, Created: CreationDate}' \
  --output table

# Delete old AMIs
aws ec2 deregister-image --image-id ami-0abc123
```

## Useful Automation Scripts

Here are some practical scripts that combine CLI commands.

Stop all development instances at end of day:

```bash
#!/bin/bash
# stop-dev-instances.sh - Stop all development instances
INSTANCE_IDS=$(aws ec2 describe-instances \
  --filters \
    "Name=tag:Environment,Values=development" \
    "Name=instance-state-name,Values=running" \
  --query 'Reservations[].Instances[].InstanceId' \
  --output text)

if [ -n "$INSTANCE_IDS" ]; then
  echo "Stopping instances: $INSTANCE_IDS"
  aws ec2 stop-instances --instance-ids $INSTANCE_IDS
else
  echo "No running development instances found"
fi
```

Find and clean up unattached EBS volumes:

```bash
#!/bin/bash
# cleanup-volumes.sh - Find unattached EBS volumes
aws ec2 describe-volumes \
  --filters "Name=status,Values=available" \
  --query 'Volumes[].{
    ID: VolumeId,
    Size: Size,
    Created: CreateTime
  }' \
  --output table
```

Get a cost estimate based on running instances:

```bash
#!/bin/bash
# count-instances.sh - Count running instances by type
aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running" \
  --query 'Reservations[].Instances[].InstanceType' \
  --output text | tr '\t' '\n' | sort | uniq -c | sort -rn
```

## SSH and Session Manager

Connect to instances in different ways:

```bash
# Traditional SSH with key
ssh -i my-key.pem ec2-user@<public-ip>

# SSH with instance ID (requires SSH config setup)
aws ec2-instance-connect send-ssh-public-key \
  --instance-id i-0abc123 \
  --instance-os-user ec2-user \
  --ssh-public-key file://~/.ssh/id_rsa.pub

# Session Manager (no SSH key needed, no public IP required)
aws ssm start-session --target i-0abc123
```

Session Manager is the recommended approach since it doesn't require opening port 22 or managing SSH keys.

For monitoring the instances you manage through the CLI, check out our guide on [AWS infrastructure monitoring](https://oneuptime.com/blog/post/2026-02-13-aws-cloudwatch-infrastructure-monitoring/view) to set up proper alerting and dashboards.

## Wrapping Up

The AWS CLI transforms EC2 management from a point-and-click affair into something you can script, automate, and version control. Master the `describe-instances` query syntax and the basic lifecycle commands, and you'll be able to manage fleets of instances far more efficiently than through the console. Build up a library of scripts for your common tasks, and you'll save hours every week.
