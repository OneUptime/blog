# Validation Summary: How to Create Azure Logic Apps in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Logic Apps Consumption
- Azure Logic Apps Standard
- Azure API Connections
- Azure Monitor diagnostic settings
- Azure Log Analytics

## Sources Consulted
- HashiCorp AzureRM provider documentation: azurerm_logic_app_workflow: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/logic_app_workflow
- HashiCorp AzureRM provider documentation: azurerm_logic_app_trigger_http_request: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/logic_app_trigger_http_request
- HashiCorp AzureRM provider documentation: azurerm_logic_app_action_http: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/logic_app_action_http
- HashiCorp AzureRM provider documentation: azurerm_logic_app_action_custom: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/logic_app_action_custom
- HashiCorp AzureRM provider documentation: azurerm_logic_app_trigger_recurrence: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/logic_app_trigger_recurrence
- HashiCorp AzureRM provider documentation: azurerm_logic_app_standard: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/logic_app_standard
- HashiCorp AzureRM provider documentation for v3.80.0: azurerm_logic_app_standard and azurerm_monitor_diagnostic_setting: https://github.com/hashicorp/terraform-provider-azurerm/tree/v3.80.0/website/docs/r
- HashiCorp AzureRM provider documentation: azurerm_api_connection: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_connection
- HashiCorp AzureRM provider documentation: azurerm_service_plan: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/service_plan
- Microsoft Learn: Azure Logic Apps overview: https://learn.microsoft.com/en-us/azure/logic-apps/logic-apps-overview
- Microsoft Learn: Workflow Definition Language schema reference: https://learn.microsoft.com/en-us/azure/logic-apps/update-workflow-definition-language-schema
- Microsoft Learn: Collect diagnostic data for workflows in Azure Logic Apps: https://learn.microsoft.com/en-us/azure/logic-apps/monitor-workflows-collect-diagnostic-data
- Microsoft Learn: Supported logs for Microsoft.Logic/Workflows: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-logic-workflows-logs

## Issues Found
- The `azurerm_logic_app_action_http` example included an empty `run_after {}` block. The AzureRM provider requires `action_name` and `action_result` inside `run_after`; when no explicit predecessor is needed, the block should be omitted. Removed the empty block.
- The `azurerm_logic_app_standard` example used `use_32_bit_worker`, which is not a supported `site_config` attribute for this resource. Changed it to `use_32_bit_worker_process`.
- The `app_scale_limit` comment incorrectly described the setting as Application Insights integration. Changed the comment to identify it as a scale-out limit.
- The "Complete Workflow Definition" section implied that `azurerm_logic_app_workflow` can inline the entire workflow definition. The AzureRM resource supports schema, version, parameters, and separate trigger/action resources, not a full workflow definition body argument. Updated the heading and wording to explain that schema/version are set on the workflow resource while triggers/actions are defined separately.

## Review Notes
- The post pins AzureRM with `~> 3.80`, so the examples were reviewed against the v3.80 provider schema as well as the latest provider documentation where applicable.
- AzureRM v4 is now the latest major provider version, but the v3.80 examples remain valid after the corrections above.
