# Validation Summary: How to Implement Enterprise-Scale Architecture in Azure with Management Groups

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Management Groups
- Azure Policy
- Azure CLI
- Azure RBAC
- Azure landing zones
- Microsoft Cost Management budgets
- Microsoft Defender for Cloud
- Azure Monitor

## Sources Consulted
- Azure CLI `az account management-group` reference: https://learn.microsoft.com/en-us/cli/azure/account/management-group?view=azure-cli-latest
- Azure CLI `az account management-group subscription` reference: https://learn.microsoft.com/en-us/cli/azure/account/management-group/subscription?view=azure-cli-latest
- Azure CLI `az policy assignment` reference: https://learn.microsoft.com/en-us/cli/azure/policy/assignment?view=azure-cli-latest
- Azure CLI `az policy state` reference: https://learn.microsoft.com/en-us/cli/azure/policy/state?view=azure-cli-latest
- Azure CLI `az role assignment` reference: https://learn.microsoft.com/en-us/cli/azure/role/assignment?view=azure-cli-latest
- Azure Management Groups overview and limits: https://learn.microsoft.com/en-us/azure/governance/management-groups/overview
- Azure Management Groups move permissions: https://learn.microsoft.com/en-us/azure/governance/management-groups/manage
- Azure landing zone management group guidance: https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/landing-zone/design-area/resource-org-management-groups
- Azure Policy overview: https://learn.microsoft.com/en-us/azure/governance/policy/overview
- Azure Policy CLI assignment quickstart: https://learn.microsoft.com/en-us/azure/governance/policy/assign-policy-azurecli
- Azure Policy tutorial for Not allowed resource types: https://learn.microsoft.com/en-us/azure/governance/policy/tutorials/disallowed-resources
- Azure Monitor built-in policy definitions: https://learn.microsoft.com/en-us/azure/azure-monitor/fundamentals/policy-reference
- Microsoft Cost Management scopes: https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/understand-work-scopes
- Microsoft Defender for Cloud overview: https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-cloud-introduction
- Azure DDoS Protection pricing and tiers: https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-pricing-guide

## Issues Found
- The post stated that policies, RBAC roles, and budgets all automatically inherit from management groups. Updated this to distinguish policy/RBAC inheritance from Cost Management budgets, which can be scoped to a management group for aggregate cost tracking.
- The identity platform bullet used the older "Azure AD Connect" product name. Updated it to "Microsoft Entra Connect Sync."
- The diagnostic settings policy assignment used the built-in "Audit diagnostic setting for selected resource types" policy but described it as requiring diagnostics for all resources and omitted the required `listOfResourceTypes` parameter. Updated the description and added example parameters.
- The public IP policy assignment used the built-in "Not allowed resource types" policy without the required `listOfResourceTypesNotAllowed` parameter. Added `Microsoft.Network/publicIPAddresses` as the example resource type.
- The custom VNet peering policy assignment used `--policy-definition`, which is not a valid `az policy assignment create` option. Changed it to `--policy`.
- The policy strategy referenced "Azure Defender," an older product name. Updated it to "Microsoft Defender for Cloud plans."
- The policy strategy referenced vulnerability assessment agents, which is too implementation-specific for current Defender for Cloud vulnerability assessment coverage. Updated it to "vulnerability assessment coverage."
- The policy strategy referenced "DDoS Protection Standard," which is now represented by current Azure DDoS Protection tiers such as Network Protection. Updated it to "Azure DDoS Network Protection."
- The sandbox strategy said to auto-delete resources older than 30 days as though it were a direct policy effect. Updated it to configure automation for that behavior.
- The subscription move explanation said the subscription "loses the old" policies. Clarified that it no longer inherits policies from the old parent management group; direct assignments can still apply.
- The subscription move permissions bullet was incomplete. Updated it to mention required permissions on the subscription, current parent management group, and target parent management group.

## Review Notes
Azure CLI is not installed in the local environment, so command syntax was verified against current Microsoft Learn CLI reference pages rather than local `az --help` output.
