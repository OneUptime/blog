# How to Set Up a Local Flux Test Environment with k3d

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Testing, K3d, K3s, Local Development

Description: Learn how to set up a lightweight local Kubernetes cluster using k3d for fast Flux CD testing with multi-node support and built-in registry.

---

## Introduction

k3d is a lightweight wrapper that runs k3s (a minimal Kubernetes distribution) in Docker containers. It creates clusters in seconds, supports multi-node configurations, and includes a built-in container registry. These features make k3d an excellent choice for rapid Flux testing iterations.

## Prerequisites

- Docker installed and running
- kubectl installed
- Flux CLI installed (v2.0 or later)
- A GitHub personal access token

## Step 1: Install k3d

```bash
# macOS (Homebrew)
brew install k3d

# Linux / macOS (install script)
curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash

# Verify installation
k3d version
```

## Step 2: Create a k3d Cluster

Create a multi-node cluster with port mappings for testing.

```bash
# Simple single-node cluster
k3d cluster create flux-test

# Multi-node cluster with port mapping and registry
k3d cluster create flux-test \
  --servers 1 \
  --agents 3 \
  --port "8080:80@loadbalancer" \
  --port "8443:443@loadbalancer" \
  --k3s-arg "--disable=traefik@server:0" \
  --wait

# Verify the cluster
kubectl get nodes
kubectl cluster-info
```

## Step 3: Create a Local Registry

k3d can create a local container registry that is accessible from both your host and the cluster.

```bash
# Create a registry
k3d registry create flux-registry.localhost --port 5111

# Create a cluster connected to the registry
k3d cluster create flux-test \
  --servers 1 \
  --agents 2 \
  --registry-use k3d-flux-registry.localhost:5111 \
  --port "8080:80@loadbalancer" \
  --wait
```

## Step 4: Bootstrap Flux

```bash
# Set credentials
export GITHUB_TOKEN=<your-github-token>
export GITHUB_USER=<your-github-username>

# Bootstrap
flux bootstrap github \
  --owner=$GITHUB_USER \
  --repository=flux-k3d-test \
  --path=clusters/k3d \
  --personal \
  --branch=main

# Verify
flux check
kubectl get pods -n flux-system
```

## Step 5: Test with the Local Registry

Push images to the local registry and deploy them through Flux.

```bash
# Build and push an image to the local registry
docker build -t localhost:5111/my-app:v1 .
docker push localhost:5111/my-app:v1
```

Create a deployment using the local registry image.

```yaml
# apps/local-app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: local-app
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: local-app
  template:
    metadata:
      labels:
        app: local-app
    spec:
      containers:
        - name: app
          image: k3d-flux-registry.localhost:5111/my-app:v1
          ports:
            - containerPort: 8080
          resources:
            limits:
              cpu: 100m
              memory: 128Mi
```

## Step 6: Create the Flux Kustomization

```yaml
# clusters/k3d/local-app.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: local-app
  namespace: flux-system
spec:
  interval: 1m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/local-app
  prune: true
```

## Step 7: Test Image Updates

Simulate an image update workflow.

```bash
# Build and push a new version
docker build -t localhost:5111/my-app:v2 .
docker push localhost:5111/my-app:v2

# Update the image tag in your manifests
sed -i 's/my-app:v1/my-app:v2/' apps/local-app/deployment.yaml

# Commit and push to trigger Flux reconciliation
git add . && git commit -m "Update my-app to v2" && git push

# Watch Flux deploy the update
flux get kustomizations --watch
```

## Step 8: Test Multi-Cluster Scenarios

k3d makes it easy to create multiple clusters for testing multi-cluster Flux setups.

```bash
# Create a management cluster
k3d cluster create flux-mgmt \
  --servers 1 \
  --agents 1 \
  --wait

# Create a workload cluster
k3d cluster create flux-workload \
  --servers 1 \
  --agents 2 \
  --wait

# Switch between clusters
kubectl config use-context k3d-flux-mgmt
kubectl config use-context k3d-flux-workload

# List all clusters
k3d cluster list
```

## Using a k3d Configuration File

Define your cluster setup in a reusable configuration file.

```yaml
# k3d-config.yaml
apiVersion: k3d.io/v1alpha5
kind: Simple
metadata:
  name: flux-test
servers: 1
agents: 3
ports:
  - port: 8080:80
    nodeFilters:
      - loadbalancer
  - port: 8443:443
    nodeFilters:
      - loadbalancer
registries:
  create:
    name: flux-registry.localhost
    host: "0.0.0.0"
    hostPort: "5111"
options:
  k3d:
    wait: true
    timeout: "120s"
  k3s:
    extraArgs:
      - arg: --disable=traefik
        nodeFilters:
          - server:*
  kubeconfig:
    updateDefaultKubeconfig: true
    switchCurrentContext: true
```

```bash
# Create the cluster from the config file
k3d cluster create --config k3d-config.yaml
```

## Performance Comparison

k3d creates clusters significantly faster than other local Kubernetes tools.

```bash
# Typical creation times
# k3d: ~20 seconds
# Kind: ~60 seconds
# Minikube: ~120 seconds

# Benchmark cluster creation
time k3d cluster create benchmark-test --wait
k3d cluster delete benchmark-test
```

## Cleanup

```bash
# Delete a specific cluster
k3d cluster delete flux-test

# Delete all k3d clusters
k3d cluster delete --all

# Delete the registry
k3d registry delete flux-registry.localhost
```

## Automation Script

```bash
#!/bin/bash
# setup-k3d-flux.sh
set -euo pipefail

CLUSTER_NAME="flux-test"
REGISTRY_NAME="flux-registry.localhost"
REGISTRY_PORT="5111"

echo "Creating k3d registry..."
k3d registry create "$REGISTRY_NAME" --port "$REGISTRY_PORT" 2>/dev/null || true

echo "Creating k3d cluster..."
k3d cluster create "$CLUSTER_NAME" \
  --servers 1 \
  --agents 2 \
  --registry-use "k3d-$REGISTRY_NAME:$REGISTRY_PORT" \
  --port "8080:80@loadbalancer" \
  --wait

echo "Bootstrapping Flux..."
flux bootstrap github \
  --owner="$GITHUB_USER" \
  --repository=flux-k3d-test \
  --path=clusters/k3d \
  --personal \
  --branch=main

echo "Environment ready."
echo "Registry: localhost:$REGISTRY_PORT"
echo "Cluster: $CLUSTER_NAME"
```

## Best Practices

- Use k3d configuration files for reproducible cluster setups
- Take advantage of the built-in registry for local image testing
- Use multi-node clusters to test pod scheduling and anti-affinity rules
- Disable Traefik if you want to test your own ingress controller
- Use k3d's fast creation time for CI pipeline testing
- Create separate clusters for different test scenarios

## Conclusion

k3d offers the fastest way to create disposable Kubernetes clusters for Flux testing. Its built-in registry support eliminates the need for external registries during development, and its multi-node capability lets you test realistic cluster topologies. The combination of speed and features makes k3d an ideal tool for iterative Flux development and CI pipelines.
