# Validation Summary: How to Configure Azure Private Link

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Private Link
- Azure Private Endpoint
- Azure Private Link Service
- Azure Storage
- Azure Virtual Network and subnets
- Azure Private DNS
- Azure CLI
- Terraform AzureRM provider

## Sources Consulted
- Microsoft Learn: Use private endpoints for Azure Storage: https://learn.microsoft.com/en-us/azure/storage/common/storage-private-endpoints
- Microsoft Learn: Azure Private Endpoint private DNS zone values: https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- Microsoft Learn: Manage network policies for private endpoints: https://learn.microsoft.com/en-us/azure/private-link/disable-private-endpoint-network-policy
- Microsoft Learn: Disable network policies for Azure Private Link service source IP: https://learn.microsoft.com/en-us/azure/private-link/disable-private-link-service-network-policy
- Microsoft Learn: Quickstart - Create an Azure Private Link service using Azure CLI: https://learn.microsoft.com/en-us/azure/private-link/create-private-link-service-cli
- Microsoft Learn: az network private-endpoint CLI reference: https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint
- Microsoft Learn: az network private-endpoint dns-zone-group CLI reference: https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint/dns-zone-group
- Microsoft Learn: az network vnet subnet CLI reference: https://learn.microsoft.com/en-us/cli/azure/network/vnet/subnet
- Microsoft Learn: az storage account CLI reference: https://learn.microsoft.com/en-us/cli/azure/storage/account
- Microsoft Learn: az storage account private-endpoint-connection CLI reference: https://learn.microsoft.com/en-us/cli/azure/storage/account/private-endpoint-connection
- Microsoft Learn: Quickstart - Create a private endpoint by using Terraform: https://learn.microsoft.com/en-us/azure/private-link/create-private-endpoint-terraform
- Terraform Registry: azurerm_subnet and azurerm_private_endpoint resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs

## Issues Found
- The opening Mermaid diagram showed one private endpoint connecting to both Azure SQL and Azure Storage. A private endpoint maps to a specific private link resource/subresource, and Azure Storage documentation notes that separate private endpoints are needed for separate storage resources. Updated the diagram to show separate private endpoints for SQL and Storage.
- The subnet policy wording said disabling private endpoint network policies was required. Current Azure documentation describes private endpoint network policies as configurable for NSG and route-table support. Updated the CLI and Terraform comments to say policies should be kept disabled unless NSG or route-table support is needed.
- The troubleshooting text implied network policies should always be disabled to avoid blocked traffic. Updated it to clarify that if private endpoint network policies are enabled, the associated NSG or route-table rules should be checked; otherwise policies can remain disabled.
- The DNS-zone-group command comment said it created DNS records directly. Updated the comment to say it creates a DNS zone group for the private endpoint, which is the Azure CLI resource being configured.

## Review Notes
Azure CLI and Terraform binaries were not installed in the local environment, so command validation was performed against Microsoft Learn CLI references and Terraform/Microsoft documentation rather than local `az --help` or `terraform validate`.
