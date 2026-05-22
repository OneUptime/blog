# Validation Summary: How to Migrate Between Terraform Enterprise Deployments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform Enterprise
- HCP Terraform/Terraform Enterprise API
- PostgreSQL
- AWS S3
- AWS Route 53
- Docker Compose
- Bash, curl, and jq

## Sources Consulted
- HashiCorp Terraform Enterprise Admin Organizations API: https://developer.hashicorp.com/terraform/enterprise/api-docs/admin/organizations
- HashiCorp Terraform Enterprise Admin Users API: https://developer.hashicorp.com/terraform/enterprise/api-docs/admin/users
- HashiCorp Terraform Enterprise Admin Workspaces API: https://developer.hashicorp.com/terraform/enterprise/api-docs/admin/workspaces
- HashiCorp Terraform Enterprise Admin Runs API: https://developer.hashicorp.com/terraform/enterprise/api-docs/admin/runs
- HashiCorp Terraform Enterprise Admin Settings API: https://developer.hashicorp.com/terraform/enterprise/api-docs/admin/settings
- HashiCorp Workspace Variables API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspace-variables
- HashiCorp state version upload guidance: https://support.hashicorp.com/hc/en-us/articles/360041299873-How-to-Create-a-State-Version-Using-the-API
- HashiCorp Terraform Enterprise storage overview: https://developer.hashicorp.com/terraform/enterprise/deploy/configuration/storage
- HashiCorp Terraform Enterprise deployment overview: https://developer.hashicorp.com/terraform/enterprise/deploy
- HashiCorp Terraform Enterprise monitoring and health check docs: https://developer.hashicorp.com/terraform/enterprise/deploy/replicated/monitoring/monitoring
- AWS CLI `s3 sync` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html
- AWS CLI Route 53 `change-resource-record-sets` command reference: https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html
- PostgreSQL `pg_dump` documentation: https://www.postgresql.org/docs/current/app-pgdump.html
- PostgreSQL `pg_restore` documentation: https://www.postgresql.org/docs/current/app-pgrestore.html
- Docker Compose CLI documentation: https://docs.docker.com/reference/cli/docker/compose/

## Issues Found
- The post used `PATCH /api/v2/admin/general-settings` with a `maintenance-mode` attribute. The official Admin Settings API does not define that attribute, so the example would not work as written. I replaced it with operational guidance to prevent new work through VCS webhook or load balancer controls.
- The run-drain check only filtered `planning` and `applying` runs. The Admin Runs API also exposes queued, pending, and confirmation states, so I expanded the filter to include `pending`, `plan_queued`, `planning`, `confirmed`, `apply_queued`, and `applying`.
- The state-version upload example omitted the required base64-encoded `state` attribute and used hard-coded `serial` and `lineage` values. I updated it to read `serial` and `lineage` from the downloaded state file, compute the MD5 checksum, base64-encode the state, and submit the complete state-version payload.
- The state download example did not include redirect handling or an authorization header for the hosted state download URL. I added `-L` and the source token header, matching current HashiCorp guidance.
- The variable migration payload interpolated variable values directly into JSON, which can break when values contain quotes, newlines, or other JSON-significant characters. I changed it to build the payload with `jq -n`.
- The post showed a direct SQL update to an internal `site_configurations` table for hostname changes. Because this relies on undocumented internal schema details, I replaced it with guidance to update the deployment configuration such as `TFE_HOSTNAME` and reconfigure VCS connections when the hostname changes.
- The rollback plan referred to disabling maintenance mode even though the unsupported maintenance-mode API example was removed. I updated the rollback step to re-enable user/API access and VCS webhooks.

## Review Notes
The direct database and object storage strategy may be valid in tightly controlled external-services deployments, but HashiCorp's documented backup/restore workflow is the safer reference path for supported migration scenarios, especially Replicated-to-FDO or mounted-disk-to-external-services migrations. Future revisions should consider calling out support boundaries, version parity requirements, and the need to preserve encryption keys or Vault-backed configuration explicitly.
