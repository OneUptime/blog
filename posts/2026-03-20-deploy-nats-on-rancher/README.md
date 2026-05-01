# How to Deploy NATS on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, NATS, Kubernetes, Messaging, Helm, JetStream

Description: Deploy a NATS messaging cluster on Rancher with JetStream persistence enabled, clustering configured, and connection testing validated.

## Introduction

NATS is an ultra-lightweight, high-performance cloud-native messaging system. It supports publish-subscribe, request-reply, and JetStream (persistent messaging). NATS is ideal for microservices communication due to its minimal resource footprint.

## Prerequisites

- Rancher cluster with `kubectl` and `helm` configured
- StorageClass available for JetStream persistence

## Step 1: Add NATS Helm Repository

```bash
helm repo add nats https://nats-io.github.io/k8s/helm/charts/
helm repo update
```

## Step 2: Create Values File

```yaml
# nats-values.yaml

config:
  cluster:
    enabled: true
    replicas: 3    # Three-node cluster

  jetstream:
    enabled: true    # Enable persistent messaging
    fileStore:
      enabled: true
      dir: /data/jetstream
      pvc:
        size: 20Gi
        storageClassName: longhorn

container:
  resources:
    requests:
      memory: "128Mi"
      cpu: "100m"
    limits:
      memory: "512Mi"
      cpu: "500m"

promExporter:
  enabled: true    # Prometheus metrics exporter
```

## Step 3: Deploy NATS

```bash
kubectl create namespace messaging

helm install nats nats/nats \
  --namespace messaging \
  --values nats-values.yaml
```

## Step 4: Verify Cluster

```bash
# Check NATS server pods
kubectl get pods -n messaging -l app.kubernetes.io/component=nats

# Wait for the StatefulSet to become ready
kubectl rollout status statefulset/nats -n messaging
```

## Step 5: Test Publish/Subscribe

Use the NATS CLI from the `nats-box` deployment that the chart installs by default.

```bash
# Subscribe in one terminal
kubectl exec -it deployment/nats-box -n messaging -- \
  nats sub test.subject

# Publish from another terminal
kubectl exec -it deployment/nats-box -n messaging -- \
  nats pub test.subject "Hello from NATS!"
```

## Step 6: Create a JetStream Stream

JetStream adds persistence and replay capabilities to NATS subjects.

```bash
# Create a stream
kubectl exec -it deployment/nats-box -n messaging -- \
  nats stream add EVENTS \
  --subjects "events.*" \
  --storage file \
  --replicas 3 \
  --max-msgs=-1 \
  --max-bytes=-1 \
  --max-age=24h \
  --defaults
```

## Step 7: Connect Applications

```yaml
# Application environment variable for NATS connection
env:
  - name: NATS_URL
    value: "nats://nats.messaging.svc.cluster.local:4222"
```

## Conclusion

NATS is running on Rancher with clustering and JetStream persistence. Its lightweight nature makes it suitable for edge deployments and high-frequency microservice communication. The Prometheus exporter exposes metrics for collection when enabled.
