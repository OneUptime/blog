# Validation Summary: How to Configure ECS Service Auto Scaling with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Application Auto Scaling
- Amazon ECS
- AWS CLI
- Application Load Balancer

## Sources Consulted
- OpenTofu `depends_on` meta-argument: https://opentofu.org/docs/language/meta-arguments/depends_on/
- OpenTofu CLI `init`: https://opentofu.org/docs/cli/commands/init/
- OpenTofu CLI `plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI `apply`: https://opentofu.org/docs/cli/commands/apply/
- AWS Application Auto Scaling with Amazon ECS: https://docs.aws.amazon.com/autoscaling/application/userguide/services-that-can-integrate-ecs.html
- Amazon ECS target tracking auto scaling: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-autoscaling-targettracking.html
- Amazon ECS service auto scaling overview: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-auto-scaling.html
- AWS Application Auto Scaling `TargetTrackingScalingPolicyConfiguration`: https://docs.aws.amazon.com/autoscaling/application/APIReference/API_TargetTrackingScalingPolicyConfiguration.html
- AWS CLI `describe-scaling-activities`: https://docs.aws.amazon.com/cli/latest/reference/application-autoscaling/describe-scaling-activities.html
- AWS provider docs for `aws_appautoscaling_target`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/appautoscaling_target.html.markdown
- AWS provider docs for `aws_appautoscaling_policy`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/appautoscaling_policy.html.markdown
- AWS provider docs for `aws_appautoscaling_scheduled_action`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/appautoscaling_scheduled_action.html.markdown
- AWS provider docs for `aws_ecs_service`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ecs_service.html.markdown

## Issues Found
- The `aws_appautoscaling_target` example used `depends_on = [var.ecs_service_arn]`. This is invalid because `depends_on` must contain references to resources or child modules, not variable expressions. I removed the `depends_on` line so the example is valid for the stated prerequisite of using an existing ECS service.
- The CPU target tracking comment described `target_value = 70.0` as a hard threshold. Target tracking policies maintain a target value rather than acting like a simple threshold alarm, so I changed the comment to say it keeps average CPU utilization near 70%.
- The ALB request count comment described `target_value = 1000` as a simple trigger condition. AWS defines this value as the optimal average request count per target during a one-minute interval, so I updated the comment accordingly.

## Review Notes
- If the ECS service is also managed in the same OpenTofu configuration, consider adding `lifecycle { ignore_changes = [desired_count] }` on `aws_ecs_service` so later applies do not fight Application Auto Scaling's changes to desired count.
- `ALBRequestCountPerTarget` is not supported for Amazon ECS services using the blue/green deployment type.
