# Validation Summary: How to Set Up Azure Bastion Shareable Link for VM Access Without Azure Portal

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Bastion
- Azure Bastion Shareable Links
- Azure CLI
- Azure REST API
- Azure Virtual Machines
- Azure Monitor diagnostic settings
- Log Analytics and KQL
- RDP and SSH

## Sources Consulted
- Microsoft Learn: Create a shareable link for Azure Bastion - https://learn.microsoft.com/en-us/azure/bastion/shareable-link
- Microsoft Learn: Azure Bastion overview - https://learn.microsoft.com/en-us/azure/bastion/bastion-overview
- Microsoft Learn: Azure CLI `az network bastion` reference - https://learn.microsoft.com/en-us/cli/azure/network/bastion
- Microsoft Learn: Put Bastion Shareable Link REST API - https://learn.microsoft.com/en-us/rest/api/virtualnetwork/put-bastion-shareable-link/put-bastion-shareable-link?view=rest-virtualnetwork-2025-05-01
- Microsoft Learn: Get Bastion Shareable Link REST API - https://learn.microsoft.com/en-us/rest/api/virtualnetwork/get-bastion-shareable-link/get-bastion-shareable-link?view=rest-virtualnetwork-2025-05-01
- Microsoft Learn: Delete Bastion Shareable Link REST API - https://learn.microsoft.com/en-us/rest/api/virtualnetwork/delete-bastion-shareable-link/delete-bastion-shareable-link?view=rest-virtualnetwork-2025-05-01
- Microsoft Learn: Azure Bastion monitoring - https://learn.microsoft.com/en-us/azure/bastion/monitor-bastion
- Microsoft Learn: Supported logs for `microsoft.network/bastionHosts` - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-network-bastionhosts-logs
- Microsoft Learn: `MicrosoftAzureBastionAuditLogs` table reference - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/microsoftazurebastionauditlogs
- Microsoft Learn: Azure Monitor diagnostic settings CLI reference - https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings

## Issues Found
- The Azure CLI examples used `--enable-shareable-link true`, but the current `az network bastion create` and `az network bastion update` option is `--shareable-link`. Updated both commands and the explanatory text.
- The REST examples used `PUT` for `createShareableLinks`, but the official Azure REST API uses `POST`. Updated the single-VM and bulk creation examples.
- The REST examples used API version `2023-04-01`. Updated the shareable-link REST examples to the current stable `2025-05-01` API version.
- The `getShareableLinks` examples claimed to list all active links with an empty request body. Official REST documentation returns links for VMs specified in the request body. Updated the examples and surrounding text to pass VM references.
- The network security section described Bastion as encrypted end-to-end with TLS. Microsoft documents the client-to-Bastion connection as RDP/SSH over TLS on port 443, while Bastion-to-VM traffic uses RDP or SSH over the private network. Updated the wording.
- Updated references from Azure AD authentication to Microsoft Entra ID authentication to match current Microsoft naming.

## Review Notes
The Azure CLI was not installed in the local review environment, so command verification was performed against Microsoft Learn CLI reference documentation rather than local `az --help` output. The diagnostic logging category, Log Analytics table name, and KQL column names match current Azure Monitor references.
