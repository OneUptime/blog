# Validation Summary: How to Fix High Latency Issues Between Azure Regions Using Traffic Manager

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Azure Traffic Manager
- Azure CLI
- DNS routing and TTL
- EDNS Client Subnet (ECS)
- Traffic Manager endpoint monitoring
- Traffic Manager Real User Measurements
- Azure Front Door

## Sources Consulted
- Azure Traffic Manager routing methods: https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-routing-methods
- How Azure Traffic Manager works: https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-how-it-works
- Azure Traffic Manager endpoint monitoring: https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-monitoring
- Performance considerations for Traffic Manager: https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-performance-considerations
- Azure Traffic Manager FAQ: https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-faqs
- Azure CLI Traffic Manager profile reference: https://learn.microsoft.com/en-us/cli/azure/network/traffic-manager/profile
- Azure CLI Traffic Manager endpoint reference: https://learn.microsoft.com/en-us/cli/azure/network/traffic-manager/endpoint
- Real User Measurements overview: https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-rum-overview
- Real User Measurements with web pages: https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-create-rum-web-pages
- Traffic Manager User Metrics Keys REST API: https://learn.microsoft.com/en-us/rest/api/trafficmanager/traffic-manager-user-metrics-keys/create-or-update
- Azure Front Door overview: https://learn.microsoft.com/en-us/azure/frontdoor/front-door-overview
- RFC 7871, Client Subnet in DNS Queries: https://datatracker.ietf.org/doc/html/rfc7871

## Issues Found
- The post described Performance routing as using the client location directly. Updated the routing-method descriptions to clarify that Traffic Manager uses the DNS query source, or EDNS Client Subnet when the resolver includes it.
- The post said MultiValue routing returns all healthy endpoints and the client picks one. Updated this to reflect the documented limitation that MultiValue works with external endpoints specified as IPv4 or IPv6 addresses and returns multiple healthy endpoints.
- The DNS resolver/ECS guidance named specific public DNS services as ECS-enabled. Changed this to the more accurate general guidance that users should choose geographically close resolvers or resolvers that pass ECS, because resolver ECS behavior varies.
- The post stated the default Traffic Manager TTL is 60 seconds. Updated it to 300 seconds based on Microsoft performance documentation.
- The TTL update example used `--set dnsConfig.ttl=30`. Changed it to the documented Azure CLI `--ttl 30` option.
- The Real User Measurements example used an undocumented `--traffic-view-enrollment-status` Azure CLI option on `az network traffic-manager profile update`. Replaced it with the documented REST API flow to create or retrieve the subscription-level Real User Measurements key.

## Review Notes
Azure CLI is not installed in the local environment, so CLI syntax was verified against the official Microsoft Learn Azure CLI reference instead of local `az --help` output.
