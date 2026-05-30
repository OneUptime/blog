# Validation Summary: How to Troubleshoot Azure Arc-Enabled Server Connectivity

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Arc-enabled servers
- Azure Connected Machine agent
- azcmagent CLI
- Azure CLI
- Microsoft Entra ID service principals
- Azure Resource Graph
- Windows PowerShell
- Linux systemd

## Sources Consulted
- Microsoft Learn: Connected Machine Agent Network Requirements - https://learn.microsoft.com/en-us/azure/azure-arc/servers/network-requirements
- Microsoft Learn: azcmagent CLI reference - https://learn.microsoft.com/en-us/azure/azure-arc/servers/azcmagent
- Microsoft Learn: azcmagent connect reference - https://learn.microsoft.com/en-us/azure/azure-arc/servers/azcmagent-connect
- Microsoft Learn: azcmagent disconnect reference - https://learn.microsoft.com/en-us/azure/azure-arc/servers/azcmagent-disconnect
- Microsoft Learn: azcmagent config reference - https://learn.microsoft.com/en-us/azure/azure-arc/servers/azcmagent-config
- Microsoft Learn: Manage Azure Connected Machine agent proxy settings - https://learn.microsoft.com/en-us/azure/azure-arc/servers/manage-agent-proxy-settings
- Microsoft Learn: Overview of Azure Connected Machine agent - https://learn.microsoft.com/en-us/azure/azure-arc/servers/agent-overview
- Microsoft Learn: Identity and authorization for Azure Arc-enabled servers - https://learn.microsoft.com/en-us/azure/azure-arc/servers/security-identity-authorization
- Microsoft Learn: Troubleshoot Azure Arc-enabled servers in disconnected scenarios - https://learn.microsoft.com/en-us/azure/azure-arc/servers/troubleshoot-connectivity
- Microsoft Learn: Azure Resource Graph sample queries for Azure Arc-enabled servers - https://learn.microsoft.com/en-us/azure/azure-arc/servers/resource-graph-samples
- Microsoft Learn: az connectedmachine Azure CLI reference - https://learn.microsoft.com/en-us/cli/azure/connectedmachine

## Issues Found
- The registration flow incorrectly said the agent establishes a persistent connection through Guest Configuration. I changed this to ongoing communication with Azure Arc services, including HIMDS, Guest Configuration, and extension management, because Microsoft documents these as separate agent components.
- The required endpoint list was outdated. I updated it to include the current public cloud installation and identity endpoints, removed `login.windows.net` and `*.blob.core.windows.net` from the core required list, and clarified the current notification service endpoints.
- The proxy example showed embedding `username:password` in `proxy.url`. I removed it because Microsoft documents that the Connected Machine agent does not support proxy authentication.
- The proxy issue list only mentioned NTLM authentication. I broadened it to proxy authentication generally, matching Microsoft guidance.
- The service principal section said the Azure Connected Machine Onboarding role was required and that Contributor was not enough. I changed this to Azure Connected Machine Onboarding or Contributor, while preserving the least-privilege recommendation for the onboarding role.
- The `azcmagent disconnect` service principal example omitted `--tenant-id`. I added it because the official `azcmagent disconnect` authentication options require tenant ID with service principal authentication.

## Review Notes
The remaining commands and claims checked out against current Microsoft documentation, including Linux and Windows agent service names, `azcmagent show/check/config/list/connect/disconnect`, heartbeat timing, log locations, Azure Resource Graph status properties, and `az connectedmachine delete --yes`.
