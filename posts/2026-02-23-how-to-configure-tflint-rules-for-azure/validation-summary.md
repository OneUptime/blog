# Validation Summary: How to Configure TFLint Rules for Azure

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- TFLint
- TFLint AzureRM ruleset
- Azure Resource Manager
- GitHub Actions
- Azure DevOps
- Trivy

## Sources Consulted
- TFLint AzureRM ruleset README: https://github.com/terraform-linters/tflint-ruleset-azurerm
- TFLint AzureRM ruleset v0.32.0 rules list: https://github.com/terraform-linters/tflint-ruleset-azurerm/blob/v0.32.0/docs/README.md
- TFLint AzureRM `azurerm_linux_virtual_machine_invalid_size` rule: https://github.com/terraform-linters/tflint-ruleset-azurerm/blob/v0.32.0/docs/rules/azurerm_linux_virtual_machine_invalid_size.md
- TFLint AzureRM `azurerm_storage_account_invalid_account_kind` rule: https://github.com/terraform-linters/tflint-ruleset-azurerm/blob/v0.32.0/docs/rules/azurerm_storage_account_invalid_account_kind.md
- TFLint AzureRM `azurerm_key_vault_invalid_sku_name` rule: https://github.com/terraform-linters/tflint-ruleset-azurerm/blob/v0.32.0/docs/rules/azurerm_key_vault_invalid_sku_name.md
- TFLint AzureRM `azurerm_search_service_invalid_sku` rule: https://github.com/terraform-linters/tflint-ruleset-azurerm/blob/v0.32.0/docs/rules/azurerm_search_service_invalid_sku.md
- TFLint AzureRM `azurerm_redis_cache_invalid_sku_name` rule: https://github.com/terraform-linters/tflint-ruleset-azurerm/blob/v0.32.0/docs/rules/azurerm_redis_cache_invalid_sku_name.md
- TFLint AzureRM `azurerm_resource_missing_tags` rule: https://github.com/terraform-linters/tflint-ruleset-azurerm/blob/v0.32.0/docs/rules/azurerm_resource_missing_tags.md
- TFLint CLI and configuration documentation: https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/config.md
- setup-tflint action README: https://github.com/terraform-linters/setup-tflint

## Issues Found
- The post used AzureRM ruleset version `0.26.0`, while the current documented release is `0.32.0`; updated all plugin examples to `0.32.0`.
- The post claimed VM size validation checks regional availability. The documented rule validates against known VM size values, not region availability; corrected the wording.
- The post claimed the Azure plugin validates API versions and location values. The documented ruleset validates supported resource names and enum-style argument values generated from Azure REST API specifications; corrected the rule summary.
- The storage account example used `account_replication_type = "GZRS"` as a region-specific failure, but no documented AzureRM TFLint rule validates regional replication availability. Replaced it with `azurerm_storage_account_invalid_account_kind`.
- The invalid location example referenced a rule the AzureRM ruleset does not document. Replaced it with the documented `azurerm_key_vault_invalid_sku_name` case.
- The App Service plan SKU and MSSQL database SKU examples referenced rules not documented in the AzureRM ruleset. Replaced them with documented Search Service and Redis Cache SKU examples.
- The tag enforcement section omitted the AzureRM tag rule and instead only showed Terraform core rules. Added `azurerm_resource_missing_tags` with required tag configuration.
- The specific-module command used `--chdir modules/networking`; changed it to the documented `--chdir=modules/networking` form.
- The GitHub Actions example used `terraform-linters/setup-tflint@v4`; updated it to the current documented `v6` action.
- The summary claimed incorrect location names are caught by the plugin. Updated it to describe documented checks: invalid VM sizes, unsupported SKUs, invalid argument values, configured tag enforcement, and retired VM sizes.

## Review Notes
TFLint was not installed in the local workspace, so command availability was verified against official TFLint documentation rather than local `--help` output.
