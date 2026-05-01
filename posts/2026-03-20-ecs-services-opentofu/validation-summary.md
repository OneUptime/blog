# Validation Summary: How to Create ECS Services with OpenTofu - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS ECS
- AWS Fargate
- AWS Fargate Spot
- AWS CLI
- AWS Application Load Balancer
- AWS Security Groups

## Sources Consulted
- OpenTofu lifecycle meta-arguments: https://opentofu.org/docs/v1.6/language/meta-arguments/lifecycle/
- AWS provider `aws_ecs_service` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ecs_service.html.markdown
- AWS provider `aws_security_group` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/security_group.html.markdown
- Amazon ECS `CreateService` API reference: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_CreateService.html
- Amazon ECS deployment circuit breaker documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-circuit-breaker.html
- Amazon ECS `DeploymentCircuitBreaker` API reference: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_DeploymentCircuitBreaker.html
- Amazon ECS Availability Zone rebalancing: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-rebalancing.html
- AWS CLI `create-service` reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/create-service.html
- AWS CLI `describe-services` reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/describe-services.html
- AWS CLI `update-service` reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/update-service.html
- Amazon ECS `CapacityProviderStrategyItem` API reference: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_CapacityProviderStrategyItem.html
- AWS Fargate pricing: https://aws.amazon.com/fargate/pricing/

## Issues Found
- The post used `deployment_configuration` as if it contained `minimum_healthy_percent`, `maximum_percent`, and `deployment_circuit_breaker`. In the current AWS provider schema, `deployment_minimum_healthy_percent` and `deployment_maximum_percent` are top-level arguments, and `deployment_circuit_breaker` is a separate top-level block. I rewrote both ECS service examples to use the correct schema.
- The Fargate example included an empty `placement_constraints {}` block and described it as spreading tasks across Availability Zones. Fargate services do not support task placement constraints, and the empty block is invalid. I replaced it with `availability_zone_rebalancing = "ENABLED"` to match the high-availability intent.
- The prerequisites omitted a key requirement for ECS services using `awsvpc` networking with an ALB target group: the target group must use the `ip` target type. I added that prerequisite.
- The capacity provider example reused the same ECS service name as the first service example, which would conflict if a reader applied both snippets together. I changed the example service name to `${var.project_name}-app-spot`.
- The comment that `weight = 4` means `80% of tasks on Spot` was too specific for a strategy that also sets `base = 1` on `FARGATE`. AWS evaluates `base` first and then applies weights to remaining tasks. I changed the comment to describe the actual behavior.
- The `aws ecs update-service --force-new-deployment` note incorrectly said it would pick up a new task definition revision. Without `--task-definition`, that command forces a new deployment of the existing service definition, which is useful for cases like re-pulling the same image tag. I corrected the comment.
- The conclusion stated FARGATE_SPOT can reduce compute costs by `60-70%`. AWS currently documents Fargate Spot pricing as up to a 70% discount, so I aligned the wording to the official claim.
- The introduction and conclusion described deployment circuit breakers without scoping them to rolling (`ECS`) deployments. I tightened that wording to match the ECS API documentation.

## Review Notes
- The inline `ingress` and `egress` blocks in `aws_security_group` are still valid, but the AWS provider documentation recommends the separate `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources as the current best practice.
- Amazon ECS now defaults Availability Zone rebalancing to `ENABLED` for eligible new services. Keeping it explicit in the example is still valid and makes the intent clearer.
