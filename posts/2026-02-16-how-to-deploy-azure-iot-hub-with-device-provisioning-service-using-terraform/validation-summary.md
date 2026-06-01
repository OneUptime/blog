# Validation Summary: How to Deploy Azure IoT Hub with Device Provisioning Service Using Terraform

## Status
validated

## Post Type
Tutorial / Infrastructure as Code guide

## Technologies Covered
- Azure IoT Hub
- Azure IoT Hub Device Provisioning Service
- Terraform
- AzureRM Terraform provider
- Azure Monitor diagnostic settings
- Log Analytics

## Sources Consulted
- HashiCorp AzureRM Provider v3.80.0 `azurerm_iothub` documentation: https://github.com/hashicorp/terraform-provider-azurerm/blob/v3.80.0/website/docs/r/iothub.html.markdown
- HashiCorp AzureRM Provider v3.80.0 `azurerm_iothub_dps` documentation: https://github.com/hashicorp/terraform-provider-azurerm/blob/v3.80.0/website/docs/r/iothub_dps.html.markdown
- HashiCorp AzureRM Provider v3.80.0 `azurerm_iothub_shared_access_policy` documentation: https://github.com/hashicorp/terraform-provider-azurerm/blob/v3.80.0/website/docs/r/iothub_shared_access_policy.html.markdown
- HashiCorp AzureRM Provider v3.80.0 `azurerm_iothub_dps_shared_access_policy` documentation: https://github.com/hashicorp/terraform-provider-azurerm/blob/v3.80.0/website/docs/r/iothub_dps_shared_access_policy.html.markdown
- HashiCorp AzureRM Provider v3.80.0 `azurerm_iothub_dps_certificate` documentation: https://github.com/hashicorp/terraform-provider-azurerm/blob/v3.80.0/website/docs/r/iothub_dps_certificate.html.markdown
- HashiCorp AzureRM Provider v3.80.0 `azurerm_iothub_consumer_group` documentation: https://github.com/hashicorp/terraform-provider-azurerm/blob/v3.80.0/website/docs/r/iothub_consumer_group.html.markdown
- HashiCorp AzureRM Provider v3.80.0 `azurerm_monitor_diagnostic_setting` documentation: https://github.com/hashicorp/terraform-provider-azurerm/blob/v3.80.0/website/docs/r/monitor_diagnostic_setting.html.markdown
- Microsoft Learn, Terraform quickstart for Azure IoT Hub DPS: https://learn.microsoft.com/azure/iot-dps/quick-setup-auto-provision-terraform
- Microsoft Learn, DPS global device endpoint guidance: https://learn.microsoft.com/azure/iot-dps/virtual-network-support
- Microsoft Learn, supported log categories for Microsoft.Devices/IotHubs: https://learn.microsoft.com/azure/azure-monitor/reference/supported-logs/microsoft-devices-iothubs-logs
- Microsoft Learn, supported log categories for Microsoft.Devices/provisioningServices: https://learn.microsoft.com/azure/azure-monitor/reference/supported-logs/microsoft-devices-provisioningservices-logs

## Issues Found
- The architecture diagram showed routing to an Event Hub, but the Terraform did not create an Event Hub endpoint or route. Removed that diagram edge to match the implementation.
- The DPS `linked_hub` block referenced `azurerm_iothub.main.shared_access_policy[0].primary_connection_string`, but the computed `shared_access_policy` block on `azurerm_iothub` does not export `primary_connection_string`. Updated it to use `azurerm_iothub_shared_access_policy.service.primary_connection_string`, matching the documented AzureRM pattern.
- The DPS `allocation_policy` comment and explanation listed `Custom`, but AzureRM Provider v3.80.0 documents only `Hashed`, `GeoLatency`, and `Static` for `azurerm_iothub_dps.allocation_policy`. Removed `Custom` from the Terraform-specific options and summary.
- The "DPS Enrollment Groups" section described enrollment groups, but the shown Terraform resource creates a DPS shared access policy, not an enrollment group. Renamed and reworded the section to describe DPS access policies and certificates accurately.
- The DPS output used the per-instance service hostname while describing the global endpoint devices use for registration. Changed the output to `https://global.azure-devices-provisioning.net`.

## Review Notes
- Terraform was not installed in the local environment, so I could not run `terraform validate`. The review was performed against the official AzureRM v3.80.0 resource documentation and Microsoft Learn documentation.
- The storage account name is generated from `environment`; very long or invalid environment values could still produce an invalid storage account name. The default value shown in the post is valid.
