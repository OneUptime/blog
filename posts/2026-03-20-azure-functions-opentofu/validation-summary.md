# Validation Summary: How to Deploy Azure Functions with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Azure Functions
- Azure Resource Manager (AzureRM) provider
- Azure App Service / Service Plans
- Azure Storage Accounts
- Azure Application Insights
- Azure Log Analytics Workspace
- Azure RBAC
- HCL

## Sources Consulted
- OpenTofu `tofu init`: https://opentofu.org/docs/v1.11/cli/commands/init/
- OpenTofu `tofu apply`: https://opentofu.org/docs/v1.11/cli/commands/apply/
- AzureRM provider overview: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/index.html.markdown
- AzureRM 4.0 upgrade guide: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/guides/4.0-upgrade-guide.html.markdown
- AzureRM `azurerm_service_plan` resource: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/service_plan.html.markdown
- AzureRM `azurerm_windows_function_app` resource: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/windows_function_app.html.markdown
- AzureRM `azurerm_linux_function_app` resource: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/linux_function_app.html.markdown
- AzureRM `azurerm_storage_account` resource: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/storage_account.html.markdown
- AzureRM `azurerm_application_insights` resource: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/application_insights.html.markdown
- AzureRM `azurerm_log_analytics_workspace` resource: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/log_analytics_workspace.html.markdown
- Microsoft Learn, Automate function app resource deployment to Azure: https://learn.microsoft.com/en-us/azure/azure-functions/functions-infrastructure-as-code
- Microsoft Learn, Create a function app in the Azure portal: https://learn.microsoft.com/en-us/azure/azure-functions/functions-create-function-app-portal
- Microsoft Learn, Azure Functions Premium plan: https://learn.microsoft.com/en-us/azure/azure-functions/functions-premium-plan
- Microsoft Learn, Storage considerations for Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/storage-considerations
- Microsoft Learn, Configure monitoring for Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/configure-monitoring
- Microsoft Learn, Azure built-in roles for Monitor: https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/monitor

## Issues Found
- The post claimed to deploy Azure Functions but the original HCL only created a resource group, a diagnostic setting, and role assignments. I replaced the infrastructure example with actual `azurerm_service_plan`, `azurerm_windows_function_app`, and `azurerm_linux_function_app` resources.
- The original guide omitted required supporting resources for Function Apps, including storage accounts and the monitoring resources referenced in the description. I added dedicated storage accounts, a Log Analytics workspace, and Application Insights wired through a workspace-based configuration.
- The original post mixed an existing resource group data source with creation of a different resource group and then output only the resource group. I simplified this to a single created resource group and changed the outputs to the actual Function App names and hostnames.
- The AzureRM provider version was pinned to `~> 3.0`, while current provider guidance is v4 and v4 requires explicit subscription selection for plan and apply. I updated the provider block to `~> 4.0` and kept `subscription_id` as an input.
- The monitoring example was inaccurate for Azure Functions. The post used a resource-group diagnostic setting unrelated to Function App deployment and referenced undeclared variables. I replaced it with Function App `site_config` monitoring integration using `application_insights_connection_string`, which is the current recommended Application Insights setting.
- The original access-control example referenced undeclared principal variables and scoped monitoring access to the resource group instead of the monitoring resource. I made the RBAC assignments optional, declared the missing variables, and scoped `Monitoring Reader` to the Application Insights resource.
- The post described "consumption and premium plans" without the current hosting-plan caveat. I clarified the guide to use a Windows Function App on `Y1` Consumption and a Linux Function App on `EP1` Elastic Premium, and added the current Azure recommendation to prefer Flex Consumption for new Linux serverless workloads.
- The original article implied that `tofu apply` fully deploys Azure Function code. I clarified that these AzureRM resources provision the Function App infrastructure only, and function code must be published separately.

## Review Notes
- The guide now reflects current resource names and hosting-plan guidance as of May 7, 2026.
- No live Azure deployment was executed during validation; the review was performed against official provider schemas and Microsoft documentation.
- For new Linux serverless apps, Azure currently recommends Flex Consumption. The guide keeps a Consumption example because the post specifically covers Consumption and Premium plans.
