# Validation Summary: How to Configure Azure Policy Exemptions for Resources That Require Temporary

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Policy
- Azure Policy exemptions
- Azure CLI
- Azure PowerShell
- Terraform
- HashiCorp AzureRM provider

## Sources Consulted
- Microsoft Learn: Azure Policy exemption structure - https://learn.microsoft.com/en-us/azure/governance/policy/concepts/exemption-structure
- Microsoft Learn: Azure Policy compliance states - https://learn.microsoft.com/en-us/azure/governance/policy/concepts/compliance-states
- Microsoft Learn: Azure CLI `az policy exemption` reference - https://learn.microsoft.com/en-us/cli/azure/policy/exemption?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az policy state` reference - https://learn.microsoft.com/en-us/cli/azure/policy/state?view=azure-cli-latest
- Microsoft Learn: Azure PowerShell `Get-AzPolicyExemption` reference - https://learn.microsoft.com/en-us/powershell/module/az.resources/get-azpolicyexemption
- Terraform Registry: AzureRM `azurerm_resource_group_policy_exemption` resource - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group_policy_exemption

## Issues Found
- The post said waived and mitigated exemptions are excluded from compliance calculations. Azure Policy reports exempt resources with the `Exempt` compliance state, and the overall compliance percentage includes compliant, exempt, unknown, and protected resources in the numerator. Updated the wording and diagram to say exempted resources are shown as exempt and counted toward the overall compliance percentage.
- The `expires-on` explanation implied the exemption resource itself disappears or directly changes the resource state. Microsoft documents that an expired exemption is preserved but no longer honored. Clarified that the resource shows non-compliant again only if it still does not meet the policy requirements.
- The Azure CLI exemption list example was described as showing expiration status, but the query only displays expiration dates. Updated the description to match the command.
- The PowerShell examples used `Get-AzPolicyExemption -All`, which is not a current documented parameter. Updated them to use `Get-AzPolicyExemption` for current-subscription exemptions.
- The PowerShell examples accessed exemption details through `$exemption.Properties.*` and used `$exemption.Properties.Scope`. Current Az.Resources output exposes policy exemption properties directly by default, and scope is not a policy-specific property. Updated the examples to use direct properties and derive the exempted scope from the exemption resource ID.

## Review Notes
- Azure CLI and Az PowerShell were not installed in the local environment, so command validation was performed against current Microsoft Learn command references rather than local `az --help` or `Get-Help` output.
- The Terraform example matches the current AzureRM provider documentation for `azurerm_resource_group_policy_exemption`.
