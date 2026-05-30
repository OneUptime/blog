# Validation Summary: How to Set Up Message Routing from Azure IoT Hub to Azure Storage and Event Hubs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure IoT Hub message routing
- Azure IoT Hub custom endpoints
- Azure Storage containers
- Azure Event Hubs
- Azure CLI
- Azure IoT Device SDK for Python
- IoT Hub message enrichments

## Sources Consulted
- Microsoft Learn: Create and delete routes and endpoints by using the Azure CLI - https://learn.microsoft.com/en-us/azure/iot-hub/how-to-routing-azure-cli
- Microsoft Learn: az iot hub message-endpoint create - https://learn.microsoft.com/en-us/cli/azure/iot/hub/message-endpoint/create?view=azure-cli-latest
- Microsoft Learn: az iot hub message-route - https://learn.microsoft.com/en-us/cli/azure/iot/hub/message-route?view=azure-cli-latest
- Microsoft Learn: IoT Hub message routing query syntax - https://learn.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-routing-query-syntax
- Microsoft Learn: IoT Hub endpoints - https://learn.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-endpoints
- Microsoft Learn: Message enrichments for device-to-cloud IoT Hub messages - https://learn.microsoft.com/en-us/azure/iot-hub/iot-hub-message-enrichments-overview
- Microsoft Learn: Troubleshoot Azure IoT message routing - https://learn.microsoft.com/en-us/azure/iot-hub/troubleshoot-message-routing
- Microsoft Learn: az eventhubs eventhub - https://learn.microsoft.com/en-us/cli/azure/eventhubs/eventhub?view=azure-cli-latest
- Microsoft Learn: Azure IoT Device SDK for Python Message class - https://learn.microsoft.com/en-us/python/api/azure-iot-device/azure.iot.device.message?view=azure-python

## Issues Found
- The post used deprecated Azure IoT CLI command groups `az iot hub routing-endpoint` and `az iot hub route`. Updated endpoint commands to `az iot hub message-endpoint create ...` and route commands to `az iot hub message-route create ...` because current Microsoft documentation says the older command groups are no longer supported.
- The Event Hubs creation snippet used `--message-retention 7`, which is not the current Azure CLI option. Changed it to `--retention-time 168` to express seven days in hours.
- The storage endpoint snippet used old option names `--container-name` and `--max-chunk-size`. Updated them to `--container` and `--chunk-size` to match the current `az iot hub message-endpoint create storage-container` reference.
- The fallback route check used `az iot hub route show --route-name '$fallback'`. Updated it to `az iot hub message-route fallback show`, which is the current command for fallback route status.
- The enrichment example used unsupported value `$twin.deviceId`. Replaced it with supported `$iothubname` enrichment and adjusted the text accordingly. Device ID remains available through IoT Hub system properties rather than as a supported enrichment variable.
- The post described enrichments as adding context to the message payload. Clarified that enrichments add metadata/application properties, not body payload fields.
- The monitoring section referred to a dead letter endpoint for failed routed messages. Replaced this with current guidance to check routing metrics, resource logs, and endpoint health.
- The introduction implied the built-in Event Hub-compatible endpoint is read by a single consumer. Reworded this to back-end services can read from it, which better matches Event Hubs-compatible consumption.
- The prerequisite tier statement was too narrow for routing and too broad for twin usage. Updated it to distinguish Basic/Standard support for routing from Standard-tier requirements for device twin features.

## Review Notes
The Azure CLI was not installed in the local environment, so command validation was performed against current Microsoft Learn CLI references rather than local `az --help` output.
