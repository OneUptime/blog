# Validation Summary: How to Create ECS Services with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS
- AWS Fargate and Fargate Spot
- Terraform AWS provider
- IAM roles and policies
- Amazon CloudWatch Logs
- AWS Secrets Manager
- Elastic Load Balancing / Application Load Balancer
- Application Auto Scaling

## Sources Consulted
- Terraform AWS provider `aws_ecs_cluster_capacity_providers` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_cluster_capacity_providers
- Terraform AWS provider `aws_ecs_task_definition` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- Terraform AWS provider `aws_ecs_service` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- AWS ECS service definition parameters: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service_definition_parameters.html
- AWS ECS launch types and capacity providers guide: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/capacity-launch-type-comparison.html
- AWS ECS task definition parameters for Fargate: https://docs.aws.amazon.com/AmazonECS/latest/userguide/task_definition_parameters.html
- AWS ECS deployment circuit breaker documentation: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_DeploymentCircuitBreaker.html
- AWS ECS task definition secret reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-ecs-taskdefinition-secret.html

## Issues Found
- The ECS service example set `launch_type = "FARGATE"` while the article configured a cluster default capacity provider strategy using both `FARGATE` and `FARGATE_SPOT`. AWS ECS service definitions require `launchType` to be omitted when using a capacity provider strategy, and if neither `launchType` nor `capacityProviderStrategy` is specified, ECS uses the cluster default capacity provider strategy. I removed `launch_type = "FARGATE"` so the service uses the configured cluster default and the Fargate Spot explanation is correct.

## Review Notes
- The `curl`-based container health check is valid ECS task definition syntax, but the container image must include `curl` for it to work at runtime.
- The task secret reference keeps the secret value out of the ECS task definition; only the secret reference is stored there. Terraform state can still contain secret values if the secret value itself is managed elsewhere in Terraform.
