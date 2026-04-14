# How to Configure Dapr Graceful Shutdown

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Shutdown, Graceful, Kubernetes, Reliability

Description: Learn how to configure Dapr graceful shutdown to ensure in-flight requests complete and resources are released cleanly before pod termination.

---

## Overview

When Kubernetes terminates a pod, Dapr needs time to drain in-flight requests, close component connections, and deregister from the service mesh. Without proper graceful shutdown configuration, you risk dropped requests, data loss, and inconsistent state during rolling updates.

## How Dapr Graceful Shutdown Works

When a pod receives `SIGTERM`:
1. Kubernetes stops sending new traffic to the pod
2. Dapr shuts down its API endpoints, causing its health probes to fail
3. Dapr waits for in-flight requests to complete
4. Dapr closes component connections (state stores, pub/sub, bindings, etc.)
5. The sidecar exits

## Configuring Shutdown Timeout

Set the Dapr graceful shutdown timeout:

```yaml
annotations:
  dapr.io/graceful-shutdown-seconds: "30"
```

This gives Dapr 30 seconds to drain before forcing shutdown.

## Kubernetes terminationGracePeriodSeconds

The Kubernetes termination grace period must be longer than Dapr's shutdown timeout:

```yaml
spec:
  terminationGracePeriodSeconds: 60  # Longer than dapr.io/graceful-shutdown-seconds
  containers:
  - name: myapp
    ...
```

## Application-Level Graceful Shutdown

Your application also needs to handle `SIGTERM`:

```python
import signal
import sys
from flask import Flask

app = Flask(__name__)
shutting_down = False

def handle_sigterm(sig, frame):
    global shutting_down
    shutting_down = True
    print("SIGTERM received, stopping gracefully...")
    # Wait for in-flight requests to complete
    # Then exit
    sys.exit(0)

signal.signal(signal.SIGTERM, handle_sigterm)

@app.route('/health')
def health():
    if shutting_down:
        return {"status": "shutting_down"}, 503
    return {"status": "ok"}, 200
```

## Pre-Stop Hooks

Add a pre-stop hook to delay container shutdown:

```yaml
spec:
  containers:
  - name: myapp
    lifecycle:
      preStop:
        exec:
          command: ["/bin/sh", "-c", "sleep 5"]
```

This gives the load balancer time to remove the pod from rotation before the app stops accepting connections.

## Complete Graceful Shutdown Configuration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "payment-service"
        dapr.io/app-port: "8080"
        dapr.io/graceful-shutdown-seconds: "30"
    spec:
      terminationGracePeriodSeconds: 60
      containers:
      - name: payment-service
        image: myrepo/payment:latest
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 5"]
```

## Verifying Graceful Shutdown

Watch pod events during a rolling update:

```bash
kubectl rollout restart deployment payment-service
kubectl get pods -w -l app=payment-service
# Observe Terminating pods and how long they stay before removal
```

## Summary

Dapr graceful shutdown requires coordination between Dapr's `graceful-shutdown-seconds`, Kubernetes `terminationGracePeriodSeconds`, application SIGTERM handlers, and pre-stop hooks. Set the grace period longer than the longest expected in-flight request duration to ensure zero dropped requests during deployments and node maintenance.
