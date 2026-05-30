# Validation Summary: How to Set Up Azure DNS Private Zones for Azure Files SMB Access

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Files
- Azure Storage accounts
- Azure Private Endpoint
- Azure DNS Private Zones
- Azure DNS Private Resolver
- Azure CLI
- SMB mounts on Windows and Linux

## Sources Consulted
- Microsoft Learn: Networking considerations for Azure Files - https://learn.microsoft.com/en-us/azure/storage/files/storage-files-networking-overview
- Microsoft Learn: Configure network endpoints for accessing Azure file shares - https://learn.microsoft.com/en-us/azure/storage/files/storage-files-networking-endpoints
- Microsoft Learn: Configure DNS forwarding for Azure Files using VMs or Azure DNS Private Resolver - https://learn.microsoft.com/en-us/azure/storage/files/storage-files-networking-dns
- Microsoft Learn: Azure Private Endpoint private DNS zone values - https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- Microsoft Learn: Azure Private Endpoint DNS integration scenarios - https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns-integration
- Microsoft Learn: Azure CLI `az network private-endpoint create` - https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint
- Microsoft Learn: Azure CLI `az network private-endpoint dns-zone-group` - https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint/dns-zone-group
- Microsoft Learn: Azure CLI `az network private-dns record-set a` - https://learn.microsoft.com/en-us/cli/azure/network/private-dns/record-set/a
- Microsoft Learn: Azure CLI `az storage account update` - https://learn.microsoft.com/en-us/cli/azure/storage/account
- Microsoft Learn: Mount SMB Azure file shares on Linux clients - https://learn.microsoft.com/en-us/azure/storage/files/storage-how-to-use-files-linux
- Microsoft Learn: SMB file shares in Azure Files - https://learn.microsoft.com/en-us/azure/storage/files/files-smb-protocol

## Issues Found
- The post said automatic DNS integration would create both the private DNS zone and A record, then showed `az network private-endpoint dns-zone-group create`. That command creates a DNS zone group association for an existing private DNS zone and lets Azure manage the private endpoint records. Updated the wording and command comment to match the CLI behavior.
- The storage account firewall command was described as disabling public network access. The command sets `networkRuleSet.defaultAction` to `Deny` and leaves `--bypass AzureServices`, so it denies public endpoint access by default while still allowing trusted Azure services. Updated the wording to avoid confusing this with the separate public network access setting.
- The on-premises DNS forwarding guidance told readers to forward only `privatelink.file.core.windows.net`. Microsoft guidance for Azure Files and Private Endpoint DNS forwarding recommends forwarding the public storage endpoint suffix, such as `core.windows.net` or `file.core.windows.net`, to the Azure resolver path. Updated the guidance accordingly.
- A `Test-NetConnection` troubleshooting snippet was marked as `bash` even though it is a PowerShell command. Updated the code fence language to `powershell`.

## Review Notes
The remaining Azure CLI commands and SMB examples align with current Microsoft documentation. The Linux mount example uses SMB 3.0, which is supported, although Microsoft currently recommends SMB 3.1.1 when the Linux kernel and distribution support it.
