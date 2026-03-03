# How to Create Dev/Test Environments with Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Development Environment, Testing, Kubernetes, Developer Experience

Description: Build isolated development and testing environments using Talos Linux clusters, giving each developer or team their own Kubernetes instance for safe experimentation.

---

Every developer who works with Kubernetes has experienced the pain of shared environments. Someone deploys a broken version, someone else changes a ConfigMap, and suddenly your feature branch is failing for reasons that have nothing to do with your code. Development and testing environments built on Talos Linux solve this by giving each developer or feature branch its own isolated Kubernetes cluster.

This guide covers practical approaches to creating on-demand dev/test environments with Talos Linux, from local setups for individual developers to shared infrastructure that provisions environments automatically.

## The Case for Isolated Environments

Shared Kubernetes environments create friction at every level:

- **Namespace conflicts** - Two developers deploy different versions of the same service
- **Resource contention** - One team's load test starves other teams of CPU
- **Config pollution** - Cluster-wide resources like CRDs, admission webhooks, and RBAC changes affect everyone
- **Debugging difficulty** - Hard to tell if a failure is your code or someone else's change
- **Testing limitations** - You cannot test destructive operations or cluster upgrades

Isolated environments eliminate these problems. Each developer gets their own cluster, uses it for as long as needed, and destroys it when done.

## Local Dev Environments with Docker Provider

For individual developers, the Docker provider is the fastest path to a local environment:

```bash
# Create a development cluster
talosctl cluster create \
  --provisioner docker \
  --name dev-$(whoami) \
  --controlplanes 1 \
  --workers 1 \
  --wait-timeout 5m

# Get kubeconfig
talosctl kubeconfig --force ~/.kube/dev-config --merge=false
export KUBECONFIG=~/.kube/dev-config

# Verify
kubectl get nodes
```

### Dev Environment Setup Script

Wrap the cluster creation in a script that also deploys common infrastructure:

```bash
#!/bin/bash
# dev-env.sh - Set up a complete development environment
set -euo pipefail

CLUSTER_NAME="dev-$(whoami)-$(date +%Y%m%d)"
KUBECONFIG_PATH="${HOME}/.kube/${CLUSTER_NAME}"

echo "Creating development environment: ${CLUSTER_NAME}"

# Create the cluster
talosctl cluster create \
  --provisioner docker \
  --name "$CLUSTER_NAME" \
  --controlplanes 1 \
  --workers 2 \
  --wait-timeout 5m

# Export kubeconfig
talosctl kubeconfig --force "$KUBECONFIG_PATH" --merge=false
export KUBECONFIG="$KUBECONFIG_PATH"

# Wait for all nodes
kubectl wait --for=condition=Ready nodes --all --timeout=300s

# Install common dev infrastructure
echo "Installing development tools..."

# Metrics server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Local path provisioner for storage
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/master/deploy/local-path-storage.yaml
kubectl patch storageclass local-path -p '{"metadata":{"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'

# Ingress controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml

echo ""
echo "Development environment ready!"
echo "  export KUBECONFIG=${KUBECONFIG_PATH}"
echo "  kubectl get nodes"
echo ""
echo "Destroy with: talosctl cluster destroy --name ${CLUSTER_NAME}"
```

## Environment Templates

Different projects need different cluster configurations. Create templates:

```yaml
# templates/minimal.yaml
# Single node, good for frontend dev
cluster:
  name: minimal
  controlplanes: 1
  workers: 0
  allowSchedulingOnControlPlanes: true
  resources:
    cpus: 2
    memory: 2048
```

```yaml
# templates/full-stack.yaml
# Multi-node with storage, good for microservices
cluster:
  name: full-stack
  controlplanes: 1
  workers: 2
  resources:
    cpus: 4
    memory: 4096
  addons:
    - metrics-server
    - local-path-provisioner
    - ingress-nginx
```

```yaml
# templates/data-heavy.yaml
# Larger workers for data services
cluster:
  name: data-heavy
  controlplanes: 1
  workers: 3
  resources:
    cpus: 4
    memory: 8192
  addons:
    - metrics-server
    - local-path-provisioner
    - ingress-nginx
    - prometheus-stack
```

Create a script that reads these templates:

```bash
#!/bin/bash
# create-from-template.sh
set -euo pipefail

TEMPLATE="${1:?Usage: create-from-template.sh <template-name>}"
TEMPLATE_FILE="templates/${TEMPLATE}.yaml"

if [ ! -f "$TEMPLATE_FILE" ]; then
  echo "Template not found: ${TEMPLATE_FILE}"
  echo "Available templates:"
  ls templates/*.yaml | sed 's|templates/||;s|.yaml||'
  exit 1
fi

# Parse template (simplified - use yq for production)
WORKERS=$(grep "workers:" "$TEMPLATE_FILE" | awk '{print $2}')
CPUS=$(grep "cpus:" "$TEMPLATE_FILE" | awk '{print $2}')
MEMORY=$(grep "memory:" "$TEMPLATE_FILE" | awk '{print $2}')

CLUSTER_NAME="dev-${TEMPLATE}-$(whoami)"

talosctl cluster create \
  --provisioner docker \
  --name "$CLUSTER_NAME" \
  --controlplanes 1 \
  --workers "${WORKERS:-1}" \
  --cpus "${CPUS:-2}" \
  --memory "${MEMORY:-2048}" \
  --wait-timeout 5m

echo "Cluster created: ${CLUSTER_NAME}"
```

