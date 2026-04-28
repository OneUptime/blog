# How to Use Okteto with Rancher for Remote Development

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Okteto, Remote Development, Kubernetes, Developer Experience, IDE

Description: Use Okteto to develop applications directly inside Rancher clusters with full IDE integration, bidirectional file sync, and access to all cluster services.

## Introduction

Okteto transforms a Kubernetes container into a development environment: it replaces your application container with a developer container (that includes your language runtime, IDE tools, and debugger) while preserving the pod's network identity and volume mounts. Your local IDE connects to this remote container via a bidirectional tunnel.

## Step 1: Install the Okteto CLI

```bash
# macOS

brew install okteto

# Linux
curl https://get.okteto.com -sSfL | sh
```

## Step 2: Configure Okteto for Your Application

Create an `okteto.yaml` in your project root:

```yaml
# okteto.yaml
name: myapp
image: okteto/node:18       # Developer image with Node.js and common tools pre-installed

command: bash               # Start a shell in the development container

sync:
  - .:/app                  # Sync entire project to /app in the container

forward:
  - 8080:8080               # Forward service port to localhost
  - 9229:9229               # Node.js debugger port

environment:
  - NODE_ENV=development
  - DEBUG=*

volumes:
  - /app/node_modules       # Preserve node_modules across syncs

workdir: /app
```

## Step 3: Start Remote Development

```bash
# Set the Kubernetes context to your Rancher cluster
kubectl config use-context rancher-dev

# Start Okteto - it swaps your pod for a dev container
okteto up --namespace myapp-development

# Okteto will:
# 1. Replace the myapp container with a developer image
# 2. Start bidirectional file sync
# 3. Port-forward configured ports
# 4. Drop you into a shell inside the container
```

Inside the container shell, all cluster services are reachable:

```bash
# You're now inside the Kubernetes network
nc -zv postgres.databases.svc.cluster.local 5432    # Verify DB reachability
nc -zv redis.cache.svc.cluster.local 6379           # Verify Redis reachability

# Run your app directly
npm install
npm run dev    # Hot-reload runs inside the cluster pod!
```

## Step 4: IDE Remote Development

VS Code can connect directly to the Okteto container:

1. Install the **Remote - SSH** extension in VS Code
2. Run `okteto up` to start the development container
3. In VS Code, open Command Palette (`Ctrl+Shift+P`)
4. Select **Remote-SSH: Connect to Host**
5. Enter the Okteto SSH host (shown in `okteto up` output)

Now VS Code runs entirely inside the Kubernetes pod with full access to all cluster services.

## Step 5: Stop and Restore

```bash
# Stop development and restore the original deployment
okteto down

# This restores the original container image
# (your changes to the source are saved locally)
```

## Conclusion

Okteto on Rancher provides the most seamless remote development experience available. The IDE connection to the in-cluster container eliminates all environment differences between development and production, and the bidirectional sync ensures local and remote code stay in sync. This is particularly valuable for applications with complex service dependencies.
