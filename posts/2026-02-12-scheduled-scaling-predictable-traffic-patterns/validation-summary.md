# Validation Summary: How to Set Up Scheduled Scaling for Predictable Traffic Patterns

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EC2 Auto Scaling
- AWS CLI
- Scheduled scaling actions
- Target tracking scaling policies
- Terraform AWS provider
- CloudFormation scheduled actions
- CloudWatch monitoring

## Sources Consulted
- AWS CLI Command Reference: `autoscaling put-scheduled-update-group-action` - https://docs.aws.amazon.com/cli/latest/reference/autoscaling/put-scheduled-update-group-action.html
- AWS CLI Command Reference: `autoscaling put-scaling-policy` - https://docs.aws.amazon.com/cli/latest/reference/autoscaling/put-scaling-policy.html
- Amazon EC2 Auto Scaling User Guide: Scheduled scaling - https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-scheduled-scaling.html
- Amazon EC2 Auto Scaling User Guide: Create a scheduled action - https://docs.aws.amazon.com/autoscaling/ec2/userguide/scheduled-scaling-create-scheduled-action.html
- Terraform Registry: `aws_autoscaling_schedule` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_schedule
- AWS CloudFormation Template Reference: `AWS::AutoScaling::ScheduledAction` - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-autoscaling-scheduledaction.html

## Issues Found
- The AWS CLI target tracking policy example included `ScaleInCooldown` and `ScaleOutCooldown` inside `--target-tracking-configuration`. Those fields are not valid for Amazon EC2 Auto Scaling target tracking policies. Removed them and left the valid `PredefinedMetricSpecification` and `TargetValue` fields.
- The post stated that CLI scheduled scaling times are always UTC. Current Amazon EC2 Auto Scaling supports `--time-zone` for recurring cron schedules, while `start-time` and `end-time` remain UTC. Updated the wording to explain UTC defaults and the `--time-zone` option.
- The timezone gotcha said Terraform and CloudFormation both support `time_zone`. Terraform uses `time_zone`, but CloudFormation uses `TimeZone`. Updated the statement with the correct parameter/property names.
- The overlapping actions note described precedence in a way that does not match AWS documentation. AWS documents identical cron expressions as arbitrary and undefined, and one-time actions require a unique scheduled time. Updated the guidance to avoid identical recurring cron expressions.

## Review Notes
- The AWS CLI was not installed in the local environment, so CLI verification was performed against official AWS CLI documentation rather than local `--help` output.
- Terraform was not installed locally, so Terraform syntax was checked against the official Terraform Registry documentation.
- The OneUptime blog link returned HTTP 200 during validation.
