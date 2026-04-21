# Validation Summary: How to Build a Three-Tier Web Application Architecture with OpenTofu on Azure

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu / Terraform HCL
- AzureRM provider
- Azure Virtual Network and subnets
- Azure Application Gateway v2 with WAF
- Azure App Service on Linux
- Azure SQL Database
- Azure Private Endpoint and Private DNS
- Azure Key Vault references
- Azure Application Insights

## Sources Consulted
- HashiCorp AzureRM provider docs: `azurerm_application_gateway` - https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/application_gateway.html.markdown
- HashiCorp AzureRM provider docs: `azurerm_linux_web_app` - https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/linux_web_app.html.markdown
- HashiCorp AzureRM provider docs: `azurerm_mssql_server` - https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/mssql_server.html.markdown
- HashiCorp AzureRM provider docs: `azurerm_mssql_database` - https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/mssql_database.html.markdown
- HashiCorp AzureRM provider docs: `azurerm_private_endpoint` - https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/private_endpoint.html.markdown
- HashiCorp AzureRM provider docs: `azurerm_private_dns_zone` - https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/private_dns_zone.html.markdown
- HashiCorp AzureRM provider docs: `azurerm_private_dns_zone_virtual_network_link` - https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/private_dns_zone_virtual_network_link.html.markdown
- Microsoft Learn: Enable virtual network integration in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/configure-vnet-integration-enable
- Microsoft Learn: Managed identities for Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/overview-managed-identity
- Microsoft Learn: Azure Private Endpoint private DNS zone values - https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- Microsoft Learn: Azure Web Application Firewall on Application Gateway FAQ - https://learn.microsoft.com/en-us/azure/web-application-firewall/ag/application-gateway-waf-faq
- Microsoft Learn: Azure DDoS Protection reference architectures - https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-protection-reference-architectures
- Microsoft Learn: Azure SQL Private Link overview - https://learn.microsoft.com/en-us/azure/azure-sql/database/private-endpoint-overview

## Issues Found
- The Application Gateway listener referenced `ssl_certificate_name = "app-cert"` without declaring a matching `ssl_certificate` block. Added the `ssl_certificate` block using `filebase64(...)` and a password variable, matching the AzureRM provider requirements.
- The Application Gateway backend settings referenced `probe_name = "app-probe"` without declaring a matching health probe. Added an HTTPS `probe` block with host-name pickup from backend HTTP settings and a `200-399` match range.
- The WAF block was labeled as a policy, but the snippet uses inline `waf_configuration`, not an `azurerm_web_application_firewall_policy` resource. Updated the comment to "WAF configuration."
- The App Service used a Key Vault reference for the database connection string but did not enable a managed identity on the web app. Added a system-assigned identity so the app can use managed identity-based access to Key Vault.
- The SQL server specified `administrator_login` without `administrator_login_password` and did not set Entra-only authentication. Added `administrator_login_password = var.sql_admin_password`, which is required by the AzureRM provider for SQL authentication.
- The post described Azure SQL Database, but the snippet only created a logical SQL server. Added an `azurerm_mssql_database` resource.
- The SQL private endpoint omitted private DNS integration. Added `privatelink.database.windows.net`, a virtual network link, and a `private_dns_zone_group` on the private endpoint so standard Azure SQL FQDNs resolve to the private endpoint inside the VNet.
- The summary said Application Gateway WAF provides DDoS protection. Updated the wording to Layer 7 web attack protection, since DDoS mitigation is handled by Azure DDoS Protection and related architecture choices.

## Review Notes
The post remains snippet-based and assumes surrounding resources and variables exist, including the resource group, provider configuration, public IP, certificate path/password variables, SQL admin password variable, Key Vault, Key Vault access role assignment, and Application Insights. AzureRM currently lists `20-lts` as a valid App Service Node stack value, but a future update could move examples to `22-lts` or `24-lts` for longer support.
