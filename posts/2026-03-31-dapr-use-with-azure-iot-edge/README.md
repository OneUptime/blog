# How to Use Dapr with Azure IoT Edge

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure IoT Edge, IoT, Edge Computing, Azure

Description: Integrate Dapr with Azure IoT Edge modules to leverage state management, pub/sub, and service invocation for industrial IoT and edge AI workloads.

---

## Overview

Azure IoT Edge runs Docker containers as modules on edge devices. You can deploy Dapr as a module alongside your application modules, enabling Dapr's building blocks for local inter-module communication and cloud-synchronized state.

## IoT Edge Module Architecture

In IoT Edge, each module is a Docker container. Dapr runs as a sidecar to your application module using the IoT Edge networking model:

```text
[Sensor Module] -> [App Module + Dapr Sidecar] -> [IoT Hub / Azure Storage]
```

## Dapr Module Configuration for IoT Edge

```json
{
  "modulesContent": {
    "$edgeAgent": {
      "properties.desired": {
        "modules": {
          "app": {
            "type": "docker",
            "settings": {
              "image": "myacr.azurecr.io/edge-app:latest"
            },
            "env": {
              "DAPR_HTTP_PORT": {"value": "3500"}
            }
          },
          "daprd": {
            "type": "docker",
            "settings": {
              "image": "daprio/daprd:1.13.0",
              "createOptions": "{\"HostConfig\":{\"NetworkMode\":\"host\"},\"Cmd\":[\"./daprd\",\"--app-id\",\"edge-app\",\"--app-port\",\"8080\",\"--resources-path\",\"/components\"]}"
            }
          }
        }
      }
    }
  }
}
```

## Dapr Component: Azure Blob Storage State

```yaml
# components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.azure.blobstorage
  version: v1
  metadata:
  - name: accountName
    value: "myedgestorage"
  - name: accountKey
    secretKeyRef:
      name: azure-storage-secret
      key: accountKey
  - name: containerName
    value: "edge-device-state"
```

## Dapr Component: IoT Hub Pub/Sub via MQTT

```yaml
# components/pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: iothub-pubsub
spec:
  type: pubsub.mqtt3
  version: v1
  metadata:
  - name: url
    value: "ssl://myhub.azure-devices.net:8883"
  - name: clientID
    value: "edge-device-001"
  - name: username
    value: "myhub.azure-devices.net/edge-device-001/?api-version=2021-04-12"
  - name: password
    secretKeyRef:
      name: iot-sas-token
      key: token
  - name: qos
    value: "1"
```

## Application Module: Telemetry Processing

```python
import requests
import json
import os

DAPR_URL = f"http://localhost:{os.getenv('DAPR_HTTP_PORT', '3500')}"
DEVICE_ID = os.getenv("IOTEDGE_DEVICEID", "unknown-device")

def process_telemetry(telemetry):
    # Save latest reading to state store
    requests.post(
        f"{DAPR_URL}/v1.0/state/statestore",
        json=[{
            "key": f"{DEVICE_ID}-latest",
            "value": telemetry
        }]
    )

    # Alert if threshold exceeded
    if telemetry.get("temperature", 0) > 80:
        requests.post(
            f"{DAPR_URL}/v1.0/publish/iothub-pubsub/alerts",
            json={
                "deviceId": DEVICE_ID,
                "alert": "high-temperature",
                "value": telemetry["temperature"]
            }
        )

def call_local_inference_module(data):
    # Service invocation to local AI module
    resp = requests.post(
        f"{DAPR_URL}/v1.0/invoke/inference-module/method/predict",
        json=data
    )
    return resp.json()
```

## Deploying via Azure CLI

```bash
# Deploy IoT Edge deployment with Dapr modules
az iot edge deployment create \
  --deployment-id dapr-edge-deployment \
  --hub-name myhub \
  --content deployment.json \
  --target-condition "tags.environment='production'"

# Monitor module status
az iot hub module-identity list \
  --device-id edge-device-001 \
  --hub-name myhub \
  --output table
```

## Local Service Discovery Between Modules

Dapr service invocation works between IoT Edge modules on the same device:

```python
# Call another module's API via Dapr
def call_filter_module(raw_data):
    resp = requests.post(
        f"{DAPR_URL}/v1.0/invoke/filter-module/method/process",
        json=raw_data
    )
    return resp.json()
```

## Summary

Dapr integrates with Azure IoT Edge by running as an additional module alongside your application modules. Use Azure Blob Storage or SQLite for offline-capable state, MQTT pub/sub for IoT Hub connectivity, and Dapr service invocation for local inter-module communication. This provides a consistent programming model for both edge and cloud components, reducing the complexity of building hybrid IoT applications.
