# How to Use Dapr with Kubernetes Ephemeral Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Ephemeral Container, Debugging, Troubleshooting

Description: Use Kubernetes ephemeral containers to debug live Dapr-enabled pods without restarting them, inspect sidecar state, and diagnose production issues in real time.

---

## Overview

Ephemeral containers are temporary containers you inject into a running pod for debugging. Unlike init containers, they are not defined in the pod spec ahead of time - you add them on demand using `kubectl debug`. This is especially useful for debugging Dapr sidecar issues in distroless or minimal container images.

## Attaching a Debug Container to a Dapr Pod

Find the pod you want to debug and attach an ephemeral container:

```bash
# List pods (Dapr-injected pods show an extra container in the READY column)
kubectl get pods

# Attach an ephemeral debug container
kubectl debug -it pod/order-service-abc123 \
  --image=busybox:1.36 \
  --target=order-service \
  -- sh
```

The `--target` flag shares the process namespace with the specified container.

## Inspecting Dapr Sidecar from an Ephemeral Container

Once inside the ephemeral container, query the Dapr sidecar's metadata endpoint:

```bash
# Check Dapr sidecar health
wget -qO- http://localhost:3500/v1.0/healthz

# Get Dapr metadata including loaded components
wget -qO- http://localhost:3500/v1.0/metadata

# Check Dapr sidecar version
wget -qO- http://localhost:3500/v1.0/metadata | grep -i version
```

## Debugging Dapr Component Connectivity

Test connectivity to Dapr components from within the pod network:

```bash
# Test Redis connectivity (used by Dapr state store)
nc -w 2 redis-master.default.svc.cluster.local 6379 </dev/null && echo "Connected" || echo "Connection failed"

# Test Kafka connectivity (used by Dapr pub/sub)
nc -w 2 kafka.default.svc.cluster.local 9092 </dev/null && echo "Connected" || echo "Connection failed"

# Check DNS resolution
nslookup dapr-placement-server.dapr-system.svc.cluster.local
```

## Using a Richer Debug Image

For more advanced debugging, use an image with networking and HTTP tools:

```bash
kubectl debug -it pod/order-service-abc123 \
  --image=nicolaka/netshoot:latest \
  --target=daprd \
  -- bash

# Inside the container - check Dapr actor placement
curl http://localhost:3500/v1.0/actors/OrderActor/1234/state/items

# Check current subscriptions
curl http://localhost:3500/v1.0/metadata | jq '.subscriptions'
```

## Checking Dapr Sidecar Logs via Ephemeral Container

Access the Dapr sidecar's log output from the ephemeral container:

```bash
# Share the PID namespace to access /proc
kubectl debug -it pod/order-service-abc123 \
  --image=busybox:1.36 \
  --share-processes \
  -- sh

# Inside: find the daprd process
ps aux | grep daprd
```

## Inspecting Network Traffic

Use tcpdump to capture traffic between the app and the Dapr sidecar:

```bash
kubectl debug -it pod/order-service-abc123 \
  --image=nicolaka/netshoot:latest \
  -- tcpdump -i lo -n port 3500
```

## Summary

Kubernetes ephemeral containers are invaluable for debugging live Dapr-enabled pods without causing service interruptions. By attaching debug containers that share the pod's network namespace, you can query Dapr's HTTP API, test component connectivity, and inspect sidecar state in real time. This approach is particularly useful when your main application container uses a minimal or distroless image that lacks debugging tools.
