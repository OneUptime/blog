# How to Optimize Dapr for Edge Computing Scenarios

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Edge Computing, IoT, Resource, Optimization

Description: Learn how to deploy and optimize Dapr for edge computing environments where CPU, memory, and network bandwidth are constrained.

---

## Overview

Edge computing environments impose strict constraints: limited CPU (often ARM-based), low memory, intermittent connectivity, and no managed Kubernetes infrastructure. Dapr can be deployed at the edge in self-hosted mode with careful resource optimization.

## Self-Hosted Mode for Edge Deployments

At the edge, use Dapr in self-hosted mode without Kubernetes:

```bash
# Install Dapr CLI on edge device
wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | /bin/bash

# Initialize Dapr in slim mode (no Docker required)
dapr init --slim
```

Slim mode installs only the daprd binary without Docker containers for Redis and Zipkin.

## Minimal Component Configuration

Use only the components your edge app needs:

```yaml
# edge-statestore.yaml - lightweight SQLite state store
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.sqlite
  version: v1
  metadata:
  - name: connectionString
    value: "/data/dapr-state.db"
```

Start with only required components:

```bash
dapr run \
  --app-id edge-sensor \
  --app-port 8080 \
  --resources-path ./components \
  --log-level error \
  --enable-metrics=false \
  -- python sensor_app.py
```

## Reduce Binary Size

Build a custom daprd binary with a smaller footprint:

```bash
# Clone the Dapr repository
git clone https://github.com/dapr/dapr.git
cd dapr

# Build with reduced binary size (strip debug info and symbols)
go build \
  -ldflags "-s -w" \
  -o daprd-slim \
  ./cmd/daprd
```

## Configure for Intermittent Connectivity

Handle disconnected scenarios with retry policies:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: edge-resiliency
spec:
  policies:
    retries:
      cloudRetry:
        policy: exponential
        initialInterval: 1s
        maxInterval: 60s
        maxRetries: -1   # Retry indefinitely until connected
    circuitBreakers:
      cloudCircuitBreaker:
        maxRequests: 1
        timeout: 30s
        trip: consecutiveFailures >= 3
  targets:
    components:
      cloud-pubsub:
        outbound:
          retry: cloudRetry
          circuitBreaker: cloudCircuitBreaker
```

## Local-First Architecture

Queue events locally when disconnected, sync when connected:

```python
from dapr.clients import DaprClient
import sqlite3, json

def publish_event_local_first(event: dict):
    # Try cloud first
    try:
        with DaprClient() as client:
            client.publish_event("cloud-pubsub", "sensor-data",
                                 json.dumps(event))
    except Exception:
        # Fall back to local SQLite queue
        conn = sqlite3.connect("/data/event-queue.db")
        conn.execute("INSERT INTO events (data) VALUES (?)",
                     [json.dumps(event)])
        conn.commit()
        conn.close()
```

## ARM-Specific Optimizations

For ARM edge devices (Raspberry Pi, NVIDIA Jetson):

```bash
# Set GOMAXPROCS to match physical cores
export GOMAXPROCS=4

# Tune Go runtime for constrained memory
export GOMEMLIMIT=128MiB
export GOGC=30   # Aggressive GC for low memory
```

## Summary

Deploying Dapr at the edge requires using self-hosted slim mode, minimizing loaded components, configuring aggressive retry policies for intermittent connectivity, and tuning Go runtime parameters for constrained ARM hardware. A local-first architecture that queues events locally and syncs when connected ensures reliable operation even with unstable network links.
