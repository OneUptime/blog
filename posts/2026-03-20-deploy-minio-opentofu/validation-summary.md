# Validation Summary: How to Deploy Minio with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform
- MinIO (S3-compatible object storage)
- AWS ECS Fargate
- AWS EFS (Elastic File System)
- AWS ALB (Application Load Balancer)
- AWS Secrets Manager
- HashiCorp AWS Terraform provider
- aminueza/minio Terraform provider

## Sources Consulted
- HashiCorp AWS provider — `aws_ecs_task_definition`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- HashiCorp AWS provider — `aws_efs_file_system`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/efs_file_system
- HashiCorp AWS provider — `aws_efs_access_point`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/efs_access_point
- HashiCorp AWS provider — `aws_lb_target_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- aminueza/minio provider docs: https://github.com/aminueza/terraform-provider-minio/blob/main/docs/index.md
- aminueza/minio `minio_s3_bucket`: https://github.com/aminueza/terraform-provider-minio/blob/main/docs/resources/s3_bucket.md
- aminueza/minio `minio_iam_user`: https://github.com/aminueza/terraform-provider-minio/blob/main/docs/resources/iam_user.md
- aminueza/minio `minio_iam_policy`: https://github.com/aminueza/terraform-provider-minio/blob/main/docs/resources/iam_policy.md
- MinIO health check probe documentation: https://docs.min.io/community/minio-object-store/operations/monitoring/healthcheck-probe.html
- MinIO server reference / GitHub README: https://github.com/minio/minio

## Issues Found

1. **`access_point_id` placed at the wrong nesting level in `efs_volume_configuration`.**
   The original code placed `access_point_id` directly under `efs_volume_configuration`. Per the HashiCorp AWS provider schema, `access_point_id` must be nested inside an `authorization_config` block. The example would fail with a schema validation error during `tofu plan`. Fixed by wrapping `access_point_id` inside an `authorization_config` block (with `iam = "DISABLED"`, the default).

2. **`/minio/health/ready` is not an officially documented MinIO health endpoint.**
   MinIO documents `/minio/health/live` as the liveness probe and `/minio/health/cluster` (and `/minio/health/cluster/read`) for cluster readiness. There is no `/minio/health/ready` endpoint in current MinIO documentation. Changed the console target group health check path from `/minio/health/ready` to `/minio/health/live`, which is the documented liveness endpoint.

## Review Notes

- The post uses `image = "minio/minio:latest"`. Pinning to a specific MinIO release tag (e.g. `minio/minio:RELEASE.2025-XX-XX...`) is recommended in production to ensure deployment reproducibility — `latest` is not best practice for stateful workloads.
- The deployment uses a single MinIO container backed by EFS, so MinIO runs in standalone (single-drive) mode. This works but does not provide MinIO's native erasure coding / multi-drive durability — the durability story is delegated to EFS. This is implicitly correct for the architecture described, but readers should be aware MinIO distributed mode would require a different topology.
- `MINIO_VOLUMES = "/data"` and the CLI argument `/data` are both set; MinIO will accept either, but they are redundant. Not incorrect.
- `throughput_mode = "elastic"` is supported by `aws_efs_file_system` (alongside `bursting` and `provisioned`) and is appropriate for spiky workloads, though it has different cost characteristics than `bursting`.
- The `aws_efs_access_point` `root_directory.path` is set to `/minio`, while the ECS volume `root_directory` is `/`. When an access point is used, AWS overrides the volume `root_directory` with the access point's root directory, so this is consistent.
- Excerpts only — IAM roles (`aws_iam_role.ecs_execution`, `aws_iam_role.minio_task`), the KMS key (`aws_kms_key.efs`), security groups, the ALB itself, listeners, the ECS service, Secrets Manager secrets, and `random_password.minio_app_secret` are referenced but not shown. This is normal for a focused tutorial but worth noting for readers planning a full deployment.
