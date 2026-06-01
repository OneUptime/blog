# Validation Summary: How to Onboard On-Premises Servers to Azure Arc for Centralized Management

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Arc-enabled servers
- Azure Connected Machine agent
- Microsoft Entra ID managed identities
- Azure CLI
- PowerShell
- Linux shell scripting
- Azure Monitor Agent
- Azure Arc Private Link Scope

## Sources Consulted
- Microsoft Learn: Connected Machine agent prerequisites - https://learn.microsoft.com/en-us/azure/azure-arc/servers/prerequisites
- Microsoft Learn: Connected Machine agent network requirements - https://learn.microsoft.com/en-us/azure/azure-arc/servers/network-requirements
- Microsoft Learn: `azcmagent connect` CLI reference - https://learn.microsoft.com/en-us/azure/azure-arc/servers/azcmagent-connect
- Microsoft Learn: `azcmagent` CLI reference - https://learn.microsoft.com/en-us/azure/azure-arc/servers/azcmagent
- Microsoft Learn: Connect hybrid machines to Azure at scale - https://learn.microsoft.com/en-us/azure/azure-arc/servers/onboard-service-principal
- Microsoft Learn: Azure Arc-enabled servers overview - https://learn.microsoft.com/en-us/azure/azure-arc/servers/overview
- Microsoft Learn: Use Azure Private Link to securely connect servers to Azure Arc - https://learn.microsoft.com/en-us/azure/azure-arc/servers/private-link-security
- Microsoft Learn: Azure Monitor Agent overview - https://learn.microsoft.com/en-us/azure/azure-monitor/agents/agents-overview

## Issues Found
- The post referred to Azure AD. Updated this to Microsoft Entra ID, which is the current product name used in Microsoft documentation.
- The required endpoint list was incomplete and included `gbl.his.arc.azure.com` separately. Updated the list to include current required installation, Microsoft Entra ID, metadata, guest configuration, and notification service endpoints from the Azure Arc network requirements.
- The supported operating system examples were outdated. Removed Ubuntu 16.04 and CentOS entries, added currently documented examples such as Ubuntu 24.04, RHEL 9/10, Amazon Linux 2023, and clarified SLES support.
- The Azure portal navigation used older "Servers" wording. Updated it to the current Azure Arc "Machines" and "Add/Create" flow while keeping the single-server onboarding instructions.
- The Linux at-scale script depended on `jq` without listing it as a prerequisite. Replaced the JSON parsing with `azcmagent show status` so the check uses the agent CLI directly.
- The post recommended the Log Analytics agent as an extension example. Replaced it with Azure Monitor Agent because the Log Analytics agent is retired for Azure Monitor scenarios.
- The Private Link section implied all Azure Arc traffic could route through the Azure Arc Private Link Scope. Clarified that Microsoft Entra ID and Azure Resource Manager still use the normal internet route unless separate private connectivity is configured.

## Review Notes
The remaining commands and flags reviewed are consistent with current Microsoft Learn references, including `az ad sp create-for-rbac`, `azcmagent connect` service principal flags, `--tags`, `azcmagent check`, proxy configuration, and `azcmagent show`. The article intentionally keeps endpoint and OS details summarized; readers should still check the Microsoft support matrix before production deployment because Azure Arc support changes over time.
