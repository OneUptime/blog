# Validation Summary: How to Deploy Extensions to Azure Arc-Enabled Servers at Scale

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Arc-enabled servers
- Azure VM extensions
- Azure Monitor Agent
- Azure Policy
- Azure CLI
- Azure Resource Manager templates
- Azure PowerShell
- Azure Resource Graph

## Sources Consulted
- Microsoft Learn: Virtual machine extension management with Azure Arc-enabled servers - https://learn.microsoft.com/en-us/azure/azure-arc/servers/manage-vm-extensions
- Microsoft Learn: Enable Arc VM extensions by using the Azure CLI - https://learn.microsoft.com/en-us/azure/azure-arc/servers/manage-vm-extensions-cli
- Microsoft Learn: Azure CLI reference for az connectedmachine extension - https://learn.microsoft.com/en-us/cli/azure/connectedmachine/extension
- Microsoft Learn: Azure CLI reference for az connectedmachine extension image - https://learn.microsoft.com/en-us/cli/azure/connectedmachine/extension/image
- Microsoft Learn: Azure Policy built-in definitions for Azure Arc-enabled servers - https://learn.microsoft.com/en-us/azure/azure-arc/servers/policy-reference
- Microsoft Learn: Use Azure Policy to install and manage the Azure Monitor Agent - https://learn.microsoft.com/en-us/azure/azure-monitor/agents/azure-monitor-agent-policy
- Azure Policy GitHub repository: AzureMonitor_Agent_Linux_HybridVM_DINE.json - https://raw.githubusercontent.com/Azure/azure-policy/master/built-in-policies/policyDefinitions/Monitoring/AzureMonitor_Agent_Linux_HybridVM_DINE.json
- Azure Policy GitHub repository: AzureMonitor_Agent_Windows_HybridVM_DINE.json - https://raw.githubusercontent.com/Azure/azure-policy/master/built-in-policies/policyDefinitions/Monitoring/AzureMonitor_Agent_Windows_HybridVM_DINE.json
- Microsoft Learn: Microsoft.HybridCompute/machines/extensions ARM template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.hybridcompute/2024-07-10/machines/extensions
- Microsoft Learn: New-AzConnectedMachineExtension - https://learn.microsoft.com/en-us/powershell/module/az.connectedmachine/new-azconnectedmachineextension
- Microsoft Learn: Troubleshoot Azure Arc-enabled servers VM extension issues - https://learn.microsoft.com/en-us/azure/azure-arc/servers/troubleshoot-vm-extensions
- Microsoft Learn: Migrate to Azure Monitor Agent from Log Analytics agent - https://learn.microsoft.com/en-us/azure/azure-monitor/agents/azure-monitor-agent-migration

## Issues Found
- The Log Analytics Agent (MMA) was described as a common current extension without noting its retirement. Updated the description to identify MMA as a retired legacy agent and recommend AMA for new deployments.
- The CLI section said it listed all available extensions, but `az connectedmachine extension list` lists installed extensions on a machine, and `az connectedmachine extension image list` requires location, publisher, and extension type. Updated the surrounding text and command example.
- The Windows Azure Monitor Agent built-in policy ID was incorrect. Replaced it with the current built-in policy definition ID from the Azure Policy repository.
- The custom Azure Policy example used JSON comments and omitted the `deployment.properties.parameters` bindings required by `deployIfNotExists`. Removed comments and added `vmName` and `location` bindings from policy fields.
- The ARM template example used comments inside JSON and an unused `workspaceId` parameter. Removed comments and the unused parameter.
- The ARM template examples used an older API version. Updated the `Microsoft.HybridCompute/machines/extensions` resources to the current `2024-07-10` API version.
- The PowerShell example installed the Linux AMA extension on every Arc server in the resource group. Updated it to filter for Linux Arc servers before deployment.

## Review Notes
- The Azure CLI was not installed in the local workspace, so CLI validation was performed against Microsoft Learn CLI reference pages rather than local `az --help` output.
- Azure Monitor Agent installation alone does not configure data collection; production deployments usually also need Data Collection Rules and Data Collection Rule Associations.
- Policy remediation and self-healing depend on Azure Policy evaluation timing; Microsoft documentation notes the standard compliance evaluation cycle is once every 24 hours.
