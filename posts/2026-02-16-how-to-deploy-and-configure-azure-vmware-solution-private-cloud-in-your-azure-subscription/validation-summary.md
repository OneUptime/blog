# Validation Summary: How to Deploy and Configure Azure VMware Solution Private Cloud

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Azure VMware Solution
- Azure CLI and the `vmware` extension
- VMware vSphere, ESXi, vCenter Server, vSAN, NSX-T / NSX Manager, and HCX
- Azure ExpressRoute and virtual network gateway connections
- AVS workload networking, DHCP, DNS zones, and DNS services

## Sources Consulted
- Microsoft Learn: Azure CLI `az vmware private-cloud` reference: https://learn.microsoft.com/en-us/cli/azure/vmware/private-cloud?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az vmware authorization` reference: https://learn.microsoft.com/en-us/cli/azure/vmware/authorization?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az vmware workload-network dhcp server` reference: https://learn.microsoft.com/en-us/cli/azure/vmware/workload-network/dhcp/server?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az vmware workload-network segment` reference: https://learn.microsoft.com/en-us/cli/azure/vmware/workload-network/segment?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az vmware workload-network dns-zone` reference: https://learn.microsoft.com/en-us/cli/azure/vmware/workload-network/dns-zone?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az vmware workload-network dns-service` reference: https://learn.microsoft.com/en-us/cli/azure/vmware/workload-network/dns-service?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network vpn-connection` reference: https://learn.microsoft.com/en-us/cli/azure/network/vpn-connection?view=azure-cli-latest
- Microsoft Learn: Azure VMware Solution private cloud architecture: https://learn.microsoft.com/en-us/azure/azure-vmware/architecture-private-clouds
- Microsoft Learn: Azure VMware Solution FAQ: https://learn.microsoft.com/en-us/azure/azure-vmware/faq
- Microsoft Learn: Azure VMware Solution REST API, Private Clouds - Get: https://learn.microsoft.com/en-us/rest/api/avs/private-clouds/get?view=rest-avs-2025-09-01
- Microsoft Azure pricing page for Azure VMware Solution: https://azure.microsoft.com/en-us/pricing/details/azure-vmware/

## Issues Found
- The AV36 storage description said the host has 15.2 TB NVMe storage. Microsoft documents AV36 as 3.2 TB raw NVMe cache tier plus 15.2 TB raw SSD capacity tier, so the SKU description was corrected.
- The ExpressRoute circuit query used `circuit.expressRouteId`. The AVS API property is `expressRouteID`, so the query was corrected to `circuit.expressRouteID`.
- The DHCP server example used `--dhcp-id`, which is not a valid current Azure CLI option. It was changed to `--dhcp`.
- The workload segment example used `--segment-id` and `--subnet`, which are not valid current Azure CLI options for `az vmware workload-network segment create`. They were changed to `--segment`, `--dhcp-ranges`, and `--gateway-address`.
- The DNS service example used `--dns-service-id`, which is not a valid current Azure CLI option. It was changed to `--dns-service`.
- The DNS forwarding example passed a domain directly as `--fqdn-zones` without creating a DNS zone. A `dns-zone create` command was added and the DNS service example now references that zone.
- The cost section included hardcoded hourly and monthly prices plus a specific discount percentage. AVS pricing varies by region, host SKU, licensing model, agreement, and reservation term, so this was replaced with guidance to use the official Azure pricing page or calculator.

## Review Notes
Azure CLI was not installed in the local environment, so command validation was performed against current official Microsoft Learn CLI and REST API documentation rather than local `az --help` output.
