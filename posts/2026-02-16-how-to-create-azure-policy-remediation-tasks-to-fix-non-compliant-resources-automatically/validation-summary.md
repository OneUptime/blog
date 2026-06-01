# Validation Summary: How to Create Azure Policy Remediation Tasks to Fix Non-Compliant Resources Auto

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Policy
- Azure Policy remediation tasks
- Azure CLI
- Azure PowerShell
- Azure managed identities
- Azure RBAC
- Azure Event Grid

## Sources Consulted
- Microsoft Learn: Remediate non-compliant resources with Azure Policy - https://learn.microsoft.com/azure/governance/policy/how-to/remediate-resources
- Microsoft Learn: Azure Policy remediation task structure - https://learn.microsoft.com/azure/governance/policy/concepts/remediation-structure
- Microsoft Learn: Azure Policy definitions deployIfNotExists effect - https://learn.microsoft.com/azure/governance/policy/concepts/effect-deploy-if-not-exists
- Microsoft Learn: Azure Policy definitions modify effect - https://learn.microsoft.com/azure/governance/policy/concepts/effect-modify
- Microsoft Learn: Azure CLI az policy remediation - https://learn.microsoft.com/cli/azure/policy/remediation
- Microsoft Learn: Azure CLI az policy assignment identity - https://learn.microsoft.com/cli/azure/policy/assignment/identity
- Microsoft Learn: Azure PowerShell Start-AzPolicyRemediation - https://learn.microsoft.com/powershell/module/az.policyinsights/start-azpolicyremediation
- Microsoft Learn: Azure PowerShell Get-AzPolicyState - https://learn.microsoft.com/powershell/module/az.policyinsights/get-azpolicystate
- Microsoft Learn: Reacting to Azure Policy state change events - https://learn.microsoft.com/azure/governance/policy/concepts/event-overview

## Issues Found
- The post said `DeployIfNotExists` handles new resources "within about 15 minutes." Microsoft documentation states the delay is controlled by `evaluationDelay`, which defaults to `PT10M` (10 minutes), and deployment duration depends on the template. Updated the wording to describe the configurable delay accurately.
- The prerequisites implied that a managed identity is automatically created whenever these effects are used. The assignment must be configured with a managed identity, and that identity needs sufficient RBAC permissions. Updated the prerequisite and added the role-assignment permission caveat.
- The subscription-level `az policy remediation create` example passed empty `--resource-group` and `--definition-reference-id` values. Azure CLI documentation shows these should be omitted unless needed. Removed the empty flags and added a note that `--definition-reference-id` is required for initiative assignments.
- The remediation list query labeled `deploymentStatus.totalDeployments` as succeeded. Updated the query to use `deploymentStatus.successfulDeployments` and `deploymentStatus.failedDeployments`.
- The resource lock explanation treated delete locks and read-only locks the same. Updated the wording to clarify that read-only locks block writes, while delete locks matter when remediation needs to delete or replace a protected child resource.
- The scheduled PowerShell example claimed it got only `DeployIfNotExists` or `Modify` assignments but did not filter for those effects. Updated the state query to filter for non-compliant resources with remediable policy definition actions.

## Review Notes
Azure CLI was not installed in the local environment, so command verification used official Microsoft Learn CLI reference pages instead of local `az --help` output.
