# Validation Summary: How to Configure Custom Azure Policy Definitions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Policy
- DeployIfNotExists effect
- ARM templates
- Azure CLI
- Azure Monitor diagnostic settings
- Azure RBAC
- Azure Virtual Machines
- Azure Virtual Network subnets and Network Security Groups

## Sources Consulted
- Microsoft Learn: Azure Policy definitions deployIfNotExists effect - https://learn.microsoft.com/en-us/azure/governance/policy/concepts/effect-deploy-if-not-exists
- Microsoft Learn: Azure Policy definition structure policy rules - https://learn.microsoft.com/en-us/azure/governance/policy/concepts/definition-structure-policy-rule
- Microsoft Learn: Azure Policy definition structure basics - https://learn.microsoft.com/en-us/azure/governance/policy/concepts/definition-structure-basics
- Microsoft Learn: az policy definition - https://learn.microsoft.com/en-us/cli/azure/policy/definition
- Microsoft Learn: az policy assignment - https://learn.microsoft.com/en-us/cli/azure/policy/assignment
- Microsoft Learn: az policy remediation - https://learn.microsoft.com/en-us/cli/azure/policy/remediation
- Microsoft Learn: az policy remediation deployment - https://learn.microsoft.com/en-us/cli/azure/policy/remediation/deployment
- Microsoft Learn: Microsoft.Insights/diagnosticSettings ARM template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.insights/diagnosticsettings
- Microsoft Learn: Azure built-in roles - https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles
- Microsoft Learn: Azure Storage encryption for data at rest - https://learn.microsoft.com/en-us/azure/storage/common/storage-service-encryption
- Azure/azure-policy official repository notes on policy evaluation and known resource behaviors - https://github.com/Azure/azure-policy

## Issues Found
- The introduction used storage account encryption at rest as a DeployIfNotExists example. Azure Storage encryption at rest is enabled by default, so the example was changed to storage account diagnostic settings.
- The post said DINE evaluation for new resources triggers within about 15 minutes. Microsoft documents a configurable `evaluationDelay` with a default of `PT10M`, so the text and testing comment now say 10 minutes by default.
- The VM diagnostic settings example said it sends logs, but the shown ARM template only configures the `AllMetrics` category. The wording now says platform metrics.
- The subnet example used `DeployIfNotExists` with the same resource type in `if.field.type` and `then.details.type` but omitted `details.name`. Microsoft requires `name` in that case, so `"[field('fullName')]"` was added.
- The subnet example derived `vnetName` from `field('id')`, which produced a full resource ID prefix rather than the VNet name required by the ARM resource `name`. It now derives `vnetName` and `subnetName` from `field('fullName')`.
- The CLI section implied a whole policy definition JSON file could be passed to `--rules`. Azure CLI expects the policy rule and parameter definitions separately, so the surrounding text was clarified.

## Review Notes
The subnet remediation example is technically valid for simple subnets that use a single `addressPrefix`, but production subnet updates should preserve other existing subnet properties such as route tables, delegations, service endpoints, private endpoint policies, and `addressPrefixes` when present.
