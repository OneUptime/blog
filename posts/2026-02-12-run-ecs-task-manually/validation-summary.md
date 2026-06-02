# Validation Summary: How to Run an ECS Task Manually

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS
- AWS Fargate
- Amazon EC2 launch type for ECS
- AWS CLI
- boto3 for Python
- Amazon CloudWatch Logs
- Docker containers

## Sources Consulted
- AWS CLI `ecs run-task` command reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/run-task.html
- AWS CLI `ecs wait` command reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/wait/
- Amazon ECS task lifecycle documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-lifecycle-explanation.html
- Amazon ECS Fargate task networking documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-task-networking.html
- Amazon ECS Fargate task definition and networking requirements: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-tasks-services.html
- boto3 ECS `run_task` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/ecs/client/run_task.html
- boto3 ECS waiters documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/ecs.html
- Amazon ECS `LogConfiguration` API reference: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_LogConfiguration.html
- Amazon ECS `CannotPullContainerError` troubleshooting documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_cannot_pull_image.html
- AWS CLI CloudWatch Logs `get-log-events` command reference: https://docs.aws.amazon.com/cli/latest/reference/logs/get-log-events.html
- AWS CLI CloudWatch Logs `tail` command reference: https://docs.aws.amazon.com/cli/latest/reference/logs/tail.html

## Issues Found
- The post said the AWS CLI does not have a built-in wait command for tasks, but AWS CLI includes `aws ecs wait tasks-stopped`. Changed the wording to accurately describe using the built-in waiter in a script.
- The boto3 example used `taskDefinition='db-migration:latest'`. ECS task definition identifiers accept `family`, `family:revision`, or an ARN; `latest` is not a valid numeric revision. Changed it to `taskDefinition='db-migration'`, which uses the latest active revision.
- The common issue "Task stuck in PROVISIONING" attributed the state only to Fargate capacity. ECS documentation distinguishes lifecycle states: `PROVISIONING` includes setup such as ENI provisioning, while `PENDING` waits for resources. Updated the wording to cover networking/resource allocation and capacity.
- The common issue "Exit code 1 with CannotPullContainerError" conflated a stopped reason with a container exit code. If a task cannot pull the image, the container may not start and may not have an exit code. Updated the heading and explanation to describe network, image, and permission causes.

## Review Notes
The remaining AWS CLI commands, JSON option names, ECS lifecycle state list, `awsvpc` networking requirement for Fargate, `--count` limit of 10 tasks per `run-task` call, task-level CPU and memory overrides, boto3 waiter usage, and CloudWatch Logs stream naming format were consistent with current AWS documentation as of 2026-06-02.
