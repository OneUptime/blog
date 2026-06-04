# Configure Nocalhost for One-Click Kubernetes Development Environment Setup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Development, Nocalhost, DevOps, IDE

Description: Configure Nocalhost to create instant Kubernetes development environments with one click, enabling hot reload, port forwarding, and file synchronization for faster inner loop development.

---

Setting up development environments for Kubernetes applications traditionally requires multiple steps: configuring kubectl, setting up port forwards, building images, and deploying to the cluster. This friction slows down new developer onboarding and disrupts the development workflow.

Nocalhost eliminates this complexity by providing IDE-integrated Kubernetes development environments. Developers can launch complete applications in Kubernetes with a single click, then code directly against cluster resources with instant feedback. This guide shows you how to configure Nocalhost for your team.

## Understanding Nocalhost Architecture

Nocalhost consists of these main components:

- IDE plugins for VS Code and JetBrains IDEs
- The `nhctl` CLI, which communicates with Kubernetes through your kubeconfig
- An optional Nocalhost Server for managing clusters, applications, users, and development spaces
- Client-side tools for file synchronization and port forwarding

With Nocalhost Server, the system creates isolated development spaces in your Kubernetes cluster where developers can work without interfering with each other.

## Installing Nocalhost

Install the VS Code extension from the marketplace:

```bash
# Or from command line

code --install-extension nocalhost.nocalhost
```

Install the Nocalhost server in your Kubernetes cluster:

```bash
# Add Nocalhost Helm repository
helm repo add nocalhost https://nocalhost-helm.pkg.coding.net/nocalhost/nocalhost
helm repo update

# Install Nocalhost server
helm install nocalhost nocalhost/nocalhost \
  --namespace nocalhost \
  --create-namespace
```

Wait for the installation to complete:

```bash
kubectl -n nocalhost rollout status deployment/nocalhost-api --timeout=300s
kubectl -n nocalhost rollout status deployment/nocalhost-web --timeout=300s
kubectl -n nocalhost rollout status statefulset/nocalhost-mariadb --timeout=300s
```

Port-forward the Nocalhost web service:

```bash
kubectl -n nocalhost port-forward service/nocalhost-web 8080:80
```

## Creating a Nocalhost Configuration

Define your application's development configuration in `.nocalhost/config.yaml`:

```yaml
# .nocalhost/config.yaml
application:
  name: myapp
  manifestType: helmGit
  resourcePath: ["deployment/charts"]
  env:
    - name: DEBUG
      value: "true"
  helmValues:
    - key: image.pullPolicy
      value: IfNotPresent

  services:
    - name: api
      serviceType: deployment
      containers:
        - name: api
          dev:
            gitUrl: https://github.com/myorg/myapp-api.git
            image: node:18-alpine
            shell: /bin/sh
            workDir: /app
            storageClass: standard

            # Synchronize local files to container
            sync:
              type: send
              mode: gitIgnore
              filePattern:
                - .
              ignoreFilePattern:
                - .git
                - node_modules
                - .env

            # Port forwarding
            portForward:
              - 3000:3000
              - 9229:9229

            # Hot reload command
            command:
              run:
                - /bin/sh
                - -c
                - "npm install && npm run dev"
              debug:
                - /bin/sh
                - -c
                - "npm install && npm run debug"

            # Environment variables for dev mode
            env:
              - name: NODE_ENV
                value: development
              - name: DEBUG
                value: "*"

            # Resource limits
            resources:
              limits:
                cpu: "1"
                memory: 1Gi
              requests:
                cpu: "0.5"
                memory: 512Mi

    - name: worker
      serviceType: deployment
      containers:
        - name: worker
          dev:
            gitUrl: https://github.com/myorg/myapp-worker.git
            image: node:18-alpine
            workDir: /app

            sync:
              type: send
              mode: gitIgnore
              filePattern:
                - .
              ignoreFilePattern:
                - .git
                - node_modules

            command:
              run:
                - npm
                - run
                - worker

            env:
              - name: WORKER_CONCURRENCY
                value: "1"

    - name: postgres
      serviceType: deployment
      containers:
        - name: postgres
          dev:
            gitUrl: null
            image: postgres:15

            # Don't sync files for database
            sync:
              type: send
              mode: pattern
              filePattern: []

            portForward:
              - 5432:5432
```

