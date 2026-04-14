# How to Use Dapr for Edge Computing Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Edge Computing, IoT, k3s, Lightweight

Description: Deploy Dapr on edge devices using K3s or standalone mode to enable state management, pub/sub, and cloud synchronization for edge computing workloads.

---

## Overview

Dapr's lightweight sidecar runs on resource-constrained edge devices using K3s or standalone mode. Edge deployments use local state stores for offline operation and sync with cloud backends when connectivity is available.

## Running Dapr in Standalone Mode on Edge

```bash
# Install Dapr CLI on edge device
curl -fsSL https://raw.githubusercontent.com/dapr/cli/master/install/install.sh | /bin/bash

# Initialize Dapr in slim mode (no Docker required)
dapr init --slim

# Start your app with Dapr
dapr run \
  --app-id edge-sensor \
  --app-port 8080 \
  --dapr-http-port 3500 \
  --resources-path ./components \
  -- python3 sensor.py
```

## Local State Store for Offline Operation

```yaml
# components/local-statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: localstore
spec:
  type: state.sqlite
  version: v1
  metadata:
  - name: connectionString
    value: "file:/var/dapr/edge-state.db"
```

SQLite state store works without network connectivity.

## Sensor Data Collection with Dapr

```python
import requests
import json
import time
from datetime import datetime

DAPR_URL = "http://localhost:3500"

def get_pending_keys():
    # Retrieve the list of keys waiting to be synced
    response = requests.get(f"{DAPR_URL}/v1.0/state/localstore/pending-keys")
    if response.status_code == 200 and response.json():
        return response.json()
    return []

def save_pending_keys(keys):
    requests.post(
        f"{DAPR_URL}/v1.0/state/localstore",
        json=[{"key": "pending-keys", "value": keys}]
    )

def collect_and_store(sensor_id, reading):
    key = f"sensor-{sensor_id}-{int(time.time())}"
    data = {
        "sensorId": sensor_id,
        "reading": reading,
        "timestamp": datetime.utcnow().isoformat()
    }

    # Store reading locally (works offline)
    requests.post(
        f"{DAPR_URL}/v1.0/state/localstore",
        json=[{"key": key, "value": data}]
    )

    # Track the key in a pending list for later sync
    pending = get_pending_keys()
    pending.append(key)
    save_pending_keys(pending)

def sync_to_cloud():
    pending = get_pending_keys()
    remaining = []

    for key in pending:
        # Retrieve the stored reading
        response = requests.get(f"{DAPR_URL}/v1.0/state/localstore/{key}")
        if response.status_code != 200 or not response.json():
            continue
        data = response.json()

        # Publish to cloud pub/sub (best-effort)
        try:
            requests.post(
                f"{DAPR_URL}/v1.0/publish/cloud-pubsub/sensor-data",
                json=data,
                timeout=5
            )
        except requests.exceptions.RequestException:
            remaining.append(key)  # Will retry on next sync cycle

    save_pending_keys(remaining)
```

## Cloud Pub/Sub Component (Sync When Online)

```yaml
# components/cloud-pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: cloud-pubsub
spec:
  type: pubsub.mqtt3
  version: v1
  metadata:
  - name: url
    value: "ssl://iot-hub.example.com:8883"
  - name: qos
    value: "1"
  - name: retain
    value: "false"
  - name: cleanSession
    value: "true"
  - name: caCert
    secretKeyRef:
      name: iot-certs
      key: ca.crt
```

## Deploying Dapr on K3s at the Edge

```bash
# Install K3s (lightweight Kubernetes)
curl -sfL https://get.k3s.io | sh -

# Install Dapr on K3s
dapr init -k \
  --set global.ha.enabled=false \
  --set dapr_sidecar_injector.replicaCount=1 \
  --set dapr_operator.replicaCount=1

# Verify
kubectl get pods -n dapr-system
```

## Resource Limits for Edge Deployments

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: edge-sensor-app
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "edge-sensor"
        dapr.io/sidecar-cpu-limit: "100m"
        dapr.io/sidecar-memory-limit: "64Mi"
        dapr.io/sidecar-cpu-request: "50m"
        dapr.io/sidecar-memory-request: "32Mi"
```

## Handling Connectivity Interruptions

```python
def publish_with_fallback(topic, data):
    try:
        # Try cloud publish first
        requests.post(
            f"{DAPR_URL}/v1.0/publish/cloud-pubsub/{topic}",
            json=data, timeout=3
        )
    except requests.exceptions.RequestException:
        # Fall back to local queue
        requests.post(
            f"{DAPR_URL}/v1.0/state/localstore",
            json=[{"key": f"pending-{topic}-{time.time()}", "value": data}]
        )
```

## Summary

Dapr runs effectively on edge devices in standalone mode with SQLite for offline state storage and MQTT for cloud synchronization. Use K3s for orchestrated edge deployments with tight resource limits on the Dapr sidecar (100m CPU, 64Mi memory). Implement a local-first, sync-when-connected pattern using SQLite as the offline buffer and cloud pub/sub for eventual delivery, handling network interruptions gracefully with local fallbacks.
