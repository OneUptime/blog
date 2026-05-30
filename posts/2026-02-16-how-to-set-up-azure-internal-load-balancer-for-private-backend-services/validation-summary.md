# Validation Summary: How to Set Up Azure Internal Load Balancer for Private Backend Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Load Balancer
- Azure Internal Load Balancer
- Azure CLI
- Azure Virtual Network and VNet peering
- Network Security Groups
- Azure Monitor metrics and alerts
- Azure NAT Gateway and outbound connectivity

## Sources Consulted
- Azure CLI documentation for `az network lb create`: https://learn.microsoft.com/en-us/cli/azure/network/lb
- Azure CLI documentation for `az network lb probe create`: https://learn.microsoft.com/en-us/cli/azure/network/lb/probe
- Azure CLI documentation for `az network lb rule create`: https://learn.microsoft.com/en-us/cli/azure/network/lb/rule
- Azure CLI documentation for `az network nic ip-config address-pool add`: https://learn.microsoft.com/en-us/cli/azure/network/nic/ip-config/address-pool
- Azure CLI documentation for `az monitor metrics alert create`: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Azure Load Balancer health probes: https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-custom-probe-overview
- Azure Load Balancer diagnostics and metrics: https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-standard-diagnostics
- Azure Monitor supported metrics for Microsoft.Network/loadBalancers: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-network-loadbalancers-metrics
- Azure Load Balancer best practices: https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-best-practices
- Azure Basic Load Balancer lifecycle page: https://learn.microsoft.com/en-us/lifecycle/products/azure-basic-load-balancer
- Troubleshoot no outbound connectivity from Standard internal load balancers: https://learn.microsoft.com/en-us/troubleshoot/azure/load-balancer/troubleshoot-common-problems/no-outbound-connectivity-standard-internal-load-balancers

## Issues Found
- The post said Azure Load Balancer still has Standard and Basic SKU options. Basic Load Balancer was retired on September 30, 2025, so I changed the text to recommend Standard for new deployments.
- The monitoring command used `az network lb show` and only returned rule/probe IDs, not backend health status. I replaced it with an Azure Monitor metrics query for `DipAvailability`, the REST/API metric name for Health Probe Status.
- The metrics list described SNAT Connection Count as generally relevant for backend VM outbound connections. For an internal load balancer, outbound SNAT requires a public load balancer frontend or another explicit outbound method, so I clarified the scope.
- The alert example used the display metric name `HealthProbeStatus` and the unsupported `--action-group` flag. I changed the condition to use `DipAvailability` and changed the flag to `--action`, matching Azure CLI documentation.
- The Standard Load Balancer troubleshooting note only mentioned allowing traffic to the ILB port. I clarified that NSGs must allow client traffic to the backend port and that health probe traffic should allow the `AzureLoadBalancer` service tag.

## Review Notes
The Azure CLI command structure for creating the internal load balancer, health probes, load-balancing rules, HA Ports rule, session persistence, and NIC backend pool association matches current Azure CLI documentation. The health probe examples use `--threshold`, which remains a documented alias for `--number-of-probes`; Microsoft has announced future retirement of the underlying `numberOfProbes` property in favor of `probeThreshold`, but the replacement CLI option is currently documented as preview and not recommended for production workloads.
