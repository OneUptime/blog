# Validation Summary: How to Set Up Azure Sentinel with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Microsoft Sentinel
- OpenTofu / Terraform-style HCL
- AzureRM provider
- Azure Log Analytics Workspace
- Microsoft Entra ID
- Microsoft Defender for Cloud
- Microsoft Defender for Endpoint
- Microsoft 365
- Kusto Query Language (KQL)

## Sources Consulted
- AzureRM provider docs: `azurerm_sentinel_log_analytics_workspace_onboarding` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/sentinel_log_analytics_workspace_onboarding.html.markdown
- AzureRM provider docs: `azurerm_sentinel_data_connector_azure_active_directory` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/sentinel_data_connector_azure_active_directory.html.markdown
- AzureRM provider docs: `azurerm_sentinel_data_connector_azure_security_center` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/sentinel_data_connector_azure_security_center.html.markdown
- AzureRM provider docs: `azurerm_sentinel_data_connector_microsoft_defender_advanced_threat_protection` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/sentinel_data_connector_microsoft_defender_advanced_threat_protection.html.markdown
- AzureRM provider docs: `azurerm_sentinel_data_connector_office_365` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/sentinel_data_connector_office_365.html.markdown
- AzureRM provider docs: `azurerm_sentinel_alert_rule_scheduled` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/sentinel_alert_rule_scheduled.html.markdown
- AzureRM provider docs: `azurerm_sentinel_watchlist`, `azurerm_log_analytics_workspace`, and `azurerm_client_config` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/sentinel_watchlist.html.markdown, https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/log_analytics_workspace.html.markdown, https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/d/client_config.html.markdown
- Microsoft Learn: Microsoft Sentinel overview - https://learn.microsoft.com/en-us/azure/sentinel/sentinel-overview
- Microsoft Learn: Microsoft Entra ID connector - https://learn.microsoft.com/en-us/azure/sentinel/connect-azure-active-directory
- Microsoft Learn: Microsoft Defender for Cloud connector - https://learn.microsoft.com/en-us/azure/sentinel/connect-defender-for-cloud
- Microsoft Learn: API-based Microsoft service connector prerequisites - https://learn.microsoft.com/en-us/azure/sentinel/connect-services-api-based
- Microsoft Learn: Watchlists in Microsoft Sentinel - https://learn.microsoft.com/en-us/azure/sentinel/watchlists

## Issues Found
- The post used outdated product naming in the title and prose (`Azure Sentinel`, `Azure Active Directory`, `Office 365`, `Security Center`). I updated the prose to current Microsoft naming (`Microsoft Sentinel`, `Microsoft Entra ID`, `Microsoft 365`, `Microsoft Defender for Cloud`) because the official Microsoft documentation now uses those product names even though some AzureRM resource names still use older identifiers.
- The HCL snippets referenced `azurerm_resource_group.rg` and `data.azurerm_client_config.current` without defining them. I added the missing resource group and data source blocks so the examples are internally consistent and match the AzureRM provider documentation.
- The Sentinel connector, analytics rule, and watchlist resources pointed directly at the Log Analytics workspace ID instead of the Sentinel onboarding resource. I changed those references to `azurerm_sentinel_log_analytics_workspace_onboarding.sentinel.workspace_id` to match the provider examples and to enforce the correct dependency order so Sentinel is onboarded before dependent resources are created.
- The comment above `azurerm_sentinel_data_connector_microsoft_defender_advanced_threat_protection` incorrectly described it as a Defender for Cloud connector. I corrected it to Microsoft Defender for Endpoint, and clarified that `azurerm_sentinel_data_connector_azure_security_center` is the subscription-based Defender for Cloud connector, because those are different products/connectors in Microsoft Sentinel.
- The watchlist section implied that the `azurerm_sentinel_watchlist` resource created a populated list of malicious IPs. I reworded it as a watchlist definition because the provider resource creates the watchlist container/metadata; population of items is a separate step.
- The `sentinel_workspace_id` output returned `workspace_id`, which AzureRM defines as the Log Analytics workspace customer ID, while the description implied the Azure resource ID used by Sentinel resources. I changed the output to `azurerm_log_analytics_workspace.sentinel_law.id` and updated the description accordingly.
- The summary overstated the outcome by claiming a "fully operational SIEM from day one" that "surfaces security incidents automatically." I narrowed that language to "core configuration as code" and "surfaces security alerts automatically" because the post does not configure incident creation and connector behavior still depends on source-side prerequisites.

## Review Notes
- The AzureRM Sentinel resources are technically current, but several of them still use legacy names in the provider schema such as `azure_active_directory`, `azure_security_center`, `office_365`, and `microsoft_defender_advanced_threat_protection`. The post now keeps the code as required by AzureRM while using current Microsoft product names in the explanatory text.
- Watchlist population is not shown in this post. If a future revision wants to demonstrate a usable threat-intelligence watchlist, it should also show how items are added after the watchlist is created.
- I could not run `tofu validate` or `terraform validate` locally because neither `tofu` nor `terraform` is installed in this environment, so validation was performed against the official AzureRM and Microsoft documentation.
