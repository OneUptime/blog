# Validation Summary: How to Configure Terraform Backend Partial Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform backend configuration
- Terraform CLI
- AzureRM Terraform backend
- Azure Blob Storage state storage and locking
- Microsoft Entra ID / OpenID Connect authentication
- GitHub Actions
- Bash scripting

## Sources Consulted
- HashiCorp Terraform backend configuration documentation: https://developer.hashicorp.com/terraform/language/backend
- HashiCorp Terraform AzureRM backend documentation: https://developer.hashicorp.com/terraform/language/backend/azurerm
- HashiCorp Terraform workspaces documentation: https://developer.hashicorp.com/terraform/language/state/workspaces
- HashiCorp Terraform force-unlock command documentation: https://docs.hashicorp.com/terraform/cli/commands/force-unlock
- HashiCorp Terraform AzureRM backend implementation for workspace blob naming: https://github.com/hashicorp/terraform/blob/main/internal/backend/remote-state/azure/backend_state.go
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax

## Issues Found
- The AzureRM OIDC backend examples set `use_oidc = true` but omitted `client_id`, which the Terraform AzureRM backend requires for service principal / app registration based OIDC authentication. Added `client_id` to backend config file, CLI, and GitHub Actions examples.
- The AzureRM OIDC examples did not set `use_azuread_auth = true`, so the backend could fall back to access key lookup behavior instead of recommended Microsoft Entra ID data-plane authentication. Added `use_azuread_auth = true` to the OIDC examples.
- The workspace section said Terraform automatically adds the workspace name to the key path. For the AzureRM backend, the default workspace uses the configured key and non-default workspaces append `env:<workspace>` to that key. Updated the explanation and comment accordingly.
- The description and conclusion referred to keeping "sensitive storage details" out of code. Storage account names and container names are environment-specific but not secrets, and Terraform can store backend configuration under `.terraform` and in plan files. Reworded those statements to "environment-specific backend details."

## Review Notes
Backend configuration values supplied with `-backend-config` can be persisted locally in `.terraform` and captured in saved plan files, so credentials should still be supplied through environment variables where possible.
