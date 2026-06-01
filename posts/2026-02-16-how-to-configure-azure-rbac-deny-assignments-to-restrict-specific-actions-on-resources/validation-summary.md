# Validation Summary: How to Configure Azure RBAC Deny Assignments to Restrict Specific Actions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure RBAC
- Azure deny assignments
- Azure Deployment Stacks
- Azure Blueprints
- Azure Managed Applications
- Azure Policy
- Azure CLI
- Azure REST API

## Sources Consulted
- Microsoft Learn: List Azure deny assignments: https://learn.microsoft.com/en-us/azure/role-based-access-control/deny-assignments
- Microsoft Learn: Understand resource locking in Azure Blueprints: https://learn.microsoft.com/en-us/azure/governance/blueprints/concepts/resource-locking
- Microsoft Learn: Azure Deployment Stacks in Bicep: https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/deployment-stacks
- Microsoft Learn: Azure Policy deny effect: https://learn.microsoft.com/en-ie/azure/governance/policy/concepts/effect-deny
- Microsoft Learn: Azure Policy denyAction effect: https://learn.microsoft.com/en-us/azure/governance/policy/concepts/effect-deny-action
- Microsoft Learn: Azure CLI az blueprint reference: https://learn.microsoft.com/en-us/cli/azure/blueprint
- Microsoft Learn: Azure CLI az blueprint assignment reference: https://learn.microsoft.com/en-us/cli/azure/blueprint/assignment
- Microsoft Learn: Azure CLI az blueprint resource-group reference: https://learn.microsoft.com/en-us/cli/azure/blueprint/resource-group
- Microsoft Learn: Azure CLI az policy definition reference: https://learn.microsoft.com/en-us/cli/azure/policy/definition
- Microsoft Learn: Azure subscription and service limits: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/azure-subscription-service-limits

## Issues Found
- The post listed Azure Lighthouse as a feature that creates deny assignments. Replaced that with Azure Deployment Stacks, which Microsoft documents as the current way to configure deny settings that create Azure-managed deny assignments.
- The post recommended Azure Blueprints without a current deprecation caveat. Added the July 11, 2026 deprecation note and directed new designs toward deployment stacks.
- The Blueprint assignment command used `--lock-mode "DoNotDelete"`, which is not the documented Azure CLI parameter/value. Updated it to `--locks-mode "AllResourcesDoNotDelete"`.
- The Azure Policy `deny` example claimed to prevent VM deletion. Corrected it to explain that `deny` blocks matching create/update requests, and that delete-specific blocking requires `denyAction`.
- The Azure Policy JSON examples were full policy-definition-shaped snippets while the CLI command used `--rules @policy-rule.json`, which expects the policy rule object. Updated the snippets to policy rule objects and kept `--mode` in the CLI command.
- The `denyAction` discussion implied broader operation support. Clarified that the only currently supported action name is `delete`.
- The deny assignment principal example used `type: "Everyone"` and `objectId` fields. Updated it to use the documented All Principals zero GUID with `type: "SystemDefined"` and `id` fields.
- The limitations section stated a 500 deny assignments per tenant limit. Updated it to the documented 2,000 system-managed deny assignments per Azure subscription.

## Review Notes
The Azure CLI is not installed in the local workspace, so command validation was performed against official Microsoft Learn CLI references rather than local `az --help` output.
