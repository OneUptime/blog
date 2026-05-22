# Validation Summary: How to Use Terraform with Docker Compose

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Docker
- Docker Compose
- AWS EC2
- AWS Elastic IP
- Amazon CloudWatch Logs
- Terraform Docker provider
- Terraform AWS, Local, and provisioner features

## Sources Consulted
- Terraform provisioners documentation: https://developer.hashicorp.com/terraform/language/resources/provisioners/local-exec
- Terraform `templatefile` function documentation: https://developer.hashicorp.com/terraform/language/functions/templatefile
- Terraform Local provider `local_file` resource documentation: https://registry.terraform.io/providers/hashicorp/local/latest/docs/resources/file
- Terraform AWS provider `aws_eip` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip.html
- Terraform Docker provider `docker_container` resource documentation: https://registry.terraform.io/providers/kreuzwerker/docker/latest/docs/resources/container.html
- Docker Compose file reference: https://docs.docker.com/compose/compose-file/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose installation documentation: https://docs.docker.com/compose/install/linux/
- Docker Compose CLI reference: https://docs.docker.com/reference/cli/docker/compose/
- Docker `awslogs` logging driver documentation: https://docs.docker.com/engine/logging/drivers/awslogs/
- Docker restart policy documentation: https://docs.docker.com/engine/containers/start-containers-automatically/
- Dockerfile `HEALTHCHECK` reference: https://docs.docker.com/reference/builder
- AWS EC2 user data documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html

## Issues Found
- The Compose template used `version: "3.8"`. Docker Compose V2 uses the current Compose Specification, and the top-level `version` field is obsolete and only retained for backward compatibility. Removed the `version` line.
- The Docker Compose logging configuration used `awslogs-stream-prefix`, which is an ECS task logging option, not a Docker Engine `awslogs` logging driver option. Replaced it with the Docker-supported `awslogs-stream` option for both `app` and `worker`.
- The best-practices section said health checks let Docker automatically restart unhealthy containers. Docker health checks report health state, while restart policies apply when containers stop or exit. Updated the wording to say health checks report unhealthy containers and can gate dependent services, while restart policies or external monitoring are needed for recovery.

## Review Notes
- The Terraform examples are illustrative and reference resources and variables not shown in the post, such as RDS, ElastiCache, S3, IAM instance profile, and provider blocks. That is acceptable for a focused integration guide, but a complete runnable module would need those definitions.
- The Docker Compose template leaves `DB_PASSWORD` to be supplied at deploy/runtime, which is a reasonable secret-handling pattern as long as the deployment environment provides it.
- Terraform provisioners are valid for the shown workflow, but HashiCorp recommends using purpose-built configuration management, cloud-init, or prebuilt images where possible because provisioners add operational coupling.
