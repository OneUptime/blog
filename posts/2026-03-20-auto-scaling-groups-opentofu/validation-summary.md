# Validation Summary: How to Configure AWS Auto Scaling Groups with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Auto Scaling Groups
- Amazon EC2 launch templates
- Application Load Balancer target groups
- Target tracking scaling policies
- Lifecycle hooks
- Spot Instances
- Scheduled scaling

## Sources Consulted
- OpenTofu `templatefile` function: https://opentofu.org/docs/language/functions/templatefile/
- OpenTofu `base64encode` function: https://opentofu.org/docs/language/functions/base64encode/
- OpenTofu `lifecycle` meta-argument: https://opentofu.org/docs/language/meta-arguments/lifecycle/
- AWS provider `aws_launch_template` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/launch_template.html.markdown
- AWS provider `aws_autoscaling_group` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/autoscaling_group.html.markdown
- AWS provider `aws_autoscaling_policy` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/autoscaling_policy.html.markdown
- AWS provider `aws_autoscaling_lifecycle_hook` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/autoscaling_lifecycle_hook.html.markdown
- AWS provider `aws_autoscaling_schedule` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/autoscaling_schedule.html.markdown
- AWS target tracking scaling policies guide: https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-target-tracking.html
- AWS lifecycle hooks guide: https://docs.aws.amazon.com/autoscaling/ec2/userguide/lifecycle-hooks.html
- AWS scheduled scaling guide: https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-scheduled-scaling.html
- AWS instance refresh overview: https://docs.aws.amazon.com/autoscaling/ec2/userguide/instance-refresh-overview.html
- AWS Spot best practices: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-best-practices.html
- AWS EC2 user data guide: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html

## Issues Found
- The ASG examples used `version = "$Latest"` together with `instance_refresh` guidance. The AWS provider docs explicitly note that an instance refresh does not start when the ASG launch template block uses `"$Latest"`. I changed both launch template version references to `aws_launch_template.app.latest_version` so the example matches current provider behavior.
- The mixed instances example used `spot_allocation_strategy = "capacity-optimized"` even though the post frames the section as cost optimization. Current AWS Spot best-practice guidance recommends `price-capacity-optimized`, so I updated the example to that strategy.
- The launch lifecycle hook comment said it fires "after launch". AWS lifecycle hook documentation places `autoscaling:EC2_INSTANCE_LAUNCHING` in the launch workflow before the instance reaches `InService`, so I corrected the wording to "during launch".
- The conclusion claimed that `instance_refresh` provides zero-downtime deployments when the launch template changes. With `min_healthy_percentage = 50`, that is not guaranteed, and the original `"$Latest"` reference would not have triggered the refresh as written. I updated the conclusion to describe rolling deployments triggered by a new launch template version instead.

## Review Notes
- The post is now technically correct after the fixes above.
- The AWS provider docs note that standalone `aws_autoscaling_lifecycle_hook` resources are attached only after the Auto Scaling group has been created. If hook behavior is required for the very first instances launched during initial provisioning, `initial_lifecycle_hook` inside `aws_autoscaling_group` is the more precise pattern.
- The AWS provider docs also note that you may want to omit `desired_capacity` from an Auto Scaling group when using scaling policies. The example remains valid, but future OpenTofu applies can intentionally reassert configured capacity if runtime scaling has changed it.
