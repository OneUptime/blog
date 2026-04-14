# How to Use the dapr run Command

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, CLI, Development, Sidecar, Local

Description: Learn how to use the dapr run command to launch your application with a Dapr sidecar for local development and testing.

---

## Overview

The `dapr run` command starts your application alongside a Dapr sidecar process. The sidecar intercepts API calls and provides Dapr's building blocks - state management, pub/sub, service invocation, and more - without any changes to your application's core logic.

## Basic Usage

Run a Node.js application with a Dapr sidecar:

```bash
dapr run --app-id my-app --app-port 3000 -- node server.js
```

- `--app-id` sets the unique application identifier used for service discovery
- `--app-port` tells Dapr which port your app listens on
- Everything after `--` is the command to start your application

## Specifying the HTTP and gRPC Ports

By default, the Dapr sidecar listens on HTTP port 3500 and gRPC port 50001. Override these if they conflict:

```bash
dapr run --app-id my-app \
         --app-port 3000 \
         --dapr-http-port 3501 \
         --dapr-grpc-port 50002 \
         -- node server.js
```

## Enabling API Logging

Log all API calls between your app and the sidecar:

```bash
dapr run --app-id my-app \
         --app-port 3000 \
         --enable-api-logging \
         -- node server.js
```

## Pointing to a Custom Components Directory

```bash
dapr run --app-id my-app \
         --app-port 3000 \
         --resources-path ./my-components \
         -- node server.js
```

## Running a Python App

```bash
dapr run --app-id order-processor \
         --app-port 8080 \
         --app-protocol http \
         -- python3 app.py
```

## Running a Go App with gRPC

```bash
dapr run --app-id grpc-service \
         --app-port 9090 \
         --app-protocol grpc \
         -- go run main.go
```

## Multi-App Run with dapr.yaml

Instead of running each service in a separate terminal, use a `dapr.yaml` file:

```yaml
version: 1
apps:
  - appID: frontend
    appDirPath: ./frontend
    appPort: 3000
    command: ["npm", "start"]
  - appID: backend
    appDirPath: ./backend
    appPort: 8080
    command: ["go", "run", "main.go"]
```

```bash
dapr run -f dapr.yaml
```

## Setting Log Level

```bash
dapr run --app-id my-app \
         --log-level debug \
         -- node server.js
```

Valid levels are `debug`, `info`, `warn`, `error`, `fatal`, and `panic`.

## Summary

`dapr run` is the primary development command for running Dapr-enabled applications locally. It attaches a sidecar process to your app, wires up components from the local directory, and handles all Dapr API calls transparently. Use the `dapr.yaml` multi-app file to manage complex local setups with multiple cooperating services.
