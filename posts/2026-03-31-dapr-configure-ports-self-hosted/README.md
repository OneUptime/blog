# How to Configure Dapr Ports in Self-Hosted Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Port, Configuration, Self-Hosted, Network

Description: Configure custom Dapr HTTP, gRPC, and metrics ports in self-hosted mode to avoid conflicts and align with your application network requirements.

---

## Overview

By default Dapr uses port 3500 for HTTP, 50001 for gRPC, and 9090 for metrics. When running multiple apps or when these ports conflict with other services, you need to customize them.

## Default Port Reference

| Port | Purpose |
|------|---------|
| 3500 | Dapr HTTP API |
| 50001 | Dapr gRPC API |
| 9090 | Prometheus metrics |
| 50002 | Dapr internal gRPC (Kubernetes only) |

## Step 1: Configure Ports via CLI Flags

```bash
dapr run \
  --app-id orders \
  --app-port 8080 \
  --dapr-http-port 3510 \
  --dapr-grpc-port 50011 \
  --metrics-port 9091 \
  node app.js
```

## Step 2: Access the Custom Ports

```bash
# HTTP API
curl http://localhost:3510/v1.0/metadata

# Metrics
curl http://localhost:9091/metrics | grep dapr_http
```

## Step 3: Configure in Application Code

When using a Dapr SDK, specify the custom sidecar port:

```javascript
const { DaprClient, CommunicationProtocolEnum } = require('@dapr/dapr');

const client = new DaprClient({
  daprHost: '127.0.0.1',
  daprPort: '3510',        // custom HTTP port
  communicationProtocol: CommunicationProtocolEnum.HTTP,
});

await client.state.save('statestore', [{ key: 'k', value: 'v' }]);
```

```python
from dapr.clients import DaprClient

# Set via environment variable
import os
os.environ['DAPR_HTTP_PORT'] = '3510'

with DaprClient() as client:
    client.save_state('statestore', 'k', b'v')
```

## Step 4: Set Ports via Environment Variables

```bash
export DAPR_HTTP_PORT=3510
export DAPR_GRPC_PORT=50011
dapr run --app-id orders node app.js
```

## Step 5: Multi-App Port Strategy

Define a port map for your local stack:

```bash
#!/bin/bash
# start-all.sh

dapr run --app-id orders --app-port 8001 \
  --dapr-http-port 3501 --dapr-grpc-port 50001 &

dapr run --app-id inventory --app-port 8002 \
  --dapr-http-port 3502 --dapr-grpc-port 50002 &

dapr run --app-id payment --app-port 8003 \
  --dapr-http-port 3503 --dapr-grpc-port 50003 &

wait
```

## Step 6: Check for Port Conflicts

```bash
# Check which process is using port 3500
lsof -i :3500
# or
ss -tlnp | grep 3500
```

## Summary

Customizing Dapr ports in self-hosted mode is done through `--dapr-http-port`, `--dapr-grpc-port`, and `--metrics-port` flags on the `dapr run` command. Environment variables offer a cleaner alternative for consistent configuration across scripts. Proper port planning prevents conflicts when running multiple Dapr applications on a single machine.
