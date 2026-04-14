# How to Use Dapr with k3s

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, k3s, Lightweight Kubernetes, Edge Computing, IoT

Description: Install and run Dapr on k3s lightweight Kubernetes for edge computing and IoT use cases with minimal resource overhead and local component configuration.

---

k3s is a lightweight Kubernetes distribution ideal for edge nodes, IoT gateways, and resource-constrained environments. Dapr runs well on k3s with a few configuration adjustments to account for its minimal footprint.

## Installing k3s

```bash
# Install k3s with Traefik disabled (optional, saves resources)
curl -sfL https://get.k3s.io | \
  INSTALL_K3S_EXEC="--disable traefik" sh -

# Configure kubectl
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
sudo chmod 644 /etc/rancher/k3s/k3s.yaml

# Verify
kubectl get nodes
```

## Installing Dapr on k3s

k3s uses containerd, which works out of the box with Dapr's Helm installation:

```bash
# Add Dapr Helm repo
helm repo add dapr https://dapr.github.io/helm-charts/
helm repo update

# Install Dapr (single replica for resource-constrained environments)
helm upgrade --install dapr dapr/dapr \
  --namespace dapr-system \
  --create-namespace \
  --set global.ha.enabled=false \
  --set dapr_operator.replicaCount=1 \
  --set dapr_placement.replicaCount=1 \
  --set dapr_sentry.replicaCount=1 \
  --set dapr_scheduler.replicaCount=1 \
  --wait
```

For edge nodes with very limited RAM (2-4 GB), set tighter resource limits:

```bash
helm upgrade --install dapr dapr/dapr \
  --namespace dapr-system \
  --set dapr_operator.resources.requests.memory=64Mi \
  --set dapr_operator.resources.limits.memory=256Mi \
  --set dapr_sentry.resources.requests.memory=64Mi \
  --set dapr_sentry.resources.limits.memory=256Mi
```

## Edge IoT Application with Dapr

A typical k3s edge use case: collect sensor data and publish via Dapr pub/sub:

```python
# sensor_collector.py
import os
import requests
import json
import time
import random

DAPR_PORT = os.getenv("DAPR_HTTP_PORT", "3500")

def read_temperature_sensor():
    # Simulate sensor reading
    return round(random.uniform(20.0, 35.0), 2)

def publish_sensor_data():
    temperature = read_temperature_sensor()
    event = {
        "sensor_id": os.getenv("SENSOR_ID", "sensor-001"),
        "temperature": temperature,
        "unit": "celsius"
    }

    response = requests.post(
        f"http://localhost:{DAPR_PORT}/v1.0/publish/pubsub/sensor-readings",
        headers={"Content-Type": "application/json"},
        data=json.dumps(event)
    )
    print(f"Published: {temperature}C - Status: {response.status_code}")

while True:
    publish_sensor_data()
    time.sleep(30)
```

## k3s Local Storage for State Store

Use a local Redis instance for edge state storage:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis-master.default.svc.cluster.local:6379
  - name: actorStateStore
    value: "false"
```

Deploy a lightweight Redis:

```bash
helm install redis bitnami/redis \
  --set auth.enabled=false \
  --set replica.replicaCount=0 \
  --set master.resources.requests.memory=64Mi \
  --set master.resources.limits.memory=128Mi
```

## Multi-Node k3s Cluster

For k3s clusters with multiple edge nodes, configure a k3s agent:

```bash
# On additional edge nodes, join the cluster
K3S_URL=https://<server-ip>:6443
K3S_TOKEN=<node-token>

curl -sfL https://get.k3s.io | \
  K3S_URL=$K3S_URL \
  K3S_TOKEN=$K3S_TOKEN \
  sh -
```

## Verifying Dapr on k3s

```bash
# Check Dapr components
dapr status -k

# Verify sidecar injection
kubectl get pods -o wide

# Check Dapr metrics endpoint
kubectl port-forward -n dapr-system \
  svc/dapr-operator 9090:9090
curl http://localhost:9090/metrics | grep dapr_
```

## Summary

Dapr on k3s enables lightweight Kubernetes deployments for edge and IoT scenarios. Running single-replica control plane components reduces the resource footprint while preserving all core Dapr building blocks. k3s's containerd runtime works out of the box with Dapr's Helm installation, making it straightforward to build event-driven IoT pipelines on resource-constrained edge hardware.
