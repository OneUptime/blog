# Validation Summary: How to Deploy a Fargate Service with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- AWS ECS
- AWS Fargate
- AWS Application Auto Scaling
- AWS Application Load Balancer
- Amazon CloudWatch Logs

## Sources Consulted
- OpenTofu resource syntax: https://opentofu.org/docs/language/resources/syntax/
- AWS provider `aws_ecs_cluster`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_cluster
- AWS provider `aws_ecs_cluster_capacity_providers`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_cluster_capacity_providers
- AWS provider `aws_ecs_task_definition`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- AWS provider `aws_ecs_service`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- AWS provider `aws_appautoscaling_target`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appautoscaling_target
- AWS provider `aws_appautoscaling_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appautoscaling_policy
- Amazon ECS task definition parameters for Fargate: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- Amazon ECS clusters for Fargate: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-capacity-providers.html
- Amazon ECS deployment circuit breaker: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-circuit-breaker.html
- Automatically scale your Amazon ECS service: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-auto-scaling.html
- Use a target metric to scale Amazon ECS services: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-autoscaling-targettracking.html
- Amazon ECS and Application Auto Scaling: https://docs.aws.amazon.com/autoscaling/application/userguide/services-that-can-integrate-ecs.html

## Issues Found
- The description said the post included service discovery, but the article only covered ALB integration, ECS service deployment, and autoscaling. I updated the description to match the actual content.
- The Fargate task definition omitted `runtime_platform.operating_system_family`. Current AWS ECS Fargate documentation requires an operating system family for Fargate task definitions, so I added `LINUX`.
- The ECS service used a capacity provider strategy without an explicit dependency on `aws_ecs_cluster_capacity_providers`. AWS requires the capacity provider to be associated with the cluster before it can be used in a service strategy, so I added `depends_on`.
- The lifecycle block ignored `task_definition`, which would prevent OpenTofu from rolling the service forward when the task definition changes. I changed the ignore list to `desired_count` only, which aligns with the documented autoscaling pattern for ECS services.

## Review Notes
- The `curl`-based container health check is valid, but it assumes the container image includes `curl`.
- `assign_public_ip = false` with private subnets requires outbound access to AWS services such as ECR and CloudWatch Logs, typically through NAT or VPC endpoints.