## Shared Dev Environment Infrastructure

For teams that want centralized dev environment management, use a management cluster to provision Talos clusters on demand.

### Architecture

```
Management Cluster (persistent)
  - Environment Controller
  - Developer Portal UI
  - Resource Quotas
        |
        | Creates VMs on demand
        |
    +---------+---------+
    |         |         |
  Dev-1    Dev-2    Dev-3
  (Alice)  (Bob)    (Test)
```

### Environment Controller

A simple controller that watches custom resources and provisions environments:

```yaml
# DevEnvironment CRD
apiVersion: dev.example.com/v1
kind: DevEnvironment
metadata:
  name: alice-feature-123
spec:
  owner: alice
  template: full-stack
  ttl: 8h
  applications:
    - name: myapp
      repo: https://github.com/org/myapp
      branch: feature-123
status:
  phase: Running
  endpoint: https://alice-feature-123.dev.example.com
  kubeconfig: /secrets/alice-feature-123/kubeconfig
  expiresAt: "2026-03-03T20:00:00Z"
```

## Tilt Integration for Live Development

Tilt is a development tool that watches your code and automatically rebuilds and deploys to Kubernetes. It pairs well with Talos dev environments:

```python
# Tiltfile
# Point to your Talos dev cluster
allow_k8s_contexts('dev-alice')

# Build and deploy your app
docker_build('myapp', '.')
k8s_yaml('manifests/deployment.yaml')
k8s_resource('myapp', port_forwards='8080:8080')
```

```bash
# Start development with Tilt
export KUBECONFIG=~/.kube/dev-config
tilt up
```

## Skaffold Integration

Skaffold also works well for iterative development:

```yaml
# skaffold.yaml
apiVersion: skaffold/v4beta1
kind: Config
build:
  artifacts:
    - image: myapp
      docker:
        dockerfile: Dockerfile
deploy:
  kubectl:
    manifests:
      - manifests/*.yaml
```

```bash
# Start development with Skaffold
export KUBECONFIG=~/.kube/dev-config
skaffold dev
```

## Resource Management

Dev environments can consume significant resources on the host machine. Implement guardrails:

```bash
#!/bin/bash
# Check available resources before creating a cluster
check_resources() {
  local available_memory=$(free -m | awk '/^Mem:/ {print $7}')
  local required_memory=$((WORKERS * MEMORY_PER_WORKER + MEMORY_FOR_CP))

  if [ "$available_memory" -lt "$required_memory" ]; then
    echo "Insufficient memory. Available: ${available_memory}MB, Required: ${required_memory}MB"
    echo "Consider destroying unused environments:"
    talosctl cluster show
    exit 1
  fi
}
```

## Environment Lifecycle Management

Prevent resource waste with automatic cleanup:

```bash
#!/bin/bash
# cleanup-old-envs.sh - Run periodically to clean up stale environments

MAX_AGE_HOURS=24

docker ps --filter "label=talos.dev/role" --format '{{.Names}} {{.CreatedAt}}' | while read name created; do
  age_seconds=$(( $(date +%s) - $(date -d "$created" +%s) ))
  age_hours=$(( age_seconds / 3600 ))

  if [ "$age_hours" -gt "$MAX_AGE_HOURS" ]; then
    cluster_name=$(echo "$name" | sed 's/-controlplane-1//' | sed 's/-worker-[0-9]*//')
    echo "Destroying stale environment: ${cluster_name} (age: ${age_hours}h)"
    talosctl cluster destroy --name "$cluster_name" || true
  fi
done
```

## Testing Workflows

### Feature Branch Testing

Each feature branch gets its own environment:

```bash
# Create environment for a feature branch
BRANCH=$(git branch --show-current)
CLUSTER_NAME="dev-${BRANCH//\//-}"

talosctl cluster create \
  --provisioner docker \
  --name "$CLUSTER_NAME" \
  --controlplanes 1 \
  --workers 1 \
  --wait-timeout 5m

# Deploy the branch
kubectl apply -f manifests/

# Run tests
make test-integration
```

### A/B Testing

Compare two versions side by side:

```bash
# Create two clusters
talosctl cluster create --provisioner docker --name "version-a" --controlplanes 1 --workers 1
talosctl cluster create --provisioner docker --name "version-b" --controlplanes 1 --workers 1

# Deploy different versions to each
KUBECONFIG=/tmp/version-a.kubeconfig kubectl apply -f manifests/v1/
KUBECONFIG=/tmp/version-b.kubeconfig kubectl apply -f manifests/v2/

# Run comparison tests
```

## Wrapping Up

Dev/test environments built on Talos Linux bring isolation, reproducibility, and self-service to your development workflow. Whether developers create local clusters on their machines or use a centralized provisioning system, the result is the same: each person or task gets a clean, dedicated Kubernetes environment. The fast creation and teardown times make it practical for daily use, and the deterministic configuration ensures that "works on my cluster" translates to "works on every cluster."
