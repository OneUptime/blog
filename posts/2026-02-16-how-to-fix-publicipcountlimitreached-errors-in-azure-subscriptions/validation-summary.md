# Validation Summary: How to Fix 'PublicIPCountLimitReached' Errors in Azure Subscriptions

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Public IP addresses
- Azure networking quotas and subscription limits
- Azure CLI
- Azure NAT Gateway
- Azure Load Balancer
- Azure Bastion
- Azure Policy
- Azure Monitor concepts

## Sources Consulted
- Microsoft Learn: Azure subscription and service limits, quotas, and constraints - https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/azure-subscription-service-limits
- Microsoft Learn: Public IP addresses in Azure - https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses
- Microsoft Learn: Troubleshoot PublicIPCountLimitReached error code - https://learn.microsoft.com/en-us/troubleshoot/azure/azure-kubernetes/error-codes/publicipcountlimitreached-error
- Microsoft Learn: Azure CLI `az network list-usages` - https://learn.microsoft.com/en-us/cli/azure/network
- Microsoft Learn: Azure CLI `az network public-ip` - https://learn.microsoft.com/en-us/cli/azure/network/public-ip
- Microsoft Learn: Azure CLI `az network nat gateway` - https://learn.microsoft.com/en-us/cli/azure/network/nat/gateway
- Microsoft Learn: Azure CLI `az quota` - https://learn.microsoft.com/en-us/cli/azure/quota
- Microsoft Learn: Azure Bastion overview and configuration requirements - https://learn.microsoft.com/en-us/azure/bastion/bastion-overview
- Microsoft Learn: Supported metrics for Microsoft.Network/publicIPAddresses - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-network-publicipaddresses-metrics
- Microsoft Learn: Built-in policy definitions for Azure networking services - https://learn.microsoft.com/en-us/azure/networking/policy-reference

## Issues Found
- The post stated that typical public IP defaults are 200 per region for Standard static IPs and 200 for Basic dynamic IPs. Microsoft documentation says public IP address defaults vary by subscription offer type, with examples including 10 for many offers, 20 for pay-as-you-go, and 1000 for Enterprise Agreement. Updated the limits section accordingly.
- The post treated Basic dynamic public IPs as a current default. Basic SKU public IPs were retired on September 30, 2025. Updated the text to recommend Standard SKU for new designs.
- The `az network list-usages` JMESPath filters used `PublicIPAddresses`, which can miss current resource names such as `StandardSkuPublicIpAddresses` because of casing. Updated filters to match localized "Public IP" names or `PublicIpAddresses` resource names.
- The bulk deletion loop split TSV output on all whitespace, so it would not reliably preserve name/resource group pairs. Replaced it with a tab-delimited `while read` loop.
- The Azure CLI quota example used `PublicIPAddresses` as both `--resource-name` and `--resource-type`, and included an unsupported `limit-object-type` value. Updated it to the documented `StandardSkuPublicIpAddresses` resource name, `PublicIpAddresses` resource type, and `--limit-object value=500`.
- The Azure Monitor metric alert example used a non-existent `PublicIPAddressUsage` platform metric and an unsupported `--action-group` flag for `az monitor metrics alert create`. Replaced it with a scheduled `az network list-usages` check, since quota usage is not exposed as a public IP platform metric.
- The Private Endpoints section implied that accessing Azure PaaS public endpoints directly consumes outbound public IP resources. Reworded it to focus on reducing public internet exposure, which is the technically accurate benefit.

## Review Notes
Azure CLI was not installed in the local environment, so CLI syntax was validated against Microsoft Learn CLI reference pages rather than local `az --help` output.
