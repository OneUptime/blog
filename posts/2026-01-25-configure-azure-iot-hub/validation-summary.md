# Validation Summary: How to Configure Azure IoT Hub

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure IoT Hub
- Azure CLI and azure-iot extension
- Terraform AzureRM provider
- Azure Event Hubs
- Azure Storage
- Python Azure IoT Device SDK
- Device twins, direct methods, message routing, shared access policies, and X.509 authentication

## Sources Consulted
- Azure CLI IoT Hub device identity documentation: https://learn.microsoft.com/en-us/cli/azure/iot/hub/device-identity?view=azure-cli-latest
- Azure CLI IoT Hub message endpoint documentation: https://learn.microsoft.com/en-us/cli/azure/iot/hub/message-endpoint/create?view=azure-cli-latest
- Azure CLI IoT Hub message route documentation: https://learn.microsoft.com/en-us/cli/azure/iot/hub/message-route?view=azure-cli-latest
- Azure CLI IoT Hub shared access policy documentation: https://learn.microsoft.com/en-us/cli/azure/iot/hub/policy?view=azure-cli-latest
- Azure IoT Hub message routing query syntax: https://learn.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-routing-query-syntax
- Azure IoT Hub device twins documentation: https://learn.microsoft.com/en-us/azure/iot-hub/how-to-device-twins
- Azure IoT Device SDK for Python API documentation: https://learn.microsoft.com/en-us/python/api/azure-iot-device/azure.iot.device.aio.iothubdeviceclient?view=azure-python
- Azure IoT SDK for Python direct method sample: https://github.com/Azure/azure-iot-sdk-python/blob/main/samples/async-hub-scenarios/receive_direct_method.py
- Terraform AzureRM `azurerm_iothub` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/iothub
- Terraform AzureRM `azurerm_iothub_shared_access_policy` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/iothub_shared_access_policy
- Terraform AzureRM provider v4 upgrade guidance: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/4.0-upgrade-guide
- Microsoft lifecycle listing for Azure Time Series Insights retirement: https://learn.microsoft.com/en-us/lifecycle/end-of-support/end-of-support-2024
- Azure Data Explorer documentation: https://learn.microsoft.com/en-us/azure/data-explorer/

## Issues Found
- The Terraform example pinned AzureRM `~> 3.0` and used older Event Hub arguments. Updated the provider pin to `~> 4.0`, added the required `subscription_id` provider setting, and changed `azurerm_eventhub` to use `namespace_id`.
- The Terraform output referenced `azurerm_iothub.main.primary_connection_string`, which is not exported by `azurerm_iothub`. Added an `azurerm_iothub_shared_access_policy` resource and changed the output to its `primary_connection_string`.
- The Terraform device registration section used a nonexistent `azurerm_iothub_device` resource. Replaced it with a note explaining that AzureRM does not currently manage IoT Hub device identities and that devices should be registered with CLI, SDKs, or REST API.
- The routing CLI examples used older `az iot hub route` / `routing-endpoint` commands and routed alerts to an Event Hub endpoint that was never created in that CLI section. Updated the examples to the current `message-endpoint` and `message-route` command groups and added an Event Hub endpoint creation command.
- The architecture diagram referenced Azure Time Series Insights, which is retired. Replaced it with Azure Data Explorer.

## Review Notes
Python code snippets were syntax-checked with `ast.parse`. Azure CLI, Terraform apply, and live Azure resource provisioning were not executed because they require Azure credentials and billable cloud resources.
