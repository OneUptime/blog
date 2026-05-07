# Validation Summary: How to Configure Azure Traffic Manager with OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu
- Azure Traffic Manager
- Azure Resource Manager (`azurerm`) provider
- Azure CLI
- DNS-based traffic routing

## Sources Consulted
- OpenTofu v1.6 documentation: https://opentofu.org/docs/v1.6/
- Azure Traffic Manager routing methods: https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-routing-methods
- How Azure Traffic Manager works: https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-how-it-works
- Azure Traffic Manager endpoint monitoring: https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-monitoring
- Azure Traffic Manager geographic hierarchy: https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-geographic-regions
- Azure CLI `az network traffic-manager endpoint`: https://learn.microsoft.com/en-us/cli/azure/network/traffic-manager/endpoint?view=azure-cli-lts
- `azurerm_traffic_manager_profile` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/traffic_manager_profile
- `azurerm_traffic_manager_azure_endpoint` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/traffic_manager_azure_endpoint
- `azurerm_traffic_manager_external_endpoint` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/traffic_manager_external_endpoint

## Issues Found
- The Step 1 heading described Performance routing as the default. I changed it to `Performance Routing` because the routing method is explicitly configured and is not a default implied by the OpenTofu resource.
- The weighted-routing example used `endpoint_location` on an external endpoint inside a `Weighted` profile. I removed it because that setting is relevant for `Performance` routing with external endpoints, not weighted routing.
- The weighted-routing comments described the endpoints as exact `75%` and `25%` traffic splits. I changed those comments to weight-based wording because Traffic Manager selection is probabilistic and DNS caching can skew observed distribution.
- The Azure CLI health-check command queried `properties.endpointStatus`, which reflects enabled/disabled configuration rather than health. I changed it to `properties.endpointMonitorStatus` so the command reports actual monitor state.
- The conclusion recommended `interval_in_seconds = 10` without the required timeout constraint. I corrected it to note that `timeout_in_seconds` must be between `5` and `9` when fast probing is used.
- The conclusion referred to a `default endpoint` for geographic routing and did not mention the failover caveat. I changed it to a catch-all `WORLD` mapping and added the nested-endpoint recommendation for failover within a geographic mapping.

## Review Notes
- The code samples are resource-focused HCL snippets and assume provider configuration, variables, and referenced Azure resources already exist elsewhere in the project.
- Geographic routing with direct Azure endpoints is valid, but Microsoft strongly recommends nested endpoints when you need high availability inside each geographic mapping.
- Weighted routing in Traffic Manager is DNS-based and approximate; recursive DNS caching can affect the real-world split.
