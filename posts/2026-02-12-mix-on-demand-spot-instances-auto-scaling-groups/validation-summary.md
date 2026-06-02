# Validation Summary: How to Mix On-Demand and Spot Instances in Auto Scaling Groups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Auto Scaling Groups
- Amazon EC2 On-Demand Instances
- Amazon EC2 Spot Instances
- AWS CLI
- Terraform AWS Provider
- Auto Scaling mixed instances policies
- Auto Scaling capacity rebalancing
- Auto Scaling instance refresh
- Auto Scaling target tracking policies

## Sources Consulted
- AWS CLI Command Reference: create-auto-scaling-group - https://docs.aws.amazon.com/cli/latest/reference/autoscaling/create-auto-scaling-group.html
- AWS CLI Command Reference: update-auto-scaling-group - https://docs.aws.amazon.com/cli/latest/reference/autoscaling/update-auto-scaling-group.html
- AWS CLI Command Reference: start-instance-refresh - https://docs.aws.amazon.com/cli/latest/reference/autoscaling/start-instance-refresh.html
- AWS CLI Command Reference: describe-auto-scaling-groups - https://docs.aws.amazon.com/cli/latest/reference/autoscaling/describe-auto-scaling-groups.html
- AWS CLI Command Reference: describe-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html
- Amazon EC2 Auto Scaling User Guide: Auto Scaling groups with multiple instance types and purchase options - https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-mixed-instances-groups.html
- Amazon EC2 Auto Scaling User Guide: Setup overview for creating a mixed instances group - https://docs.aws.amazon.com/autoscaling/ec2/userguide/mixed-instances-groups-set-up-overview.html
- Amazon EC2 Auto Scaling User Guide: Allocation strategies for multiple instance types - https://docs.aws.amazon.com/autoscaling/ec2/userguide/allocation-strategies.html
- Amazon EC2 Auto Scaling User Guide: Capacity Rebalancing in Auto Scaling to replace at-risk Spot Instances - https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-capacity-rebalancing.html
- Amazon EC2 Auto Scaling User Guide: Configure termination policies - https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-termination-policies.html
- Terraform AWS Provider: aws_autoscaling_group - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group

## Issues Found
- The post used `capacity-optimized` as the Spot allocation strategy in the AWS CLI and Terraform examples. This is still valid, but AWS currently recommends `price-capacity-optimized` for Spot because it considers both interruption risk and price. Updated both examples and the Terraform comment.
- The post implied that an Auto Scaling group automatically falls back to On-Demand when Spot capacity is unavailable. Mixed instances policies follow the configured On-Demand and Spot distribution; increasing On-Demand usage requires changing the policy or automating that change. Updated the wording in the model and scaling sections.
- The scale-in explanation said Spot instances are terminated before On-Demand instances. AWS documents that mixed instances groups first identify which purchase option should be terminated based on the configured ratio, then apply termination policy logic. Updated the wording to reflect this.
- The monitoring command queried `LifecycleState` from `describe-auto-scaling-groups` and labeled it as lifecycle, but that field is the Auto Scaling state such as `InService`, not the EC2 purchase option. Replaced it with an EC2 `describe-instances` command that reports `InstanceLifecycle`, which identifies Spot instances.

## Review Notes
- The AWS CLI and Terraform binaries were not installed in the local environment, so command verification was performed against official AWS CLI documentation and Terraform provider documentation.
- `SpotMaxPrice` with an empty string is valid for removing a configured maximum Spot price; AWS does not recommend setting a maximum price because it can increase interruptions.
- The OneUptime internal health-check link is plausible and consistent with the referenced blog URL pattern, but it was not treated as an external technical API reference.
