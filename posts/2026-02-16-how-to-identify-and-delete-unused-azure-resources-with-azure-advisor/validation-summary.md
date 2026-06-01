# Validation Summary: How to Identify and Delete Unused Azure Resources with Azure Advisor

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Advisor
- Azure CLI
- Azure Managed Disks and snapshots
- Azure Public IP addresses
- Azure Load Balancer
- Azure NAT Gateway
- Azure Application Gateway
- Azure Virtual Machines
- Azure App Service Plans
- Azure Policy
- Azure Automation
- Azure SDK for Python

## Sources Consulted
- Microsoft Learn: Azure Advisor cost recommendations reference: https://learn.microsoft.com/en-us/azure/advisor/advisor-reference-cost-recommendations
- Microsoft Learn: az advisor recommendation: https://learn.microsoft.com/en-us/cli/azure/advisor/recommendation
- Microsoft Learn: az disk: https://learn.microsoft.com/en-us/cli/azure/disk
- Microsoft Learn: az snapshot: https://learn.microsoft.com/en-us/cli/azure/snapshot
- Microsoft Learn: az network public-ip: https://learn.microsoft.com/en-us/cli/azure/network/public-ip
- Microsoft Learn: az network lb: https://learn.microsoft.com/en-us/cli/azure/network/lb
- Microsoft Learn: Azure Load Balancer backend pool management: https://learn.microsoft.com/en-us/azure/load-balancer/backend-pool-management
- Microsoft Learn: az network nat gateway: https://learn.microsoft.com/en-us/cli/azure/network/nat/gateway
- Microsoft Learn: az network application-gateway: https://learn.microsoft.com/en-us/cli/azure/network/application-gateway
- Microsoft Learn: Application Gateway backend pools: https://learn.microsoft.com/en-us/azure/application-gateway/application-gateway-components#backend-pools
- Microsoft Learn: az vm: https://learn.microsoft.com/en-us/cli/azure/vm
- Microsoft Learn: VM power states and billing states: https://learn.microsoft.com/en-us/azure/virtual-machines/states-billing
- Microsoft Learn: az appservice plan: https://learn.microsoft.com/en-us/cli/azure/appservice/plan
- Microsoft Learn: az resource tag: https://learn.microsoft.com/en-us/cli/azure/resource
- Microsoft Learn: Azure Policy definition structure: https://learn.microsoft.com/en-us/azure/governance/policy/concepts/definition-structure-basics
- Microsoft Learn: Azure SDK for Python management libraries: https://learn.microsoft.com/en-us/azure/developer/python/sdk/azure-sdk-overview
- Azure pricing pages for Public IP addresses, NAT Gateway, Application Gateway, and App Service: https://azure.microsoft.com/en-us/pricing/

## Issues Found
- The Advisor recommendation list said Azure Advisor typically identifies unassociated public IP addresses and unattached managed disks. Microsoft documents many Advisor cost recommendations, but those examples are not listed as typical Advisor cost recommendations. Updated the list to use currently documented examples such as underutilized VMs, VM scale sets, empty App Service Plans, idle data services, and ExpressRoute circuits with provider status Not Provisioned.
- The Load Balancer query only checked the first backend pool and only the `backendIPConfigurations` field. Updated it to detect load balancers with no backend members across all pools, including both NIC-based members and IP-based `loadBalancerBackendAddresses`.
- The Application Gateway query only printed backend pool names and did not actually filter for gateways with no backend members. Updated it to filter for gateways with no backend pool members, checking both `backendAddresses` and `backendIPConfigurations`.

## Review Notes
- The Azure CLI was not installed in the local environment, so CLI validation was performed against Microsoft Learn command references rather than local `az --help` output.
- Several dollar amounts in the post are approximate and region-dependent. They are directionally consistent with Azure pricing at review time, but future reviewers should re-check prices because cloud pricing can change.
