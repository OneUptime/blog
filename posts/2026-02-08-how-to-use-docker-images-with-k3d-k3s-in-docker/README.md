# How to Use Docker Images with k3d (k3s in Docker)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Kubernetes, k3d, k3s, Local Development, Lightweight Kubernetes, DevOps

Description: Step-by-step instructions for loading and managing Docker images in k3d clusters for lightweight Kubernetes testing.

---

k3d wraps Rancher's k3s, a lightweight Kubernetes distribution, inside Docker containers. The result is a Kubernetes cluster that starts in seconds, uses minimal resources, and tears down just as quickly. If you have worked with Kind, k3d fills a similar niche but with the added benefit of k3s features like built-in Traefik ingress, local storage provisioning, and a smaller memory footprint.

Getting local Docker images into a k3d cluster requires a slightly different approach than Kind. This guide covers all the methods, from simple image imports to setting up a local registry that integrates seamlessly with your k3d cluster.

## Installing k3d

k3d is a single binary. Install it with one command.

```bash
# Install k3d on macOS or Linux
curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash

# Or with Homebrew on macOS
brew install k3d

# Verify the installation
k3d version
```

You also need `kubectl` installed:

```bash
# Install kubectl on macOS
brew install kubectl

# Install kubectl on Linux
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/
```

## Creating a k3d Cluster

Create a basic cluster:

```bash
# Create a single-node k3d cluster
k3d cluster create dev

# Create a cluster with multiple worker nodes
k3d cluster create dev --agents 2

# Create a cluster with port mapping (expose port 8080 on localhost to port 80 in the cluster)
k3d cluster create dev -p "8080:80@loadbalancer" --agents 2
```

The `-p` flag maps host ports to the k3d load balancer, which is essential for accessing services from your browser.

Check that kubectl is configured to talk to the new cluster:

```bash
# Verify cluster connectivity
kubectl cluster-info
kubectl get nodes
```

## Why Local Images Need Special Handling

Just like Kind, k3d nodes run containerd independently from your Docker daemon. An image you built with `docker build` exists only in your local Docker image store. The containerd instance inside the k3d nodes has no access to it.

If you try to deploy a locally built image without loading it first, the pod enters `ImagePullBackOff` because the cluster cannot find the image in any registry.

## Method 1: k3d image import

The most straightforward way to get a local Docker image into k3d.

```bash
# Build your image locally
docker build -t myapi:v1.0 .

# Import the image into the k3d cluster named "dev"
k3d image import myapi:v1.0 -c dev
```

This copies the image from your Docker daemon into every node in the cluster. Now reference it in your Kubernetes manifests:

```yaml
# deployment.yaml - Using the imported image
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapi
spec:
  replicas: 2
  selector:
    matchLabels:
      app: myapi
  template:
    metadata:
      labels:
        app: myapi
    spec:
      containers:
        - name: myapi
          image: myapi:v1.0
          # Prevent Kubernetes from trying to pull from a remote registry
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 3000
```

Import multiple images at once:

```bash
# Import several images in a single command
k3d image import myapi:v1.0 myworker:v1.0 redis:7-alpine -c dev
```

Import from a tar archive:

```bash
# Save an image to tar and import it
docker save myapi:v1.0 -o myapi.tar
k3d image import myapi.tar -c dev
```

## Method 2: Local Registry with k3d

For iterative development, importing images after every build gets tedious. k3d has first-class support for creating a local Docker registry alongside your cluster.

```bash
# Create a cluster with a connected local registry on port 5111
k3d cluster create dev \
  --registry-create dev-registry:0.0.0.0:5111 \
  -p "8080:80@loadbalancer" \
  --agents 2
```

This command does three things:

1. Creates a k3d cluster named "dev"
2. Starts a Docker registry container named "dev-registry" accessible on port 5111
3. Configures all k3d nodes to pull from this registry

Now your build-push-deploy workflow becomes:

```bash
# Build and tag for the local registry
docker build -t localhost:5111/myapi:v1.0 .

# Push to the local registry (fast since it is local)
docker push localhost:5111/myapi:v1.0
```

Reference the registry in your deployment:

```yaml
# deployment.yaml - Pull from the k3d local registry
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapi
spec:
  replicas: 2
  selector:
    matchLabels:
      app: myapi
  template:
    metadata:
      labels:
        app: myapi
    spec:
      containers:
        - name: myapi
          # Use the registry name, not localhost, inside the cluster
          image: dev-registry:5111/myapi:v1.0
          ports:
            - containerPort: 3000
```

