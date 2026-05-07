# Validation Summary: How to Configure Azure App Service Logging with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure App Service
- Azure Monitor
- Log Analytics
- Application Insights
- Azure Storage
- OpenTofu / AzureRM provider
- HCL

## Sources Consulted
- Azure App Service diagnostic logging: https://learn.microsoft.com/en-us/azure/app-service/troubleshoot-diagnostic-logs
- Monitor Azure App Service: https://learn.microsoft.com/en-us/azure/app-service/monitor-app-service
- Azure App Service monitoring data reference: https://learn.microsoft.com/en-us/azure/app-service/monitor-app-service-reference
- Azure App Service app settings reference: https://learn.microsoft.com/en-us/azure/app-service/reference-app-settings
- Supported logs for `Microsoft.Web/sites`: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-web-sites-logs
- AzureRM `azurerm_linux_web_app`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_web_app
- AzureRM `azurerm_monitor_diagnostic_setting`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_diagnostic_setting
- AzureRM `azurerm_storage_container`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_container
- AzureRM `azurerm_application_insights`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/application_insights
- AzureRM `azurerm_log_analytics_workspace`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/log_analytics_workspace

## Issues Found
- The Linux App Service example enabled `detailed_error_messages` and `failed_request_tracing`, but Microsoft documents those as Windows App Service features. I removed those settings and updated the overview to match the Linux example.
- The post configured Azure Blob Storage application logging for a generic Linux web app. Current Azure App Service docs document blob application logging as a .NET-specific capability, so I removed that block and kept file-system application logging for the Linux example.
- The storage account section created a blob container that was no longer appropriate after fixing the Linux logging example. I removed the container and used the storage account as an archive destination for Azure Monitor diagnostic settings instead.
- The diagnostic setting snippet used the older `metric` block with `enabled = true`. Current AzureRM provider documentation uses `enabled_metric` without that field, so I updated the snippet.
- The Application Insights comment implied generic auto-instrumentation. I tightened the wording so it matches current App Service documentation for supported Linux stacks.

## Review Notes
- `AppServiceAppLogs` and Application Insights autoinstrumentation behavior still depend on the application stack and logging framework. The revised post is technically accurate, but readers should expect stack-specific behavior for what telemetry actually appears.
- The storage account name in the snippet is still a fixed example value. In real deployments it must be globally unique.
