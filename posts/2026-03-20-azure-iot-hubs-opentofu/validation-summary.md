# Validation Summary: How to Create Azure IoT Hubs with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Azure IoT Hub
- Azure Resource Manager (`azurerm`) provider
- Azure Storage Accounts and Blob Containers

## Sources Consulted
- HashiCorp AzureRM provider docs for `azurerm_iothub`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/iothub.html.markdown
- HashiCorp AzureRM provider docs for `azurerm_iothub_shared_access_policy`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/iothub_shared_access_policy.html.markdown
- HashiCorp AzureRM provider docs for `azurerm_iothub_consumer_group`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/iothub_consumer_group.html.markdown
- HashiCorp AzureRM provider docs for `azurerm_iothub_endpoint_storage_container`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/iothub_endpoint_storage_container.html.markdown
- HashiCorp AzureRM provider docs for `azurerm_iothub_route`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/iothub_route.html.markdown
- HashiCorp AzureRM provider docs for `azurerm_storage_container`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/storage_container.html.markdown
- Microsoft Learn, Understand Azure IoT Hub endpoints: https://learn.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-endpoints
- Microsoft Learn, Understand Azure IoT Hub quotas and throttling: https://learn.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-quotas-throttling
- Microsoft Learn, Azure subscription and service limits, quotas, and constraints: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/azure-subscription-service-limits
- OpenTofu CLI docs, `tofu apply`: https://opentofu.org/docs/cli/commands/apply/

## Issues Found
- The storage routing example created an IoT Hub storage endpoint but did not create a route, so device messages would not actually be routed to storage. Added `azurerm_iothub_route.telemetry` to connect `DeviceMessages` to the storage endpoint.
- The storage container example used `storage_account_name`, which is deprecated in the current AzureRM provider docs. Updated it to `storage_account_id`.
- The description and summary implied the post configured message routing to Event Hubs and Storage. The post actually demonstrates consumer groups on the built-in Event Hubs-compatible endpoint plus routing to Storage, so the wording was corrected to match the implementation.

## Review Notes
- `encoding = "JSON"` on the storage endpoint is valid, but Azure IoT Hub writes message payloads as base64 unless device messages also set `contentType=application/json` and `contentEncoding=UTF-8`.
- The example assumes input values satisfy Azure naming constraints and uniqueness requirements, especially for the storage account name.
- I could not run `tofu validate` locally because neither `tofu` nor `terraform` is installed in this environment.
