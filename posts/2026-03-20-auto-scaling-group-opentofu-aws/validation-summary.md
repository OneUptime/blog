# Validation Summary: How to Deploy an Auto Scaling Group with OpenTofu on AWS - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS provider for OpenTofu/Terraform
- Amazon EC2 Auto Scaling
- Amazon EC2 Launch Templates
- Amazon EC2
- Elastic Load Balancing target groups
- Amazon CloudWatch Agent
- AWS Identity and Access Management (IAM)
- Amazon SNS

## Sources Consulted
- OpenTofu lifecycle meta-argument docs: https://opentofu.org/docs/v1.6/language/meta-arguments/lifecycle/
- OpenTofu `tofu init` docs: https://opentofu.org/docs/cli/init/
- OpenTofu `tofu plan` docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `tofu apply` docs: https://opentofu.org/docs/v1.11/cli/commands/apply/
- AWS provider docs for `aws_launch_template` (source-backed markdown): https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/launch_template.html.markdown
- AWS provider docs for `aws_autoscaling_group` (source-backed markdown): https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/autoscaling_group.html.markdown
- AWS provider docs for `aws_autoscaling_policy` (source-backed markdown): https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/autoscaling_policy.html.markdown
- AWS provider docs for `aws_autoscaling_lifecycle_hook` (source-backed markdown): https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/autoscaling_lifecycle_hook.html.markdown
- AWS docs for target tracking policies: https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-target-tracking.html
- AWS docs for instance refresh: https://docs.aws.amazon.com/autoscaling/ec2/userguide/instance-refresh-overview.html
- AWS docs for ASG health checks: https://docs.aws.amazon.com/autoscaling/ec2/userguide/health-checks-overview.html
- AWS docs for launch templates with Auto Scaling: https://docs.aws.amazon.com/autoscaling/ec2/userguide/create-launch-template.html
- AWS docs for lifecycle hooks: https://docs.aws.amazon.com/autoscaling/ec2/userguide/adding-lifecycle-hooks.html
- AWS CloudWatch agent install docs: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/manual-installation.html

## Issues Found
- The target tracking scaling policy used `scale_in_cooldown` and `scale_out_cooldown` inside `target_tracking_configuration`. Those are not valid fields for the EC2 Auto Scaling `aws_autoscaling_policy` resource. I replaced them with `estimated_instance_warmup = 300`, which is the supported warmup control for this policy type.
- The Auto Scaling Group used `launch_template.version = "$Latest"` while also configuring `instance_refresh`. The AWS provider docs explicitly note that instance refresh will not start on launch template changes when `$Latest` is used here. I changed this to `aws_launch_template.app.latest_version`.
- The conclusion stated that instance refresh provides zero-downtime rolling updates and that ELB health checks should always be used instead of EC2 health checks. I corrected this to reflect the documented behavior: instance refresh performs rolling updates, and ELB health checks are appropriate when you want replacement decisions based on load balancer-reported application health.

## Review Notes
- The separate `aws_autoscaling_lifecycle_hook` resource is valid, but provider docs note that hooks added this way are attached after the Auto Scaling Group is created. If the hook must apply to the very first launched instances, `initial_lifecycle_hook` on the ASG is the safer pattern.
- The user data assumes the instances can reach package repositories and AWS APIs, and that the instance profile has permissions for the CloudWatch agent and Systems Manager Parameter Store configuration lookup.
