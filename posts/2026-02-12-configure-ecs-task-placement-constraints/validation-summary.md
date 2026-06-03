# Validation Summary: How to Configure ECS Task Placement Constraints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS
- ECS task placement constraints and strategies
- ECS Cluster Query Language
- AWS CLI
- Terraform AWS provider
- EC2-backed ECS container instances

## Sources Consulted
- Amazon ECS Developer Guide: Task placement constraints: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-placement-constraints.html
- Amazon ECS Developer Guide: Example task placement constraints: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/constraint-examples.html
- Amazon ECS Developer Guide: Cluster Query Language: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/cluster-query-language.html
- Amazon ECS Developer Guide: Task placement strategies: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-placement-strategies.html
- AWS CLI Command Reference: ecs create-service: https://docs.aws.amazon.com/cli/latest/reference/ecs/create-service.html
- AWS CLI Command Reference: ecs put-attributes: https://docs.aws.amazon.com/cli/latest/reference/ecs/put-attributes.html
- Amazon ECS Developer Guide: ECS container agent configuration: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-agent-config.html
- Terraform Registry: aws_ecs_service: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service

## Issues Found
- The post described placement constraints broadly as ECS behavior without noting the Fargate limitation. AWS documents that task placement constraints are not supported for Fargate tasks, so I added a short note that the examples apply to EC2-backed ECS container instances.
- The `distinctInstance` description was too absolute. AWS defines it as placing each active task in the same task group on a different container instance, with documented edge cases during task state transitions. I updated the wording to say "active task in the same task group" and softened the service-specific wording.

## Review Notes
AWS CLI is not installed in this local environment, so CLI syntax was checked against the current AWS CLI command reference rather than local `--help` output. The `create-service`, `put-attributes`, placement constraint, placement strategy, Cluster Query Language, ECS agent configuration, and Terraform `aws_ecs_service` examples are otherwise consistent with the consulted official documentation.
