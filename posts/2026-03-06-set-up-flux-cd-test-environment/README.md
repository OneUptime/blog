# How to Set Up a Flux CD Test Environment

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Testing, Kind, Kubernetes, Test Environment, CI/CD, DevOps

Description: A complete guide to setting up a local Flux CD test environment using Kind, enabling safe testing of GitOps workflows before deploying to production clusters.

---

## Introduction

Testing Flux CD configurations against a live production cluster is risky and slow. A dedicated test environment lets you validate GitOps workflows, test new Kustomizations, verify HelmRelease upgrades, and experiment with Flux features without impacting production workloads. This guide walks through setting up a complete Flux CD test environment using Kind (Kubernetes in Docker).

## Prerequisites

```bash
# Install Kind
go install sigs.k8s.io/kind@latest
# Or on macOS:
brew install kind

# Install Flux CLI
curl -s https://fluxcd.io/install.sh | sudo bash

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/

# Install Docker (required for Kind)
# Follow: https://docs.docker.com/get-docker/

# Verify prerequisites
flux check --pre
```

## Step 1: Create a Kind Cluster

### Basic Kind Configuration

```yaml
# kind-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: flux-test
nodes:
  - role: control-plane
    kubeadmConfigPatches:
      - |
        kind: InitConfiguration
        nodeRegistration:
          kubeletExtraArgs:
            # Enable metrics server support
            node-labels: "ingress-ready=true"
    extraPortMappings:
      # Map ports for ingress testing
      - containerPort: 80
        hostPort: 8080
        protocol: TCP
      - containerPort: 443
        hostPort: 8443
        protocol: TCP
  - role: worker
  - role: worker
networking:
  # Use a custom subnet to avoid conflicts
  podSubnet: "10.244.0.0/16"
  serviceSubnet: "10.96.0.0/12"
```

```bash
# Create the cluster
kind create cluster --config kind-config.yaml

# Verify the cluster is running
kubectl cluster-info --context kind-flux-test
kubectl get nodes
```

### Lightweight Single-Node Configuration

```yaml
# kind-config-minimal.yaml
# For quick testing with minimal resources
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: flux-test-minimal
nodes:
  - role: control-plane
    extraPortMappings:
      - containerPort: 80
        hostPort: 8080
        protocol: TCP
```

## Step 2: Set Up a Local Git Server

### Option A: Use Gitea as a Local Git Server

```yaml
# gitea-deployment.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: gitea
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gitea
  namespace: gitea
spec:
  replicas: 1
  selector:
    matchLabels:
      app: gitea
  template:
    metadata:
      labels:
        app: gitea
    spec:
      containers:
        - name: gitea
          image: gitea/gitea:latest
          ports:
            - containerPort: 3000
              name: http
            - containerPort: 22
              name: ssh
          env:
            # Disable registration for security
            - name: GITEA__service__DISABLE_REGISTRATION
              value: "false"
            # Use SQLite for simplicity
            - name: GITEA__database__DB_TYPE
              value: sqlite3
          volumeMounts:
            - name: data
              mountPath: /data
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
      volumes:
        - name: data
          emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: gitea
  namespace: gitea
spec:
  selector:
    app: gitea
  ports:
    - name: http
      port: 3000
      targetPort: 3000
    - name: ssh
      port: 22
      targetPort: 22
```

```bash
# Deploy Gitea
kubectl apply -f gitea-deployment.yaml

# Wait for Gitea to be ready
kubectl wait --for=condition=available deployment/gitea -n gitea --timeout=120s

# Port-forward to access Gitea UI
kubectl port-forward -n gitea svc/gitea 3000:3000 &

# Access Gitea at http://localhost:3000
# Complete initial setup and create a test repository
```

### Option B: Use a Bare Git Repository on the Cluster

