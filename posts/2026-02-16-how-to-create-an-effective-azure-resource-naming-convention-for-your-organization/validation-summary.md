# Validation Summary: How to Create an Effective Azure Resource Naming Convention

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Microsoft Azure resource naming
- Azure Resource Manager naming rules
- Azure Cloud Adoption Framework naming abbreviations
- Terraform HCL
- Azure Policy
- AzureRM Terraform provider

## Sources Consulted
- Microsoft Learn: Naming rules and restrictions for Azure resources - https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules
- Microsoft Learn: Abbreviation recommendations for Azure resources - https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-best-practices/resource-abbreviations
- Microsoft Learn: Define your naming convention - https://learn.microsoft.com/en-gb/azure/cloud-adoption-framework/ready/azure-best-practices/resource-naming-and-tagging-decision-guide
- Microsoft Learn: Azure Policy definition structure policy rule - https://learn.microsoft.com/en-us/azure/governance/policy/concepts/definition-structure-policy-rule
- HashiCorp Developer: Terraform substr function - https://developer.hashicorp.com/terraform/language/functions/substr
- Terraform Registry: azurerm_storage_account resource - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- Terraform Registry: azurerm_resource_group resource - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group

## Issues Found
- The storage account example used hyphens, which are invalid for Azure Storage account names. Changed it to a lowercase alphanumeric example.
- Several resource type prefixes did not match Microsoft's current Cloud Adoption Framework abbreviation recommendations. Updated App Service Plan from `plan` to `asp`, Service Bus Namespace from `sb` to `sbns`, external Load Balancer from `lb` to `lbe`, and Redis guidance to Azure Managed Redis with `amr`.
- The Terraform naming module used the outdated or unsupported prefixes above. Updated the generated names to match the corrected abbreviations.
- The VM naming restrictions incorrectly allowed underscores. Updated the VM rule summary to reflect Azure's host-name restrictions.
- The Key Vault and Resource Group restriction summaries omitted important official constraints. Added the Key Vault ending/consecutive-hyphen rules and the Resource Group ending-period rule.
- The Azure Policy example used `?` for the six-character workload segment even though Azure Policy `?` matches letters only. Changed the workload segment to `.` wildcards and clarified the description.

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform validate`. The HCL was reviewed against Terraform language documentation and current AzureRM provider documentation.
