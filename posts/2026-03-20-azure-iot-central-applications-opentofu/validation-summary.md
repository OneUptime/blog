# Validation Summary: How to Create Azure IoT Central Applications with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu CLI
- Azure Resource Manager (AzureRM) provider
- Azure IoT Central
- Azure Event Hubs
- Azure RBAC and managed identities
- HCL

## Sources Consulted
- AzureRM provider docs for `azurerm_iotcentral_application`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/iotcentral_application.html.markdown
- AzureRM provider docs for `azurerm_iotcentral_application_network_rule_set`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/iotcentral_application_network_rule_set.html.markdown
- AzureRM provider docs for `azurerm_eventhub_namespace`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/eventhub_namespace.html.markdown
- AzureRM provider docs for `azurerm_eventhub`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/eventhub.html.markdown
- AzureRM provider docs for `azurerm_role_assignment`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/role_assignment.html.markdown
- Microsoft Learn, Azure IoT Central overview: https://learn.microsoft.com/en-us/azure/iot-central/core/overview-iot-central
- Microsoft Learn, create/manage IoT Central applications and managed identity guidance: https://learn.microsoft.com/en-us/azure/iot-central/core/howto-manage-iot-central-from-portal?view=azure-iot-central
- Microsoft Learn, `Microsoft.IoTCentral/iotApps` ARM/AzAPI reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.iotcentral/iotapps
- OpenTofu CLI docs for `plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI docs for `apply`: https://opentofu.org/docs/cli/commands/apply/

## Issues Found
- The IoT Central example referenced `azurerm_iotcentral_application.main.identity[0].principal_id` without enabling a managed identity on the application. I added an `identity { type = "SystemAssigned" }` block so the role assignment example is valid.
- The network rule set used `apply_to_devices`, but the current AzureRM argument name is `apply_to_device`. I updated the argument to match the current provider schema.
- The Event Hub example used the older `namespace_name` and `resource_group_name` arguments. I updated the resource to use the current `namespace_id` argument from the current AzureRM provider docs.
- The post described IoT Central as a SaaS platform and labeled `ST0` as free. I corrected the wording to match current Microsoft guidance: IoT Central is a managed application platform, and the SKU list is `ST0`, `ST1`, and `ST2`.

## Review Notes
- The current AzureRM provider docs for `azurerm_iotcentral_application` and `azurerm_iotcentral_application_network_rule_set` still target the `Microsoft.IoTCentral` `2021-11-01-preview` API.
- OpenTofu was not installed in this workspace, so the CLI commands were checked against the official OpenTofu documentation and the HCL snippets were parsed locally rather than executed against Azure.
