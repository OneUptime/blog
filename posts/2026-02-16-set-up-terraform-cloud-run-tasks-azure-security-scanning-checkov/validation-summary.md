# Validation Summary: How to Set Up Terraform Cloud Run Tasks for Azure Security Scanning with Checkov

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Terraform
- HCP Terraform / Terraform Cloud run tasks
- Terraform Enterprise / TFE provider
- Checkov
- AzureRM Terraform provider
- Python / Flask

## Sources Consulted
- HCP Terraform run tasks documentation: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings/run-tasks
- HCP Terraform run tasks integration API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/run-tasks/run-tasks-integration
- HCP Terraform run tasks API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/run-tasks/run-tasks
- TFE provider `tfe_workspace_run_task` resource documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/workspace_run_task
- TFE provider `tfe_organization_run_task` resource documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/organization_run_task
- Checkov README and command examples: https://github.com/bridgecrewio/checkov
- Checkov Python custom policy documentation: https://www.checkov.io/3.Custom%20Policies/Python%20Custom%20Policies.html
- Checkov custom policy sharing documentation: https://www.checkov.io/3.Custom%20Policies/Sharing%20Custom%20Policies.html
- Checkov CLI command reference: https://www.checkov.io/2.Basics/CLI%20Command%20Reference.html
- AzureRM `azurerm_storage_account` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- AzureRM `azurerm_mssql_server_extended_auditing_policy` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_server_extended_auditing_policy

## Issues Found
- The Flask run task service declared an HMAC key but did not verify the `X-TFC-Task-Signature` header. Added SHA-512 HMAC verification using the raw request body before processing the payload.
- The Terraform Cloud callback request omitted the bearer token from the originating run task payload. Added the required `Authorization: Bearer <access_token>` header to the callback `PATCH`.
- The `tfe_workspace_run_task` example used the deprecated singular `stage` argument. Updated it to `stages = ["post_plan"]`.
- The TFE provider version constraint was old for a current tutorial. Updated it from `~> 0.50` to `~> 0.77` to align with current provider documentation.
- The Checkov command in the service limited scanning to three hard-coded Azure checks while describing Azure security scanning more broadly. Removed the narrow `--check` filter so Checkov evaluates the Terraform plan normally.
- The custom storage policy said it checked customer-managed keys, but the implementation checked `infrastructure_encryption_enabled`. Renamed the custom check and description to match what the code actually validates.
- The custom Checkov policy directory was missing the `__init__.py` loader file shown in Checkov's custom policy documentation. Added a small `custom_checks/__init__.py` example.
- The Azure storage remediation example used deprecated `enable_https_traffic_only`. Updated it to the current `https_traffic_only_enabled` argument.

## Review Notes
The local environment did not have `terraform` or `checkov` installed, so CLI behavior was verified against official documentation rather than local `--help` output. The Flask service remains a compact tutorial example; a production implementation should also add stronger error handling, remove temporary files after scans, and consider asynchronous processing for long Checkov runs.
