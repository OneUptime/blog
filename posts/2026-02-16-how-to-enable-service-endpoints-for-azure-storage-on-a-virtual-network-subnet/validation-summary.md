# Validation Summary: How to Enable Service Endpoints for Azure Storage on a Virtual Network Subnet

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Virtual Network
- Azure service endpoints
- Azure Storage firewall and virtual network rules
- Azure Private Endpoints
- Azure CLI
- Network security groups and service tags

## Sources Consulted
- Azure virtual network service endpoints: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-service-endpoints-overview
- Azure Storage firewall rules: https://learn.microsoft.com/en-us/azure/storage/common/storage-network-security
- Azure Storage trusted Azure services: https://learn.microsoft.com/en-gb/azure/storage/common/storage-network-security-trusted-azure-services
- Manage Azure Storage network security exceptions: https://learn.microsoft.com/en-us/azure/storage/common/storage-network-security-manage-exceptions
- Azure CLI `az network vnet subnet`: https://learn.microsoft.com/en-us/cli/azure/network/vnet/subnet
- Azure CLI `az storage account`: https://learn.microsoft.com/en-us/cli/azure/storage/account
- Azure CLI `az storage account network-rule`: https://learn.microsoft.com/en-us/cli/azure/storage/account/network-rule
- Create an Azure storage account: https://learn.microsoft.com/en-us/azure/storage/common/storage-account-create
- Use private endpoints for Azure Storage: https://learn.microsoft.com/en-us/azure/storage/common/storage-private-endpoints

## Issues Found
- The storage account creation example used a fixed account name. Azure Storage account names must be unique across Azure and use only lowercase letters and numbers, so the sample could fail if the name is already taken. I added a comment telling readers to replace it with a globally unique name.

## Review Notes
The Azure CLI commands and service endpoint behavior described in the post match current Microsoft documentation. One caveat for future improvement is that `Microsoft.Storage` service endpoints are region-scoped for normal storage endpoints, while `Microsoft.Storage.Global` exists for cross-region storage access; the tutorial's same-region example is correct as written.
