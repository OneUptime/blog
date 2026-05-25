# Validation Summary: How to Create Azure Monitor Action Groups in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM Provider
- Azure Monitor
- Azure Monitor action groups
- Azure Functions
- Azure Logic Apps
- Webhooks
- SMS and email alert receivers

## Sources Consulted
- HashiCorp Terraform Registry: `azurerm_monitor_action_group` resource documentation, https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_action_group
- HashiCorp Terraform Registry: AzureRM Provider 4.0 upgrade guide, https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/4.0-upgrade-guide
- Microsoft Learn: Create and manage action groups in Azure Monitor, https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/action-groups
- Microsoft Learn: Common alert schema for Azure Monitor alerts, https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-common-schema
- HashiCorp Developer: Manage sensitive data in Terraform state, https://developer.hashicorp.com/terraform/language/state/sensitive-data

## Issues Found
- The provider setup used `azurerm` `~> 3.0`, while the current AzureRM provider major version is 4.x. Updated the version constraint to `~> 4.0` and added `subscription_id = var.subscription_id`, because AzureRM provider 4.x requires a subscription ID for plan/apply operations.
- The webhook examples described direct Slack webhook usage. Azure Monitor webhook receivers send Azure alert payloads, and endpoints that expect a different schema need an adapter such as Logic Apps or a custom relay. Renamed the direct Slack examples to generic team notification webhooks.
- The best practices section said sensitive variables avoid exposing webhook URLs in Terraform state. Terraform sensitive variables redact CLI output, but values can still be stored in state. Updated the guidance to say sensitive variables reduce plan/apply exposure and state must still be protected.

## Review Notes
The action group receiver block names and fields used in the examples match the current AzureRM provider documentation, including `email_receiver`, `sms_receiver`, `webhook_receiver`, `azure_function_receiver`, and `logic_app_receiver`. The short names shown are within Azure Monitor's 12-character action group short name limit.
