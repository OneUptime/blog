# Validation Summary: How to Configure ECS Task Placement Strategies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon ECS
- ECS task placement strategies
- AWS CLI
- Terraform AWS provider
- EC2 launch type container instances

## Sources Consulted
- Amazon ECS Developer Guide: Use strategies to define Amazon ECS task placement - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-placement-strategies.html
- Amazon ECS Developer Guide: Example Amazon ECS task placement strategies - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/strategy-examples.html
- AWS CLI Command Reference: ecs create-service - https://docs.aws.amazon.com/cli/latest/reference/ecs/create-service.html
- AWS CLI Command Reference: ecs update-service - https://docs.aws.amazon.com/cli/latest/reference/ecs/update-service.html
- AWS CLI Command Reference: ecs run-task - https://docs.aws.amazon.com/cli/latest/reference/ecs/run-task.html
- Terraform Registry: aws_ecs_service - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service

## Issues Found
- The post said ECS spreads tasks across instances by default. AWS documentation says ECS services default to spreading tasks across Availability Zones using `attribute:ecs.availability-zone`, so the introduction was corrected.
- The AZ spread example implied an exact 2-task-per-AZ result. AWS describes task placement strategies as best effort, so the wording was qualified to depend on eligible capacity.
- The instance spread examples implied `spread` on `instanceId` guarantees one task per instance. AWS documents `spread` as even distribution, not a hard isolation guarantee, so the comments and stateful-service explanation were corrected and a note was added to use `distinctInstance` when strict separation is required.
- The post said existing service placement strategies cannot be changed directly. AWS CLI documentation for `update-service` supports `--placement-strategy`, notes it overrides the existing strategy, and says it does not trigger a deployment by itself. The section was corrected to explain direct updates and optional `--force-new-deployment`.

## Review Notes
The AWS CLI examples use valid `--placement-strategy` JSON syntax, and the Terraform `ordered_placement_strategy` blocks match the current Terraform AWS provider schema. The examples intentionally focus on EC2-backed ECS tasks; placement strategies are not applicable in the same way to Fargate task placement.
