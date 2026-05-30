# Validation Summary: How to Use Azure Automation Update Management to Patch Windows and Linux VMs

## Status
not-technically-relevant

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Automation Update Management
- Azure Update Manager
- Azure Monitor Agent
- Log Analytics workspace
- Azure CLI
- Azure Policy
- KQL / Log Analytics
- Azure Automation PowerShell runbooks
- Azure VMs and Azure Arc-enabled servers

## Sources Consulted
- Microsoft Learn: Azure Automation What's New - retirement notice for Automation Update Management and Change Tracking using Log Analytics: https://learn.microsoft.com/en-us/azure/automation/whats-new
- Microsoft Learn: Migrate to Azure Monitor Agent from Log Analytics agent - notes that Automation Update Management must migrate to Azure Update Manager: https://learn.microsoft.com/en-us/azure/azure-monitor/agents/azure-monitor-agent-migration
- Microsoft Learn: Azure Monitor Agent overview - Log Analytics agent retirement and supported-service context: https://learn.microsoft.com/en-us/azure/azure-monitor/agents/agents-overview
- Microsoft Learn: Azure Update Manager overview - current service for update compliance and scheduled patching: https://learn.microsoft.com/en-us/azure/update-manager/overview
- Microsoft Learn: Prerequisites for Azure Update Manager - current extension and Arc requirements: https://learn.microsoft.com/en-us/azure/update-manager/prerequisites
- Microsoft Learn: Manage multiple machines with Azure Update Manager - current portal workflow for assessing and deploying updates: https://learn.microsoft.com/en-us/azure/update-center/manage-multiple-machines
- Microsoft Learn: Azure Update Manager pre and post events - current Event Grid-based pre/post event model: https://learn.microsoft.com/en-us/azure/update-manager/pre-post-scripts-overview
- Microsoft Learn: Azure Monitor Logs reference for UpdateRunProgress - schema used by update run logging: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/updaterunprogress

## Issues Found
- The post is built around Azure Automation Update Management as if it were a current service for new deployments. Microsoft documentation states that Azure Automation Update Management using Log Analytics was retired on August 31, 2024 and customers must migrate to Azure Update Manager. Because this post is dated February 16, 2026, the central premise is outdated.
- The setup flow incorrectly presents creating a Log Analytics workspace, linking it to an Automation account, and enabling "Update management" on the Automation account as the path for a new patching solution. Current Microsoft guidance is to use Azure Update Manager, which is decoupled from the Log Analytics agent and does not use the old Automation Update Management onboarding model.
- The agent explanation mixes legacy Automation Update Management with Azure Monitor Agent. Microsoft guidance says Automation Update Management used the Log Analytics agent and that customers using Automation Update Management must migrate to Azure Update Manager; Azure Update Manager has its own VM/Arc extension behavior and is not configured by the DCR shown in the post.
- The Azure CLI examples for `az automation software-update-configuration create` describe creating new Automation Update Management software update configurations. These examples target a retired service path and should not be published as current guidance in a 2026 tutorial.
- The pre/post script section describes classic Automation Update Management pre/post scripts. Current Azure Update Manager pre/post actions are implemented as Event Grid pre/post events on maintenance configurations, with endpoints such as Azure Automation webhooks or Azure Functions.
- The post was not edited because correcting it would require a substantial rewrite from Azure Automation Update Management to Azure Update Manager, including the portal workflow, APIs/CLI commands, scheduling model, agent model, and pre/post event model. That is beyond a targeted technical correction.

## Review Notes
This topic is still technically relevant if rewritten as an Azure Update Manager guide. A replacement article should use Azure Update Manager terminology, maintenance configurations, Azure VM/Arc support, Update Manager extension behavior, and Event Grid-based pre/post events instead of Automation account-linked Update Management.
