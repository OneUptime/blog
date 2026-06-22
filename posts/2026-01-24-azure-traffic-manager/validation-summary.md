# Validation Summary: How to Configure Azure Traffic Manager

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Azure Traffic Manager
- Azure CLI
- Terraform AzureRM provider
- ASP.NET Core health checks
- Azure Monitor alerts
- DNS and TTL behavior

## Sources Consulted
- Azure Traffic Manager overview and behavior: https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-how-it-works
- Azure Traffic Manager routing methods: https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-routing-methods
- Azure Traffic Manager endpoint monitoring: https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-monitoring
- Azure CLI Traffic Manager profile reference: https://learn.microsoft.com/en-us/cli/azure/network/traffic-manager/profile
- Azure CLI Traffic Manager endpoint reference: https://learn.microsoft.com/en-us/cli/azure/network/traffic-manager/endpoint
- Real User Measurements overview: https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-rum-overview
- Real User Measurements with web pages: https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-create-rum-web-pages
- Traffic Manager User Metrics Keys REST API: https://learn.microsoft.com/en-us/rest/api/trafficmanager/traffic-manager-user-metrics-keys/get
- Azure Monitor supported Traffic Manager metrics: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-network-trafficmanagerprofiles-metrics
- Azure CLI metric alert reference: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Azure CLI action group reference: https://learn.microsoft.com/en-us/cli/azure/monitor/action-group
- Terraform AzureRM Traffic Manager profile resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/traffic_manager_profile
- Terraform AzureRM Traffic Manager Azure endpoint resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/traffic_manager_azure_endpoint
- Terraform AzureRM Traffic Manager nested endpoint resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/traffic_manager_nested_endpoint

## Issues Found
- The Terraform example referenced `azurerm_app_service`, which is deprecated/removed in current AzureRM provider versions. Changed the Traffic Manager endpoint target references to `azurerm_linux_web_app`.
- The ASP.NET Core health-check sample used `Configuration` without defining it in `Startup`. Added the standard `IConfiguration` constructor injection.
- The Real User Measurements JavaScript example was a hand-written script, while Microsoft documentation instructs users to use the generated JavaScript snippet exactly as provided. Replaced it with a generated-snippet placeholder.
- The RUM CLI example used unsupported Traffic Manager profile fields and queried `trafficViewEnrollmentStatus`, which does not return the RUM key. Replaced it with `az rest` against the documented Traffic Manager User Metrics Keys API and queried `properties.key`.
- The TTL/failover diagram implied a single health check detects failure at exactly 10 seconds. Updated the wording to show that degraded status depends on probe interval, timeout, and tolerated failures.
- The Azure Monitor action group command used an outdated/incorrect email receiver flag. Replaced it with the current `--action email NAME EMAIL_ADDRESS` syntax.
- The metric alert command used `avg` for `ProbeAgentCurrentEndpointStateByProfileResourceId`, but Azure Monitor documents `Maximum` as the supported/default aggregation for that metric. Changed the condition to use `max`.
- The metric alert command used `--action-group`, but the current Azure CLI metric alert command uses `--action`. Updated the command.

## Review Notes
- Azure CLI was not installed in the local environment, so command validation was performed against Microsoft Learn CLI reference pages rather than local `az --help`.
- The Terraform snippets still assume the referenced web app resources are declared elsewhere in the configuration, which is reasonable for an excerpt.
