# Validation Summary: How to Create Azure SignalR Service in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure SignalR Service
- Azure Private Link and private endpoints
- Azure Private DNS
- Azure Key Vault certificates
- Azure Monitor diagnostic settings and metric alerts

## Sources Consulted
- HashiCorp AzureRM provider `azurerm_signalr_service` documentation for v3.80.0: https://registry.terraform.io/providers/hashicorp/azurerm/3.80.0/docs/resources/signalr_service
- HashiCorp AzureRM provider `azurerm_signalr_service_custom_certificate` documentation for v3.80.0: https://registry.terraform.io/providers/hashicorp/azurerm/3.80.0/docs/resources/signalr_service_custom_certificate
- HashiCorp AzureRM provider `azurerm_signalr_service_custom_domain` documentation for v3.80.0: https://registry.terraform.io/providers/hashicorp/azurerm/3.80.0/docs/resources/signalr_service_custom_domain
- HashiCorp AzureRM provider `azurerm_subnet` documentation for v3.80.0: https://registry.terraform.io/providers/hashicorp/azurerm/3.80.0/docs/resources/subnet
- HashiCorp AzureRM provider `azurerm_private_endpoint` documentation for v3.80.0: https://registry.terraform.io/providers/hashicorp/azurerm/3.80.0/docs/resources/private_endpoint
- HashiCorp AzureRM provider `azurerm_monitor_diagnostic_setting` documentation for v3.80.0: https://registry.terraform.io/providers/hashicorp/azurerm/3.80.0/docs/resources/monitor_diagnostic_setting
- HashiCorp AzureRM provider `azurerm_monitor_metric_alert` documentation for v3.80.0: https://registry.terraform.io/providers/hashicorp/azurerm/3.80.0/docs/resources/monitor_metric_alert
- Azure SignalR Service private endpoint documentation: https://learn.microsoft.com/en-us/azure/azure-signalr/howto-private-endpoints
- Azure SignalR Service custom domain documentation: https://learn.microsoft.com/en-us/azure/azure-signalr/howto-custom-domain
- Azure SignalR Service upstream endpoint documentation: https://learn.microsoft.com/en-us/azure/azure-signalr/concept-upstream
- Azure Monitor supported metrics for Microsoft.SignalRService/SignalR: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-signalrservice-signalr-metrics
- Azure Monitor supported logs for Microsoft.SignalRService/SignalR: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-signalrservice-signalr-logs
- Azure SignalR Service pricing: https://azure.microsoft.com/en-us/pricing/details/signalr-service/

## Issues Found
- The private endpoint subnet example set `private_endpoint_network_policies_enabled = true`. For AzureRM 3.80, private endpoint network policies must be disabled on the subnet used for private endpoints, so this was changed to `false`.
- The custom domain example referenced the Standard SKU `azurerm_signalr_service.main` resource. AzureRM and Azure documentation state SignalR custom certificates are available only for Premium tier SignalR Service resources, so the example now references the Premium tier SignalR resource from the private endpoint section.
- The custom certificate example used a Key Vault certificate URL ending in `/latest`. AzureRM accepts a Key Vault certificate identifier with an optional concrete version, and omitting the version lets SignalR use the latest certificate version, so the example now uses the versionless certificate identifier.
- The Standard S1 capacity comment listed only selected valid unit counts. AzureRM 3.80 allows `1` through `10`, then `20`, `30`, and so on through `100` for Standard S1 and Premium P1, so the comment was corrected.
- The best practices section said each Standard S1 unit supports "1 million messages per day." Current Azure pricing describes Standard as unlimited messages, with the first 1 million messages per unit per day included in the base price, so the wording was corrected.

## Review Notes
- The post pins AzureRM to `~> 3.80`, so `live_trace_enabled` is valid for the documented provider line. AzureRM 4.x has different SignalR live trace configuration shape, so this post should be revisited if the provider constraint is upgraded to 4.x.
- Terraform was not installed in the local environment, so I could not run `terraform validate`; validation was performed against official provider documentation and Azure documentation.
