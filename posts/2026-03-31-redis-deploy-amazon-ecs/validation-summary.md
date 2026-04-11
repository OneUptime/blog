# Validation Summary: How to Deploy Redis with Amazon ECS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis 7 (Alpine Docker image)
- Amazon ECS (Elastic Container Service) with Fargate launch type
- Amazon EFS (Elastic File System) for persistent volumes
- ECS Service Connect for service discovery
- AWS CLI (ecs, ec2, logs subcommands)
- Amazon CloudWatch Logs

## Sources Consulted
- AWS ECS Task Definition documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- AWS ECS Fargate supported CPU/memory combinations: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-cpu-memory-error.html
- AWS ECS Service Connect documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-connect.html
- AWS ECS EFS volume configuration: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/efs-volumes.html
- Redis PING command documentation: https://redis.io/docs/latest/commands/ping/
- Redis requirepass configuration: https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/
- AWS CLI ECS create-service reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/create-service.html
- AWS CLI EC2 authorize-security-group-ingress reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html

## Issues Found
1. **Health check fails when `requirepass` is set**: The original health check command was `redis-cli ping || exit 1`, but Redis is configured with `--requirepass REDIS_PASSWORD_FROM_SECRET`. When `requirepass` is enabled, Redis requires authentication before executing any command (including PING). The health check would always fail, causing ECS to mark the container as unhealthy and continuously restart it. Fixed by changing the health check to `redis-cli -a REDIS_PASSWORD_FROM_SECRET --no-auth-warning ping || exit 1`, which authenticates before sending PING and suppresses the CLI password warning.

## Review Notes
- The password is passed as a plaintext placeholder in the `command` field. In production, it would be better to use AWS Secrets Manager with the ECS `secrets` field to inject the password as an environment variable, then reference it in a custom entrypoint script. This is a best-practice improvement rather than a technical error, since the post uses an obvious placeholder value.
- The Fargate CPU (512) and memory (1024) combination is valid. The `--maxmemory 512mb` Redis setting is appropriate for the 1024 MB container memory, leaving headroom for Redis overhead and the OS.
- The `desired-count` of 1 is correct for Redis since it is a single-node datastore; running multiple replicas without replication configuration would cause data divergence.
- All AWS CLI commands use correct syntax and valid flags.
- The ECS Service Connect configuration correctly references the `portName` from the task definition's port mappings.
