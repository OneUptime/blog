# Validation Summary: How to Set Up ECS with Spot Instances and Capacity Providers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS
- Amazon EC2 Spot Instances
- Amazon EC2 Auto Scaling Groups
- ECS capacity providers
- AWS CLI
- AWS CDK for TypeScript
- Application Load Balancer target group draining

## Sources Consulted
- Amazon ECS Developer Guide: managed termination protection - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/managed-termination-protection.html
- Amazon ECS Developer Guide: managed scaling behavior - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/managed-scaling-behavior.html
- Amazon ECS Developer Guide: Spot instance draining - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/spot-instance-draining-linux-container.html
- Amazon ECS Developer Guide: retrieving ECS-optimized AMI metadata - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/retrieve-ecs-optimized_AMI.html
- AWS CLI Command Reference: ecs create-capacity-provider - https://docs.aws.amazon.com/cli/latest/reference/ecs/create-capacity-provider.html
- AWS CLI Command Reference: ecs create-service - https://docs.aws.amazon.com/cli/latest/reference/ecs/create-service.html
- AWS CLI Command Reference: ecs put-cluster-capacity-providers - https://docs.aws.amazon.com/cli/latest/reference/ecs/put-cluster-capacity-providers.html
- AWS CLI Command Reference: ec2 create-launch-template - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-launch-template.html
- AWS CLI Command Reference: autoscaling create-auto-scaling-group - https://docs.aws.amazon.com/cli/latest/reference/autoscaling/create-auto-scaling-group.html
- AWS CDK API Reference: AsgCapacityProviderProps - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs.AsgCapacityProviderProps.html
- AWS CDK API Reference: MixedInstancesPolicy - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_autoscaling.MixedInstancesPolicy.html

## Issues Found
- The launch template used a hard-coded AMI ID that was not guaranteed to be an ECS-optimized AMI. Changed it to the public SSM parameter for the recommended ECS-optimized Amazon Linux 2 AMI so the ECS agent is present and current for the region.
- The launch template user data used plain `base64`, which can wrap long output and produce invalid JSON for `UserData`. Changed it to `base64 -w 0`.
- The placeholder IAM account ID in the launch template ARN had too few digits. Changed it to a 12-digit placeholder account ID.
- The `create-service` example explicitly set `base` on both capacity providers. ECS capacity provider strategies allow `base` on only one provider, so the redundant `base=0` was removed from the Spot provider.
- The CDK example referenced `spotLaunchTemplate` without defining it. Added a minimal ECS-optimized launch template and Spot draining user data before it is used by the mixed instances policy.

## Review Notes
- The examples use Amazon Linux 2 ECS-optimized AMIs, which are still supported, but future updates could consider Amazon Linux 2023 ECS-optimized AMIs.
- The Spot Auto Scaling Group uses `capacity-optimized`, which is valid and lowers interruption risk. AWS now also documents `price-capacity-optimized` as the recommended Spot allocation strategy for many Auto Scaling use cases when both price and capacity should be optimized.
