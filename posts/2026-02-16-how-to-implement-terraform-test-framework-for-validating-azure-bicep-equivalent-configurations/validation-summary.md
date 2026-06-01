# Validation Summary: How to Use Terraform Test Framework for Validating Azure Bicep-Equivalent

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform test framework
- Terraform HCL
- AzureRM Terraform provider
- Azure Bicep and ARM what-if
- Azure CLI
- GitHub Actions

## Sources Consulted
- Terraform test language documentation: https://developer.hashicorp.com/terraform/language/tests
- Terraform test files documentation: https://developer.hashicorp.com/terraform/language/files/tests
- Terraform test command reference: https://developer.hashicorp.com/terraform/cli/commands/test
- AzureRM `azurerm_linux_web_app` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_web_app
- AzureRM `azurerm_storage_account` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- AzureRM service principal OIDC authentication guide: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/service_principal_oidc
- Azure CLI `az deployment group what-if` documentation: https://learn.microsoft.com/en-us/cli/azure/deployment/group
- HashiCorp `setup-terraform` action documentation: https://github.com/hashicorp/setup-terraform

## Issues Found
- The cross-reference `.tftest.hcl` example used a root-level `locals` block. Terraform test files support root-level `test`, `run`, `variables`, and `provider` blocks, but not arbitrary `locals`. Removed the unsupported block and compared against literal extracted Bicep what-if values in the assertions.
- The Azure CLI what-if command omitted the required `--resource-group` argument for `az deployment group what-if`. Added `--resource-group rg-webapp-prod` to the example command.
- The GitHub Actions workflow only ran on `pull_request`, while the integration test step was guarded by a `push` to `main`, making that step unreachable. Added a `push` trigger for `main`.
- The GitHub Actions OIDC example set `ARM_USE_OIDC` but did not grant `id-token: write`. Added workflow permissions for `contents: read` and `id-token: write`.
- The best-practices section stated that plan-mode tests do not require Azure credentials. Plan mode does not deploy resources, but the AzureRM provider can still require valid provider configuration and credentials unless mocks are used. Updated the wording.
- The best-practices section recommended defining Bicep-expected values in test-file locals, which is not valid Terraform test syntax. Reworded it to recommend shared fixtures or variable files instead.

## Review Notes
Terraform CLI was not installed in the local workspace, so command behavior was checked against official Terraform CLI documentation rather than local `terraform test -help`. The post remains a valid technical tutorial after the fixes.
