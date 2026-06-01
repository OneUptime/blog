# Validation Summary: How to Invoke Direct Methods on IoT Devices from Azure IoT Hub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure IoT Hub
- Azure IoT Hub direct methods
- Azure CLI azure-iot extension
- Azure IoT SDK for Python
- Azure IoT service SDK for .NET
- Device twins
- Cloud-to-device messages

## Sources Consulted
- Microsoft Learn: Understand and invoke direct methods from IoT Hub: https://learn.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-direct-methods
- Microsoft Learn: Cloud-to-device communications guidance: https://learn.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-c2d-guidance
- Microsoft Learn: Understand and use device twins in IoT Hub: https://learn.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-device-twins
- Microsoft Learn: Azure CLI `az iot hub invoke-device-method`: https://learn.microsoft.com/en-us/cli/azure/iot/hub?view=azure-cli-latest#az-iot-hub-invoke-device-method
- Microsoft Learn: Azure CLI `az iot hub job create`: https://learn.microsoft.com/en-us/cli/azure/iot/hub/job?view=azure-cli-latest#az-iot-hub-job-create
- Microsoft Learn: Python `azure.iot.device.IoTHubDeviceClient`: https://learn.microsoft.com/en-us/python/api/azure-iot-device/azure.iot.device.iothubdeviceclient?view=azure-python
- Microsoft Learn: .NET `Microsoft.Azure.Devices.CloudToDeviceMethod`: https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.devices.cloudtodevicemethod?view=azure-dotnet
- Microsoft Learn: .NET `ServiceClient.InvokeDeviceMethodAsync`: https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.devices.serviceclient.invokedevicemethodasync?view=azure-dotnet
- Microsoft Learn: .NET `DeviceNotFoundException`: https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.devices.common.exceptions.devicenotfoundexception?view=azure-dotnet

## Issues Found
- The introduction said calls fail immediately when a device is offline. Azure IoT Hub direct methods do not queue, but the service can wait for a disconnected device to come online when a connect timeout is configured. Updated the wording to reflect the default and configurable behavior.
- The prerequisites did not mention that direct methods require the Standard tier. Updated the IoT Hub prerequisite accordingly.
- The CLI example comment referred to `--method-response-timeout`, but `az iot hub invoke-device-method` uses `--timeout`. Updated the comment to match the command.
- The C# snippet caught `DeviceNotFoundException` without importing its namespace. Added `using Microsoft.Azure.Devices.Common.Exceptions;`.
- The comparison table listed the C2D message payload limit as 256 KB. Microsoft Learn currently lists cloud-to-device messages as up to 64 KB. Updated the table.
- The comparison table described device twin payload as "32 KB total." Azure IoT Hub enforces 32 KB each for desired and reported properties, and 8 KB for tags. Updated the table cell to avoid the incorrect "total" wording.

## Review Notes
The Python device example uses placeholder hardware/helper functions such as `read_temperature_sensor()` and `calibrate()`. That is acceptable for a tutorial-style sample, but a production implementation should define those functions, validate direct-method payload types defensively, and manage process lifetime and shutdown behavior explicitly.
