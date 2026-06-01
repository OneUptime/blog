# Validation Summary: How to Partition and Scale Azure IoT Hub for Millions of Device Connections

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure IoT Hub
- Azure IoT Hub built-in Event Hub-compatible endpoint
- Azure CLI and azure-iot extension
- Azure Event Hubs Python SDK
- Azure Blob Storage checkpoint store
- Kubernetes Deployments
- Azure Monitor metrics alerts

## Sources Consulted
- Microsoft Learn: IoT Hub quotas and throttling - https://learn.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-quotas-throttling
- Microsoft Learn: Azure subscription and service limits, quotas, and constraints - https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/azure-subscription-service-limits
- Microsoft Learn: Create and read IoT Hub messages - https://learn.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-messaging
- Microsoft Learn: IoT Hub message routing query syntax - https://learn.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-routing-query-syntax
- Microsoft Learn: Azure CLI `az iot hub` reference - https://learn.microsoft.com/en-us/cli/azure/iot/hub
- Microsoft Learn: Azure CLI `az iot hub message-route` reference - https://learn.microsoft.com/en-us/cli/azure/iot/hub/message-route
- Microsoft Learn: Supported metrics for Microsoft.Devices/IotHubs - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-devices-iothubs-metrics
- Microsoft Learn: Azure Event Hubs Python `EventHubConsumerClient` API - https://learn.microsoft.com/en-us/python/api/azure-eventhub/azure.eventhub.eventhubconsumerclient
- Microsoft Learn: Azure Event Hubs async Python API - https://learn.microsoft.com/en-us/python/api/azure-eventhub/azure.eventhub.aio

## Issues Found
- The original limits table treated "device connections" as a concurrent connection limit of 1,000 per unit and used MB/minute D2C throughput values. Microsoft documents IoT Hub scaling in terms of daily message quota and operation throttles. Updated the table to show D2C send and new device connection throttles, and clarified that the new connection throttle is not the maximum number of simultaneous connections.
- The connection sizing example incorrectly concluded that a million simultaneous devices require 1,000 units. Replaced it with connection-rate math based on documented new-device-connection throttles and the 1,000,000 device/module identity cap.
- The creation example described two S3 units as "redundancy." IoT Hub units add quota and throttle headroom, not redundancy. Updated the comment.
- The partitioning section said IoT Hub distributes device-to-cloud messages round-robin and that a device can set `iothub-partition-key`. Microsoft documents that IoT Hub does not allow arbitrary partitioning for device-to-cloud messages and partitions them by originating `deviceId`. Removed the unsupported partition-key code and updated the explanation.
- The telemetry message example used single quotes in a JSON payload while declaring `application/json`. Changed the example to valid JSON.
- The processing section referred to `EventProcessorClient`, while the Python sample uses the current `EventHubConsumerClient`. Updated the text and summary to match the Python SDK.
- The checkpoint call in the batch-processing example omitted the event to checkpoint. Updated it to checkpoint the last event in a non-empty batch.
- The routing guidance claimed body-based route queries are slower than property-based queries. Replaced that with the documented requirement that body-based queries need a valid JSON body and correct content type/encoding.
- The throttling alert used `d2c.telemetry.egress.dropped`, which is for routed messages dropped because endpoints are dead. Changed the alert and metric list to use `d2c.telemetry.ingress.sendThrottle` for device throughput throttling errors.

## Review Notes
The local workspace does not have the Azure CLI installed, so command verification was done against the official Microsoft Learn CLI reference rather than local `az --help` output.
