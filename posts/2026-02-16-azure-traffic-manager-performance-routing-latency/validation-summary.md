# Validation Summary: Set Up Azure Traffic Manager with Performance Routing for Latency-Based Routing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Traffic Manager
- Traffic Manager performance routing
- Traffic Manager endpoint monitoring
- Azure DNS alias records
- Azure CLI
- Azure Monitor metrics and diagnostic settings
- DNS and EDNS Client Subnet

## Sources Consulted
- Microsoft Learn: Traffic Manager routing methods - https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-routing-methods
- Microsoft Learn: How Azure Traffic Manager works - https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-how-it-works
- Microsoft Learn: Configure performance traffic routing method using Azure Traffic Manager - https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-configure-performance-routing-method
- Microsoft Learn: Azure Traffic Manager endpoint monitoring - https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-monitoring
- Microsoft Learn: Azure Traffic Manager FAQ - https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-faqs
- Microsoft Learn: Verify Azure Traffic Manager settings - https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-testing-settings
- Microsoft Learn: Traffic Manager endpoint types - https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-endpoint-types
- Microsoft Learn: Azure DNS alias records overview - https://learn.microsoft.com/en-us/azure/dns/dns-alias
- Microsoft Learn: Azure CLI `az network traffic-manager profile` reference - https://learn.microsoft.com/en-us/cli/azure/network/traffic-manager/profile
- Microsoft Learn: Azure CLI `az network traffic-manager endpoint` reference - https://learn.microsoft.com/en-us/cli/azure/network/traffic-manager/endpoint
- Microsoft Learn: Azure CLI `az network dns record-set a` reference - https://learn.microsoft.com/en-us/cli/azure/network/dns/record-set/a
- Microsoft Learn: Supported metrics for Microsoft.Network/trafficManagerProfiles - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-network-trafficmanagerprofiles-metrics
- Microsoft Learn: Supported logs for Microsoft.Network/trafficManagerProfiles - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-network-trafficmanagerprofiles-logs

## Issues Found
- The post described performance routing as using only the DNS resolver source IP. Microsoft documents that Traffic Manager also considers EDNS Client Subnet when the resolver includes it, so I updated the explanation and limitation wording.
- The post said Traffic Manager returns an endpoint address. Traffic Manager is DNS-based and returns the selected endpoint in the DNS response, so I changed the wording to avoid implying it always returns an address directly.
- The Azure DNS zone-apex alias example was presented without the documented restriction that A/AAAA alias records pointing to a Traffic Manager profile require a profile with only external endpoints using IPv4 or IPv6 addresses, not FQDN endpoints. I added that condition to the example comment.
- The testing section labeled `az network traffic-manager profile show` as a Traffic Manager test tool that simulates source locations. That command only shows profile data, so I corrected the comment and left the global DNS lookup testing guidance in place.
- The metrics example used the wrong metric name, `QueriesByEndpoint`. The documented REST metric name is `QpsByEndpoint`, with Total aggregation for the count of endpoint returns, so I updated the command.
- The limitations section said there is no distribution within performance routing. Microsoft documents that multiple endpoints in the same Azure region are distributed evenly, so I corrected the limitation to say custom weights require nested weighted profiles.

## Review Notes
The local workspace does not have the Azure CLI installed, so CLI validation was performed against the current official Microsoft Learn Azure CLI reference instead of local `az --help` output. The `--interval 10` monitor setting enables Traffic Manager fast probing; the values shown for timeout and tolerated failures are within the documented ranges.
