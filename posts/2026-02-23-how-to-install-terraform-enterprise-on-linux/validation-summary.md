# Validation Summary: How to Install Terraform Enterprise on Linux

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Terraform Enterprise
- HCP Terraform
- Linux
- Docker Engine
- Docker Compose
- TLS certificates
- systemd
- PostgreSQL and S3-compatible object storage

## Sources Consulted
- HashiCorp Developer: Terraform Enterprise deployment overview: https://developer.hashicorp.com/terraform/enterprise/deploy
- HashiCorp Developer: Prepare the Terraform Enterprise host environment: https://developer.hashicorp.com/terraform/enterprise/deploy/prepare-host
- HashiCorp Developer: Deploy Terraform Enterprise to Docker: https://developer.hashicorp.com/terraform/enterprise/deploy/docker
- HashiCorp Developer: Terraform Enterprise configuration reference: https://developer.hashicorp.com/terraform/enterprise/deploy/reference/configuration
- HashiCorp Developer: Configure the operational mode: https://developer.hashicorp.com/terraform/enterprise/deploy/configuration/storage/configure-mode
- Docker Docs: Install Docker Engine on Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Docker Docs: Install Docker Engine on RHEL: https://docs.docker.com/engine/install/rhel/
- Docker Docs: Compose file reference: https://docs.docker.com/reference/compose-file/

## Issues Found
- The system requirements hard-coded operating systems and runtime versions that vary by Terraform Enterprise release. Replaced them with release-dependent compatibility guidance and a note to check the software product compatibility report.
- The network requirements listed port 8800 for an admin console, which applies to older Replicated-style installs rather than the current Docker deployment path. Replaced it with ports 80 and 443.
- Docker installation commands used older Ubuntu repository setup and CentOS/Yum examples. Updated them to the current Docker Docs patterns for Ubuntu and RHEL, including the Buildx and Compose plugins.
- TLS certificate paths used `tfe.crt`, `tfe.key`, and `ca-bundle.crt`. Updated the examples to HashiCorp's documented `cert.pem`, `key.pem`, and `bundle.pem` file names.
- The image pull and Compose file used the invalid `latest` tag. Replaced this with a versioned `TFE_VERSION` value because HashiCorp documents that `latest` is not a valid Terraform Enterprise image tag.
- The Docker Compose example omitted required current deployment details, including the Docker socket bind mount, disk cache volume, read-only container setting, temporary writable mounts, and CA bundle setting. Updated the Compose file to follow HashiCorp's Docker example.
- The Compose service name and log commands were inconsistent. Standardized the service as `tfe` and updated log, readiness, and stats commands accordingly.
- The environment file described the license as base64 encoded. Changed it to a raw HashiCorp license, matching the configuration reference and registry login documentation.
- The readiness check expected a Replicated-style JSON health response. Replaced it with `tfectl app health readiness`, which HashiCorp documents for Docker deployments.
- The systemd unit used `Type=simple` with a detached Compose command. Updated it to `Type=oneshot` with `RemainAfterExit=yes`, matching the lifecycle behavior of `docker compose up -d`.
- The backup example referenced a Docker volume that no longer matched the corrected disk-mode bind mount. Updated it to back up `/var/lib/terraform-enterprise` and the Terraform Enterprise cache volume.
- The upgrade section pulled `latest` and did not update the Compose interpolation value. Updated it to pull a target version and update `TFE_VERSION` in `.env` before restarting.

## Review Notes
The post remains a simplified single-node Docker deployment walkthrough. Production deployments should still be planned from HashiCorp's current reference architecture and compatibility report, especially for external PostgreSQL, object storage, Redis, backup/restore, high availability, and release-specific requirements.
