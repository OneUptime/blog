# Validation Summary: How to Configure Azure Application Gateway Autoscaling Based on Traffic Load

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Application Gateway v2
- Azure Application Gateway WAF_v2
- Azure CLI
- Azure Monitor metrics and alerts
- Azure virtual networks and subnets

## Sources Consulted
- Microsoft Learn: Scaling Application Gateway v2 and WAF v2 - https://learn.microsoft.com/en-us/azure/application-gateway/application-gateway-autoscaling-zone-redundant
- Microsoft Learn: What is Azure Application Gateway v2? - https://learn.microsoft.com/en-us/azure/application-gateway/overview-v2
- Microsoft Learn: Understanding pricing - Azure Application Gateway - https://learn.microsoft.com/en-us/azure/application-gateway/understanding-pricing
- Microsoft Learn: Monitoring data reference for Azure Application Gateway - https://learn.microsoft.com/en-us/azure/application-gateway/monitor-application-gateway-reference
- Microsoft Learn: Azure Application Gateway infrastructure configuration - https://learn.microsoft.com/en-us/azure/application-gateway/configuration-infrastructure
- Microsoft Learn: Application Gateway high traffic volume support - https://learn.microsoft.com/en-us/azure/application-gateway/high-traffic-support
- Microsoft Learn: az network application-gateway CLI reference - https://learn.microsoft.com/en-us/cli/azure/network/application-gateway
- Microsoft Learn: New-AzApplicationGatewayAutoscaleConfiguration - https://learn.microsoft.com/en-us/powershell/module/az.network/new-azapplicationgatewayautoscaleconfiguration

## Issues Found
- Corrected capacity-unit component descriptions. Persistent connections and throughput limits are per capacity unit, not per compute unit, and the compute-unit factors are TLS connections per second, URL rewrite computations, and WAF rule processing.
- Removed `--capacity` from the autoscaling create command and its explanation. Azure autoscale configuration uses `--min-capacity` and optional `--max-capacity`; fixed instance capacity is for manual scaling.
- Updated the fixed-capacity example to remove `autoscaleConfiguration` when setting `--capacity`, because autoscale configuration must be cleared when moving back to manual fixed capacity.
- Changed the monitoring command label from "current instance count" to "current connection count" because the command queries the `CurrentConnections` metric, not an instance-count metric.
- Updated scale-out timing from 6-7 minutes to 3-5 minutes based on current Microsoft documentation.

## Review Notes
The post remains a practical Azure Application Gateway v2 autoscaling guide. Azure documentation recommends sizing minimum capacity from compute-unit usage and notes that Microsoft commonly recommends a maximum of 125 when subnet capacity allows, because billing is based on consumed or reserved capacity units rather than the configured maximum alone.
