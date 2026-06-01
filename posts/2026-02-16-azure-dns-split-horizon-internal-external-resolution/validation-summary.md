# Validation Summary: How to Configure Azure DNS Split-Horizon for Internal and External Resolution

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure DNS public zones
- Azure Private DNS zones
- Azure DNS Private Resolver
- Azure Private Link / Private Endpoints
- Azure CLI
- DNS record management and split-horizon name resolution

## Sources Consulted
- Microsoft Learn: Azure Private DNS zone overview - https://learn.microsoft.com/en-us/azure/dns/private-dns-privatednszone
- Microsoft Learn: What is a virtual network link? - https://learn.microsoft.com/en-us/azure/dns/private-dns-virtual-network-links
- Microsoft Learn: Quickstart: Create an Azure private DNS zone using Azure CLI - https://learn.microsoft.com/en-us/azure/dns/private-dns-getstarted-cli
- Microsoft Learn: Manage DNS records in Azure DNS using Azure CLI - https://learn.microsoft.com/en-us/azure/dns/dns-operations-recordsets-cli
- Microsoft Learn: az dns-resolver CLI reference - https://learn.microsoft.com/en-us/cli/azure/dns-resolver?view=azure-cli-latest
- Microsoft Learn: az dns-resolver inbound-endpoint CLI reference - https://learn.microsoft.com/en-us/cli/azure/dns-resolver/inbound-endpoint?view=azure-cli-latest
- Microsoft Learn: az network private-dns record-set cname CLI reference - https://learn.microsoft.com/en-us/cli/azure/network/private-dns/record-set/cname?view=azure-cli-lts
- Microsoft Learn: Azure Private Endpoint private DNS zone values - https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- Microsoft Learn: Fallback to internet for Azure Private DNS zones - https://learn.microsoft.com/en-us/azure/dns/private-dns-fallback

## Issues Found
- The Azure DNS Private Resolver create command used `--resolver-name`, which is not a documented parameter for `az dns-resolver create`. Changed it to `--name resolver-main`, which is the documented alias for the resolver name.
- The inbound endpoint command used `--resolver-name`, which is not a documented parameter for `az dns-resolver inbound-endpoint create`. Changed it to `--dns-resolver-name resolver-main`.
- The inbound endpoint `--ip-configurations` example used a REST-style nested `subnet` object. Changed it to the Azure CLI documented shorthand format with `private-ip-allocation-method` and subnet `id`.

## Review Notes
- The post is technically relevant and contains implementation commands, so it was reviewed as a code/technical tutorial.
- Azure CLI is not installed in the local environment, so command validation was performed against current Microsoft Learn Azure CLI reference documentation rather than local `az --help` output.
- The explanation of private DNS fallback is broadly consistent with Azure's documented resolution order for linked private DNS zones, but Private Link zones have additional NXDOMAIN fallback behavior that may require `NxDomainRedirect` in some designs.
