# Validation Summary: How to Use EC2 Spot Fleet with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS
- Amazon EC2 Spot Fleet
- Application Auto Scaling
- IAM
- HCL

## Sources Consulted
- AWS EC2 Spot best practices: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-best-practices.html
- AWS EC2 Spot Fleet prerequisites and IAM role guidance: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-fleet-prerequisites.html
- AWS EC2 tagging for Spot Fleet requests and instances: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/tag-spot-fleet.html
- AWS EC2 automatic scaling for Spot Fleet: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-fleet-automatic-scaling.html
- AWS EC2 target tracking for Spot Fleet: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-fleet-target-tracking.html
- AWS EC2 Spot Instance interruption notices: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html
- AWS Application Auto Scaling `RegisterScalableTarget` API reference: https://docs.aws.amazon.com/autoscaling/application/APIReference/API_RegisterScalableTarget.html
- AWS Application Auto Scaling predefined metrics reference: https://docs.aws.amazon.com/autoscaling/application/APIReference/API_PredefinedMetricSpecification.html
- OpenTofu `init` command: https://opentofu.org/docs/cli/init/
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command: https://opentofu.org/docs/v1.11/cli/commands/apply/
- AWS provider `aws_spot_fleet_request` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/spot_fleet_request.html.markdown
- AWS provider `aws_appautoscaling_target` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/appautoscaling_target.html.markdown
- AWS provider `aws_appautoscaling_policy` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/appautoscaling_policy.html.markdown

## Issues Found
- The post presented Spot Fleet as a normal current design choice, but AWS now explicitly classifies `RequestSpotFleet` as a legacy API and strongly discourages new usage. I updated the introduction to state that new workloads should prefer EC2 Fleet or EC2 Auto Scaling.
- The Spot Fleet snippet relied on `fleet_type = "maintain"` behavior for replacement and automatic scaling, but did not declare it explicitly. I added `fleet_type = "maintain"` so the scaling guidance matches the configuration.
- The deletion behavior comment used `terminate_instances_with_expiration` as if it controlled resource deletion. I replaced it with `terminate_instances_on_delete = true`, which is the direct setting for terminating running instances when the fleet resource is deleted.
- The `spot_price` explanation was inaccurate. Omitting `spot_price` does not mean AWS uses the current Spot price as the bid ceiling; the provider documents that the maximum bid defaults to the On-Demand price, while billing still follows the current Spot price. I corrected the comment.
- The Application Auto Scaling policy was described as a scale-out threshold rule, but the configuration uses target tracking. I corrected the comment to explain that it keeps average CPU utilization near the target value instead of only scaling out above a threshold.
- The conclusion said `diversified` spreads capacity across instance types and AZs. More precisely, it spreads across the Spot pools defined by the launch specifications. I corrected that wording.
- The code sample referenced an AMI data source and several variables without stating that they must already exist. I added a brief note clarifying that those supporting definitions are assumed elsewhere in the module.

## Review Notes
- AWS documentation now recommends EC2 Auto Scaling groups or EC2 Fleet for new Spot-based designs, and recommends the `price-capacity-optimized` allocation strategy for many new workloads. This post is now accurate as a Spot Fleet guide, but Spot Fleet itself is a legacy path.
- CPU-based target tracking for Spot Fleet works best with EC2 detailed monitoring enabled, because AWS notes that 1-minute metrics respond faster than the default 5-minute metrics.
- Application Auto Scaling for Spot Fleet uses the `AWSServiceRoleForApplicationAutoScaling_EC2SpotFleetRequest` service-linked role automatically; no separate autoscaling role block is required in the post's OpenTofu example.
