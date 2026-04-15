# How to Use Dapr CLI for Local Development

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, CLI, Local Development, Tooling, Debug

Description: Master the Dapr CLI for local development including running apps, inspecting state, publishing events, and invoking services from the command line.

---

## Overview

The Dapr CLI is your primary tool for local development. Beyond initializing and running apps, it provides commands for invoking methods, publishing messages, managing state, and debugging - all without writing code.

## Installation

```bash
# macOS
brew install dapr/tap/dapr-cli

# Linux
wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | /bin/bash

# Windows
winget install Dapr.CLI
```

## Running Applications

```bash
dapr run \
  --app-id myapp \
  --app-port 8080 \
  --dapr-http-port 3500 \
  --log-level debug \
  go run main.go
```

Key flags:

| Flag | Purpose |
|------|---------|
| `--app-id` | Unique application identifier |
| `--app-port` | Port the application listens on |
| `--dapr-http-port` | Dapr sidecar HTTP port |
| `--resources-path` | Custom components directory |
| `--config` | Path to Dapr config file |

## Invoking Services

Call a method on a running Dapr app:

```bash
# GET request
dapr invoke --app-id myapp --method getOrder --verb GET

# POST with data
dapr invoke \
  --app-id myapp \
  --method createOrder \
  --verb POST \
  --data '{"item":"shoes","qty":2}'
```

## Publishing Events

```bash
dapr publish \
  --publish-app-id myapp \
  --pubsub pubsub \
  --topic orders \
  --data '{"orderId":42,"status":"placed"}'
```

## Managing State

```bash
# List state store entries (via HTTP directly)
curl http://localhost:3500/v1.0/state/statestore/mykey

# Save state
dapr invoke --app-id myapp --method saveState --verb POST \
  --data '{"key":"session1","value":{"user":"alice"}}'
```

## Viewing Logs and Metadata

```bash
# List running apps
dapr list

# Inspect app metadata (via HTTP API)
curl http://localhost:3500/v1.0/metadata

# Open the Dapr dashboard
dapr dashboard
```

## Running with a Config File

```yaml
# config.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: myconfig
spec:
  tracing:
    samplingRate: "1"
  features:
    - name: HotReload
      enabled: true
```

```bash
dapr run --app-id myapp --config ./config.yaml node app.js
```

## Stopping Apps

```bash
# Stop specific app
dapr stop --app-id myapp

# Stop all
dapr list | awk 'NR>1{print $1}' | xargs -I{} dapr stop --app-id {}
```

## Summary

The Dapr CLI provides everything needed for efficient local development: running apps with sidecars, invoking methods, publishing events, and inspecting state - all without writing extra code. The `dapr invoke` and `dapr publish` commands are especially useful for testing service behavior and message flows during development.