## Creating Quick Start Templates

Build a one-click setup script for new developers:

```bash
#!/bin/bash
# setup-dev-environment.sh

set -e

echo "Setting up Nocalhost development environment..."

# Install nhctl CLI if not present
if ! command -v nhctl &> /dev/null; then
    echo "Installing nhctl..."
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(uname -m)
    case "$ARCH" in
        x86_64|amd64) ARCH=amd64 ;;
        *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
    esac
    mkdir -p "$HOME/.nh/bin"
    curl -fsSL -o "$HOME/.nh/bin/nhctl" \
        "https://github.com/nocalhost/nocalhost/releases/latest/download/nhctl-${OS}-${ARCH}"
    chmod +x "$HOME/.nh/bin/nhctl"
    export PATH="$HOME/.nh/bin:$PATH"
fi

# Configure cluster access
CLUSTER_NAME=${1:-"dev-cluster"}
NAMESPACE=${2:-"dev-$USER"}

echo "Connecting to cluster: $CLUSTER_NAME"

# Create development namespace
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# Label namespace for Nocalhost
kubectl label namespace "$NAMESPACE" nocalhost.dev=true --overwrite

# Install application using Nocalhost
echo "Installing application in development mode..."

nhctl install myapp \
  --namespace "$NAMESPACE" \
  --git-url https://github.com/myorg/myapp.git \
  --git-ref main \
  --config config.yaml

echo "Development environment ready!"
echo "Namespace: $NAMESPACE"
echo ""
echo "Next steps:"
echo "1. Open VS Code"
echo "2. Install Nocalhost extension"
echo "3. Connect to cluster: $CLUSTER_NAME"
echo "4. Select namespace: $NAMESPACE"
echo "5. Start developing!"
```

Make it executable:

```bash
chmod +x setup-dev-environment.sh
./setup-dev-environment.sh dev-cluster
```

## Configuring IDE Integration

Set up VS Code debugging for your project:

```jsonc
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "nocalhost",
      "request": "attach",
      "name": "Nocalhost Debug",
      "trace": true
    }
  ]
}
```

## Building Service Mesh Integration

Configure Nocalhost to work with service meshes:

```yaml
# .nocalhost/config.yaml (extended)
application:
  services:
    - name: api
      serviceType: deployment
      containers:
        - name: api
          dev:
            # Service mesh sidecar configuration
            sidecarImage: nocalhost-docker.pkg.coding.net/nocalhost/public/nocalhost-sidecar:sshversion

            # Patch deployment for dev mode
            patches:
              - patch: '{"spec":{"template":{"metadata":{"annotations":{"sidecar.istio.io/inject":"false"}}}}}'
                type: strategic

              - patch: '{"spec":{"template":{"spec":{"containers":[{"name":"api","securityContext":{"capabilities":{"add":["SYS_PTRACE"]}}}]}}}}'
                type: strategic
```

## Creating Team Development Spaces

Set up isolated spaces for multiple developers:

