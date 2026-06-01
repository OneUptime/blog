# Validation Summary: Fix 'RequestDisallowedByPolicy' Errors Caused by Azure Policy Restrictions

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Policy
- Azure CLI
- Azure Monitor Activity Log
- Azure Storage
- Terraform AzureRM provider
- ARM policy definitions and assignments

## Sources Consulted
- Microsoft Learn: Azure Policy overview - https://learn.microsoft.com/en-us/azure/governance/policy/overview
- Microsoft Learn: Azure Policy definitions effect basics - https://learn.microsoft.com/en-us/azure/governance/policy/concepts/effect-basics
- Microsoft Learn: Azure Policy definitions deny effect - https://learn.microsoft.com/en-us/azure/governance/policy/concepts/effect-deny
- Microsoft Learn: Understand scope in Azure Policy - https://learn.microsoft.com/en-us/azure/governance/policy/concepts/scope
- Microsoft Learn: Azure Policy exemption structure - https://learn.microsoft.com/en-us/azure/governance/policy/concepts/exemption-structure
- Microsoft Learn: az policy definition CLI reference - https://learn.microsoft.com/en-us/cli/azure/policy/definition?view=azure-cli-latest
- Microsoft Learn: az policy assignment CLI reference - https://learn.microsoft.com/en-us/cli/azure/policy/assignment?view=azure-cli-latest
- Microsoft Learn: az policy state CLI reference - https://learn.microsoft.com/en-us/cli/azure/policy/state?view=azure-cli-latest
- Microsoft Learn: az policy exemption CLI reference - https://learn.microsoft.com/en-us/cli/azure/policy/exemption?view=azure-cli-latest
- Microsoft Learn: az monitor activity-log CLI reference - https://learn.microsoft.com/en-us/cli/azure/monitor/activity-log?view=azure-cli-latest
- Microsoft Learn: az storage account CLI reference - https://learn.microsoft.com/en-us/cli/azure/storage/account?view=azure-cli-latest
- HashiCorp Terraform Registry: azurerm_storage_account - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- JMESPath specification - https://jmespath.org/specification.html

## Issues Found
- The Activity Log query used invalid JMESPath syntax: `properties.statusMessage contains 'RequestDisallowedByPolicy'`. Changed it to use the documented `contains(subject, search)` function with `to_string(...)`, and added `--status Failed` because the Azure CLI supports filtering Activity Log entries by status directly.
- The policy compliance example passed a full policy assignment resource ID to `--policy-assignment`, which the Azure CLI documents as an assignment name parameter. Changed the command to filter by `policyAssignmentId` and `complianceState` using the documented OData `--filter` parameter.

## Review Notes
Azure CLI was not installed in the local environment, so command verification was performed against Microsoft Learn CLI reference documentation rather than local `az --help` output. The storage account CLI examples, Terraform storage account snippet, Azure Policy effects, exemption categories, expiration behavior, assignment inheritance, and compliance state usage are consistent with current official documentation.
