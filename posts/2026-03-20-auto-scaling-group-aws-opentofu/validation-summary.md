# Validation Summary: How to Deploy an Auto Scaling Group with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS Auto Scaling
- Amazon EC2
- AWS Launch Templates
- Elastic Load Balancing target groups

## Sources Consulted
- HashiCorp AWS provider docs: `aws_autoscaling_group` https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/autoscaling_group.html.markdown
- HashiCorp AWS provider docs: `aws_autoscaling_policy` https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/autoscaling_policy.html.markdown
- HashiCorp AWS provider docs: `aws_autoscaling_schedule` https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/autoscaling_schedule.html.markdown
- HashiCorp AWS provider docs: `aws_launch_template` https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/launch_template.html.markdown
- AWS Auto Scaling docs: scheduled scaling https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-scheduled-scaling.html
- AWS Auto Scaling docs: instance refresh overview https://docs.aws.amazon.com/autoscaling/ec2/userguide/instance-refresh-overview.html

## Issues Found
- The ASG used `version = "$Latest"` in the `launch_template` block while also relying on `instance_refresh`. The provider docs note that an instance refresh will not start when `"$Latest"` is used. I changed this to `aws_launch_template.app.latest_version` so launch template changes can trigger the refresh as intended.
- The target tracking policy placed `scale_in_cooldown` and `scale_out_cooldown` inside `target_tracking_configuration`, but those arguments are not supported for `aws_autoscaling_policy` target tracking policies. I removed the unsupported arguments so the example matches the provider schema.
- The conclusion claimed instance refresh provides "zero-downtime" updates. AWS documents rolling replacement behavior and capacity controls, but zero downtime is not guaranteed by this configuration. I changed the wording to "rolling AMI or configuration updates."

## Review Notes
- The scheduled scaling cron expressions are valid and default to UTC because no `time_zone` is specified.
- Keeping `desired_capacity` on the Auto Scaling group is valid, but future applies can reset capacity after scaling events; the provider docs call this out as a consideration when using scaling policies.
