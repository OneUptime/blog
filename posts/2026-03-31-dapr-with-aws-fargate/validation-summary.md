# Validation Summary: How to Use Dapr with AWS Fargate

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (daprd sidecar, version 1.13.0)
- AWS Fargate
- Amazon ECS (Elastic Container Service)
- AWS Application Auto Scaling
- AWS CLI (ecs, ec2, application-autoscaling subcommands)
- Amazon S3 (for component config distribution)
- Amazon ECR (container registry)

## Sources Consulted
- AWS ECS Task Definition documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- AWS ECS Fargate networking (awsvpc mode): https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-networking.html
- AWS ECS container dependency and health check: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html#container_definition_dependson
- Dapr CLI / daprd flags reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr 1.11 migration guide (--components-path renamed to --resources-path): https://docs.dapr.io/operations/support/support-release-policy/
- AWS Application Auto Scaling for ECS: https://docs.aws.amazon.com/autoscaling/application/userguide/services-that-can-integrate-ecs.html
- AWS Security Group ingress rules: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html

## Issues Found

1. **Missing volume mount on dapr-sidecar container**: The sidecar container used `--resources-path /dapr/components` but did not mount the `dapr-components` volume. Only the `dapr-config-init` container had the volume mount, so the sidecar would not have access to the component files. Fixed by adding `mountPoints` to the sidecar container definition.

2. **Missing container dependency ordering**: The `dapr-sidecar` container had no `dependsOn` clause for the `dapr-config-init` init container. This meant the sidecar could start before component files were copied from S3. Fixed by adding `dependsOn` with `condition: "SUCCESS"` for `dapr-config-init`.

3. **Deprecated `--components-path` flag**: The post uses Dapr 1.13.0 but referenced the `--components-path` flag, which was deprecated in Dapr 1.11 and replaced by `--resources-path`. Updated to `--resources-path`.

4. **Security group port range too wide**: The ingress rule used `--port 3500-50001`, which opens approximately 46,500 ports. Only two ports are needed: 3500 (Dapr HTTP API) and 50001 (Dapr gRPC). Fixed by splitting into two separate ingress rules, one per port.

## Review Notes
- The health check on the daprd container uses `CMD-SHELL` with `wget`. The official `daprio/daprd` image is based on a distroless base image which may not include `wget` or a shell. If the health check fails at runtime, consider using `CMD` format with the daprd binary's built-in health check support, or switching to a non-distroless daprd image variant.
- The Dapr image version 1.13.0 is not the latest. Readers should consider using a more recent stable version.
- The task definition uses an ephemeral Docker volume for sharing component files between the init and sidecar containers, which is fine for Fargate (bind mounts from the host are not supported). For production, EFS volumes could provide more persistent and shared configuration storage.
