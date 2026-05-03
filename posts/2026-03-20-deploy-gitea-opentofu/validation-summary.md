# Validation Summary: How to Deploy Gitea with OpenTofu

## Status
validated

## Post Type
Tutorial / Infrastructure-as-Code Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS RDS (PostgreSQL 15.4)
- AWS EFS (Elastic File System)
- AWS ECS Fargate
- AWS ALB (Application Load Balancer)
- AWS Route53
- AWS Secrets Manager
- AWS KMS
- Gitea 1.21 (self-hosted Git service)
- Docker (gitea/gitea image)

## Sources Consulted
- Gitea official documentation - configuration cheat sheet (`GITEA__section__KEY` env var format)
- Gitea Docker installation docs (image `gitea/gitea:1.21`, default SSH port 22)
- Terraform AWS provider docs - `aws_efs_file_system` (`throughput_mode` valid values: bursting, provisioned, elastic)
- Terraform AWS provider docs - `aws_db_instance` (`skip_final_snapshot`, `final_snapshot_identifier`)
- Terraform AWS provider docs - `aws_ecs_task_definition` and container definitions schema
- AWS RDS PostgreSQL release notes (engine_version 15.4 supported)
- AWS ECS task definition JSON schema (camelCase field names: `mountPoints`, `readOnly`, `containerPath`, `sourceVolume`)

## Issues Found
No technical issues found.

All HCL resource attributes are valid and current. The Gitea environment variable mapping (`GITEA__database__*`, `GITEA__server__*`, `GITEA__service__*`, `GITEA__mailer__*`, `GITEA__security__*`) follows the documented Docker config-via-env-var convention. The EFS `throughput_mode = "elastic"` is a valid value. ECS task definition uses correct camelCase JSON keys. The `gitea/gitea:1.21` image exists and the in-container SSH server listens on port 22 by default.

## Review Notes
- **PostgreSQL 15.4 patch level**: Engine version "15.4" was released in late 2023. As of 2026, newer 15.x minor versions are available; readers may want to use a more recent patch (e.g., 15.7+). RDS will still accept 15.4 but it may be subject to auto minor upgrades.
- **`final_snapshot_identifier` not set**: With `deletion_protection = true` and `skip_final_snapshot = false`, the destroy operation requires a `final_snapshot_identifier` to be set. The post does not include this attribute. It will not affect `tofu apply` (creation works fine) but will fail on `tofu destroy` until it is added. This is a minor omission rather than a hard error in the deploy path the tutorial focuses on.
- **ALB does not handle SSH (port 22)**: The container exposes port 22 for git SSH, but the post's ALB target group only forwards port 3000 (HTTP). Reaching git-over-SSH would require an NLB or direct exposure — out of scope for what the post claims to demonstrate, but worth noting for readers planning end-to-end git access.
- **Health check path "/"**: Gitea also exposes `/api/healthz`, which is a more semantically correct health endpoint, but `/` works.