There is an important detail here. From your host machine, you push to `localhost:5111`. But inside the cluster, the registry is reachable at `dev-registry:5111` (the container name). Your Kubernetes manifests must use the internal name.

## Method 3: Connect an Existing Registry

If you already have a registry running (maybe shared across multiple clusters), connect it when creating the cluster.

```bash
# Start a standalone registry if you do not already have one
docker run -d -p 5000:5000 --name shared-registry registry:2

# Create a k3d cluster that uses the existing registry
k3d cluster create dev --registry-use shared-registry:5000
```

## Verifying Images Inside the Cluster

Confirm that your image is available on the cluster nodes:

```bash
# List images on the k3d server node
docker exec k3d-dev-server-0 crictl images | grep myapi

# Check all nodes in a multi-node cluster
for node in $(k3d node list -o json | jq -r '.[].name'); do
  echo "--- $node ---"
  docker exec $node crictl images 2>/dev/null | grep myapi
done
```

## Complete Development Workflow

Here is my recommended workflow for active development with k3d.

Set up the cluster and registry once:

```bash
# One-time setup: cluster with registry and port mapping
k3d cluster create dev \
  --registry-create dev-registry:0.0.0.0:5111 \
  -p "8080:80@loadbalancer" \
  --agents 1
```

Create a simple build script:

```bash
#!/bin/bash
# build-and-deploy.sh - Build, push, and restart the deployment

# Set variables
REGISTRY="localhost:5111"
IMAGE="myapi"
TAG="${1:-latest}"

# Build the Docker image
docker build -t ${REGISTRY}/${IMAGE}:${TAG} .

# Push to the local registry
docker push ${REGISTRY}/${IMAGE}:${TAG}

# Restart the deployment to pull the latest image
kubectl rollout restart deployment/myapi

# Follow the rollout progress
kubectl rollout status deployment/myapi
```

```bash
# Make the script executable and run it
chmod +x build-and-deploy.sh
./build-and-deploy.sh v1.1
```

## Exposing Services

k3d includes Traefik as an ingress controller by default. Combined with port mapping, you can access services through your browser.

```yaml
# ingress.yaml - Route traffic through k3d's built-in Traefik
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapi-ingress
spec:
  rules:
    - host: myapi.localhost
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: myapi
                port:
                  number: 3000
```

Since port 8080 on your host maps to port 80 on the load balancer, visit `http://myapi.localhost:8080` to access the service.

## Managing Multiple Clusters

k3d makes it easy to run multiple clusters simultaneously for different projects.

```bash
# Create separate clusters for different environments
k3d cluster create staging --registry-create staging-reg:0.0.0.0:5112
k3d cluster create testing --registry-create testing-reg:0.0.0.0:5113

# Switch between clusters
kubectl config use-context k3d-staging
kubectl config use-context k3d-testing

# List all clusters
k3d cluster list
```

## Cleaning Up

```bash
# Stop a cluster without deleting it (saves resources)
k3d cluster stop dev

# Start it back up
k3d cluster start dev

# Delete a cluster and its registry
k3d cluster delete dev

# Delete all k3d clusters
k3d cluster delete --all
```

## k3d vs Kind

Both tools serve similar purposes, but there are differences worth noting:

- **Startup time**: k3d clusters start faster because k3s is lighter than kubeadm-based Kubernetes.
- **Built-in extras**: k3d comes with Traefik ingress and local path provisioner out of the box.
- **Registry support**: k3d has native registry creation and management. Kind requires manual setup.
- **Memory usage**: k3d clusters use less memory, roughly 500 MB for a single-node cluster versus 700+ MB for Kind.
- **Kubernetes compatibility**: Kind uses upstream Kubernetes, which means perfect API compatibility. k3s occasionally has minor differences.

## Conclusion

k3d gives you production-like Kubernetes environments that spin up in seconds. The built-in registry support makes the image loading workflow smooth and mirrors how you would work with a real registry in production. For local development and CI/CD testing, the combination of fast startup, low resource usage, and seamless image management makes k3d a strong choice. Start with `k3d image import` for simplicity, and switch to the local registry approach when you find yourself importing images repeatedly.
