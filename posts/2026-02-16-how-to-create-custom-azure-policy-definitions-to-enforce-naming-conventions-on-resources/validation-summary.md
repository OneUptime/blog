# Validation Summary: How to Create Custom Azure Policy Definitions to Enforce Naming Conventions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Policy
- Azure Resource Manager resource naming rules
- Azure PowerShell Az.Resources
- Azure PowerShell Az.PolicyInsights
- Policy definitions, assignments, exemptions, and initiatives

## Sources Consulted
- Microsoft Learn: Azure Policy definition structure policy rule - https://learn.microsoft.com/en-us/azure/governance/policy/concepts/definition-structure-policy-rule
- Microsoft Learn: Azure Policy definition structure basics - https://learn.microsoft.com/en-us/azure/governance/policy/concepts/definition-structure-basics
- Microsoft Learn: Azure Policy overview - https://learn.microsoft.com/en-us/azure/governance/policy/overview
- Microsoft Learn: Get Azure Policy compliance data - https://learn.microsoft.com/en-us/azure/governance/policy/how-to/get-compliance-data
- Microsoft Learn: Azure resource naming rules and restrictions - https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules
- Microsoft Learn: New-AzPolicyDefinition - https://learn.microsoft.com/en-us/powershell/module/az.resources/new-azpolicydefinition
- Microsoft Learn: New-AzPolicyAssignment - https://learn.microsoft.com/en-us/powershell/module/az.resources/new-azpolicyassignment
- Microsoft Learn: New-AzPolicyExemption - https://learn.microsoft.com/en-us/powershell/module/az.resources/new-azpolicyexemption
- Microsoft Learn: New-AzPolicySetDefinition - https://learn.microsoft.com/en-us/powershell/module/az.resources/new-azpolicysetdefinition
- Microsoft Learn: Get-AzPolicyState - https://learn.microsoft.com/en-us/powershell/module/az.policyinsights/get-azpolicystate
- Microsoft Learn: Azure built-in roles - https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles

## Issues Found
- Corrected the explanation and examples for Azure Policy `match`. The post incorrectly described `?` as any single character and `*` as a wildcard for `match`; Microsoft documents `#` for digits, `?` for letters, and `.` for any single character. Updated the policy patterns and descriptions accordingly.
- Replaced invalid `like` patterns that used multiple wildcards. Azure Policy `like` should not use more than one `*`, so the VM environment example now combines `like` for the prefix with `contains` checks for environment segments.
- Corrected the prerequisite role from "Policy Contributor" to the built-in "Resource Policy Contributor" role.
- Corrected Audit-mode wording. Audit marks resources in compliance results; it does not remediate names.
- Updated compliance scan wording to reflect the documented 24-hour standard reevaluation cycle and the fact that large scopes have no fixed completion time.
- Changed legacy-resource guidance from "rename" to "migrate, recreate, or exempt" because resource renaming is generally not the remediation path for Azure resource names.
- Corrected resource naming constraints for resource groups and virtual machines to better match Microsoft Learn's current naming rules.

## Review Notes
The policy examples are intentionally simple and enforce representative naming patterns. Azure Policy does not provide full regular expression support, so complex organization-wide naming rules may need multiple policy conditions, fixed-width `match` patterns, or separate policies per resource type.
