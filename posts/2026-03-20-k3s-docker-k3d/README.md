# How to Run K3s in Docker (K3d)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, K3d, Docker, Local Development, Kubernetes, Testing, SUSE Rancher

Description: Learn how to use K3d to run K3s clusters inside Docker containers for local development and testing, including multi-node clusters, port mapping, and registry configuration.

---

K3d (K3s in Docker) creates lightweight K3s clusters inside Docker containers. It is ideal for local development, CI testing, and trying out Kubernetes configurations without needing real virtual machines.

---

## Step 1: Install K3d

```bash
# Install K3d

curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash

# Verify installation
k3d version

# Prerequisites: Docker must be running and kubectl should be installed
docker version
kubectl version --client
```

---

## Step 2: Create a Basic Cluster

```bash
# Create a single-node cluster and set kubeconfig automatically
k3d cluster create mycluster --kubeconfig-update-default

# Verify the cluster is running
kubectl cluster-info
kubectl get nodes
```

---

## Step 3: Create a Multi-Node Cluster

```bash
# Create a cluster with 1 server node + 3 agent nodes
# Map host ports 8080 and 8443 to the cluster ingress load balancer
k3d cluster create production \
  --servers 1 \
  --agents 3 \
  --port "8080:80@loadbalancer" \
  --port "8443:443@loadbalancer"

# Verify all nodes
kubectl get nodes
```

---

## Step 4: Map Ports for Local Development

```bash
# Map host port 3000 to cluster ingress
k3d cluster create dev \
  --port "3000:80@loadbalancer" \
  --port "3443:443@loadbalancer"

# Deploy a test application
kubectl create deployment nginx --image=nginx:1.24
kubectl expose deployment nginx --port=80

# Create an Ingress for the application
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nginx
spec:
  rules:
    - host: nginx.localhost
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: nginx
                port:
                  number: 80
EOF

# Access the application
curl -H "Host: nginx.localhost" http://localhost:3000
```

---

## Step 5: Use a Local Registry with K3d

K3d can create a local registry container for faster image iteration:

```bash
# Create a cluster with a local registry
k3d registry create myregistry.localhost --port 5000

k3d cluster create registry-demo \
  --registry-use k3d-myregistry.localhost:5000 \
  --port "8080:80@loadbalancer"

# Build and push an image to the local registry
docker build -t k3d-myregistry.localhost:5000/myapp:latest .
docker push k3d-myregistry.localhost:5000/myapp:latest

# Deploy the local image
kubectl create deployment myapp \
  --image=k3d-myregistry.localhost:5000/myapp:latest
```

---

## Step 6: Use a K3d Config File

For reproducible cluster configurations:

```yaml
# k3d-config.yaml
apiVersion: k3d.io/v1alpha5
kind: Simple
metadata:
  name: dev-cluster
servers: 1
agents: 2
ports:
  - port: 8080:80
    nodeFilters:
      - loadbalancer
  - port: 8443:443
    nodeFilters:
      - loadbalancer
registries:
  create:
    name: myregistry.localhost
    host: "0.0.0.0"
    hostPort: "5000"
options:
  k3d:
    wait: true
    timeout: "60s"
  k3s:
    extraArgs:
      - arg: --disable=traefik
        nodeFilters:
          - server:*
```

```bash
k3d cluster create --config k3d-config.yaml
```

---

## Step 7: Manage K3d Clusters

```bash
# List all clusters
k3d cluster list

# Stop a cluster (preserves data)
k3d cluster stop dev-cluster

# Start a stopped cluster
k3d cluster start dev-cluster

# Delete a cluster
k3d cluster delete dev-cluster

# Get the kubeconfig for a cluster
k3d kubeconfig get dev-cluster

# Switch between clusters
kubectl config use-context k3d-dev-cluster
```

---

## Step 8: Use K3d in CI Pipelines

```yaml
# .github/workflows/test.yml
- name: Create K3d cluster for testing
  run: |
    curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash
    k3d cluster create ci \
      --agents 1 \
      --wait

- name: Run tests
  run: |
    kubectl apply -f manifests/
    kubectl wait deployment/myapp --for=condition=available --timeout=60s
    # Run integration tests

- name: Cleanup
  if: always()
  run: k3d cluster delete ci
```

---

## Best Practices

- Use K3d config files (`k3d-config.yaml`) for development clusters that other team members need to reproduce - commit the config to the repository.
- Create a local registry with every K3d cluster in development - it eliminates the need to push images to a remote registry during rapid iteration.
- For CI pipelines, use `--wait` when creating the cluster to ensure K3d waits for the cluster to be fully ready before the next step runs.