```yaml
# git-server.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: git-server
  namespace: flux-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: git-server
  template:
    metadata:
      labels:
        app: git-server
    spec:
      containers:
        - name: git-daemon
          image: alpine/git:latest
          command:
            - sh
            - -c
            - |
              # Initialize a bare repository
              mkdir -p /git/fleet-repo.git
              cd /git/fleet-repo.git
              git init --bare
              # Start git daemon for read access
              git daemon --verbose --export-all \
                --base-path=/git \
                --reuseaddr \
                --enable=receive-pack \
                /git
          ports:
            - containerPort: 9418
          volumeMounts:
            - name: git-data
              mountPath: /git
      volumes:
        - name: git-data
          emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: git-server
  namespace: flux-system
spec:
  selector:
    app: git-server
  ports:
    - port: 9418
      targetPort: 9418
```

## Step 3: Install Flux CD in the Test Cluster

### Bootstrap Flux with a Local Repository

```bash
# Export GitHub token for bootstrapping (if using GitHub)
export GITHUB_TOKEN=your-github-token

# Bootstrap Flux with a test repository
flux bootstrap github \
  --owner=your-github-user \
  --repository=flux-test-repo \
  --branch=main \
  --path=clusters/test \
  --personal \
  --private=false

# Verify Flux installation
flux check

# Check all Flux components are running
kubectl get pods -n flux-system
```

### Bootstrap Without a Remote Git Provider

```bash
# Install Flux components without Git bootstrap
flux install

# Verify all controllers are running
kubectl get deployments -n flux-system

# Expected output:
# helm-controller
# kustomize-controller
# notification-controller
# source-controller
```

### Create a Local GitRepository Source

```yaml
# local-git-source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: test-fleet
  namespace: flux-system
spec:
  interval: 1m
  # Point to the in-cluster Gitea or git-server
  url: http://gitea.gitea.svc.cluster.local:3000/test-user/fleet-repo.git
  ref:
    branch: main
  secretRef:
    name: git-credentials
---
apiVersion: v1
kind: Secret
metadata:
  name: git-credentials
  namespace: flux-system
type: Opaque
stringData:
  username: test-user
  password: test-password
```

## Step 4: Deploy Test Workloads

### Create a Test Kustomization

```yaml
# test-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: test-apps
  namespace: flux-system
spec:
  interval: 1m
  # Short interval for quick feedback during testing
  retryInterval: 30s
  sourceRef:
    kind: GitRepository
    name: test-fleet
  path: ./apps/test
  prune: true
  # Enable health checks for test validation
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: test-app
      namespace: default
  timeout: 2m
```

### Sample Test Application

```yaml
# apps/test/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
---
# apps/test/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-app
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: test-app
  template:
    metadata:
      labels:
        app: test-app
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 100m
              memory: 128Mi
---
# apps/test/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: test-app
  namespace: default
spec:
  selector:
    app: test-app
  ports:
    - port: 80
      targetPort: 80
```

## Step 5: Configure Monitoring for Testing

### Install Prometheus Stack for Test Monitoring

```yaml
# monitoring-helmrelease.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: prometheus-community
  namespace: flux-system
spec:
  interval: 30m
  url: https://prometheus-community.github.io/helm-charts
---
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: kube-prometheus-stack
  namespace: monitoring
spec:
  interval: 5m
  chart:
    spec:
      chart: kube-prometheus-stack
      version: "55.x"
      sourceRef:
        kind: HelmRepository
        name: prometheus-community
        namespace: flux-system
  values:
    # Minimal configuration for test environment
    prometheus:
      prometheusSpec:
        # Reduce resource usage for testing
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
        # Short retention for test data
        retention: 24h
        storageSpec:
          emptyDir:
            sizeLimit: 2Gi
    grafana:
      # Disable persistence for testing
      persistence:
        enabled: false
      # Default admin password for testing
      adminPassword: admin
    # Disable components not needed for testing
    alertmanager:
      enabled: false
    nodeExporter:
      enabled: false
```

## Step 6: Automate Test Environment Setup

### Complete Setup Script

