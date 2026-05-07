# Validation Summary: How to Create Auto Scaling Groups with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS Auto Scaling Groups
- Amazon EC2 launch templates
- Elastic Load Balancing target groups
- Amazon CloudWatch alarms and metrics
- HCL

## Sources Consulted
- HashiCorp AWS provider docs for `aws_launch_template`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/launch_template.html.markdown
- HashiCorp AWS provider docs for `aws_autoscaling_group`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/autoscaling_group.html.markdown
- HashiCorp AWS provider docs for `aws_autoscaling_policy`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/autoscaling_policy.html.markdown
- AWS: Target tracking scaling policies for Amazon EC2 Auto Scaling: https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-target-tracking.html
- AWS: Step and simple scaling policies for Amazon EC2 Auto Scaling: https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-simple-step.html
- AWS: Set the health check grace period for an Auto Scaling group: https://docs.aws.amazon.com/autoscaling/ec2/userguide/health-check-grace-period.html
- AWS: CloudWatch metrics that are available for your instances: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/viewing_metrics_with_cloudwatch.html
- AWS: Tag Auto Scaling groups and instances: https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-tagging.html
- AWS: Create a launch template for an Auto Scaling group: https://docs.aws.amazon.com/autoscaling/ec2/userguide/create-launch-template.html
- AWS: Package management tool for Amazon Linux 2023: https://docs.aws.amazon.com/linux/al2023/ug/package-management.html

## Issues Found
- The post's "step scaling" example was actually a simple scaling policy. In the AWS provider, omitting `policy_type` defaults the policy to `SimpleScaling`, and `cooldown` plus top-level `scaling_adjustment` apply to simple scaling. I changed the example to a real `StepScaling` policy with a `step_adjustment` block.
- The Auto Scaling group used `health_check_type = "ELB"` without `health_check_grace_period`. The provider documentation notes that `health_check_grace_period` is required when using `ELB` health checks. I added `health_check_grace_period = 300`.
- The launch template and Auto Scaling group set the `Name` tag to different values. AWS documents that when launch template instance tags and propagated Auto Scaling group tags use the same key, the Auto Scaling group value takes precedence. I aligned the launch template `Name` tag with the Auto Scaling group tag so the example reflects actual launched-instance behavior.

## Review Notes
- The target tracking policy is technically correct as written. AWS recommends enabling detailed monitoring when scaling on EC2 CPU metrics so the metric is available at one-minute granularity instead of the default five-minute interval.
- `version = "$Latest"` is valid in the Auto Scaling group's `launch_template` block. If the configuration is later extended to use instance refresh, the AWS provider docs note that `$Latest` does not automatically trigger refreshes on launch template changes; using `aws_launch_template.<name>.latest_version` is the safer pattern in that case.
- The launch template `user_data` remains valid for Amazon Linux. AWS documents that on Amazon Linux 2023 the `yum` command is still available as a pointer to `dnf`.
