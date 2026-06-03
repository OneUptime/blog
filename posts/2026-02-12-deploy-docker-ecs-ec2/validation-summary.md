# Validation Summary: How to Deploy a Docker Container on ECS with EC2 Launch Type

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon ECS
- Amazon EC2
- Amazon EC2 Auto Scaling
- ECS capacity providers
- Application Load Balancer target groups
- AWS CLI
- Docker containers
- AWS Systems Manager Parameter Store

## Sources Consulted
- Amazon ECS documentation: Retrieving Amazon ECS-optimized Linux AMI metadata, https://docs.aws.amazon.com/AmazonECS/latest/developerguide/retrieve-ecs-optimized_AMI.html
- Amazon ECS documentation: Amazon ECS capacity providers for EC2 workloads, https://docs.aws.amazon.com/AmazonECS/latest/developerguide/asg-capacity-providers.html
- Amazon ECS documentation: Control the instances Amazon ECS terminates, https://docs.aws.amazon.com/AmazonECS/latest/developerguide/managed-termination-protection.html
- Amazon ECS documentation: Use Docker's virtual network for Amazon ECS Linux tasks, https://docs.aws.amazon.com/AmazonECS/latest/developerguide/networking-networkmode-bridge.html
- AWS CLI documentation: ecs create-service, https://docs.aws.amazon.com/cli/latest/reference/ecs/create-service.html
- AWS CLI documentation: ecs put-cluster-capacity-providers, https://docs.aws.amazon.com/cli/latest/reference/ecs/put-cluster-capacity-providers.html
- AWS CLI documentation: autoscaling create-auto-scaling-group, https://docs.aws.amazon.com/cli/latest/reference/autoscaling/create-auto-scaling-group.html
- Amazon EC2 Auto Scaling documentation: Create a mixed instances group by manually choosing instance types, https://docs.aws.amazon.com/autoscaling/ec2/userguide/create-mixed-instances-group-manual-instance-type-selection.html
- Amazon EC2 Auto Scaling documentation: Create a launch template using advanced settings, https://docs.aws.amazon.com/autoscaling/ec2/userguide/advanced-settings-for-your-launch-template.html

## Issues Found
- Replaced "sustained-use pricing" with "Reserved Instance or Savings Plans pricing" because sustained-use pricing is not the AWS EC2 discount model described by the post.
- Updated the user data Base64 command to remove wrapped newlines before embedding it in launch template JSON. Wrapped Base64 output can make the JSON string invalid.
- Changed the ECS service creation example from `--launch-type EC2` to `--capacity-provider-strategy` so the service actually uses the EC2 Auto Scaling group capacity provider described earlier. AWS documents launch type and capacity provider strategy as mutually exclusive service configuration modes.
- Removed `InstanceMarketOptions` from the launch template used with the mixed instances policy. AWS Auto Scaling does not allow a launch template that requests Spot Instances to be used with a mixed instances group; Spot allocation belongs in `InstancesDistribution`.
- Added `OnDemandPercentageAboveBaseCapacity: 0` to the Spot mixed instances policy so the ASG launches Spot capacity instead of using the default all-On-Demand distribution.
- Added `--new-instances-protected-from-scale-in` to the Spot ASG because managed termination protection requires Auto Scaling instance scale-in protection.
- Corrected the capacity provider `base` explanation from on-demand instances to on-demand tasks. ECS capacity provider strategy `base` is a minimum number of tasks per service, not a minimum number of EC2 instances.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI validation was performed against the current official AWS CLI and service documentation instead of local `--help` output. The Spot savings percentage is plausible as general guidance, but actual savings vary by region, instance type, and market conditions.
