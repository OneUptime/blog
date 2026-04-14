# How to Use Dapr with Telepresence for Remote Debugging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Telepresence, Debugging, Development, Kubernetes

Description: Use Telepresence to intercept traffic from a Kubernetes Dapr service to your local machine, enabling real-time debugging with full cluster connectivity.

---

## Overview

Telepresence is a tool that creates a two-way network bridge between your local machine and a Kubernetes cluster. For Dapr development, Telepresence lets you run a single microservice locally while it communicates with other Dapr services, state stores, and pub/sub brokers in the actual cluster, giving you a realistic debugging environment.

## Prerequisites

- Telepresence v2 installed
- Access to a Kubernetes cluster with Dapr
- Dapr CLI installed locally
- Application code on your local machine

## Installing Telepresence

```bash
# macOS
brew install datawire/blackbird/telepresence

# Linux
curl -fL https://github.com/telepresenceio/telepresence/releases/latest/download/telepresence-linux-amd64 \
  -o /usr/local/bin/telepresence
chmod +x /usr/local/bin/telepresence

# Connect the traffic manager to your cluster
telepresence helm install
```

## Connecting to the Cluster

```bash
# Connect Telepresence to the cluster
telepresence connect

# Verify connection
telepresence status
```

## Intercepting a Dapr Service

With Telepresence, you intercept a running Dapr deployment and redirect traffic to your local machine:

```bash
# List available services
telepresence list

# Intercept the order-service deployment
telepresence intercept order-service \
  --port 3001:3001 \
  --env-file .env.cluster
```

The `--env-file` flag exports the pod's environment variables to a file for your local process.

## Running the Service Locally with Dapr

Start the local Dapr sidecar alongside your intercepted service:

```bash
# Use environment variables from the cluster
set -a; source .env.cluster; set +a

# Start Dapr locally pointing to cluster services
dapr run \
  --app-id order-service \
  --app-port 3001 \
  --dapr-http-port 3500 \
  --resources-path ./components/cluster \
  -- node src/index.js
```

Component configuration pointing to cluster services:

```yaml
# components/cluster/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis.default.svc.cluster.local:6379"
```

## Attaching a Debugger

With the service intercepted and running locally, attach your IDE debugger:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Dapr Service",
      "port": 9229,
      "restart": true
    }
  ]
}
```

Start the service with the debugger flag:

```bash
dapr run \
  --app-id order-service \
  --app-port 3001 \
  --resources-path ./components/cluster \
  -- node --inspect=0.0.0.0:9229 src/index.js
```

## Testing the Intercept

From another terminal, invoke the locally running service through the cluster:

```bash
# Invoke the local service through the local Dapr sidecar
curl http://localhost:3500/v1.0/invoke/order-service/method/orders/1001

# Publish to the cluster broker via the local Dapr sidecar; your local service receives it
curl -X POST http://localhost:3500/v1.0/publish/pubsub/orders \
  -d '{"orderId": "test-001"}'
```

## Ending the Session

```bash
# Stop the intercept
telepresence leave order-service

# Disconnect from the cluster
telepresence quit
```

## Summary

Telepresence enables a powerful debugging workflow for Dapr microservices by redirecting cluster traffic to a locally running service with a debugger attached. This approach combines the realism of the actual cluster environment with the convenience of local debugging tools, eliminating the need to rebuild and redeploy containers during debugging sessions.
