# How to Deploy Dapr .NET Apps with Dapr CLI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, DotNet, CLI, Deployment, Local Development, Microservice

Description: Use the Dapr CLI to run, debug, and manage Dapr .NET applications locally with sidecar injection, component loading, and multi-app orchestration.

---

## Overview

The Dapr CLI is the primary tool for running Dapr applications during local development. It handles sidecar lifecycle, component configuration, and port management. For .NET applications it wraps `dotnet run` and injects the Dapr sidecar process alongside your app.

## Installing the Dapr CLI

```bash
# macOS / Linux
wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | /bin/bash

# Windows (PowerShell)
powershell -Command "iwr -useb https://raw.githubusercontent.com/dapr/cli/master/install/install.ps1 | iex"

# Initialize Dapr (downloads daprd and default components)
dapr init
```

## Running a Single .NET App

```bash
dapr run \
  --app-id order-service \
  --app-port 5001 \
  --dapr-http-port 3500 \
  --dapr-grpc-port 50001 \
  --resources-path ./components \
  -- dotnet run --project ./OrderService --urls http://localhost:5001
```

## Running Multiple Apps with a Multi-App Run File

Create a `dapr.yaml` file at the repository root to orchestrate several services at once:

```yaml
version: 1
apps:
  - appID: order-service
    appDirPath: ./OrderService
    appPort: 5001
    command: ["dotnet", "run", "--urls", "http://localhost:5001"]
    resourcesPaths:
      - ./components

  - appID: inventory-service
    appDirPath: ./InventoryService
    appPort: 5002
    command: ["dotnet", "run", "--urls", "http://localhost:5002"]
    resourcesPaths:
      - ./components
```

Start all services with:

```bash
dapr run -f dapr.yaml
```

## Inspecting Running Services

```bash
# List all running Dapr apps
dapr list

# View Dapr dashboard in browser
dapr dashboard
```

## Invoking a Service from the CLI

```bash
dapr invoke --app-id order-service --method orders --verb GET
```

## Publishing Events from the CLI

```bash
dapr publish \
  --publish-app-id order-service \
  --pubsub pubsub \
  --topic new-order \
  --data '{"id": "ord-1", "product": "Widget"}'
```

## Stopping Services

```bash
dapr stop --app-id order-service
# Or stop all running apps
dapr stop -f dapr.yaml
```

## Summary

The Dapr CLI simplifies local .NET development by managing sidecar processes and component configuration alongside `dotnet run`. The multi-app run file (`dapr.yaml`) is especially valuable for microservices projects, letting you start an entire system with a single command and inspect it through the built-in dashboard.