```bash
#!/bin/bash
# setup-flux-test-env.sh
# Automated setup of a Flux CD test environment

set -euo pipefail

CLUSTER_NAME="${1:-flux-test}"
KIND_CONFIG="${2:-kind-config.yaml}"

echo "=== Setting up Flux CD Test Environment ==="

# Step 1: Create Kind cluster
echo "Creating Kind cluster: $CLUSTER_NAME"
if kind get clusters | grep -q "$CLUSTER_NAME"; then
  echo "Cluster already exists. Deleting..."
  kind delete cluster --name "$CLUSTER_NAME"
fi
kind create cluster --config "$KIND_CONFIG" --name "$CLUSTER_NAME"

# Step 2: Wait for cluster to be ready
echo "Waiting for cluster to be ready..."
kubectl wait --for=condition=Ready nodes --all --timeout=120s

# Step 3: Install Flux
echo "Installing Flux CD..."
flux install --version=latest

# Step 4: Wait for Flux to be ready
echo "Waiting for Flux controllers..."
kubectl wait --for=condition=available deployments --all -n flux-system --timeout=120s

# Step 5: Verify installation
echo "Verifying Flux installation..."
flux check

echo ""
echo "=== Test Environment Ready ==="
echo "Cluster: $CLUSTER_NAME"
echo "Context: kind-$CLUSTER_NAME"
echo ""
echo "Next steps:"
echo "  1. Create GitRepository sources"
echo "  2. Apply Kustomizations or HelmReleases"
echo "  3. Run your tests"
echo ""
echo "To tear down: kind delete cluster --name $CLUSTER_NAME"
```

### Teardown Script

```bash
#!/bin/bash
# teardown-flux-test-env.sh
# Clean up the Flux CD test environment

CLUSTER_NAME="${1:-flux-test}"

echo "Tearing down Flux CD test environment..."

# Delete the Kind cluster
kind delete cluster --name "$CLUSTER_NAME"

echo "Test environment destroyed."
```

## Step 7: CI Integration

### GitHub Actions Test Environment

```yaml
# .github/workflows/flux-test.yaml
name: Flux CD Integration Tests
on:
  pull_request:
    paths:
      - 'apps/**'
      - 'clusters/**'
      - 'infrastructure/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Flux CLI
        uses: fluxcd/flux2/action@main

      - name: Create Kind cluster
        uses: helm/kind-action@v1
        with:
          cluster_name: flux-test
          config: kind-config.yaml

      - name: Install Flux
        run: |
          flux install
          kubectl wait --for=condition=available deployments --all \
            -n flux-system --timeout=120s

      - name: Apply test configurations
        run: |
          # Apply your GitRepository and Kustomization resources
          kubectl apply -f clusters/test/

      - name: Wait for reconciliation
        run: |
          # Wait for Kustomizations to reconcile
          flux reconcile kustomization flux-system --timeout=5m
          kubectl wait --for=condition=Ready kustomizations --all \
            -n flux-system --timeout=300s

      - name: Verify deployments
        run: |
          # Check that expected resources were created
          kubectl get deployments -A
          kubectl get services -A

      - name: Run integration tests
        run: |
          # Run your test suite
          ./scripts/integration-tests.sh

      - name: Collect logs on failure
        if: failure()
        run: |
          flux logs --all-namespaces
          kubectl get events -A --sort-by='.lastTimestamp'
```

## Best Practices Summary

1. **Use Kind for local testing** - Lightweight and disposable Kubernetes clusters
2. **Automate setup and teardown** - Script the entire lifecycle for consistency
3. **Use short reconciliation intervals** - 1-minute intervals for fast feedback during testing
4. **Install minimal monitoring** - Prometheus and Grafana for validating metrics
5. **Test against a local Git server** - Gitea provides a full Git experience in-cluster
6. **Match production Kubernetes version** - Use Kind's image parameter to match your target version
7. **Clean up between test runs** - Delete and recreate clusters for clean state
8. **Integrate with CI** - Run tests on every pull request

## Conclusion

A dedicated Flux CD test environment is essential for validating GitOps configurations safely. By using Kind for local clusters, Gitea for Git hosting, and automated setup scripts, you can create reproducible test environments in minutes. This approach lets you experiment with Flux features, test configuration changes, and run integration tests without risking production workloads. Integrate the test environment into your CI pipeline to catch issues before they reach production.
