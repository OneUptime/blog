# Validation Summary: How to Use Sensitive Variables in HCP Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCP Terraform workspace variables and variable sets
- HCP Terraform Variables API
- HashiCorp `tfe` Terraform provider
- Terraform sensitive values
- HashiCorp Vault
- AWS Secrets Manager
- HCP Terraform dynamic provider credentials

## Sources Consulted
- HashiCorp Developer: Manage variables and variable sets in HCP Terraform - https://developer.hashicorp.com/terraform/cloud-docs/variables/managing-variables
- HashiCorp Developer: HCP Terraform Workspace Variables API - https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspace-variables
- HashiCorp Developer: Manage sensitive data in your configuration - https://developer.hashicorp.com/terraform/language/manage-sensitive-data
- HashiCorp Developer: Authenticate providers with dynamic credentials - https://developer.hashicorp.com/terraform/tutorials/cloud/dynamic-credentials
- Terraform Registry: HashiCorp `tfe_variable` resource - https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/variable
- Terraform Registry: HashiCorp `tfe_variable_set` resource - https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/variable_set
- Terraform Registry: AWS `aws_secretsmanager_secret_version` data source - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/secretsmanager_secret_version
- Terraform Registry: HashiCorp Vault provider documentation - https://registry.terraform.io/providers/hashicorp/vault/latest/docs

## Issues Found
- The post said Terraform redacts sensitive values in "state display" without warning that sensitive values can still be stored in state and plan files. I changed the wording to say Terraform redacts controlled output while state and plan artifacts can still contain sensitive values.
- The external secrets manager section said HCP Terraform never stores secrets fetched at runtime. That is only true for workspace variables; Terraform data sources and resource arguments may persist those secret values in state or plan files. I added that caveat and pointed to ephemeral/write-only provider features where supported.
- The secret sync script interpolated the Vault value directly into JSON. I changed the PATCH payload to use `jq -n --arg` so secrets containing quotes, backslashes, or newlines are encoded correctly.

## Review Notes
The HCP Terraform sensitive variable behavior, Workspace Variables API shape, `tfe_variable` examples, variable set examples, and AWS dynamic provider credential environment variable names were consistent with current official documentation. The post does not pin provider or Terraform versions; future updates could mention Terraform 1.10+ ephemeral values and Terraform 1.11+ write-only resource arguments in more depth.
