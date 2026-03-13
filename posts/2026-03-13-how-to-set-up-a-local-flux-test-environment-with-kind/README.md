# How to Set Up a Local Flux Test Environment with Kind

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Testing, Kind, Local Development

Description: Learn how to set up a local Kubernetes cluster using Kind for testing Flux CD configurations before deploying to production.

---

## Introduction

Kind (Kubernetes IN Docker) is a tool for running local Kubernetes clusters using Docker containers as nodes. It is an excellent choice for testing Flux configurations because it is fast to create, lightweight, and disposable. This guide walks through setting up a complete Flux test environment using Kind.

## Prerequisites

- Docker installed and running
- kubectl installed
- Flux CLI installed (v2.0 or later)
- A GitHub personal access token (for bootstrapping)
- Go 1.19 or later (optional, for building Kind from source)

## Step 1: Install Kind

```bash
# macOS (Homebrew)
brew install kind

# Linux (binary download)
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.24.0/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind

# Verify installation
kind version
```

## Step 2: Create a Kind Cluster Configuration

Create a cluster configuration file that suits Flux testing needs.

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
            node-labels: "ingress-ready=true"
    extraPortMappings:
      - containerPort: 80
        hostPort: 80
        protocol: TCP
      - containerPort: 443
        hostPort: 443
        protocol: TCP
  - role: worker
  - role: worker
networking:
  podSubnet: "10.244.0.0/16"
  serviceSubnet: "10.96.0.0/12"
```

## Step 3: Create the Cluster

```bash
# Create the Kind cluster
kind create cluster --config kind-config.yaml

# Verify the cluster is running
kubectl cluster-info --context kind-flux-test
kubectl get nodes
```

## Step 4: Bootstrap Flux

```bash
# Export your GitHub credentials
export GITHUB_TOKEN=<your-github-token>
export GITHUB_USER=<your-github-username>

# Bootstrap Flux with a test repository
flux bootstrap github \
  --owner=$GITHUB_USER \
  --repository=flux-test-env \
  --path=clusters/test \
  --personal \
  --branch=main

# Verify Flux components are running
flux check
```

## Step 5: Create a Test Application

Set up a simple application to test Flux reconciliation.

```yaml
# apps/test-app/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: test-app

---
# apps/test-app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
  namespace: test-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          image: nginx:1.27-alpine
          ports:
            - containerPort: 80
          resources:
            limits:
              cpu: 100m
              memory: 128Mi

---
# apps/test-app/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx
  namespace: test-app
spec:
  selector:
    app: nginx
  ports:
    - port: 80
      targetPort: 80
```

## Step 6: Create a Flux Kustomization for the Test App

```yaml
# clusters/test/test-app.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: test-app
  namespace: flux-system
spec:
  interval: 1m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/test-app
  prune: true
  timeout: 2m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: nginx
      namespace: test-app
```

## Step 7: Test Flux Reconciliation

```bash
# Force a reconciliation
flux reconcile kustomization flux-system --with-source

# Watch the test app deploy
flux get kustomizations --watch

# Verify the test app is running
kubectl get pods -n test-app

# Check events
kubectl get events -n test-app --sort-by='.lastTimestamp'
```

## Step 8: Test Drift Detection

Flux should detect and revert manual changes. Test this behavior.

```bash
# Manually scale the deployment
kubectl scale deployment nginx -n test-app --replicas=5

# Wait for Flux to detect the drift and revert
flux reconcile kustomization test-app

# Verify replicas are back to 2
kubectl get deployment nginx -n test-app
```

## Loading Local Images into Kind

When testing with custom container images, load them into the Kind cluster.

```bash
# Build a local image
docker build -t my-app:test .

# Load it into the Kind cluster
kind load docker-image my-app:test --name flux-test

# Verify the image is available
docker exec -it flux-test-control-plane crictl images | grep my-app
```

## Testing with Local Git Repositories

For offline testing, use Gitea as a local Git server inside Kind.

```bash
# Deploy Gitea
kubectl create namespace gitea
kubectl apply -f https://raw.githubusercontent.com/gitea/gitea/main/contrib/k8s/gitea.yaml -n gitea

# Port-forward to access Gitea
kubectl port-forward svc/gitea -n gitea 3000:3000 &

# Configure Flux to use the local Gitea instance
flux create source git local-repo \
  --url=http://gitea.gitea.svc.cluster.local:3000/user/repo \
  --branch=main \
  --interval=1m
```

## Cleanup

```bash
# Delete the Kind cluster
kind delete cluster --name flux-test

# Verify cleanup
kind get clusters
```

## Automation Script

Create a script to automate the entire test environment setup.

```bash
#!/bin/bash
# setup-flux-test.sh
set -euo pipefail

CLUSTER_NAME="flux-test"
GITHUB_USER="${GITHUB_USER:?Set GITHUB_USER}"
GITHUB_TOKEN="${GITHUB_TOKEN:?Set GITHUB_TOKEN}"

echo "Creating Kind cluster..."
kind create cluster --name "$CLUSTER_NAME" --config kind-config.yaml

echo "Bootstrapping Flux..."
flux bootstrap github \
  --owner="$GITHUB_USER" \
  --repository=flux-test-env \
  --path=clusters/test \
  --personal \
  --branch=main

echo "Waiting for Flux to be ready..."
flux check

echo "Flux test environment is ready."
echo "Cluster: $CLUSTER_NAME"
echo "Context: kind-$CLUSTER_NAME"
```

## Best Practices

- Use a dedicated Kind configuration for Flux testing to ensure reproducibility
- Always clean up Kind clusters after testing to free Docker resources
- Use short reconciliation intervals (1-2 minutes) for faster feedback during testing
- Test both happy path and failure scenarios (bad manifests, missing secrets)
- Automate the setup and teardown process with scripts

## Conclusion

Kind provides a fast and lightweight way to test Flux configurations locally. By setting up a disposable Kind cluster with Flux bootstrapped, you can validate your GitOps workflows, test drift detection, and verify reconciliation behavior before deploying to production. The quick create and delete cycle makes Kind ideal for iterative development and CI pipelines.
