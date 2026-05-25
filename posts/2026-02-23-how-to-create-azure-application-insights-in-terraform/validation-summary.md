# Validation Summary: How to Create Azure Application Insights in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Application Insights
- Azure Monitor
- Azure Log Analytics
- Azure Key Vault

## Sources Consulted
- HashiCorp AzureRM provider documentation for `azurerm_application_insights`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v3.80.0/website/docs/r/application_insights.html.markdown
- HashiCorp AzureRM provider documentation for `azurerm_application_insights_standard_web_test`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v3.80.0/website/docs/r/application_insights_standard_web_test.html.markdown
- HashiCorp AzureRM provider documentation for `azurerm_application_insights_smart_detection_rule`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v3.80.0/website/docs/r/application_insights_smart_detection_rule.html.markdown
- HashiCorp AzureRM provider documentation for `azurerm_monitor_metric_alert`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v3.80.0/website/docs/r/monitor_metric_alert.html.markdown
- HashiCorp AzureRM provider documentation for `azurerm_log_analytics_workspace`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v3.80.0/website/docs/r/log_analytics_workspace.html.markdown
- HashiCorp AzureRM provider documentation for `azurerm_key_vault` and `azurerm_key_vault_secret`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v3.80.0/website/docs/r/key_vault.html.markdown and https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v3.80.0/website/docs/r/key_vault_secret.html.markdown
- Microsoft Learn: Create and configure Application Insights resources: https://learn.microsoft.com/en-us/azure/azure-monitor/app/create-workspace-resource
- Microsoft Learn: Application Insights availability tests: https://learn.microsoft.com/en-us/azure/azure-monitor/app/availability
- Microsoft Learn: Connection strings in Application Insights: https://learn.microsoft.com/en-us/azure/azure-monitor/app/connection-strings
- Microsoft Learn: Set daily cap on Log Analytics workspace: https://learn.microsoft.com/en-us/azure/azure-monitor/logs/daily-cap

## Issues Found
- The classic versus workspace-based description was outdated. Microsoft documentation now states that classic Application Insights resources have been retired, so the wording was updated to say classic resources stored data internally and workspace-based resources store telemetry in Log Analytics.
- The Application Insights `application_type` comment implied it affects dashboards and experiences. The Terraform provider treats it as a required, case-sensitive resource argument, so the comment was corrected.
- The Application Insights resource included `retention_in_days` with a comment saying a shorter retention can be set there. Microsoft documentation says retention for workspace-based Application Insights resources is configured in the associated Log Analytics workspace, so the component-level setting was removed and the comment was corrected.
- One availability-test location tag was labeled as UK South while using `emea-gb-db3-azr`. The example was changed to `emea-ru-msa-edge` for UK South.
- The failed-request alert was described as a 5% failure-rate alert, but the Terraform metric alert uses `requests/failed` with `Count` and `threshold = 50`. The comment and description were corrected to describe failed request volume.

## Review Notes
- Terraform CLI was not installed in the local environment, so I could not run `terraform validate`. The HCL snippets were reviewed against the AzureRM provider documentation instead.
- The provider constraint `~> 3.80` is valid for the resources shown, but AzureRM v4 is the current major provider line. A future refresh could update the provider version and account for any v4 provider configuration requirements.
- Application Insights connection strings and instrumentation keys are marked sensitive in Terraform outputs. Microsoft notes that instrumentation keys are identifiers rather than security tokens, but treating these values cautiously in Terraform output remains reasonable.
