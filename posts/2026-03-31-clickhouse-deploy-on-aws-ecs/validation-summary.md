# Validation Summary: How to Deploy ClickHouse on AWS ECS

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- ClickHouse (24.3 image)
- AWS ECS (Elastic Container Service)
- AWS Fargate / EC2 launch type
- Amazon EFS (Elastic File System)
- AWS Application Load Balancer (ALB / elbv2)
- AWS Secrets Manager
- AWS CLI
- ECS task definition JSON schema (awsvpc network mode, awslogs log driver)

## Sources Consulted
- AWS ECS Fargate task size limits: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-cpu-memory-error.html (confirmed 120 GB max memory at 16 vCPU)
- AWS ECS task definition parameters: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- AWS ECS Fargate overview: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html
- ClickHouse HTTP interface docs: https://clickhouse.com/docs/en/interfaces/http (confirmed `/ping` returns "Ok." and default HTTP port 8123)

## Issues Found
No technical issues found.

Specific verifications:
- Fargate's 120 GB max memory per task claim is accurate (16 vCPU / 32–120 GB in 8 GB increments).
- ClickHouse default ports 8123 (HTTP) and 9000 (native TCP) are correct.
- ClickHouse data path `/var/lib/clickhouse` and config path `/etc/clickhouse-server/config.d` are correct for the official `clickhouse/clickhouse-server` image.
- ECS task definition fields (`family`, `networkMode`, `requiresCompatibilities`, `cpu`, `memory`, `containerDefinitions`, `mountPoints`, `logConfiguration`) are valid.
- The `efsVolumeConfiguration` fields (`fileSystemId`, `rootDirectory`, `transitEncryptionEnabled`) are valid.
- The `aws ecs create-service` command flags and `awsvpcConfiguration` syntax are correct.
- The `aws elbv2 create-target-group` command flags are correct; `--target-type ip` is required when using `awsvpc` network mode.
- ClickHouse responds to `GET /ping` with `Ok.` (with line feed), which is suitable as an ALB health check.
- The `secrets` block format for injecting Secrets Manager values into the container is correct.

## Review Notes
- The post correctly notes that the `volumes` block is shown separately from the container definition; in a real task definition, both `containerDefinitions` and `volumes` live at the top level of the task definition JSON. Readers should merge the two snippets.
- The CPU/memory pair `8192 / 65536` is shown for an EC2 launch type task, which is valid (EC2 supports up to 192 vCPUs). This combination is also valid on Fargate (8 vCPU / 64 GB), but the post explicitly targets EC2.
- ClickHouse 24.3 is an LTS release and a reasonable choice; readers may wish to use a newer LTS as time passes.
- The `awsvpc` network mode with the EC2 launch type requires the EC2 instances to have spare ENIs (or ENI trunking enabled) to attach a per-task ENI — worth noting for capacity planning, but not a technical inaccuracy in the post.
