# Validation Summary: How to Set Up EC2 Auto Recovery for Instance Health

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EC2
- EC2 automatic instance recovery
- EC2 status checks
- Amazon CloudWatch alarms
- Amazon EventBridge
- AWS Health events
- AWS CLI
- Terraform AWS provider
- Application Load Balancer target groups

## Sources Consulted
- AWS EC2 User Guide: Status checks for Amazon EC2 instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/monitoring-system-instance-status-check.html
- AWS EC2 User Guide: Automatic instance recovery - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-recover.html
- AWS EC2 User Guide: Configure simplified automatic recovery - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-configuration-recovery.html
- AWS EC2 User Guide: Configure CloudWatch action based recovery - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/cloudwatch-recovery.html
- Amazon CloudWatch User Guide: Stop, terminate, reboot, or recover an EC2 instance - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/UsingAlarmActions.html
- AWS CLI Command Reference: describe-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html
- AWS CLI Command Reference: modify-instance-maintenance-options - https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-instance-maintenance-options.html
- AWS Health User Guide: AWS Health events EventBridge schema - https://docs.aws.amazon.com/health/latest/ug/aws-health-events-eventbridge-schema.html
- AWS EC2 User Guide: EC2 instance state-change events - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/monitoring-instance-state-changes.html
- Terraform Registry: aws_cloudwatch_metric_alarm - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Terraform Registry: aws_lb_target_group_attachment - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group_attachment

## Issues Found
- The post stated that EC2 runs two types of status checks. AWS now documents three types: system, instance, and attached EBS status checks. Updated the wording to focus on the two relevant checks and added a short note about attached EBS checks.
- The simplified recovery verification command queried `describe-instance-status` events, which does not show the maintenance auto recovery setting. Replaced it with `describe-instances` querying `MaintenanceOptions.AutoRecovery`.
- The recovery preservation list said public IPv4 addresses are not preserved unless using Elastic IP. AWS documents that automatic instance recovery preserves public, private, and Elastic IP addresses. Moved public IPv4 into the preserved list and removed it from the lost list.
- The storage limitation said instance store-only instances cannot be recovered. AWS documents that simplified recovery does not support instance store volumes, while CloudWatch action based recovery supports instance store volumes only on selected instance families and loses instance store data. Updated the limitation accordingly.
- The limitation section said auto recovery does not work with Spot instances, but the current AWS recovery requirements emphasize unsupported Auto Scaling group membership and do not list Spot as a recovery-specific limitation. Replaced that claim with the documented Auto Scaling group limitation.
- The EventBridge rule used an EC2 state-change pattern with a `cause` field, but EC2 state-change events only include fields such as `instance-id` and `state`. Replaced it with an AWS Health event pattern for the documented automatic recovery success and failure event type codes.

## Review Notes
The CloudWatch alarm and Terraform alarm examples use valid fields and action ARNs. AWS recommends treating missing data as `missing` for EC2 alarm actions, which could be added in a future polish pass, but the current examples are technically valid.
