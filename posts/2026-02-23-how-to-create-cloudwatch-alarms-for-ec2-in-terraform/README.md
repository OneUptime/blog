# How to Create CloudWatch Alarms for EC2 in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, CloudWatch, EC2, Monitoring, Infrastructure as Code

Description: Learn how to create comprehensive CloudWatch alarms for EC2 instances using Terraform to monitor CPU, memory, disk, and network performance.

---

Monitoring EC2 instances is essential for maintaining application performance and availability. CloudWatch alarms allow you to automatically detect when your instances are underperforming, overloaded, or experiencing issues. This guide shows you how to create a complete set of CloudWatch alarms for EC2 using Terraform.

## Setting Up the Provider

```hcl
# Configure the AWS provider
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

## Creating an SNS Topic for Alarm Notifications

```hcl
# Create an SNS topic for EC2 alarm notifications
resource "aws_sns_topic" "ec2_alarms" {
  name = "ec2-alarm-notifications"
}

# Subscribe the operations team
resource "aws_sns_topic_subscription" "ops_email" {
  topic_arn = aws_sns_topic.ec2_alarms.arn
  protocol  = "email"
  endpoint  = var.ops_email
}

variable "ops_email" {
  type        = string
  description = "Operations team email for alarm notifications"
}
```

## CPU Utilization Alarm

```hcl
# Alarm when CPU utilization exceeds 80% for 5 minutes
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "ec2-high-cpu-${var.instance_id}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300  # 5 minutes
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "EC2 instance CPU utilization has exceeded 80% for 10 minutes"
  alarm_actions       = [aws_sns_topic.ec2_alarms.arn]
  ok_actions          = [aws_sns_topic.ec2_alarms.arn]

  dimensions = {
    InstanceId = var.instance_id
  }
}

# Alarm for sustained low CPU (potential zombie instance)
resource "aws_cloudwatch_metric_alarm" "cpu_low" {
  alarm_name          = "ec2-low-cpu-${var.instance_id}"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 6   # 30 minutes of low CPU
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 5
  alarm_description   = "EC2 instance CPU utilization has been below 5% for 30 minutes"
  alarm_actions       = [aws_sns_topic.ec2_alarms.arn]

  dimensions = {
    InstanceId = var.instance_id
  }
}

variable "instance_id" {
  type        = string
  description = "EC2 instance ID to monitor"
}
```

## Status Check Alarms

```hcl
# System status check failure (AWS infrastructure issue)
resource "aws_cloudwatch_metric_alarm" "system_status" {
  alarm_name          = "ec2-system-check-${var.instance_id}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "StatusCheckFailed_System"
  namespace           = "AWS/EC2"
  period              = 60  # Check every minute
  statistic           = "Maximum"
  threshold           = 0
  alarm_description   = "EC2 system status check has failed - potential hardware issue"
  alarm_actions = [
    aws_sns_topic.ec2_alarms.arn,
    # Auto-recover the instance
    "arn:aws:automate:${data.aws_region.current.name}:ec2:recover"
  ]

  dimensions = {
    InstanceId = var.instance_id
  }
}

# Instance status check failure (OS-level issue)
resource "aws_cloudwatch_metric_alarm" "instance_status" {
  alarm_name          = "ec2-instance-check-${var.instance_id}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "StatusCheckFailed_Instance"
  namespace           = "AWS/EC2"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0
  alarm_description   = "EC2 instance status check has failed - potential OS issue"
  alarm_actions = [
    aws_sns_topic.ec2_alarms.arn,
    # Auto-reboot the instance
    "arn:aws:automate:${data.aws_region.current.name}:ec2:reboot"
  ]

  dimensions = {
    InstanceId = var.instance_id
  }
}

data "aws_region" "current" {}
```

## Network Performance Alarms

```hcl
# Network input (bytes received) spike detection
resource "aws_cloudwatch_metric_alarm" "network_in_high" {
  alarm_name          = "ec2-network-in-high-${var.instance_id}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "NetworkIn"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 500000000  # 500 MB in 5 minutes
  alarm_description   = "EC2 instance is receiving unusually high network traffic"
  alarm_actions       = [aws_sns_topic.ec2_alarms.arn]

  dimensions = {
    InstanceId = var.instance_id
  }
}

