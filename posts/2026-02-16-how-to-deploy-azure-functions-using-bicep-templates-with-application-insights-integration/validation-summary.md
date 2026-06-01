# Validation Summary: How to Deploy Azure Functions Using Bicep Templates

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Functions
- Azure Bicep
- Azure App Service plans
- Application Insights
- Log Analytics workspace
- Azure Monitor diagnostic settings
- Azure Monitor metric alerts
- Azure CLI
- Azure Functions host.json monitoring configuration

## Sources Consulted
- Azure Functions infrastructure as code documentation: https://learn.microsoft.com/en-us/azure/azure-functions/functions-infrastructure-as-code
- Azure Functions app settings reference: https://learn.microsoft.com/en-ie/azure/azure-functions/functions-app-settings
- Azure Functions monitoring configuration: https://learn.microsoft.com/en-ie/azure/azure-functions/configure-monitoring
- Azure Functions run-from-package documentation: https://learn.microsoft.com/en-us/azure/azure-functions/run-functions-from-deployment-package
- Azure Functions host.json reference: https://learn.microsoft.com/en-us/azure/azure-functions/functions-host-json
- Application Insights component Bicep reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.insights/components
- Application Insights pricingPlans Bicep reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.insights/components/pricingplans
- Azure Monitor supported metrics for Microsoft.Web/sites: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-web-sites-metrics
- Azure Monitor supported metrics for microsoft.insights/components: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-insights-components-metrics
- Application Insights metrics overview: https://learn.microsoft.com/en-us/azure/azure-monitor/app/metrics-overview
- Azure CLI app-insights query reference: https://learn.microsoft.com/cli/azure/monitor/app-insights
- Azure CLI app-insights component reference: https://learn.microsoft.com/en-us/cli/azure/monitor/app-insights/component
- Azure Monitor diagnostic settings documentation: https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/diagnostic-settings
- Log Analytics retention documentation: https://learn.microsoft.com/en-us/azure/azure-monitor/logs/data-retention-configure
- Azure built-in Monitor roles documentation: https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/monitor

## Issues Found
- The template enabled `DisableLocalAuth` in production but only configured Application Insights with key-based settings. I added `APPLICATIONINSIGHTS_AUTHENTICATION_STRING` for production and a `Monitoring Metrics Publisher` role assignment for the Function App managed identity.
- The Function App configured both `APPLICATIONINSIGHTS_CONNECTION_STRING` and `APPINSIGHTS_INSTRUMENTATIONKEY`, which the Azure Functions app settings reference says not to use together. I removed the instrumentation key setting and kept the connection string.
- The App Service plan used Windows hosting for `dotnet-isolated` while the Function App was always declared as Linux. I changed the plan to Linux hosting consistently.
- The template defaulted to Linux Consumption while setting `WEBSITE_RUN_FROM_PACKAGE` to `1`, but Linux Consumption requires a package URL. I changed the default plan SKU to Elastic Premium and added a `deploymentPackageUrl` parameter for `Y1` deployments.
- Diagnostic settings included `retentionPolicy` blocks even though retention should be managed on the Log Analytics workspace for this destination. I removed those blocks.
- The availability alert description implied it detected a stopped Function App directly. The metric is based on Application Insights availability test results, so I updated the comment and description to state that availability tests are required.
- The "Custom properties" host.json example did not add custom dimensions. I renamed the text to dependency and performance collection, which matches the settings shown.
- The daily cap example used the older `CurrentBillingFeatures` shape. I updated it to the documented `Microsoft.Insights/components/pricingPlans@2017-10-01` child resource.
- The storage account name expression did not normalize uppercase letters. I wrapped `appName` with `toLower()` before removing hyphens.

## Review Notes
- I could not run `az` or `bicep` locally because neither tool is installed in this environment, so validation was performed against current Microsoft Learn documentation.
- The `Y1` Linux Consumption path now documents the package URL requirement, but readers still need to provide a real package URL when deploying with `planSku=Y1`.
