# Validation Summary: How to Configure Auto Scaling Policies in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- Amazon EC2 Auto Scaling
- Amazon CloudWatch alarms and metrics
- AWS scheduled, simple, step, target tracking, and predictive scaling

## Sources Consulted
- Terraform AWS provider documentation for `aws_autoscaling_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_policy
- Terraform AWS provider documentation for `aws_autoscaling_schedule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_schedule
- Amazon EC2 Auto Scaling dynamic scaling documentation: https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scale-based-on-demand.html
- Amazon EC2 Auto Scaling step and simple scaling documentation: https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-simple-step.html
- Amazon EC2 Auto Scaling scheduled scaling documentation: https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-scheduled-scaling.html
- Amazon EC2 Auto Scaling predictive scaling documentation: https://docs.aws.amazon.com/autoscaling/ec2/userguide/predictive-scaling-policy-overview.html
- Amazon EC2 Auto Scaling API reference for predictive predefined scaling metrics: https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_PredictiveScalingPredefinedScalingMetric.html

## Issues Found
- The post said it covered every scaling policy type, but target tracking is only shown as part of a combined-policy pattern. Changed the wording to "main scaling policy types" to avoid overstating coverage.
- The step scaling section said no cooldown is needed because it continuously evaluates and adjusts. AWS documents step scaling as using instance warmup and applying additional adjustments on additional alarm breaches while the alarm remains in ALARM, so the sentence was corrected.
- The one-time scheduled scaling example included `end_time`, which is for bounding recurring scheduled actions and does not automatically reset capacity after a one-time event. Removed `end_time` from the one-time scale-up example.
- The predictive scaling examples set `resource_label = ""` for ASG CPU metrics. AWS uses resource labels for Application Load Balancer request-count metrics, and Terraform treats the field as optional, so the empty labels were removed.
- The predictive scaling max-capacity comment implied max-size increases are not supported. AWS supports honoring the current maximum or allowing predictive scaling to increase it with `IncreaseMaxCapacity`, so the comment was changed to match the configured `HonorMaxCapacity` behavior.
- The multiple-policy precedence sentence said AWS uses the lowest capacity for scale-in. AWS gives precedence to the policy that provides the largest capacity for both scale-out and scale-in, and predictive scaling uses the maximum desired capacity across active policies. Updated the sentence accordingly.

## Review Notes
Terraform was not installed in the local environment, so the snippets were reviewed against official provider documentation and AWS API/user-guide documentation rather than by running `terraform validate`.
