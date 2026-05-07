# Validation Summary: How to Deploy Azure Web Apps with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AzureRM provider
- Azure App Service (Linux and Windows Web Apps)
- Azure Container Registry
- Azure Application Insights
- Azure managed identities
- Azure SQL connection strings for managed identity authentication

## Sources Consulted
- HashiCorp AzureRM provider docs for `azurerm_linux_web_app`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_web_app
- HashiCorp AzureRM provider docs for `azurerm_windows_web_app`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/windows_web_app
- HashiCorp AzureRM provider docs for `azurerm_application_insights`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/application_insights
- Azure App Service app settings reference: https://learn.microsoft.com/en-us/azure/app-service/reference-app-settings
- Run your app in Azure App Service directly from a ZIP package: https://learn.microsoft.com/en-us/azure/app-service/deploy-run-package
- Tutorial: Use managed identity to connect an Azure web app to an Azure SQL database without secrets: https://learn.microsoft.com/en-us/azure/app-service/tutorial-connect-msi-sql-database
- Connect to Azure SQL with Microsoft Entra authentication and SqlClient: https://learn.microsoft.com/en-us/sql/connect/ado-net/sql/azure-active-directory-authentication

## Issues Found
- The Linux Node.js example set `PORT` as an app setting. Azure App Service documents `PORT` as a read-only value for Linux Node.js apps, so I removed it.
- The Windows .NET example used `Authentication=Active Directory Managed Identity` in its SQL connection string without enabling a managed identity on the web app. I added a system-assigned identity block so the example matches the authentication method it configures.
- The Azure SQL managed-identity connection string omitted `Encrypt=True`. I added it to align the example with Microsoft's documented connection-string pattern.
- The post description said the article covers startup commands, but the post contains no startup-command example or explanation. I removed that claim to keep the metadata accurate.

## Review Notes
- `DOCKER_ENABLE_CI` is a valid App Service setting, but automatic image refresh for custom containers also depends on App Service continuous deployment and webhook configuration outside this OpenTofu snippet.
- `WEBSITES_PORT` is only required when a custom container listens on a non-default port. App Service otherwise auto-detects ports `80` and `8080`.
