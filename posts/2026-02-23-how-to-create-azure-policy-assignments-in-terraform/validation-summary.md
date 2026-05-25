# Validation Summary: How to Create Azure Policy Assignments in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Policy definitions, assignments, initiatives, and exemptions
- Azure managed identities and RBAC for policy remediation
- Azure CLI

## Sources Consulted
- Terraform Registry: AzureRM `azurerm_subscription_policy_assignment` resource - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subscription_policy_assignment
- Terraform Registry: AzureRM `azurerm_resource_group_policy_assignment` resource - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group_policy_assignment
- Terraform Registry: AzureRM `azurerm_policy_definition` resource and data source - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/policy_definition and https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/policy_definition
- Terraform Registry: AzureRM `azurerm_policy_set_definition` resource - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/policy_set_definition
- Terraform Registry: AzureRM policy exemption resources - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group_policy_exemption
- Microsoft Learn: Azure Policy assignment structure - https://learn.microsoft.com/en-us/azure/governance/policy/concepts/assignment-structure
- Microsoft Learn: Remediate non-compliant resources with Azure Policy - https://learn.microsoft.com/en-us/azure/governance/policy/how-to/remediate-resources
- Microsoft Learn: Azure Policy built-in definitions for tags, Key Vault, and Azure Monitor - https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/tag-policies, https://learn.microsoft.com/en-us/azure/key-vault/policy-reference, and https://learn.microsoft.com/en-us/azure/azure-monitor/fundamentals/policy-reference
- Microsoft Learn: Azure CLI `az policy definition` command reference - https://learn.microsoft.com/en-us/cli/azure/policy/definition
- Azure/azure-policy official built-in definition repository - https://github.com/Azure/azure-policy

## Issues Found
- The "Require a tag on resource groups" assignment was described as auditing missing tags, but the referenced built-in policy has a fixed `deny` effect. Updated the code comment and assignment description to say it denies non-compliant resource groups.
- The prerequisites understated permissions for examples that create resources and role assignments. Updated the wording to note that Owner covers the full example, while Policy Contributor also needs resource and role assignment permissions where applicable.
- The initiative example used an incorrect built-in policy definition ID for "Secure transfer to storage accounts should be enabled". Corrected the GUID to `/providers/Microsoft.Authorization/policyDefinitions/404c3081-a854-4457-ae30-26a93ef643f9`.
- The Key Vault diagnostic settings policy assignment omitted the required `logAnalytics` parameter. Added a Log Analytics workspace data source and passed its ID in the assignment parameters.
- The `enforce = false` example described the assignment as "audit only", but Azure Policy enforcement mode disables effect enforcement rather than changing the policy effect to `Audit`. Updated the wording and display name to "Not Enforced".
- The exemptions text referred to `azurerm_resource_policy_exemption` while the snippet used a resource-group scoped exemption. Updated the text to name `azurerm_resource_group_policy_exemption`.

## Review Notes
- Terraform was not installed in the local environment, so I could not run `terraform validate`. The HCL was reviewed against the current AzureRM provider documentation and Azure Policy built-in definitions.
- The post pins AzureRM provider `~> 3.80`. That is acceptable for the examples as written, but future updates could consider AzureRM 4.x and its provider configuration changes.
