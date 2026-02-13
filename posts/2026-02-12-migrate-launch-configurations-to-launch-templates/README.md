# How to Migrate from Launch Configurations to Launch Templates

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Auto Scaling, Launch Templates, Migration

Description: Step-by-step guide to migrating your AWS Auto Scaling groups from deprecated Launch Configurations to Launch Templates with zero downtime.

---

If you've been running EC2 Auto Scaling groups for a while, there's a good chance you're still using Launch Configurations. AWS has been nudging everyone toward Launch Templates for years now, and for good reason - Launch Configurations are officially deprecated, and new features only land in Launch Templates. It's time to make the switch.

This guide walks you through migrating from Launch Configurations to Launch Templates without disrupting your running infrastructure.

## Why Launch Templates Are Better

Launch Configurations were the original way to define instance settings for Auto Scaling groups. They worked fine, but they had serious limitations. You couldn't version them. Every change meant creating a brand new Launch Configuration, updating your Auto Scaling group to point to it, and then cleaning up the old one.

Launch Templates fix all of this. Here's what you get:

- **Versioning** - Make changes without creating entirely new resources
- **Default and latest version tracking** - Point your ASG at "latest" and it picks up changes automatically
- **Mixed instance types** - Run multiple instance types in a single ASG
- **Spot and On-Demand mixing** - Combine pricing models in one group
- **T2/T3 Unlimited support** - Configure burstable instance credit settings
- **Network interface settings** - More granular networking control

## Auditing Your Current Launch Configurations

Before you start migrating, you need to know what you're working with. Let's pull a list of all Launch Configurations in your account.

This command lists all your Launch Configurations with their associated Auto Scaling groups:

```bash
# List all Launch Configurations
aws autoscaling describe-launch-configurations \
  --query 'LaunchConfigurations[].{Name:LaunchConfigurationName,AMI:ImageId,Type:InstanceType,Key:KeyName,SGs:SecurityGroups}' \
  --output table
```

And here's how to see which Auto Scaling groups reference Launch Configurations vs Launch Templates:

```bash
# Find ASGs still using Launch Configurations
aws autoscaling describe-auto-scaling-groups \
  --query 'AutoScalingGroups[?LaunchConfigurationName!=null].{ASG:AutoScalingGroupName,LC:LaunchConfigurationName}' \
  --output table
```

Take note of every Launch Configuration and what settings it uses. You'll need this information when creating the matching Launch Templates.

## Creating a Launch Template from an Existing Launch Configuration

AWS provides a way to convert a Launch Configuration into a Launch Template directly. This is the easiest migration path.

Here's how to export a Launch Configuration's settings and create a matching Launch Template:

```bash
# Get the full details of your Launch Configuration
aws autoscaling describe-launch-configurations \
  --launch-configuration-names my-lc-name \
  --query 'LaunchConfigurations[0]' \
  --output json > lc-details.json

# Create a Launch Template from the Launch Configuration
aws ec2 create-launch-template \
  --launch-template-name my-new-template \
  --launch-template-data '{
    "ImageId": "ami-0abcdef1234567890",
    "InstanceType": "t3.medium",
    "KeyName": "my-key-pair",
    "SecurityGroupIds": ["sg-0123456789abcdef0"],
    "UserData": "base64-encoded-user-data",
    "IamInstanceProfile": {
      "Arn": "arn:aws:iam::123456789012:instance-profile/my-profile"
    },
    "BlockDeviceMappings": [
      {
        "DeviceName": "/dev/xvda",
        "Ebs": {
          "VolumeSize": 20,
          "VolumeType": "gp3",
          "Encrypted": true
        }
      }
    ],
    "Monitoring": {
      "Enabled": true
    }
  }'
```

If you're using Terraform, the migration is even cleaner. You can use a data source to read the existing Launch Configuration and create a matching Launch Template.

This Terraform configuration reads an existing Launch Configuration and creates a new Launch Template with the same settings:

```hcl
# Read the existing Launch Configuration
data "aws_launch_configuration" "existing" {
  name = "my-existing-lc"
}

# Create a Launch Template with matching settings
resource "aws_launch_template" "migrated" {
  name_prefix   = "migrated-"
  image_id      = data.aws_launch_configuration.existing.image_id
  instance_type = data.aws_launch_configuration.existing.instance_type
  key_name      = data.aws_launch_configuration.existing.key_name

  vpc_security_group_ids = data.aws_launch_configuration.existing.security_groups

  iam_instance_profile {
    name = data.aws_launch_configuration.existing.iam_instance_profile
  }

  user_data = data.aws_launch_configuration.existing.user_data

  monitoring {
    enabled = data.aws_launch_configuration.existing.enable_monitoring
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "migrated-instance"
    }
  }
}
```

