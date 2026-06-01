# Validation Summary: Connect Downstream Devices to Azure IoT Central Through an IoT Edge Gateway

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure IoT Edge
- Azure IoT Central
- IoT Edge transparent gateways
- IoT Edge deployment manifests
- IoT Edge certificates and trust bundles
- MQTT and AMQP downstream device connectivity
- Azure IoT Device SDK for Node.js
- DTDL v2

## Sources Consulted
- Microsoft Learn: Configure an IoT Edge device to act as a transparent gateway - https://learn.microsoft.com/en-us/azure/iot-edge/how-to-create-transparent-gateway
- Microsoft Learn: Connect a downstream device to an Azure IoT Edge gateway - https://learn.microsoft.com/en-us/azure/iot-edge/how-to-connect-downstream-device
- Microsoft Learn: Create and provision an IoT Edge device on Linux using symmetric keys - https://learn.microsoft.com/en-us/azure/iot-edge/how-to-provision-single-device-linux-symmetric
- Microsoft Learn: Create demo certificates to test IoT Edge device features - https://learn.microsoft.com/en-us/azure/iot-edge/how-to-create-test-certificates
- Microsoft Learn: Understand how IoT Edge uses certificates for security - https://learn.microsoft.com/en-us/azure/iot-edge/iot-edge-certs
- Microsoft Learn: Manage IoT Edge certificates - https://learn.microsoft.com/en-us/azure/iot-edge/how-to-manage-device-certificates
- Microsoft Learn: Configure Azure IoT Edge device settings - https://learn.microsoft.com/en-us/azure/iot-edge/configure-device
- Microsoft Learn: Use Azure IoT Edge as a gateway for downstream devices - https://learn.microsoft.com/en-us/azure/iot-edge/iot-edge-as-gateway
- Microsoft Learn: Configure container create options for Azure IoT Edge modules - https://learn.microsoft.com/en-us/azure/iot-edge/how-to-use-create-options
- Microsoft Learn: Azure IoT Edge lifecycle - https://learn.microsoft.com/en-us/lifecycle/products/azure-iot-edge

## Issues Found
- The introduction and description implied that the transparent gateway pattern handles native protocols such as Modbus or BLE. Updated the wording to clarify that transparent gateways require downstream devices to use IoT Hub protocols such as MQTT or AMQP, and that native protocol support requires a protocol translation gateway.
- The deployment manifest used IoT Edge 1.4 container images. Updated the examples to IoT Edge 1.5 because Microsoft documents IoT Edge 1.5 LTS as the supported release and IoT Edge 1.4 LTS reached end of life on November 12, 2024.
- The transparent gateway manifest did not publish the Edge Hub ports needed for downstream connections. Added Edge Hub `createOptions` port bindings for HTTPS 443, AMQP 5671, and MQTT 8883.
- The certificate-generation commands ran directly from the cloned IoT Edge repository instead of the documented working directory. Updated the commands to copy the certificate scripts and `.cnf` files into a working directory before running them.
- The Edge CA certificate example reused a gateway-like name and omitted the gateway `hostname` setting. Updated the example to use a separate Edge CA name and added the `hostname` setting that must match downstream devices' `GatewayHostName`.
- The IoT Central device group claim said groups could be based directly on the gateway relationship. Adjusted it to recommend grouping by downstream template or cloud properties that identify the facility.

## Review Notes
The post remains a transparent gateway tutorial. It does not cover implementing a protocol translation module for Modbus, BLE, or OPC UA devices, which would be a separate gateway pattern and implementation.
