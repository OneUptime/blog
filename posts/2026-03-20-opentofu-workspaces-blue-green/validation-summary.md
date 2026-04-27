# Validation Summary: How to Use Workspaces for Blue-Green Deployments in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (workspaces, CLI)
- Terraform / OpenTofu HCL configuration language
- AWS provider (`aws_launch_template`, `aws_autoscaling_group`, `aws_autoscaling_attachment`)
- Bash scripting

## Sources Consulted
- OpenTofu workspace CLI: https://opentofu.org/docs/cli/commands/workspace/new/, /list/, /select/
- OpenTofu workspaces language guide: https://opentofu.org/docs/language/state/workspaces/
- OpenTofu expression references (`terraform.workspace` / `tofu.workspace`): https://opentofu.org/docs/language/expressions/references/
- AWS provider `aws_lb_target_group_attachment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group_attachment
- AWS provider `aws_autoscaling_attachment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_attachment
- AWS provider `aws_launch_template`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- AWS provider `aws_autoscaling_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group

## Issues Found
- **Incorrect resource for attaching an ASG to a target group.** The original `lb.tf` example used `aws_lb_target_group_attachment` with `target_id = var.active_asg_name`. That resource's `target_id` accepts an EC2 instance ID, IP address, Lambda ARN, or ALB ARN — **not** an Auto Scaling Group name. The correct resource for attaching an ASG to an ALB/NLB/GWLB target group is `aws_autoscaling_attachment` with `autoscaling_group_name` and `lb_target_group_arn`. Replaced the snippet with a working `aws_autoscaling_attachment` example that derives the ASG name from `var.active_slot`, and added the missing `target_group_arn` variable declaration so the example is self-contained.

## Review Notes
- `terraform.workspace` is supported by OpenTofu (it also exposes `tofu.workspace` as an alias). The post's usage is fine.
- `tofu workspace new/list/select` and the `default` workspace are accurate.
- `aws_launch_template` `tag_specifications` block, `aws_autoscaling_group` `vpc_zone_identifier`, `launch_template`, and `tag` block syntax are all correct.
- The `version = "$Latest"` literal is valid and resolves to the launch template's latest version.
- The wrapper Bash script uses `#!/usr/bin/env bash` with `set -euo pipefail` and brace expansion (`{1..10}`), so it correctly relies on Bash semantics.
- Minor stylistic note (not changed): the deployment workflow assumes the ASG name and target group ARN naming pattern are wired together. In production, teams often use `aws_autoscaling_group.<name>.target_group_arns` directly to avoid maintaining a parallel attachment resource — but the standalone `aws_autoscaling_attachment` approach used here is also valid and is the right pattern when the target group lives in a separate state from the ASGs, as the post describes.
