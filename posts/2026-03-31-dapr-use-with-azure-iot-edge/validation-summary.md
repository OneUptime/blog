# Validation Summary: How to Use Dapr with Azure IoT Edge

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Dapr (runtime sidecar, version 1.13.0)
- Azure IoT Edge (module deployment manifests)
- Azure Blob Storage (Dapr state store component)
- MQTT 3 (Dapr pub/sub component for IoT Hub)
- Python (application module code using Dapr HTTP API)
- Azure CLI (`az iot edge`, `az iot hub` commands)
- Docker (container configuration via IoT Edge createOptions)

## Sources Consulted
- Dapr documentation on daprd CLI flags and `--resources-path` (renamed from `--components-path` in Dapr 1.11): https://docs.dapr.io/reference/cli/dapr-run/
- Dapr MQTT3 pub/sub component specification: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-mqtt3/
- Eclipse Paho MQTT Go client library (supported URI schemes: `tcp://`, `ssl://`, `ws://`, `wss://`): https://github.com/eclipse/paho.mqtt.golang
- Dapr state store component for Azure Blob Storage: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-azure-blobstorage/
- Azure IoT Edge deployment manifest schema: https://learn.microsoft.com/en-us/azure/iot-edge/module-composition
- Azure CLI IoT extension commands: https://learn.microsoft.com/en-us/cli/azure/iot/edge/deployment

## Issues Found

1. **Architecture diagram code block language**: The text diagram was wrapped in a ` ```json ` code block, but it is not JSON — it is a plain text diagram. Changed to ` ```text `.

2. **Daprd module uses invalid environment variables instead of CLI flags**: The daprd Docker module was configured with environment variables `APP_ID`, `APP_PORT`, and `COMPONENTS_PATH`. The `daprd` binary does not read these environment variables — it requires CLI flags (`--app-id`, `--app-port`, `--resources-path`). Fixed by removing the `env` block and passing the arguments via Docker `Cmd` in `createOptions`. Also used the current flag name `--resources-path` (the old `--components-path` was deprecated in Dapr 1.11).

3. **MQTT URL scheme `tcps://` is invalid**: The Dapr MQTT3 pub/sub component uses the Eclipse Paho MQTT Go client, which supports `tcp://`, `ssl://`, `ws://`, and `wss://` schemes. The `tcps://` scheme is not recognized. Changed to `ssl://myhub.azure-devices.net:8883`.

## Review Notes
- The `json` import in the Python code is unused but this is minor and does not affect functionality.
- The Dapr image version `1.13.0` is valid but not the latest. Future readers may want to update to a newer version.
- The IoT Edge deployment manifest shown is a simplified excerpt; a production deployment would also need `$edgeHub` desired properties and system module configuration.
- The blog mentions SQLite for offline-capable state in the summary, but no SQLite component example is shown. This is not incorrect, just a mention without a corresponding code example.
