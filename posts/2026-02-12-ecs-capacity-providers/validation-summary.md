# Validation Summary: How to Use ECS Capacity Providers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS
- ECS capacity providers
- AWS Fargate and Fargate Spot
- Amazon EC2 Auto Scaling groups
- ECS managed scaling and managed termination protection
- Terraform AWS provider
- AWS CLI
- Amazon CloudWatch

## Sources Consulted
- Amazon ECS capacity providers for EC2 workloads: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/asg-capacity-providers.html
- Amazon ECS service definition parameters: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service_definition_parameters.html
- Amazon ECS cluster auto scaling: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/cluster-auto-scaling.html
- Amazon ECS managed termination protection: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/managed-termination-protection.html
- AWS CLI create-capacity-provider command reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/create-capacity-provider.html
- AWS CLI put-cluster-capacity-providers command reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/put-cluster-capacity-providers.html
- Terraform AWS provider aws_ecs_cluster_capacity_providers resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_cluster_capacity_providers
- Terraform AWS provider aws_ecs_capacity_provider resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_capacity_provider
- Terraform AWS provider aws_ecs_service resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- Linked OneUptime CloudWatch monitoring article: https://oneuptime.com/blog/post/2026-02-13-aws-cloudwatch-infrastructure-monitoring/view

## Issues Found
- The service example mixed an Auto Scaling Group capacity provider with `FARGATE_SPOT` in a single capacity provider strategy. ECS allows a cluster to contain both provider types, but a single strategy cannot mix Fargate and ASG capacity providers. Changed the example to use two EC2-backed capacity providers and added a note to keep Fargate and EC2-backed strategies separate.
- The ASG capacity provider example created the provider but did not state that it must be associated with the ECS cluster before a service can use it. Added a short note to include the ASG provider in the cluster capacity provider association.
- The migration guidance said existing services cannot be updated from `launch_type` to `capacity_provider_strategy` and must be replaced. Current ECS documentation supports updating an existing service and requires forcing a new deployment when switching from launch type to a capacity provider strategy. Updated the migration steps and Terraform snippet accordingly.
- The monitoring section listed `BacklogPerCapacityProvider` as a CloudWatch metric. I could not verify this as an official ECS CloudWatch metric. Replaced it with ECS service events and tasks stuck in `PROVISIONING`, and clarified that `CapacityProviderReservation` is published in `AWS/ECS/ManagedScaling` for ASG capacity providers with managed scaling enabled.
- The decision framework suggested bursting from EC2 to Fargate as a single mixed strategy. Since a single strategy cannot mix ASG and Fargate providers, changed this to a cluster-level mix across separate service strategies.

## Review Notes
- The Terraform snippets are illustrative and reference surrounding resources such as IAM instance profiles, task definitions, SSM AMI data, subnet variables, and any additional EC2 Spot-backed capacity provider. Those dependencies are not fully defined in the post, but the shown resource arguments and ECS concepts are valid.
- The AWS CLI examples match the documented command shapes. The placeholder ASG ARN is intentionally abbreviated and would need to be replaced with a real ARN.
