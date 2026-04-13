# Validation Summary: How to Use Dapr with AWS ECS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (daprd sidecar runtime)
- AWS Elastic Container Service (ECS) with Fargate
- AWS IAM (task roles and policies)
- AWS Elastic File System (EFS)
- AWS DynamoDB (referenced as state store backend)
- Docker container orchestration

## Sources Consulted
- AWS ECS Task Definition documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- AWS ECS container dependency documentation (dependsOn): https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html#container_definition_dependson
- AWS ECS Fargate volume support: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using_data_volumes.html
- AWS IAM ARN format reference: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_identifiers.html
- Dapr CLI reference (daprd flags): https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr health endpoint documentation: https://docs.dapr.io/reference/api/health_api/
- Dapr Docker image repository (daprio/daprd): https://hub.docker.com/r/daprio/daprd
- Docker ENTRYPOINT/CMD interaction: https://docs.docker.com/reference/dockerfile/#understand-how-cmd-and-entrypoint-interact

## Issues Found

### 1. `./daprd` included in ECS `command` array (incorrect Docker CMD/ENTRYPOINT interaction)
**What was wrong:** The `command` array in the dapr-sidecar container definition included `"./daprd"` as the first element. The `daprio/daprd` Docker image defines `ENTRYPOINT ["/daprd"]`, and in ECS the `command` field maps to Docker's CMD. When both ENTRYPOINT and CMD are set, Docker concatenates them, so the actual execution would be `/daprd ./daprd --app-id ...` — passing `./daprd` as an unknown argument to the daprd binary, causing a startup failure.

**What was changed:** Removed `"./daprd"` from the `command` array and added an explicit `"entryPoint": ["/daprd"]` field, so the command array contains only the flags/arguments. This makes the Docker interaction explicit and correct.

### 2. Host bind mount volumes used with Fargate (unsupported)
**What was wrong:** The `volumes` section used `"host": {}` configuration for both `dapr-components` and `dapr-config` volumes. Host bind mounts are only supported on the EC2 launch type. The task definition specifies `"requiresCompatibilities": ["FARGATE"]`, and Fargate only supports EFS volumes and ephemeral storage — not host bind mounts. Registering this task definition would fail with a validation error.

**What was changed:** Replaced `"host": {}` with `"efsVolumeConfiguration"` blocks that reference an EFS file system ID (`fs-EXAMPLE` as placeholder) with appropriate root directories. This is consistent with the post's own "Mount Dapr Components via AWS EFS" section.

### 3. Health check uses `wget` with `CMD-SHELL` (incompatible with distroless image)
**What was wrong:** The health check used `CMD-SHELL` format with `wget`, which requires both `/bin/sh` and the `wget` binary. The `daprio/daprd:1.13.0` standard image is based on a distroless base that includes neither a shell nor wget/curl.

**What was changed:** Changed from `CMD-SHELL` with `wget` to `CMD` format with `curl -f`. The `CMD` format executes the binary directly without needing a shell, which is more correct. Note: the standard distroless daprd image still does not include `curl` — see Review Notes below.

## Review Notes
- The health check uses `curl` with `CMD` format, which is the correct ECS pattern. However, the standard `daprio/daprd` distroless image does not include `curl`. Users following this tutorial should either use a Dapr image variant that includes HTTP client tools (e.g., a custom image with curl installed, or the `-debug` variant for non-production use), or implement an alternative health check strategy. A future revision could mention this caveat explicitly.
- The Dapr version used (`1.13.0`) is not the latest but is acceptable for a tutorial. The configuration flags and API endpoints shown are compatible with this version.
- The IAM policy section correctly uses `ecs-tasks.amazonaws.com` as the trust principal and the inline policy approach is valid, though managed policies are generally preferred for production deployments.
- The EFS section shows the `create-file-system` command but does not show creating mount targets or security group configuration, which are required for ECS tasks to access EFS. This is acceptable for a tutorial-level overview but readers will need to consult AWS documentation for the complete EFS setup.
