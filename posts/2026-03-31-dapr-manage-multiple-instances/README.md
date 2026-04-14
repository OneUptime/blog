# How to Manage Multiple Dapr Instances Locally

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Multi-Instance, Local Development, Process, Management

Description: Manage multiple Dapr sidecar instances locally using the Dapr CLI, process management tools, and multi-app run templates for complex microservice topologies.

---

## Overview

Complex microservice applications require running many Dapr sidecars simultaneously. This guide covers techniques for starting, monitoring, and stopping multiple Dapr instances efficiently on a local machine.

## Option 1: Manual Multi-Terminal Approach

Open a terminal for each service:

```bash
# Terminal 1
dapr run --app-id api-gateway --app-port 8000 --dapr-http-port 3500 node gateway.js

# Terminal 2
dapr run --app-id user-service --app-port 8001 --dapr-http-port 3501 python3 users.py

# Terminal 3
dapr run --app-id product-service --app-port 8002 --dapr-http-port 3502 go run main.go
```

## Option 2: Shell Script

```bash
#!/bin/bash
# start-services.sh

set -e

echo "Starting Dapr services..."

dapr run --app-id api-gateway \
  --app-port 8000 --dapr-http-port 3500 \
  node gateway.js &
GATEWAY_PID=$!

dapr run --app-id user-service \
  --app-port 8001 --dapr-http-port 3501 \
  python3 users.py &
USER_PID=$!

dapr run --app-id product-service \
  --app-port 8002 --dapr-http-port 3502 \
  go run main.go &
PRODUCT_PID=$!

echo "Services started: $GATEWAY_PID $USER_PID $PRODUCT_PID"
echo "$GATEWAY_PID $USER_PID $PRODUCT_PID" > /tmp/dapr-pids.txt

wait
```

Stop all:

```bash
#!/bin/bash
# stop-services.sh
cat /tmp/dapr-pids.txt | xargs kill
dapr list | awk 'NR>1{print $1}' | xargs -I{} dapr stop --app-id {}
```

## Option 3: Multi-App Run Template

Create a `dapr.yaml` file:

```yaml
version: 1
common:
  resourcesPath: ./components
apps:
  - appID: api-gateway
    appDirPath: ./gateway
    appPort: 8000
    daprHTTPPort: 3500
    command: ["node", "app.js"]
  - appID: user-service
    appDirPath: ./users
    appPort: 8001
    daprHTTPPort: 3501
    command: ["python3", "app.py"]
  - appID: product-service
    appDirPath: ./products
    appPort: 8002
    daprHTTPPort: 3502
    command: ["go", "run", "main.go"]
```

Run all at once:

```bash
dapr run -f dapr.yaml
```

Stop all:

```bash
dapr stop -f dapr.yaml
```

## Monitoring All Instances

```bash
# List all running apps
dapr list

# Get metadata for each
dapr list | awk 'NR>1{print $1}' | while read app; do
  echo "=== $app ==="
  curl -s http://localhost:$(dapr list | grep $app | awk '{print $2}')/v1.0/metadata
done
```

## Using the Dashboard

```bash
dapr dashboard
# View all instances at http://localhost:8080
```

## Summary

Managing multiple Dapr instances locally is best handled with the `dapr.yaml` multi-app run template, which starts and stops all services with a single command. For finer control, shell scripts with background processes and a PID file provide a lightweight alternative. The Dapr Dashboard and `dapr list` command give real-time visibility into all running instances.
