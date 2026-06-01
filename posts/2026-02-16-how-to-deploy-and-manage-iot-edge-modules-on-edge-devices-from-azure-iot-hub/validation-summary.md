# Validation Summary: How to Deploy and Manage IoT Edge Modules on Edge Devices from Azure IoT Hub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure IoT Edge 1.5
- Azure IoT Hub
- Azure CLI with the azure-iot extension
- Azure Container Registry
- IoT Edge deployment manifests
- IoT Edge automatic and layered deployments
- Python Azure IoT Device SDK
- Docker/Moby containers

## Sources Consulted
- Microsoft Learn: Create and provision an IoT Edge device on Linux using symmetric keys - https://learn.microsoft.com/en-us/azure/iot-edge/how-to-provision-single-device-linux-symmetric
- Microsoft Learn: Deploy modules and establish routes in Azure IoT Edge - https://learn.microsoft.com/en-us/azure/iot-edge/module-composition
- Microsoft Learn: Operate Azure IoT Edge devices offline - https://learn.microsoft.com/en-us/azure/iot-edge/offline-capabilities
- Microsoft Learn: Azure CLI `az iot edge deployment` reference - https://learn.microsoft.com/en-us/cli/azure/iot/edge/deployment
- Microsoft Learn: Azure CLI `az iot hub device-identity connection-string` reference - https://learn.microsoft.com/en-us/cli/azure/iot/hub/device-identity/connection-string
- Microsoft Learn: Azure CLI `az iot hub module-twin` reference - https://learn.microsoft.com/en-us/cli/azure/iot/hub/module-twin
- Microsoft Learn: Azure CLI `az acr build` reference - https://learn.microsoft.com/en-us/cli/azure/acr
- Microsoft Learn: Python `azure.iot.device.aio.IoTHubModuleClient` API reference - https://learn.microsoft.com/en-us/python/api/azure-iot-device/azure.iot.device.aio.iothubmoduleclient

## Issues Found
- The prerequisites said IoT Hub S1 or higher was required. Microsoft documentation supports free or standard IoT hubs for IoT Edge registration, so the prerequisite was changed to "free or standard tier."
- The device prerequisite and install commands referred to Docker generically and installed `defender-iot-micro-agent-edge` instead of the officially supported Moby engine. The post now names Moby as the supported production container runtime and installs `moby-engine aziot-edge`.
- The runtime verification section implied both `edgeAgent` and `edgeHub` should run immediately after provisioning the device. Microsoft documentation notes a valid deployment manifest is required; the section now says `edgeHub` starts after applying a manifest that includes `$edgeHub`.
- The Python module used `nonlocal TEMPERATURE_THRESHOLD` inside `main()`, but `TEMPERATURE_THRESHOLD` is a module-level variable. That would raise a syntax error, so it was changed to `global TEMPERATURE_THRESHOLD`.
- The layered deployment explanation was too broad. It now states that layered deployments combine with a base deployment, can add or update modules/routes/properties, and must have higher priority than the device's base deployment.

## Review Notes
- Azure IoT Edge 1.5 LTS is the current supported release referenced by Microsoft documentation. The post's use of `mcr.microsoft.com/azureiotedge-agent:1.5` and `mcr.microsoft.com/azureiotedge-hub:1.5` is consistent with that.
- The Azure CLI commands use the current `az iot hub device-identity connection-string show`, `az iot edge set-modules`, `az iot edge deployment create`, and `az iot hub module-twin show` command shapes from the Azure IoT CLI extension.
- The route syntax, `$edgeHub` `storeAndForwardConfiguration.timeToLiveSecs`, and deployment manifest `schemaVersion` 1.1 are consistent with current Azure IoT Edge documentation.