## Updating the Auto Scaling Group

Once your Launch Template is ready, you need to point your Auto Scaling group to it. This is the critical step, and the good news is that it doesn't affect running instances.

This command updates an existing Auto Scaling group to use a Launch Template instead of a Launch Configuration:

```bash
# Update ASG to use Launch Template instead of Launch Configuration
aws autoscaling update-auto-scaling-group \
  --auto-scaling-group-name my-asg \
  --launch-template LaunchTemplateId=lt-0123456789abcdef0,Version='$Latest'
```

When you do this, existing instances keep running with their current configuration. Only new instances launched by the ASG will use the Launch Template settings. This means the migration is effectively zero-downtime.

If you want all instances to pick up the new template, you can trigger a rolling update:

```bash
# Start an instance refresh to gradually replace old instances
aws autoscaling start-instance-refresh \
  --auto-scaling-group-name my-asg \
  --preferences '{
    "MinHealthyPercentage": 90,
    "InstanceWarmup": 300
  }'
```

## Using Launch Template Versions

One of the biggest advantages of Launch Templates is versioning. After migration, you can update your template without touching the ASG.

Here's how to create a new version of your Launch Template when you need to change the AMI:

```bash
# Create a new version with an updated AMI
aws ec2 create-launch-template-version \
  --launch-template-id lt-0123456789abcdef0 \
  --source-version 1 \
  --launch-template-data '{"ImageId": "ami-newami1234567890"}'

# Set the new version as default
aws ec2 modify-launch-template \
  --launch-template-id lt-0123456789abcdef0 \
  --default-version 2
```

If your ASG is pointed at `$Latest` or `$Default`, it'll automatically use the new version for the next instance it launches. No ASG update needed.

## Handling Edge Cases

There are a few gotchas to watch out for during migration.

**Security Group References**: Launch Configurations use security group names or IDs. Launch Templates use security group IDs only when you specify a network interface. If you're specifying a subnet in the ASG, put security groups at the top level of the template. If you're specifying network interfaces in the template, put security groups inside the network interface block.

**User Data Encoding**: Launch Configurations accept raw user data. Launch Templates expect base64-encoded user data. If you're copying user data over, make sure to encode it:

```bash
# Base64 encode your user data script
cat user-data.sh | base64 > user-data-encoded.txt
```

**Classic Load Balancers**: If your ASG uses Classic ELBs, those references stay on the ASG itself and aren't affected by the template migration.

## Cleaning Up Old Launch Configurations

After you've confirmed everything works with the Launch Template, clean up the old Launch Configurations. They clutter your account and can cause confusion.

This script finds and deletes Launch Configurations that aren't referenced by any Auto Scaling group:

```bash
# List Launch Configurations not attached to any ASG
USED_LCS=$(aws autoscaling describe-auto-scaling-groups \
  --query 'AutoScalingGroups[].LaunchConfigurationName' \
  --output text)

ALL_LCS=$(aws autoscaling describe-launch-configurations \
  --query 'LaunchConfigurations[].LaunchConfigurationName' \
  --output text)

for lc in $ALL_LCS; do
  if [[ ! " $USED_LCS " =~ " $lc " ]]; then
    echo "Deleting unused Launch Configuration: $lc"
    aws autoscaling delete-launch-configuration \
      --launch-configuration-name "$lc"
  fi
done
```

## Monitoring the Migration

After switching over, keep an eye on your Auto Scaling group activity to make sure new instances launch correctly. You can check the ASG activity history to spot any launch failures.

For comprehensive monitoring of your EC2 instances and Auto Scaling groups during and after migration, consider using [OneUptime's infrastructure monitoring](https://oneuptime.com/blog/post/2026-02-12-configure-health-checks-ec2-load-balancer/view) to track instance health and catch any issues early.

## Summary

Migrating from Launch Configurations to Launch Templates is straightforward and low-risk. The key steps are: audit your current Launch Configurations, create matching Launch Templates, update your ASGs to point to the new templates, optionally trigger instance refreshes, and clean up the old configs. The entire process can be done without any downtime, and you'll immediately benefit from versioning, mixed instance types, and all the other features that Launch Templates offer.

Don't wait on this one. AWS has been clear that Launch Configurations are on their way out, and the migration gets harder the longer you put it off.
