# Validation Summary: How to Recreate EC2 Instances in Auto Scaling Group with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS EC2 Auto Scaling Groups
- AWS Launch Templates
- AWS Instance Refresh
- AWS CLI
- Application Load Balancer target groups

## Sources Consulted
- HashiCorp AWS Provider `aws_autoscaling_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- HashiCorp AWS Provider documentation source for `aws_autoscaling_group`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/autoscaling_group.html.markdown
- Amazon EC2 Auto Scaling User Guide, instance refresh overview: https://docs.aws.amazon.com/autoscaling/ec2/userguide/instance-refresh-overview.html
- Amazon EC2 Auto Scaling User Guide, skip matching: https://docs.aws.amazon.com/autoscaling/ec2/userguide/asg-instance-refresh-skip-matching.html
- Amazon EC2 Auto Scaling User Guide, instance refresh defaults: https://docs.aws.amazon.com/autoscaling/ec2/userguide/understand-instance-refresh-default-values.html
- AWS CLI `start-instance-refresh` command reference: https://docs.aws.amazon.com/cli/latest/reference/autoscaling/start-instance-refresh.html
- AWS CLI `describe-instance-refreshes` command reference: https://docs.aws.amazon.com/cli/latest/reference/autoscaling/describe-instance-refreshes.html
- AWS CLI `cancel-instance-refresh` command reference: https://docs.aws.amazon.com/cli/latest/reference/autoscaling/cancel-instance-refresh.html
- Amazon EC2 Auto Scaling API `StartInstanceRefresh` reference: https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_StartInstanceRefresh.html

## Issues Found
- The Terraform examples listed `launch_template` in `instance_refresh.triggers`. The AWS provider documentation states that changes to `launch_configuration`, `launch_template`, or `mixed_instances_policy` always trigger instance refresh when `instance_refresh` is configured, and `triggers` is for additional ASG properties. Updated the examples to use `triggers = ["tag"]` only where tag changes are intended as additional triggers.
- The mixed instances example used `triggers = ["launch_template"]` even though launch template and mixed instances policy changes trigger refresh automatically. Removed the redundant trigger and added a short clarifying comment.
- Adjusted one tag comment to avoid implying the tag alone is the required launch template refresh mechanism. The launch template version reference both records the version and can participate in tag-triggered refreshes.

## Review Notes
- The AWS CLI commands and option names for starting, describing, and cancelling instance refreshes match the current AWS CLI documentation.
- The Terraform snippets use current AWS provider arguments for launch templates, Auto Scaling Groups, instance refresh preferences, mixed instances policies, target group attachment, and scaling policies.
- Terraform was not installed in the local environment, so syntax validation was performed by manual review against provider documentation rather than `terraform validate`.
