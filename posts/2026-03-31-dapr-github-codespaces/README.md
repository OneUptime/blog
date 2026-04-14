# How to Use Dapr GitHub Codespaces for Development

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, GitHub Codespaces, Development Environment, DevContainer, Cloud IDE

Description: Set up a Dapr development environment in GitHub Codespaces using devcontainers with pre-installed Dapr CLI, Redis, and Zipkin for instant cloud-based microservice development.

---

## Why Use Codespaces for Dapr Development?

GitHub Codespaces provides a pre-configured cloud development environment. For Dapr, this means:
- Dapr CLI pre-installed
- Redis and Zipkin started automatically
- No local Docker or Kubernetes setup required
- Consistent environment for team contributors

## Create a .devcontainer Configuration

Add a `.devcontainer` folder to your Dapr project repository:

```bash
mkdir -p .devcontainer
touch .devcontainer/devcontainer.json
touch .devcontainer/docker-compose.yml
touch .devcontainer/Dockerfile
```

## devcontainer.json

```json
{
  "name": "Dapr Development",
  "dockerComposeFile": "docker-compose.yml",
  "service": "app",
  "workspaceFolder": "/workspace",
  "features": {
    "ghcr.io/devcontainers/features/node:1": {
      "version": "20"
    },
    "ghcr.io/devcontainers/features/go:1": {
      "version": "1.21"
    },
    "ghcr.io/devcontainers/features/dotnet:1": {
      "version": "8"
    }
  },
  "postCreateCommand": "bash .devcontainer/setup.sh",
  "forwardPorts": [3000, 3500, 9411, 6379],
  "portsAttributes": {
    "3000": { "label": "App" },
    "3500": { "label": "Dapr HTTP API" },
    "9411": { "label": "Zipkin" },
    "6379": { "label": "Redis" }
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-dotnettools.csharp",
        "golang.go",
        "redhat.vscode-yaml",
        "ms-kubernetes-tools.vscode-kubernetes-tools"
      ]
    }
  }
}
```

## docker-compose.yml for Dapr Services

```yaml
services:
  app:
    build: .
    volumes:
      - ../..:/workspace:cached
    command: sleep infinity
    networks:
      - dapr-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    networks:
      - dapr-network

  zipkin:
    image: openzipkin/zipkin:latest
    ports:
      - "9411:9411"
    networks:
      - dapr-network

networks:
  dapr-network:
    driver: bridge
```

## Dockerfile for the Dev Container

```dockerfile
FROM mcr.microsoft.com/devcontainers/base:ubuntu

# Install Dapr CLI
RUN wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | /bin/bash

# Switch to vscode user before initializing Dapr so runtime is installed in /home/vscode/.dapr/
USER vscode

# Initialize Dapr (slim mode - no Docker-in-Docker)
RUN dapr init --slim
```

## Setup Script

```bash
# .devcontainer/setup.sh
#!/bin/bash
set -e

echo "Setting up Dapr development environment..."

# Ensure components directory exists (dapr init --slim does not create it)
mkdir -p ~/.dapr/components

# Initialize Dapr with Redis and Zipkin component files
cat > ~/.dapr/components/statestore.yaml << 'EOF'
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: redis:6379
EOF

cat > ~/.dapr/config.yaml << 'EOF'
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: daprConfig
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: http://zipkin:9411/api/v2/spans
EOF

echo "Dapr environment ready!"
```

## Run Your App in Codespaces

```bash
# Open Codespace from GitHub repository
# https://github.com/YOUR_ORG/YOUR_REPO -> Code -> Codespaces -> New codespace

# Inside Codespace terminal
dapr run \
  --app-id orderservice \
  --app-port 3000 \
  --dapr-http-port 3500 \
  --resources-path ~/.dapr/components \
  --config ~/.dapr/config.yaml \
  -- node app.js
```

## Test the Dapr API

```bash
# Test state management
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{"key": "test", "value": "hello from codespaces"}]'

curl http://localhost:3500/v1.0/state/statestore/test
```

## Summary

GitHub Codespaces with a `.devcontainer` configuration provides an instant, fully configured Dapr development environment with Redis, Zipkin, and the Dapr CLI pre-installed. Team members can open a Codespace and start building Dapr microservices immediately without any local setup, making onboarding and open source contributions faster.
