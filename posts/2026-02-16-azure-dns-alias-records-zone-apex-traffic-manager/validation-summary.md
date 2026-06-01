# Validation Summary: How to Set Up Azure DNS Alias Records for Zone Apex with Traffic Manager

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure DNS
- Azure DNS alias records
- Azure Traffic Manager
- DNS CNAME, A, MX, and TXT records
- Azure CLI

## Sources Consulted
- Azure DNS alias records overview: https://learn.microsoft.com/en-us/azure/dns/dns-alias
- Azure DNS Traffic Manager apex alias tutorial: https://learn.microsoft.com/en-us/azure/dns/tutorial-alias-tm
- Azure DNS FAQ: https://learn.microsoft.com/en-us/azure/dns/dns-faq
- Azure DNS zones and records overview: https://learn.microsoft.com/en-us/azure/dns/dns-zones-records
- Azure CLI reference for `az network dns record-set a`: https://learn.microsoft.com/en-us/cli/azure/network/dns/record-set/a
- Azure CLI reference for `az network traffic-manager profile`: https://learn.microsoft.com/en-us/cli/azure/network/traffic-manager/profile
- Azure CLI reference for `az network traffic-manager endpoint`: https://learn.microsoft.com/en-us/cli/azure/network/traffic-manager/endpoint
- Azure Traffic Manager endpoint monitoring: https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-monitoring
- RFC 1034: https://www.rfc-editor.org/rfc/rfc1034

## Issues Found
- The original Traffic Manager endpoint examples used `azureEndpoints` with Web App resource IDs. Azure DNS A/AAAA alias records that target Traffic Manager require the Traffic Manager profile to use external endpoints with static IPv4 or IPv6 addresses, so the examples now use `externalEndpoints`, `--target` with static public IP values, and `--endpoint-location` for performance routing.
- The post omitted the `Microsoft.Network` resource provider registration requirement for alias records. Added the official `az provider register --namespace Microsoft.Network` step and noted the cross-subscription case.
- The CNAME-flattening comparison overstated health-check behavior and query-charge benefits. Updated the table and explanation to describe Traffic Manager health handling and the lack of an extra alias-record charge without claiming alias queries are exempt from all DNS or Traffic Manager billing.
- The supported target resource list referred to generic public IPs and Azure Front Door profiles. Updated it to Standard SKU public IP addresses and Azure Front Door endpoints to match Azure DNS alias record documentation.
- The troubleshooting section said a deleted alias target returns NXDOMAIN and that all-unhealthy Traffic Manager endpoints resolve to the last known good IP. Updated this to reflect Azure's documented empty-record-set behavior for deleted targets and Traffic Manager's best-effort response when all eligible endpoints are degraded.

## Review Notes
The Azure CLI was not installed in the local workspace, so command validation was performed against Microsoft Learn Azure CLI reference pages rather than local `az --help` output.
