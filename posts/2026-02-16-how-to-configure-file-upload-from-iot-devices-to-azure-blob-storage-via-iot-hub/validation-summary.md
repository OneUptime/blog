# Validation Summary: How to Configure File Upload from IoT Devices to Azure Blob Storage via IoT Hub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure IoT Hub
- Azure Blob Storage
- Azure Storage accounts and containers
- Azure CLI
- Azure IoT SDK for Node.js
- Node.js
- MQTT
- AMQP file upload notifications

## Sources Consulted
- Microsoft Learn: Configure IoT Hub file uploads, https://learn.microsoft.com/en-us/azure/iot-hub/iot-hub-configure-file-upload
- Microsoft Learn: Upload files from a device to the cloud with Azure IoT Hub, https://learn.microsoft.com/en-us/azure/iot-hub/how-to-file-upload
- Microsoft Learn: Understand Azure IoT Hub file upload, https://learn.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-file-upload
- Microsoft Learn: Azure IoT Hub quotas and throttling, https://learn.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-quotas-throttling
- Microsoft Learn: Azure IoT Hub billing information, https://learn.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-pricing
- Microsoft Learn: Azure CLI `az iot hub update`, https://learn.microsoft.com/en-us/cli/azure/iot/hub?view=azure-cli-latest#az-iot-hub-update
- Microsoft Learn: Azure IoT Device SDK for Node.js `Client` API, https://learn.microsoft.com/en-us/javascript/api/azure-iot-device/client?view=azure-node-latest
- Microsoft Learn: Azure IoT Hub service SDK for Node.js `Client` API, https://learn.microsoft.com/en-us/javascript/api/azure-iothub/client?view=azure-node-latest

## Issues Found
- The post said file upload notifications could be consumed with Event Hubs-compatible readers or routed to a custom endpoint. File upload notifications are delivered through the service-facing file upload notification endpoint, with AMQP and AMQP-over-WebSockets support, and are normally consumed through the IoT Hub service SDK. Updated the wording.
- The service-side Node.js notification example treated the received SDK message as if it were already the parsed notification object. The `getFileNotificationReceiver` receiver emits a message object, and the notification JSON is in `message.getData()`. Updated the example to parse the message body and complete the original message object.
- The cost section said file uploads do not count against IoT Hub message quota, then said two messages count. Updated it to clarify that the blob transfer itself is not metered by IoT Hub, while the initiation and completion messages are metered.

## Review Notes
Azure CLI was not installed in the local environment, so CLI command syntax was validated against Microsoft Learn rather than local `az --help`. The container creation command that uses `--auth-mode login` requires the signed-in user to have appropriate Azure Storage data-plane permissions.
