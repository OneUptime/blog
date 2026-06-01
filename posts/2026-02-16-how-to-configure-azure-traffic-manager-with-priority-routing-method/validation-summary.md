# Validation Summary: How to Configure Azure Traffic Manager with Priority Routing Method

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Traffic Manager
- Azure CLI
- DNS routing and CNAME records
- Traffic Manager priority routing
- Traffic Manager endpoint monitoring and failover
- Azure Monitor metric alerts

## Sources Consulted
- Azure Traffic Manager routing methods: https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-routing-methods
- How Azure Traffic Manager works: https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-how-it-works
- Traffic Manager endpoint monitoring: https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-monitoring
- Azure CLI reference for `az network traffic-manager profile`: https://learn.microsoft.com/en-us/cli/azure/network/traffic-manager/profile
- Azure CLI reference for `az network traffic-manager endpoint`: https://learn.microsoft.com/en-us/cli/azure/network/traffic-manager/endpoint
- Azure Monitor supported metrics for Traffic Manager profiles: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-network-trafficmanagerprofiles-metrics

## Issues Found
- The health check update command used invalid Azure CLI option names such as `--monitor-protocol`, `--monitor-port`, `--monitor-path`, `--monitor-interval`, `--monitor-timeout`, and `--monitor-failures`. Updated them to the documented `az network traffic-manager profile update` options: `--protocol`, `--port`, `--path`, `--interval`, `--timeout`, and `--max-failures`.
- The DNS examples said Traffic Manager returns endpoint IP addresses directly. Azure Traffic Manager selects an endpoint in DNS and commonly returns the selected endpoint as a CNAME before normal DNS resolution produces an address record. Updated the wording to refer to the selected endpoint in the DNS response.
- The endpoint list command claimed to list all endpoints but filtered to `azureEndpoints`. Removed the type filter so it matches the surrounding text and also includes external or nested endpoints if present.
- The failover timeline included a fixed 5-second "DNS propagation" step. Traffic Manager failover timing is driven primarily by health probing and DNS TTL/cache behavior, not a fixed propagation interval. Removed that step and adjusted the stated worst-case timing from about 65 seconds to about 60 seconds for the shown settings.
- The explanation said the endpoint is marked unhealthy after exactly three consecutive failures. Microsoft documentation describes this as a tolerated failures setting, so the wording was changed to avoid over-specifying an exact transition point.

## Review Notes
The Azure CLI was not installed in the local workspace, so command validation was performed against the current official Azure CLI reference instead of local `az --help` output. The post remains a valid Traffic Manager priority routing tutorial after the corrections.
