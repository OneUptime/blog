# How to Enable Dapr Sidecar on Azure Container Apps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure Container Apps, Sidecar, Configuration, Azure

Description: Enable and configure the Dapr sidecar on existing Azure Container Apps, including app ID, port, protocol, and logging settings via CLI and portal.

---

## Overview

Enabling the Dapr sidecar on an Azure Container App injects the Dapr runtime alongside your container, providing access to all Dapr building blocks: state management, pub/sub, service invocation, secrets, and more.

## Prerequisites

- Existing Azure Container Apps environment
- Azure CLI v2.50+

## Step 1: Enable Dapr on a New Container App

```bash
az containerapp create \
  --name inventory-service \
  --resource-group rg-dapr-demo \
  --environment aca-dapr-env \
  --image myacr.azurecr.io/inventory:v2 \
  --target-port 8080 \
  --enable-dapr \
  --dapr-app-id inventory-service \
  --dapr-app-port 8080 \
  --dapr-app-protocol http
```

## Step 2: Enable Dapr on an Existing App

```bash
az containerapp dapr enable \
  --name inventory-service \
  --resource-group rg-dapr-demo \
  --dapr-app-id inventory-service \
  --dapr-app-port 8080 \
  --dapr-app-protocol http
```

## Step 3: Configure gRPC Protocol

For gRPC applications:

```bash
az containerapp dapr enable \
  --name grpc-service \
  --resource-group rg-dapr-demo \
  --dapr-app-id grpc-service \
  --dapr-app-port 50051 \
  --dapr-app-protocol grpc
```

## Step 4: Enable Dapr API Logging

```bash
az containerapp dapr enable \
  --name inventory-service \
  --resource-group rg-dapr-demo \
  --dapr-enable-api-logging \
  --dapr-log-level debug
```

## Step 5: View Sidecar Configuration

```bash
az containerapp show \
  --name inventory-service \
  --resource-group rg-dapr-demo \
  --query 'properties.configuration.dapr' \
  --output json
```

Expected output:

```json
{
  "appId": "inventory-service",
  "appPort": 8080,
  "appProtocol": "http",
  "enabled": true,
  "enableApiLogging": true,
  "logLevel": "debug"
}
```

## Step 6: Access Dapr APIs from Within the Container

When the sidecar is enabled, Dapr is available at `localhost:3500`:

```python
import requests

# Service invocation - call orders-service
response = requests.get(
    'http://localhost:3500/v1.0/invoke/orders-service/method/getOrder',
    params={'id': '123'}
)
print(response.json())

# Save state
requests.post(
    'http://localhost:3500/v1.0/state/statestore',
    json=[{'key': 'item-1', 'value': {'qty': 10}}]
)
```

## Step 7: Disable Dapr Sidecar

```bash
az containerapp dapr disable \
  --name inventory-service \
  --resource-group rg-dapr-demo
```

## Summary

Enabling the Dapr sidecar on Azure Container Apps is a single CLI command that automatically injects the Dapr runtime and configures it with your chosen app ID, port, and protocol. Once enabled, all Dapr APIs are available at `localhost:3500` inside the container. API logging and debug log levels can be configured to aid troubleshooting in staging environments.