```bash
#!/bin/bash
# create-dev-space.sh

DEVELOPER=$1
TEMPLATE=${2:-"default"}

if [ -z "$DEVELOPER" ]; then
    echo "Usage: $0 <developer-email> [template]"
    exit 1
fi

# Sanitize developer name for namespace
DEV_NAME=$(echo "$DEVELOPER" | cut -d@ -f1 | tr '[:upper:]' '[:lower:]' | tr '.' '-')
NAMESPACE="dev-$DEV_NAME"

echo "Creating development space for $DEVELOPER..."

# Create namespace with resource quota
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Namespace
metadata:
  name: $NAMESPACE
  labels:
    nocalhost.dev: "true"
    developer: "$DEV_NAME"
    template: "$TEMPLATE"
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: dev-quota
  namespace: $NAMESPACE
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    persistentvolumeclaims: "5"
---
apiVersion: v1
kind: LimitRange
metadata:
  name: dev-limits
  namespace: $NAMESPACE
spec:
  limits:
  - default:
      cpu: "1"
      memory: 1Gi
    defaultRequest:
      cpu: "0.1"
      memory: 128Mi
    type: Container
EOF

# Grant developer access
kubectl create rolebinding "$DEV_NAME-admin" \
  --clusterrole=admin \
  --user="$DEVELOPER" \
  --namespace="$NAMESPACE"

# Install application template
nhctl install myapp \
  --namespace "$NAMESPACE" \
  --git-url https://github.com/myorg/myapp.git \
  --config "config-$TEMPLATE.yaml"

echo "Development space created successfully!"
echo "Namespace: $NAMESPACE"
echo "Developer: $DEVELOPER"
echo ""
echo "Share the namespace and kubeconfig context with the developer:"
echo "Namespace: $NAMESPACE"
```

## Setting Up Hot Reload for Different Languages

Configure hot reload for Node.js applications:

```yaml
# Node.js with nodemon
containers:
  - name: api
    dev:
      command:
        run:
          - npm
          - run
          - dev

      # package.json should have:
      # "scripts": {
      #   "dev": "nodemon --watch src --exec node src/index.js"
      # }
```

Configure hot reload for Python applications:

```yaml
# Python with watchdog
containers:
  - name: api
    dev:
      image: python:3.11
      command:
        run:
          - /bin/sh
          - -c
          - "pip install watchdog && watchmedo auto-restart -d . -p '*.py' -- python app.py"
```

Configure hot reload for Go applications:

```yaml
# Go with air
containers:
  - name: api
    dev:
      image: golang:1.21
      command:
        run:
          - /bin/sh
          - -c
          - "go install github.com/air-verse/air@latest && air"
```

## Implementing Dependency Management

Cache dependencies to speed up development:

```yaml
containers:
  - name: api
    dev:
      # Persistent volume for node_modules
      persistentVolumeDirs:
        - path: /app/node_modules
          capacity: 5Gi

      # Install dependencies once
      command:
        run:
          - /bin/sh
          - -c
          - |
            if [ ! -d "node_modules" ]; then
              npm install
            fi
            npm run dev
```

## Updating Dev Config Profiles

Use `nhctl profile` to inspect or update stored development configuration values:

```bash
# Check the configured development image
nhctl profile get \
  --namespace dev \
  --deployment api \
  --type deployment \
  --container api \
  --key dev.image

# Update the configured development image
nhctl profile set \
  --namespace dev \
  --deployment api \
  --type deployment \
  --container api \
  --key dev.image \
  --value node:18-alpine

# Restart DevMode after changing the profile
nhctl dev end api
nhctl dev start api --deployment api --container api
```

## Monitoring Development Environments

Create a dashboard showing active dev spaces:

```bash
#!/bin/bash
# dev-spaces-status.sh

echo "Active Development Spaces"
echo "========================"

kubectl get namespaces -l nocalhost.dev=true -o json | \
  jq -r '.items[] |
    "\(.metadata.name)\t\(.metadata.labels.developer // "unknown")\t\(.metadata.creationTimestamp)"' | \
  column -t -s $'\t'

echo ""
echo "Resource Usage by Namespace"
echo "==========================="

for ns in $(kubectl get namespaces -l nocalhost.dev=true -o jsonpath='{.items[*].metadata.name}'); do
    echo "$ns:"
    kubectl top pods -n "$ns" 2>/dev/null | tail -n +2 | awk '{cpu+=$2; mem+=$3} END {print "  CPU: " cpu "m, Memory: " mem "Mi"}'
done
```

Nocalhost transforms Kubernetes development from a complex multi-step process into a one-click experience. Configure your services once, and your entire team gains instant access to consistent, fully-functional development environments.
