# Validation Summary: How to Use ECS Capacity Provider Auto Scaling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS
- ECS capacity providers
- Amazon EC2 Auto Scaling groups
- AWS CLI
- EC2 Spot Instances
- ECS task placement strategies

## Sources Consulted
- Amazon ECS Developer Guide: Automatically manage Amazon ECS capacity with cluster auto scaling - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/cluster-auto-scaling.html
- Amazon ECS Developer Guide: Amazon ECS capacity providers for EC2 workloads - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/asg-capacity-providers.html
- AWS CLI Command Reference: ecs create-capacity-provider - https://docs.aws.amazon.com/cli/latest/reference/ecs/create-capacity-provider.html
- AWS CLI Command Reference: ecs update-capacity-provider - https://docs.aws.amazon.com/cli/latest/reference/ecs/update-capacity-provider.html
- AWS CLI Command Reference: ecs put-cluster-capacity-providers - https://docs.aws.amazon.com/cli/latest/reference/ecs/put-cluster-capacity-providers.html
- AWS CLI Command Reference: ecs create-service - https://docs.aws.amazon.com/cli/latest/reference/ecs/create-service.html
- AWS CLI Command Reference: autoscaling create-auto-scaling-group - https://docs.aws.amazon.com/cli/latest/reference/autoscaling/create-auto-scaling-group.html
- Amazon ECS Developer Guide: Configuring Amazon ECS Linux container instances to receive Spot Instance notices - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/spot-instance-draining-linux-container.html

## Issues Found
- The launch template command used `base64` without removing line wrapping. This can insert newline characters into the `UserData` value, so the example now pipes through `tr -d '\n'`.
- The explanation of `new-instances-protected-from-scale-in` said it prevents termination only for instances running ECS tasks. AWS documents it as instance scale-in protection for new ASG instances, which ECS then manages when managed termination protection is enabled. The wording was corrected.
- The descriptions of `minimumScalingStepSize` and `maximumScalingStepSize` said they apply to adding or removing instances. AWS documents these as scale-out controls; scale-in is not affected by `minimumScalingStepSize`. The wording was corrected.
- The service example used a capacity provider target capacity below 100% without a binpack placement strategy. AWS documents that when target capacity is less than 100%, binpack must have higher order than spread. The service example now includes `--placement-strategy type=binpack,field=memory`, with a short explanation.
- The capacity provider overview mentioned mixing Auto Scaling group and Fargate providers in one cluster but did not include AWS's strategy-level limitation. A sentence was added to clarify that a single capacity provider strategy can use Auto Scaling group providers or Fargate providers, but not both.

## Review Notes
The AWS CLI was not installed in the local workspace, so command validation was performed against the current official AWS CLI and Amazon ECS documentation. The linked OneUptime guide resolves correctly. Placeholder values such as AMI IDs, subnet IDs, account IDs, and ARNs still need to be replaced before running the examples.
