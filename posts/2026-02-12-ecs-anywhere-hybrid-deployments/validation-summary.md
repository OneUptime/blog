# Validation Summary: How to Use ECS Anywhere for Hybrid Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS Anywhere
- Amazon ECS external instances and EXTERNAL launch type
- AWS Systems Manager hybrid activations
- IAM roles and managed policies
- Amazon ECR image pulls
- Amazon CloudWatch Logs and Container Insights
- Docker networking for ECS tasks
- AWS CLI

## Sources Consulted
- Amazon ECS clusters for external instances: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-anywhere.html
- Registering an external instance to an Amazon ECS cluster: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-anywhere-registration.html
- Amazon ECS Anywhere IAM role: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/iam-role-ecsanywhere.html
- Example Amazon ECS task definitions, workloads on external instances: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/example_task_definitions.html
- AWS CLI create-activation reference: https://docs.aws.amazon.com/cli/latest/reference/ssm/create-activation.html
- Updating the AWS Systems Manager agent and Amazon ECS container agent on an external instance: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-anywhere-updates.html
- Deregistering an Amazon ECS external instance: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-anywhere-deregistration.html
- CloudWatch Container Insights for Amazon ECS: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/ContainerInsights.html

## Issues Found
- The architecture diagram showed the ECS control plane pulling images from ECR. Updated it so external instances pull images from ECR, which matches how ECS agents and container runtimes fetch images.
- The supported operating system list was too broad and lacked current version/date caveats. Updated it to list Amazon Linux 2023, Ubuntu 20/22/24, and RHEL 9, and noted older distributions that AWS says are supported only until August 7, 2026.
- The prerequisites implied Docker must always be preinstalled, while the ECS Anywhere script can install Docker on some supported distributions. Clarified that RHEL 9 requires Docker before running the script.
- The EXTERNAL task definition used CloudWatch Logs and a private ECR image without showing the task execution role requirement. Added `executionRoleArn` and a note explaining when it is required.
- The networking section implied ECS Anywhere always uses only `bridge` networking. Updated it to reflect AWS's documented support for `bridge`, `host`, and `none`, with `awsvpc` unsupported.
- The outbound endpoint list omitted ECS agent telemetry/task endpoints and Systems Manager message endpoints. Added `ecs-a-*`, `ecs-t-*`, `ec2messages`, and `ssmmessages` endpoint patterns.
- The ECS agent update command used a generic `yum update ecs-init` command that would not work across the supported Linux set. Replaced it with an AWS-documented package download/install flow and labeled it as an Ubuntu x86_64 example.
- The monitoring text overstated automatically visible per-task metrics. Adjusted it to say Container Insights provides task and service metrics for the workloads.

## Review Notes
The commands are example-oriented and still require region, account, subnet, security group, task role, and package choices to match the reader's environment. The AWS CLI was not installed locally, so command validation was performed against official AWS CLI and service documentation.
