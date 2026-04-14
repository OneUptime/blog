# How to Run Dapr Without Docker in Self-Hosted Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Self-Hosted, Docker-Free, Development, Local Setup

Description: Learn how to initialize and run Dapr in self-hosted mode without Docker by using slim initialization and running the Dapr sidecar as a standalone process.

---

## Why Run Dapr Without Docker

By default, `dapr init` uses Docker to pull and run the Dapr placement service and Redis containers. In environments where Docker is not available - such as CI pipelines, minimal VMs, or restricted developer machines - you can initialize Dapr without Docker using the `--slim` flag or by running components as external processes.

## Prerequisites

- Dapr CLI installed
- No Docker required for slim mode
- External Redis (optional, for state and pub/sub testing)

## Initialize Dapr in Slim Mode

The `--slim` flag initializes Dapr without starting Docker containers:

```bash
dapr init --slim
```

This installs:
- The `daprd` binary (the sidecar)
- The Dapr placement service binary

Note that slim mode does not install any default component configurations (such as Redis). You must provide your own component files.

Verify installation:

```bash
dapr --version
# Dapr CLI version: 1.14.0
# Runtime version: 1.14.0

ls ~/.dapr/bin/
# daprd  placement
```

## Start the Placement Service Manually

In slim mode, you start the placement service yourself:

```bash
# Start placement service in the background
~/.dapr/bin/placement &

# Or specify a custom port
~/.dapr/bin/placement --port 6050
```

The placement service is required if you use Dapr actors or workflows (which use actors internally). For non-actor and non-workflow use cases, you can skip it.

## Run Your Application with Dapr

```bash
dapr run \
  --app-id my-service \
  --app-port 3000 \
  --dapr-http-port 3500 \
  --placement-host-address localhost:50005 \
  --resources-path ./components \
  node app.js
```

## Configure In-Memory State Store for Testing

Create a component configuration using the in-memory state store (no Redis needed):

```yaml
# components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.in-memory
  version: v1
```

And an in-memory pub/sub:

```yaml
# components/pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: default
spec:
  type: pubsub.in-memory
  version: v1
```

## Use an External Redis Without Docker

If you have Redis installed natively (via Homebrew, apt, etc.):

```bash
# Install Redis natively on macOS
brew install redis
brew services start redis

# On Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis

# Verify
redis-cli ping  # should return PONG
```

Configure Dapr to use it:

```yaml
# components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "localhost:6379"
  - name: redisPassword
    value: ""
```

## Use SQLite as State Store (No External Dependencies)

For a truly dependency-free setup, use SQLite:

```yaml
# components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.sqlite
  version: v1
  metadata:
  - name: connectionString
    value: "dapr-state.db"
  - name: busyTimeout
    value: "5s"
```

SQLite is file-based and requires no server process.

## Set Up Multiple Services Without Docker

For a multi-service setup, start each service with a different app-id and port:

```bash
# Terminal 1 - Start placement service
~/.dapr/bin/placement &

# Terminal 2 - Service A
dapr run \
  --app-id service-a \
  --app-port 3001 \
  --dapr-http-port 3501 \
  --dapr-grpc-port 50001 \
  --placement-host-address localhost:50005 \
  --resources-path ./components \
  node service-a.js

# Terminal 3 - Service B
dapr run \
  --app-id service-b \
  --app-port 3002 \
  --dapr-http-port 3502 \
  --dapr-grpc-port 50002 \
  --placement-host-address localhost:50005 \
  --resources-path ./components \
  node service-b.js
```

## Use Multi-App Run Instead

For convenience, use the Dapr multi-app run feature to start all services from one command:

```yaml
# dapr.yaml
version: 1
apps:
- appID: service-a
  appDirPath: ./service-a
  appPort: 3001
  command: ["node", "app.js"]
- appID: service-b
  appDirPath: ./service-b
  appPort: 3002
  command: ["node", "app.js"]
```

```bash
dapr run -f dapr.yaml
```

## Uninstall Slim Mode

To remove the slim installation:

```bash
dapr uninstall
```

## Summary

Running Dapr without Docker in self-hosted mode uses `dapr init --slim` to install just the binaries, then starts the placement service manually and configures in-memory or file-based components for state and pub/sub. This makes Dapr usable in Docker-restricted CI environments, lightweight development setups, and any scenario where container runtimes are unavailable or undesired.
