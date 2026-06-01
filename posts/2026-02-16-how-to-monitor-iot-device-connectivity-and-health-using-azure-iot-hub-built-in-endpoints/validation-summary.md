# Validation Summary: How to Monitor IoT Device Connectivity and Health Using Azure IoT Hub Built-In

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure IoT Hub
- Azure IoT Hub built-in Event Hubs-compatible endpoint
- Azure IoT Hub message routing
- Azure Monitor metrics and metric alerts
- Azure IoT Hub device twins
- Azure IoT Hub Node.js SDKs (`azure-iot-device`, `azure-iothub`)
- Azure Event Hubs JavaScript SDK (`@azure/event-hubs`)
- Azure CLI

## Sources Consulted
- Azure IoT Hub built-in endpoint documentation: https://learn.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-messages-read-builtin
- Azure IoT Hub non-telemetry event schemas: https://learn.microsoft.com/en-us/azure/iot-hub/iot-hub-non-telemetry-event-schema
- Azure IoT Hub message routing CLI documentation: https://learn.microsoft.com/en-us/cli/azure/iot/hub/message-route
- Azure IoT Hub route and endpoint management with Azure CLI: https://learn.microsoft.com/en-us/previous-versions/azure/iot-hub/how-to-routing-azure-cli
- Azure IoT Hub monitoring data reference: https://learn.microsoft.com/en-us/azure/iot-hub/monitor-iot-hub-reference
- Azure IoT Hub device connection status guidance: https://learn.microsoft.com/en-us/azure/iot-hub/monitor-device-connection-state
- Azure IoT Hub query language documentation: https://learn.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-query-language
- Azure Event Hubs JavaScript SDK API reference: https://learn.microsoft.com/en-us/javascript/api/@azure/event-hubs/eventhubconsumerclient
- Azure IoT Hub Node.js Registry API reference: https://learn.microsoft.com/en-us/javascript/api/azure-iothub/registry
- Azure IoT Hub Node.js device Client API reference: https://learn.microsoft.com/en-us/javascript/api/azure-iot-device/client

## Issues Found
- The post used the old `az iot hub route create` command group. Current Azure IoT CLI documentation uses `az iot hub message-route create`, and the built-in endpoint is specified with `--endpoint-name events`. Updated both route examples.
- The post described lifecycle events as device connection and disconnection events. Azure IoT Hub distinguishes device lifecycle events, such as create and delete, from device connection state events. Updated the explanation and command comments.
- The Node.js Event Hubs consumer read `opType` from `event.body`. IoT Hub non-telemetry event schemas define `opType` as an application property, while the body contains the connection state sequence number. Updated the sample to read `event.properties?.opType`.
- The `dailyMessageQuotaUsed` metric was described as a percentage. Azure Monitor documents it as the number of total messages used today. Updated the metric description.
- The practical tip suggested querying device twins for an exact moment-in-time connection count. Azure documentation warns that device twin `connectionState` is delayed and should not be used for production runtime checks. Updated the recommendation to use connection events with sequence numbers or an application heartbeat pattern for production-grade per-device presence.

## Review Notes
Azure CLI was not installed in the local environment, so CLI validation was performed against the official Microsoft Learn Azure CLI reference instead of local `az --help` output.
