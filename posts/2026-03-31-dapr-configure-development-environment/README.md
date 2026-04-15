# How to Configure Dapr for Development Environment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Development, Configuration, Local, Environment

Description: Configure Dapr for a local development environment with self-hosted mode, local component definitions, hot reload, and developer-friendly tooling for fast iteration.

---

## Dapr Development Environment Setup

In development, Dapr runs in self-hosted mode on your local machine. Each service runs as a regular process with a Dapr sidecar attached via `dapr run`. Development components use local infrastructure (Docker containers for Redis, etc.) instead of cloud services.

```bash
# Install Dapr CLI
curl -fsSL https://raw.githubusercontent.com/dapr/cli/master/install/install.sh | /bin/bash

# Initialize Dapr (installs Redis and Zipkin containers)
dapr init

# Verify installation
dapr --version
docker ps | grep dapr
```

## Development Component Configuration

Create a `components/` directory in your project for local component definitions:

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
  - name: actorStateStore
    value: "true"
```

```yaml
# components/pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: "localhost:6379"
  - name: consumerID
    value: "dev-consumer"
```

```yaml
# components/secrets.yaml - Local secret store for development
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: local-secret-store
spec:
  type: secretstores.local.file
  version: v1
  metadata:
  - name: secretsFile
    value: "./secrets/dev-secrets.json"
  - name: nestedSeparator
    value: ":"
```

```json
// secrets/dev-secrets.json
{
  "db-password": "devpassword123",
  "api-key": "dev-api-key-not-secret",
  "jwt-secret": "dev-jwt-secret"
}
```

## Running Services in Development

```bash
# Run a single service with Dapr in development
dapr run \
  --app-id order-service \
  --app-port 8080 \
  --dapr-http-port 3500 \
  --resources-path ./components \
  --log-level debug \
  -- python main.py

# Run .NET service with hot reload
dapr run \
  --app-id order-service \
  --app-port 8080 \
  --resources-path ./components \
  -- dotnet watch run

# Run Node.js service with nodemon
dapr run \
  --app-id notification-service \
  --app-port 3001 \
  --resources-path ./components \
  -- npx nodemon app.js
```

## Multi-Service Development with Dapr Run File

```yaml
# dapr.yaml - Run all services at once
version: 1
apps:
  - appID: order-service
    appDirPath: ./services/order
    appPort: 8080
    command: ["python", "main.py"]
    env:
      APP_ENV: development
      LOG_LEVEL: debug

  - appID: payment-service
    appDirPath: ./services/payment
    appPort: 8081
    command: ["dotnet", "run"]
    env:
      ASPNETCORE_ENVIRONMENT: Development

  - appID: notification-service
    appDirPath: ./services/notification
    appPort: 3001
    command: ["node", "app.js"]
    env:
      NODE_ENV: development
```

```bash
# Start all services from project root
dapr run -f dapr.yaml

# Stop all
dapr stop -f dapr.yaml
```

## Development Tracing with Zipkin

```bash
# Zipkin is started by dapr init
# Access at http://localhost:9411

# Create a Dapr configuration file for tracing
cat > config.yaml << 'EOF'
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: daprConfig
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: "http://localhost:9411/api/v2/spans"
EOF

# Reference the configuration when running a service
dapr run \
  --app-id order-service \
  --app-port 8080 \
  --resources-path ./components \
  --config ./config.yaml \
  -- python main.py
```

## Summary

Dapr development environment configuration focuses on self-hosted mode with local Docker containers for state stores and message brokers. The `components/` directory holds environment-specific YAML definitions that override cloud component configurations. Use `dapr.yaml` run files to start all services in your local system simultaneously, and leverage Dapr's built-in Zipkin integration for distributed tracing during development without any code changes.
