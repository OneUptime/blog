# How to Use Docker Images with Kind (Kubernetes in Docker)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Kubernetes, Kind, Local Development, Testing, Container Orchestration

Description: A practical guide to loading and using local Docker images with Kind clusters for fast Kubernetes development.

---

Kind (Kubernetes in Docker) runs entire Kubernetes clusters inside Docker containers. Each Kubernetes node is a Docker container, which makes Kind lightweight, fast to start, and easy to tear down. It is the go-to tool for CI pipelines and local Kubernetes development when you do not want the overhead of a full VM-based cluster.

One of the first challenges developers face with Kind is getting their locally built Docker images into the cluster. Kind nodes run their own containerd runtime, so images in your local Docker daemon are not automatically visible inside the cluster. This guide covers every method for loading images and the workflows that make Kind productive.

## Installing Kind

Kind requires Docker and Go, though you can install the binary directly without Go.

```bash
# Install Kind on macOS
brew install kind

# Install Kind on Linux (download the binary directly)
curl -Lo ./kind https://kind.sigs.k8s.io/dl/latest/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind

# Verify the installation
kind version
```

## Creating a Cluster

Spin up a basic single-node cluster:

```bash
# Create a Kind cluster with the default name "kind"
kind create cluster

# Or give it a specific name
kind create cluster --name dev-cluster
```

For multi-node clusters, use a configuration file:

```yaml
# kind-config.yaml - A cluster with one control plane and two workers
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
  - role: worker
  - role: worker
```

```bash
# Create a multi-node cluster from the config file
kind create cluster --name multi-node --config kind-config.yaml
```

## The Image Loading Problem

When you build a Docker image locally, it lives in your Docker daemon's image store. Kind nodes use containerd internally, which has its own image store. Running `kubectl apply` with a locally built image fails because the Kind node cannot find it.

```bash
# Build a local image
docker build -t myapp:latest .

# This will FAIL - Kind cannot pull "myapp:latest" from anywhere
kubectl run myapp --image=myapp:latest
```

The pod enters an `ErrImagePull` or `ImagePullBackOff` state because the Kind node tries to pull the image from Docker Hub (or whatever registry is configured) and it does not exist there.

You have three options to solve this.

## Option 1: kind load docker-image (Recommended)

The simplest approach is the `kind load` command, which copies images from your local Docker daemon into the Kind cluster nodes.

```bash
# Build the image locally
docker build -t myapp:v1.0 .

# Load the image into the Kind cluster
kind load docker-image myapp:v1.0

# If using a named cluster, specify it
kind load docker-image myapp:v1.0 --name dev-cluster
```

After loading, the image is available on all nodes in the cluster. Use it in your pod spec:

```yaml
# deployment.yaml - Reference the loaded image
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 2
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: myapp:v1.0
          # IMPORTANT: Set to Never or IfNotPresent so Kubernetes
          # does not try to pull from a remote registry
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 8080
```

The `imagePullPolicy: IfNotPresent` setting is critical. Without it, Kubernetes defaults to `Always` for images tagged `latest` and tries to pull from a remote registry, which fails.

You can load multiple images in one command:

```bash
# Load several images at once
kind load docker-image myapp:v1.0 redis:7-alpine postgres:16-alpine --name dev-cluster
```

## Option 2: kind load image-archive

If you have a Docker image saved as a tar file (perhaps from a CI build artifact), load it directly without importing into Docker first.

```bash
# Save a Docker image to a tar archive
docker save myapp:v1.0 -o myapp.tar

# Load the archive into the Kind cluster
kind load image-archive myapp.tar --name dev-cluster
```

This is particularly useful in CI/CD pipelines where you want to pass images between build and test stages.

## Option 3: Use a Local Registry

For active development where you rebuild images frequently, a local Docker registry avoids the need to run `kind load` after every build. This approach mirrors a production workflow where you push and pull from a registry.

Create the registry and connect it to Kind:

```bash
# Create a local Docker registry running on port 5001
docker run -d --restart=always -p 5001:5000 --name kind-registry registry:2

# Create a Kind cluster configured to use the local registry
cat <<'EOF' | kind create cluster --name dev --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
containerdConfigPatches:
  - |-
    [plugins."io.containerd.grpc.v1.cri".registry.mirrors."localhost:5001"]
      endpoint = ["http://kind-registry:5000"]
EOF

# Connect the registry to the Kind network so nodes can reach it
docker network connect kind kind-registry
```

Now tag and push images to the local registry:

```bash
# Build and tag for the local registry
docker build -t localhost:5001/myapp:v1.0 .

# Push to the local registry
docker push localhost:5001/myapp:v1.0
```

Reference the local registry in your Kubernetes manifests:

```yaml
# deployment.yaml - Pull from the local registry
spec:
  containers:
    - name: myapp
      image: localhost:5001/myapp:v1.0
      imagePullPolicy: Always
```

With this setup, `imagePullPolicy: Always` works correctly because the Kind nodes can actually reach the registry.

## Verifying Images Are Loaded

To confirm an image exists inside a Kind node:

```bash
# List images loaded on Kind nodes using crictl
docker exec -it dev-cluster-control-plane crictl images | grep myapp
```

If you are using the default cluster name:

```bash
# Check images on the default Kind node
docker exec -it kind-control-plane crictl images
```

## A Complete Development Workflow

Here is a practical workflow for iterating on a microservice with Kind.

```bash
# 1. Create the cluster (once)
kind create cluster --name dev

# 2. Build your application image
docker build -t myapp:dev .

# 3. Load it into Kind
kind load docker-image myapp:dev --name dev

# 4. Apply Kubernetes manifests
kubectl apply -f k8s/

# 5. After making code changes, rebuild and reload
docker build -t myapp:dev .
kind load docker-image myapp:dev --name dev

# 6. Restart the deployment to pick up the new image
kubectl rollout restart deployment/myapp

# 7. Watch the rollout
kubectl rollout status deployment/myapp
```

## Loading Images Faster

The `kind load` command can be slow for large images because it exports the image from Docker and imports it into containerd on each node. Some tips to speed things up:

**Keep images small.** Use Alpine base images and multi-stage builds.

**Use specific tags, not `latest`.** Changing the tag forces Kubernetes to pull the new version without needing `imagePullPolicy: Always`.

**Load to specific nodes.** In multi-node clusters, if your pods only run on worker nodes, you can load images to workers only:

```bash
# Load image to specific nodes only
kind load docker-image myapp:v1.0 --name dev --nodes dev-worker,dev-worker2
```

**Use the local registry approach** for frequent rebuilds. Pushing layers is incremental, so only changed layers transfer.

## Cleaning Up

Delete a Kind cluster and all its images:

```bash
# Delete a specific cluster
kind delete cluster --name dev

# Delete the default cluster
kind delete cluster

# List all running Kind clusters
kind get clusters
```

## Conclusion

Kind is one of the most efficient ways to test Docker images in a real Kubernetes environment. The `kind load docker-image` command handles most use cases, while the local registry approach scales better for active development. The key thing to remember is setting `imagePullPolicy` correctly so Kubernetes uses the loaded images instead of trying to pull from a remote registry. With these techniques, you can iterate on containerized applications quickly without pushing to a remote registry on every build.
