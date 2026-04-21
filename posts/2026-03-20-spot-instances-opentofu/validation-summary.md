# Validation Summary: How to Use Spot Instances with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS Provider for Terraform/OpenTofu
- Amazon EC2 Spot Instances
- EC2 Launch Templates
- Amazon EC2 Auto Scaling mixed instances policies
- Amazon EC2 Fleet
- IMDSv2
- Amazon CloudWatch alarms and Auto Scaling group metrics

## Sources Consulted
- AWS Spot best practices: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-best-practices.html
- AWS Spot Instance interruption notices: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html
- AWS EC2 Fleet and Spot Fleet allocation strategies: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-fleet-allocation-strategy.html
- AWS Spot Fleet request API reference: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_SpotFleetRequestConfigData.html
- AWS Auto Scaling group CloudWatch metrics: https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-metrics.html
- Terraform AWS Provider `aws_launch_template`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- Terraform AWS Provider `aws_autoscaling_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- Terraform AWS Provider `aws_ec2_fleet`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_fleet
- Terraform AWS Provider `aws_spot_fleet_request`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/spot_fleet_request

## Issues Found

1. **Spot interruption handler used the legacy `termination-time` metadata item.** AWS documents `termination-time` as maintained for backward compatibility and recommends `spot/instance-action`, which also covers stop and terminate actions. Updated the handler to poll `spot/instance-action` and refresh the IMDSv2 token if it expires.

2. **Auto Scaling group Spot max price comment was inaccurate.** The original comment said an empty `spot_max_price` means the current Spot price cap. The AWS provider documents the empty value as the On-Demand price cap. Updated the comment.

3. **Batch workload example used the legacy Spot Fleet request resource.** AWS strongly discourages the legacy `RequestSpotFleet` API and recommends EC2 Fleet or Auto Scaling groups instead. Replaced `aws_spot_fleet_request` with `aws_ec2_fleet`, using a launch template and `price-capacity-optimized` Spot allocation.

4. **CloudWatch alarm monitored desired capacity instead of actual running capacity.** `GroupDesiredCapacity` is the capacity the ASG attempts to maintain, so it does not directly show Spot-related in-service capacity loss. Updated the ASG to enable `GroupInServiceInstances` metrics and changed the alarm to monitor `GroupInServiceInstances`.

5. **Instance type flexibility guidance was below current AWS best practice.** The post recommended 5+ instance types. AWS currently recommends being flexible across at least 10 instance types for each workload. Updated the conclusion accordingly.

## Review Notes
- The launch template Spot options, mixed instances policy fields, EC2 Fleet fields, and CloudWatch alarm fields now match current AWS provider documentation.
- `capacity-optimized` remains a valid strategy for minimizing interruptions. AWS recommends `price-capacity-optimized` for most Spot workloads where price and capacity availability should both be considered.
