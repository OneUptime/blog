# How to Use Dapr Multi-App Run Template in Self-Hosted Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Multi-App Run, Self-Hosted, Development, Local Setup

Description: Learn how to use the Dapr Multi-App Run template to start multiple Dapr applications together with a single command for local development and testing.

---

## What Is Dapr Multi-App Run

Dapr Multi-App Run (introduced in Dapr 1.10) allows you to define multiple Dapr applications and their configurations in a single YAML template file, then start all of them with one `dapr run -f` command. This replaces the need to open multiple terminals and run separate `dapr run` commands for each service.

## Prerequisites

- Dapr CLI v1.10+ installed
- Self-hosted Dapr initialized (`dapr init`)
- Multiple services to run locally

## Create the Multi-App Run Template

Create a file named `dapr.yaml` in your project root:

```yaml
version: 1
common:
  resourcesPath: ./components   # shared component path for all apps
  logLevel: info

apps:
- appID: frontend
  appDirPath: ./frontend
  appPort: 3000
  daprHTTPPort: 3500
  command: ["node", "app.js"]
  env:
    NODE_ENV: development

- appID: order-service
  appDirPath: ./order-service
  appPort: 3001
  daprHTTPPort: 3501
  daprGRPCPort: 50001
  command: ["node", "app.js"]
  env:
    DB_HOST: localhost

- appID: payment-service
  appDirPath: ./payment-service
  appPort: 3002
  daprHTTPPort: 3502
  command: ["python", "app.py"]
  env:
    PAYMENT_GATEWAY_URL: https://sandbox.stripe.com

- appID: notification-service
  appDirPath: ./notification-service
  appPort: 3003
  daprHTTPPort: 3503
  command: ["go", "run", "main.go"]
```

## Start All Apps with One Command

```bash
dapr run -f dapr.yaml
```

Dapr starts each service with its own sidecar process and shows combined log output:

```text
Started Dapr with app id order-service. HTTP Port: 3501. gRPC Port: 50001
Started Dapr with app id payment-service. HTTP Port: 3502. gRPC Port: 50002
Started Dapr with app id notification-service. HTTP Port: 3503. gRPC Port: 50003
Started Dapr with app id frontend. HTTP Port: 3500. gRPC Port: 50000

INFO  order-service -- Starting on port 3001
INFO  payment-service -- Starting on port 3002
INFO  notification-service -- Starting on port 3003
INFO  frontend -- Starting on port 3000
```

Stop all apps with `Ctrl+C`.

## Configure Per-App Components

Override the shared component path for a specific app:

```yaml
apps:
- appID: order-service
  appDirPath: ./order-service
  appPort: 3001
  daprHTTPPort: 3501
  resourcesPath: ./order-service/components   # override for this app only
  command: ["node", "app.js"]

- appID: payment-service
  appDirPath: ./payment-service
  appPort: 3002
  daprHTTPPort: 3502
  command: ["node", "app.js"]
  # uses common resourcesPath: ./components
```

## Full Template Options Reference

```yaml
version: 1
common:
  resourcesPath: ./components   # component YAML directory
  logLevel: debug               # debug, info, warn, error
  appHealthCheckPath: /healthz  # health check endpoint
  appHealthProbeInterval: 5     # seconds between health checks
  appHealthProbeTimeout: 500    # milliseconds
  appMaxConcurrency: 1          # max concurrent requests (use for testing)

apps:
- appID: my-service
  appDirPath: ./my-service       # working directory for the app
  appPort: 3000                  # port your app listens on
  daprHTTPPort: 3500             # Dapr HTTP sidecar port
  daprGRPCPort: 50000            # Dapr gRPC sidecar port
  daprInternalGRPCPort: 50001    # Dapr internal gRPC port
  metricsPort: 9090              # Prometheus metrics port
  profilePort: 7777              # profiling port
  logLevel: info                 # override common logLevel
  appHealthCheckPath: /health
  appProtocol: http              # http or grpc
  unixDomainSocket: ""           # optional UDS socket path
  resourcesPath: ./components    # override common path
  configFilePath: ./config.yaml  # Dapr Configuration resource
  placementHostAddress: ""       # placement service address
  command: ["node", "app.js"]    # command to run
  env:                           # environment variables
    NODE_ENV: development
    PORT: "3000"
```

## Use Environment Files

Reference a `.env` file for shared environment variables:

```yaml
apps:
- appID: order-service
  appDirPath: ./order-service
  appPort: 3001
  daprHTTPPort: 3501
  command: ["node", "app.js"]
  env:
    DB_HOST: localhost
    DB_PORT: "5432"
    DB_NAME: orders_dev
    REDIS_HOST: localhost
```

Or source environment variables from the shell:

```bash
export DB_PASSWORD=devpassword
dapr run -f dapr.yaml
```

## View Logs for a Specific App

In multi-app mode, all logs are interleaved. Filter by app ID:

```bash
dapr run -f dapr.yaml 2>&1 | grep "order-service"
```

Or run in a mode that separates logs per app by using `--log-as-json`:

```bash
dapr run -f dapr.yaml --log-as-json | jq 'select(.app_id == "order-service")'
```

## Summary

The Dapr Multi-App Run template simplifies local microservice development by allowing all services to be started and stopped together with a single command. A `dapr.yaml` file defines each app's ID, port, working directory, component path, and startup command. This approach is significantly faster than managing multiple terminals and ensures all services use consistent component configurations during development and testing.
