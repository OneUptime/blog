# Validation Summary: How to Upgrade Terraform Enterprise Safely

## Status
validated

## Post Type
Operations guide

## Technologies Covered
- Terraform Enterprise
- Terraform Enterprise Admin API and System API
- Docker Compose
- Kubernetes and Helm
- PostgreSQL backup and restore
- AWS CLI for RDS and S3 backups
- Sentinel and Terraform Enterprise agent pools

## Sources Consulted
- HashiCorp Terraform Enterprise upgrade documentation: https://developer.hashicorp.com/terraform/enterprise/deploy/manage/upgrade
- HashiCorp Terraform Enterprise releases page: https://developer.hashicorp.com/terraform/enterprise/releases
- HashiCorp Terraform Enterprise Admin Settings API: https://developer.hashicorp.com/terraform/enterprise/api-docs/admin/settings
- HashiCorp Terraform Enterprise Admin Runs API: https://developer.hashicorp.com/terraform/enterprise/api-docs/admin/runs
- HashiCorp Terraform Enterprise Runs API: https://developer.hashicorp.com/terraform/enterprise/api-docs/run
- HashiCorp Terraform Enterprise Kubernetes deployment documentation: https://developer.hashicorp.com/terraform/enterprise/deploy/kubernetes
- HashiCorp Terraform Enterprise API overview: https://developer.hashicorp.com/terraform/enterprise/api-docs
- HashiCorp Terraform Enterprise System Ping API: https://developer.hashicorp.com/terraform/enterprise/api-docs/ping
- HashiCorp Terraform Enterprise diagnostics documentation: https://developer.hashicorp.com/terraform/enterprise/deploy/troubleshoot/perform-diagnostics
- HashiCorp Terraform Enterprise backup and restore documentation: https://developer.hashicorp.com/terraform/enterprise/deploy/manage/backup-restore
- HashiCorp Terraform Enterprise agents and agent pools API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/agents

## Issues Found
- The post used `/api/v2/admin/general-settings` to read `.data.attributes."app-version"`, but the documented Admin Settings API does not expose an `app-version` attribute. Replaced those checks with Docker inspection of the running Terraform Enterprise container image tag.
- The notification section used a `maintenance-mode` attribute on `/api/v2/admin/general-settings`, but that attribute is not documented for the Admin Settings API. Replaced the example with guidance to pause external automation, scheduled pipelines, and VCS webhooks.
- The Docker Compose image update command rewrote the image to `terraform-enterprise:v202402-1`, which would drop the required `images.releases.hashicorp.com/hashicorp/terraform-enterprise` registry path. Updated the command to preserve the full registry-qualified image name.
- The backup example took database backups while the application was still running and did not mention object storage. HashiCorp's upgrade guidance recommends backing up while Terraform Enterprise is offline and capturing external services including PostgreSQL and object storage. Updated the backup example to stop TFE first and include an object storage backup example.

## Review Notes
The remaining commands are intentionally examples and still require environment-specific values such as container names, release names, namespace names, database identifiers, S3 bucket names, and workspace IDs. Kubernetes deployment names can vary with Helm release naming, so operators should confirm the generated deployment name in their cluster before copying the rollout and log commands unchanged.
