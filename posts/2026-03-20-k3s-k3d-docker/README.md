# How to Run K3s in Docker (K3d) - Part 3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Docker, K3d, Development, Testing, DevOps

Description: Learn how to use k3d to run K3s clusters inside Docker containers for fast local development and CI/CD testing environments.

## Introduction

K3d (K3s in Docker) is a lightweight wrapper that allows you to run K3s Kubernetes clusters inside Docker containers. This makes it perfect for local development, testing, and CI/CD pipelines where you need a real Kubernetes environment without spinning up VMs. A cluster can be created in seconds and destroyed just as quickly. This guide covers getting started with k3d and common workflows.

## Prerequisites

- Docker installed and running
- `k3d` CLI installed
- Basic kubectl knowledge

## Step 1: Install k3d

```bash
# Install latest k3d

curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash

# Or install specific version
curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | \
  TAG=v5.8.3 bash

# Verify installation
k3d version

# Install kubectl if not already installed
curl -Lo kubectl \
  "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
```

## Step 2: Create a Basic Cluster

```bash
# Create a simple single-node cluster
k3d cluster create my-cluster

# Create with custom options
k3d cluster create my-cluster \
  --servers 1 \
  --agents 2 \
  --image rancher/k3s:v1.35.4-k3s1

# Verify the cluster is running
kubectl get nodes

# k3d automatically updates your kubeconfig
kubectl cluster-info
```

## Step 3: Create a Production-Like Multi-Node Cluster

```bash
# Create a cluster with 1 server and 3 agents
k3d cluster create production-like \
  --servers 1 \
  --agents 3 \
  --image rancher/k3s:v1.35.4-k3s1 \
  --k3s-arg "--disable=traefik@server:0" \
  --k3s-arg "--kubelet-arg=max-pods=50@agent:*" \
  --timeout 60s

# Verify all nodes are Ready
kubectl get nodes
```

## Step 4: Expose Services via Port Mapping

```bash
# Create cluster with host port mappings
# Map host port 8080 to port 80 on the k3d load balancer
k3d cluster create web-cluster \
  --servers 1 \
  --agents 2 \
  --k3s-arg "--disable=traefik@server:0" \
  -p "8080:80@loadbalancer" \
  -p "8443:443@loadbalancer" \
  --image rancher/k3s:v1.35.4-k3s1

# Deploy NGINX Ingress
kubectl apply -f \
  https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.15.1/deploy/static/provider/cloud/deploy.yaml

# Wait for NGINX to be ready
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s

# Deploy a test app
kubectl create deployment test --image=nginx:alpine
kubectl expose deployment test --port=80

# Create Ingress
cat <<'EOF' | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: test-ingress
spec:
  ingressClassName: nginx
  rules:
    - host: test.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: test
                port:
                  number: 80
EOF

# Access the app
curl -H "Host: test.local" http://localhost:8080/
```

## Step 5: Use a k3d Config File

For reproducible cluster configurations:

```yaml
# k3d-cluster.yaml
apiVersion: k3d.io/v1alpha5
kind: Simple

metadata:
  name: dev-cluster

servers: 1
agents: 2

image: rancher/k3s:v1.35.4-k3s1

ports:
  - port: 8080:80
    nodeFilters:
      - loadbalancer
  - port: 8443:443
    nodeFilters:
      - loadbalancer

options:
  k3d:
    wait: true
    timeout: "60s"
  k3s:
    extraArgs:
      - arg: "--disable=traefik"
        nodeFilters:
          - server:*
  kubeconfig:
    updateDefaultKubeconfig: true
    switchCurrentContext: true

registries:
  create:
    name: local-registry
    host: "0.0.0.0"
    hostPort: "5000"
  config: |
    mirrors:
      "localhost:5000":
        endpoint:
          - http://k3d-local-registry:5000

volumes:
  - volume: /tmp/k3d-data:/data
    nodeFilters:
      - all
```

Create cluster from config:

```bash
k3d cluster create --config k3d-cluster.yaml

# Delete and recreate from config
k3d cluster delete dev-cluster
k3d cluster create --config k3d-cluster.yaml
```

## Step 6: Using a Local Docker Registry with k3d

```bash
# Create a local registry
k3d registry create local-registry \
  --port 5000

# Create cluster that uses the registry
k3d cluster create my-cluster \
  --registry-use k3d-local-registry:5000

# Tag and push a local image to the registry
docker build -t my-app:v1 .
docker tag my-app:v1 localhost:5000/my-app:v1
docker push localhost:5000/my-app:v1

# Use the image in Kubernetes
kubectl create deployment my-app \
  --image=k3d-local-registry:5000/my-app:v1
```

## Step 7: Import Docker Images into k3d

```bash
# Instead of pushing to a registry, import images directly
docker pull nginx:alpine

# Import the image into the k3d cluster
k3d image import nginx:alpine -c my-cluster

# Now use it without pulling from Docker Hub
kubectl create deployment test \
  --image=nginx:alpine
```

## Step 8: Manage Multiple Clusters

```bash
# List all k3d clusters
k3d cluster list

# Start a stopped cluster
k3d cluster start dev-cluster

# Stop a cluster (preserves data)
k3d cluster stop dev-cluster

# Delete a cluster
k3d cluster delete dev-cluster

# Switch between clusters
k3d kubeconfig merge dev-cluster --kubeconfig-merge-default
kubectl config use-context k3d-dev-cluster

# Get kubeconfig for a specific cluster
k3d kubeconfig get dev-cluster > ~/.kube/k3d-dev-cluster.yaml
```

## Step 9: CI/CD Integration

Use k3d in GitHub Actions:

```yaml
# .github/workflows/k3s-test.yaml
name: K3s Integration Tests

on: [push, pull_request]

jobs:
  integration-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install k3d
        run: |
          curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash
          k3d version

      - name: Create K3s cluster
        run: |
          k3d cluster create test-cluster \
            --servers 1 \
            --agents 1 \
            --wait \
            --timeout 60s

      - name: Wait for cluster to be ready
        run: |
          kubectl wait --for=condition=Ready nodes --all --timeout=60s

      - name: Deploy application
        run: |
          kubectl apply -f k8s/

      - name: Wait for deployment
        run: |
          kubectl rollout status deployment/my-app --timeout=120s

      - name: Run integration tests
        run: |
          # Your test suite here
          ./tests/integration-test.sh

      - name: Cleanup
        if: always()
        run: k3d cluster delete test-cluster
```

## Step 10: Performance Tuning for k3d

```bash
# Increase Docker resources (Docker Desktop)
# Settings > Resources:
# - CPUs: 4+
# - Memory: 8GB+

# For better performance, disable some k3d defaults
k3d cluster create perf-cluster \
  --servers 1 \
  --agents 2 \
  --k3s-arg "--disable=traefik@server:*" \
  --k3s-arg "--disable=metrics-server@server:*" \
  --k3s-arg "--disable=local-storage@server:*" \
  --no-lb  # Disable the load balancer container if not needed
```

## Conclusion

K3d makes running K3s clusters in Docker trivially easy, enabling fast iteration cycles for developers and reliable CI/CD testing environments. The ability to create, test, and destroy clusters in seconds - combined with local registry support and port mapping - makes k3d an essential tool for Kubernetes development workflows. For CI/CD pipelines, k3d provides a real Kubernetes environment that closely mirrors production K3s deployments without requiring dedicated infrastructure.
