# Validation Summary: How to Use Terraform Workspaces for Staging and Production GCP Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform workspaces
- Terraform GCS backend
- Terraform HCL
- Google Cloud Platform
- Google Kubernetes Engine
- Cloud SQL for PostgreSQL
- GitHub Actions

## Sources Consulted
- Terraform CLI workspaces documentation: https://developer.hashicorp.com/terraform/cli/workspaces
- Terraform `workspace select` command reference: https://developer.hashicorp.com/terraform/cli/commands/workspace/select
- Terraform GCS backend documentation: https://developer.hashicorp.com/terraform/language/backend/gcs
- Terraform `terraform.workspace` named value documentation: https://developer.hashicorp.com/terraform/language/expressions/references#filesystem-and-workspace-info
- Terraform `apply` command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform `state push` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/push
- Google provider `google_container_cluster` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster
- Google provider `google_sql_database_instance` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance
- Google provider `google_project` data source documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/project

## Issues Found
- The post showed GCS workspace state paths using an `env:/.../terraform.tfstate` layout. The official GCS backend stores named workspace states as `<prefix>/<name>.tfstate`, so I corrected the examples to `infrastructure/app/staging.tfstate`, `infrastructure/app/production.tfstate`, and the related explanatory text.
- The `project_check` example set `project_id = local.config.project_id` on `data.google_project.current` and then compared that same value back to `local.config.project_id`, making the check tautological. I changed the data source to use the provider default project and updated the error message accordingly.
- The GitHub Actions workflow used `terraform workspace select`, which fails if the named workspace does not already exist. I changed it to `terraform workspace select -or-create` to match the current Terraform CLI option for automation.

## Review Notes
- The Google provider version constraint `~> 5.0` is valid for the examples, but newer provider major versions exist. Future updates could consider whether the post should pin a newer major version after testing.
- The Cloud SQL private IP snippet assumes that the VPC and Service Networking connection are defined elsewhere. The provider documentation recommends an explicit dependency on the Service Networking connection for full private IP examples.