# Network output spike detection
resource "aws_cloudwatch_metric_alarm" "network_out_high" {
  alarm_name          = "ec2-network-out-high-${var.instance_id}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "NetworkOut"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 500000000
  alarm_description   = "EC2 instance is sending unusually high network traffic"
  alarm_actions       = [aws_sns_topic.ec2_alarms.arn]

  dimensions = {
    InstanceId = var.instance_id
  }
}
```

## Disk Performance Alarms (EBS)

```hcl
# EBS read latency alarm
resource "aws_cloudwatch_metric_alarm" "disk_read_ops" {
  alarm_name          = "ec2-disk-read-ops-${var.instance_id}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "DiskReadOps"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 10000
  alarm_description   = "EC2 instance disk read operations are abnormally high"
  alarm_actions       = [aws_sns_topic.ec2_alarms.arn]

  dimensions = {
    InstanceId = var.instance_id
  }
}

# EBS write operations alarm
resource "aws_cloudwatch_metric_alarm" "disk_write_ops" {
  alarm_name          = "ec2-disk-write-ops-${var.instance_id}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "DiskWriteOps"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 10000
  alarm_description   = "EC2 instance disk write operations are abnormally high"
  alarm_actions       = [aws_sns_topic.ec2_alarms.arn]

  dimensions = {
    InstanceId = var.instance_id
  }
}
```

## Creating Alarms for Multiple Instances

Use Terraform loops to create alarms for a fleet of instances:

```hcl
# Define instances to monitor
variable "monitored_instances" {
  type = map(object({
    instance_id   = string
    cpu_threshold = number
    name          = string
  }))
  default = {
    "web-1" = { instance_id = "i-0123456789abcdef0", cpu_threshold = 75, name = "Web Server 1" }
    "web-2" = { instance_id = "i-0123456789abcdef1", cpu_threshold = 75, name = "Web Server 2" }
    "api-1" = { instance_id = "i-0123456789abcdef2", cpu_threshold = 80, name = "API Server 1" }
    "db-1"  = { instance_id = "i-0123456789abcdef3", cpu_threshold = 70, name = "Database Server" }
  }
}

# Create CPU alarms for all instances
resource "aws_cloudwatch_metric_alarm" "fleet_cpu" {
  for_each = var.monitored_instances

  alarm_name          = "ec2-cpu-${each.key}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = each.value.cpu_threshold
  alarm_description   = "${each.value.name} CPU utilization exceeded ${each.value.cpu_threshold}%"
  alarm_actions       = [aws_sns_topic.ec2_alarms.arn]
  ok_actions          = [aws_sns_topic.ec2_alarms.arn]

  dimensions = {
    InstanceId = each.value.instance_id
  }
}

# Create status check alarms for all instances
resource "aws_cloudwatch_metric_alarm" "fleet_status" {
  for_each = var.monitored_instances

  alarm_name          = "ec2-status-${each.key}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "StatusCheckFailed"
  namespace           = "AWS/EC2"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0
  alarm_description   = "${each.value.name} status check has failed"
  alarm_actions       = [aws_sns_topic.ec2_alarms.arn]

  dimensions = {
    InstanceId = each.value.instance_id
  }
}
```

## Best Practices

Set appropriate thresholds based on your application's normal behavior rather than using arbitrary values. Use multiple evaluation periods to avoid alerting on brief spikes. Configure both alarm and OK actions so your team knows when issues resolve. Use auto-recovery actions for system status check failures. Create alarms for all critical metrics, not just CPU. Group related alarms using consistent naming conventions for easier management.

For monitoring other AWS services alongside EC2, check out our guides on [CloudWatch alarms for RDS](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloudwatch-alarms-for-rds-in-terraform/view) and [CloudWatch alarms for Lambda](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloudwatch-alarms-for-lambda-in-terraform/view).

## Conclusion

CloudWatch alarms for EC2 instances created through Terraform provide a consistent, reproducible monitoring setup that scales with your infrastructure. By covering CPU, status checks, network, and disk metrics, you build a comprehensive monitoring foundation. Combined with SNS notifications and auto-recovery actions, these alarms help you maintain high availability and quickly respond to performance issues.
