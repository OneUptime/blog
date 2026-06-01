# Validation Summary: How to Implement Compliance as Code for Azure Using Terraform Sentinel Policies

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Terraform
- HCP Terraform / Terraform Cloud
- Terraform Enterprise
- HashiCorp Sentinel
- Sentinel `tfplan/v2` and `tfrun` imports
- AzureRM Terraform provider
- Azure Storage Accounts
- Azure Network Security Groups and Network Security Rules
- Azure Public IPs
- Azure Virtual Machines
- Azure App Service Plans
- TFE Terraform provider

## Sources Consulted
- HashiCorp Sentinel enforcement levels: https://developer.hashicorp.com/sentinel/docs/concepts/enforcement-levels
- HCP Terraform Sentinel VCS policy sets: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/manage-policy-sets/sentinel-vcs
- Sentinel CLI configuration file syntax and policy parameters: https://developer.hashicorp.com/sentinel/docs/configuration
- Sentinel `test` command reference: https://developer.hashicorp.com/sentinel/docs/commands/test
- Sentinel language specification, operators, loops, and `append`: https://developer.hashicorp.com/sentinel/docs/language/spec, https://developer.hashicorp.com/sentinel/docs/language/loops, https://developer.hashicorp.com/sentinel/docs/functions/append
- Terraform `tfplan/v2` Sentinel import: https://developer.hashicorp.com/sentinel/docs/features/terraform/tfplan-v2
- HCP Terraform `tfrun` Sentinel import: https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement/import-reference/tfrun
- AzureRM `azurerm_storage_account` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- AzureRM `azurerm_network_security_rule` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_security_rule
- AzureRM `azurerm_service_plan` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/service_plan
- TFE `tfe_policy_set` resource: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/policy_set
- HCP Terraform policy checks API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/policy-checks

## Issues Found
- The storage account policy used the old AzureRM argument name `enable_https_traffic_only`. Changed it to the current `https_traffic_only_enabled` name in both the policy and mock data.
- The first policy claimed to enforce encryption at rest for storage accounts and databases, but the code only enforced storage account HTTPS, TLS, and public-access controls. Updated the heading, description, and comments to match the actual policy behavior, and removed unused SQL/PostgreSQL resource filters.
- The networking section claimed to require NSGs on subnets and block public IPs on VMs, but the code enforced NSG inbound rule restrictions and public IP justification tags. Updated the description to match the implemented checks.
- The networking policy only checked inline `security_rule` blocks on `azurerm_network_security_group`, missing standalone `azurerm_network_security_rule` resources. Added standalone rule filtering and checks for SSH/RDP from broad internet sources.
- The NSG checks only matched `source_address_prefix = "*"`, missing other broad internet values and plural source/port fields. Expanded the checks to include `Internet`, `0.0.0.0/0`, `::/0`, `source_address_prefixes`, and `destination_port_ranges`.
- Sentinel code blocks were labeled as `python`. Changed them to `sentinel` so the examples are not misidentified as Python.
- The SKU policy comment said it used workspace name or tags, but the code only used workspace name. Updated the comment.
- The Sentinel test command used `-run azure-encryption`; the documented form is `-run=regexp`. Updated the example to `sentinel test -run=azure-encryption`.

## Review Notes
- HCP Terraform documentation now uses the HCP Terraform name, though Terraform Cloud terminology remains commonly recognized and appears in existing product documentation and provider names.
- HCP Terraform documentation notes that Sentinel policy checks support Sentinel runtime versions up to 0.40.x and recommends policy evaluations to avoid disruptions when newer Sentinel runtimes are required.
