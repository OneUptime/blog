# Validation Summary: How to Configure Azure Load Balancer Cross-Region for Global Load Balancing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Load Balancer
- Azure Cross-region Load Balancer / Global Load Balancer
- Azure Standard Public IP
- Azure CLI
- Azure DNS
- Azure Monitor metrics and alerts
- Azure Traffic Manager
- Azure Front Door

## Sources Consulted
- Microsoft Learn: Global Load Balancer overview - https://learn.microsoft.com/en-us/azure/load-balancer/cross-region-overview
- Microsoft Learn: Azure CLI `az network cross-region-lb` reference - https://learn.microsoft.com/en-us/cli/azure/network/cross-region-lb
- Microsoft Learn: Azure CLI `az network cross-region-lb rule` reference - https://learn.microsoft.com/en-us/cli/azure/network/cross-region-lb/rule
- Microsoft Learn: Azure CLI `az network cross-region-lb address-pool address` reference - https://learn.microsoft.com/en-us/cli/azure/network/cross-region-lb/address-pool/address
- Microsoft Learn: Azure CLI `az network lb rule` reference - https://learn.microsoft.com/en-us/cli/azure/network/lb/rule
- Microsoft Learn: Azure CLI `az network lb probe` reference - https://learn.microsoft.com/en-us/cli/azure/network/lb/probe
- Microsoft Learn: Create a public IP address using the Azure CLI - https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/create-public-ip-cli
- Microsoft Learn: Azure Load Balancer health probes - https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-custom-probe-overview
- Microsoft Learn: Supported metrics for Microsoft.Network/loadBalancers - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-network-loadbalancers-metrics
- Microsoft Learn: What is Azure Traffic Manager? - https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-overview
- Microsoft Learn: How Azure Traffic Manager works - https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-how-it-works
- Microsoft Learn: Azure Traffic Manager endpoint monitoring - https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-monitoring

## Issues Found
- The global load balancer resource group used `eastus`, but current Azure documentation lists `eastus2`, not `eastus`, as a supported home region for Global tier public IPs and global load balancers. Changed the global resource group location to `eastus2`.
- The post said the anycast IP is advertised from all Azure regions simultaneously. Microsoft documents this as participating Azure regions / most Azure regions, not all regions. Updated the wording to "participating Azure regions."
- The health monitoring explanation said "if enough VMs are unhealthy" the regional frontend becomes unavailable. The global load balancer removes a regional load balancer when its availability drops to 0, so the wording was changed to all backends for the regional rule being unhealthy.
- The failover timing statement was too generic. Updated it to mention the global load balancer's automatic 5-second regional availability checks and the role of regional health probe configuration.
- The Azure Monitor alert used `DipAvailability`, which is the regional load balancer health probe metric. For cross-region backend health, Microsoft documents `GlobalBackendAvailability`. Updated the alert condition accordingly.

## Review Notes
The Azure CLI command groups and flags used in the post are current according to the Azure CLI reference. The Azure CLI was not installed in the local environment, so command validation was performed against Microsoft Learn CLI documentation rather than local `az --help` output.
