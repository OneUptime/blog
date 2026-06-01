# Validation Summary: How to Build Azure Traffic Manager Profiles with Priority Routing in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Traffic Manager
- Azure App Service
- Azure Monitor metric alerts
- Azure CLI
- Terraform
- HashiCorp AzureRM provider

## Sources Consulted
- Microsoft Learn: How Azure Traffic Manager works - https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-how-it-works
- Microsoft Learn: Traffic Manager endpoint monitoring - https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-monitoring
- Microsoft Learn: Traffic Manager routing methods - https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-routing-methods
- Microsoft Learn: Configure priority traffic routing method in Traffic Manager - https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-configure-priority-routing-method
- Microsoft Learn: Test Traffic Manager settings - https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-testing-settings
- Microsoft Learn: Supported metrics for Microsoft.Network/trafficManagerProfiles - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-network-trafficmanagerprofiles-metrics
- Microsoft Learn: Azure CLI az webapp commands - https://learn.microsoft.com/en-us/cli/azure/webapp
- Terraform Registry: azurerm_traffic_manager_profile - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/traffic_manager_profile
- Terraform Registry: azurerm_traffic_manager_azure_endpoint - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/traffic_manager_azure_endpoint
- Terraform Registry: azurerm_traffic_manager_external_endpoint - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/traffic_manager_external_endpoint
- Terraform Registry: azurerm_traffic_manager_nested_endpoint - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/traffic_manager_nested_endpoint
- Terraform Registry: azurerm_linux_web_app - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_web_app
- Terraform Registry: azurerm_monitor_metric_alert - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert

## Issues Found
- Corrected the comparison between Traffic Manager, Application Gateway, and Azure Load Balancer. Application Gateway operates at the application layer and Azure Load Balancer operates at layer 4; grouping both as "network level" was imprecise.
- Changed the Traffic Manager monitor path from `/health` to `/` in the runnable sample. The post creates bare Linux Web Apps but does not deploy an application that serves `/health`, so the original probe path could mark the endpoints unhealthy immediately.
- Removed the fixed `Host: myapp.contoso.com` custom monitor header from the profile. The sample endpoints use their default App Service hostnames, so an unrelated Host header can cause failed App Service health probes unless that custom domain is actually configured.
- Clarified the failover timing language to account for probe timing, DNS TTL, and resolver/client caching. Traffic Manager can stop returning a degraded endpoint after probe failure detection, but clients may continue using cached DNS answers.
- Added an `EndpointName` dimension filter to the metric alert criteria. The `ProbeAgentCurrentEndpointStateByProfileResourceId` metric is dimensioned by endpoint, so this makes the alert evaluate endpoint state per endpoint instead of only describing the profile as a whole.
- Increased the failover test wait from 60 seconds to 180 seconds to align better with Azure guidance to wait for the profile TTL plus additional time for DNS and monitoring state to settle.

## Review Notes
- The Terraform snippets use AzureRM `~> 3.80`, which is older than the latest AzureRM 4.x provider but still valid for the resource types shown. A future refresh could update the provider version and mention AzureRM 4.x authentication requirements.
- Local validation with `terraform` and Azure CLI help could not be run because neither `terraform` nor `az` is installed in this environment. Syntax and argument checks were verified against official Terraform Registry and Microsoft Learn documentation instead.
