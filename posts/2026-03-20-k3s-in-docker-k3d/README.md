# How to Run K3s in Docker (K3d) - Part 2

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, K3d, Docker, Kubernetes, Local Development, Testing, SUSE Rancher

Description: Learn how to run K3s inside Docker containers using K3d for fast local Kubernetes development and testing, including multi-node clusters, port mappings, and registry configuration.

---

K3d is a lightweight wrapper that runs K3s in Docker. It creates multi-node Kubernetes clusters in seconds on your laptop, making it ideal for development, CI pipelines, and testing.

Before you start, make sure Docker and `kubectl` are installed, since K3d requires Docker and the commands below use `kubectl`.

---

## Step 1: Install K3d

```bash
# Install K3d via curl

curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash

# Or via brew (macOS/Linux)
brew install k3d

# Verify installation
k3d version
```

---

## Step 2: Create a Single-Node Cluster

```bash
# Create a basic cluster named "dev"
k3d cluster create dev

# Verify the cluster is running
kubectl get nodes
kubectl get pods -A
```

---

## Step 3: Create a Multi-Node Cluster

Simulate a production-like environment with multiple nodes:

```bash
# Create a cluster with 3 server nodes and 3 agent nodes
k3d cluster create prod-sim \
  --servers 3 \
  --agents 3 \
  --k3s-arg "--disable=traefik@server:*" \
  --port "80:80@loadbalancer" \
  --port "443:443@loadbalancer"

# Check all nodes are running
kubectl get nodes -o wide
```

---

## Step 4: Configure Port Mappings for Local Access

Map container ports to your localhost for testing ingresses and services:

```bash
# Create cluster with HTTP and HTTPS port mappings
k3d cluster create myapp \
  --port "8080:80@loadbalancer" \
  --port "8443:443@loadbalancer"

# After deploying an ingress or service, access it via localhost
curl http://localhost:8080/
```

---

## Step 5: Use a Local Registry with K3d

K3d can create a local container registry so you don't need to push images to a remote registry:

```bash
# Create a registry alongside the cluster
k3d registry create my-registry.localhost --port 5000

# Create a cluster that uses the local registry
k3d cluster create dev-registry \
  --registry-use k3d-my-registry.localhost:5000

# Build and push to the local registry from your host
docker build -t localhost:5000/my-app:latest .
docker push localhost:5000/my-app:latest

# Deploy using the local registry image
kubectl run my-app --image=k3d-my-registry.localhost:5000/my-app:latest
```

---

## Step 6: Use K3d in CI Pipelines

K3d is perfect for integration tests in CI:

```yaml
# .github/workflows/integration.yml
on: push

jobs:
  integration-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install K3d
        run: curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash

      - name: Create test cluster
        run: k3d cluster create test --wait

      - name: Run integration tests
        run: |
          kubectl apply -f k8s/
          kubectl wait --for=condition=Ready pod -l app=my-app --timeout=60s
          make integration-test

      - name: Cleanup
        if: always()
        run: k3d cluster delete test
```

---

## Common K3d Commands

```bash
# List clusters
k3d cluster list

# Stop a cluster (keep data)
k3d cluster stop dev

# Start a stopped cluster
k3d cluster start dev

# Delete a cluster
k3d cluster delete dev

# Import an image from Docker into K3d
k3d image import my-app:latest -c dev
```

---

## Best Practices

- Use `k3d image import` instead of a registry for quick local testing to avoid push/pull overhead.
- Use K3d configuration files (`k3d-config.yaml`) to version-control your local cluster setup.
- Set `--k3s-arg "--disable=traefik@server:*"` and install your own ingress controller to mirror production.
