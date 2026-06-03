# Validation Summary: How to Set Up ECS Anywhere for Hybrid Container Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS
- Amazon ECS Anywhere
- AWS Systems Manager
- AWS IAM
- Amazon ECR
- Amazon CloudWatch Logs
- Docker
- AWS CLI

## Sources Consulted
- Amazon ECS clusters for external instances: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-anywhere.html
- Registering an external instance to an Amazon ECS cluster: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-anywhere-registration.html
- Amazon ECS Anywhere IAM role: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/iam-role-ecsanywhere.html
- Example Amazon ECS task definitions, including workloads on external instances: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/example_task_definitions.html
- Amazon ECS task execution IAM role: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html
- CloudWatch Container Insights: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/ContainerInsights.html
- Setting up Container Insights on Amazon ECS: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/deploy-container-insights-ECS-cluster.html

## Issues Found
- The supported operating system list was outdated and used broad version ranges that do not match current AWS documentation. Updated it to the current AWS ECS Anywhere support list and noted the August 7, 2026 end of support for older operating systems listed by AWS.
- The `AmazonEC2ContainerServiceforEC2Role` managed policy ARN was missing the `service-role/` path. Updated it to `arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role`.
- The task definition used the `awslogs` log driver but did not specify that a task execution role is required. Added a note to create or reuse an ECS task execution role with `AmazonECSTaskExecutionRolePolicy`, and added `executionRoleArn` to the task definition example.
- Placeholder AWS account IDs used `123456789`, which is not a valid 12-digit AWS account ID format. Updated examples to use `123456789012`.
- The prerequisites included a specific `1 vCPU and 512MB` requirement that was not confirmed in current ECS Anywhere documentation. Replaced it with a general requirement to provide enough CPU and memory for the SSM agent, ECS agent, Docker, and planned tasks.

## Review Notes
The ECS Anywhere networking limitations in the post match AWS documentation: service load balancing and service discovery are not supported for external instances, and tasks must use `bridge`, `host`, or `none` networking rather than `awsvpc`. Container Insights setup with `containerInsights=enabled` remains valid, though AWS also documents enhanced observability as a newer option.
