# How to Use Podman Desktop with Kind Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Podman Desktop, Kind, Kubernetes, Local Development

Description: Learn how to create and manage Kind (Kubernetes in Docker) clusters using Podman Desktop for local Kubernetes development and testing.

---

> Kind clusters powered by Podman give you a full Kubernetes environment on your local machine without the overhead of a cloud provider or virtual machines.

Kind (Kubernetes in Docker) is a tool for running local Kubernetes clusters using container nodes. While originally designed for Docker, Kind works with Podman as the container runtime. Podman Desktop provides integrated support for creating and managing Kind clusters, making it easy to test Kubernetes deployments locally before pushing to production.

---

## Prerequisites

Install Kind and verify Podman is ready:

```bash
# Install Kind on macOS

brew install kind

# Or download the binary directly
# For Intel Macs:
# [ "$(uname -m)" = "x86_64" ] && curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.31.0/kind-darwin-amd64
# For Apple Silicon:
# [ "$(uname -m)" = "arm64" ] && curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.31.0/kind-darwin-arm64
# chmod +x ./kind && sudo mv ./kind /usr/local/bin/kind

# Verify Kind installation
kind --version

# Ensure Podman is running
podman info --format '{{.Host.RemoteSocket.Path}}'
```

## Configuring Kind to Use Podman

Kind can auto-detect Podman, but you can force it explicitly:

```bash
# Set the provider to Podman explicitly
export KIND_EXPERIMENTAL_PROVIDER=podman

# Alternatively, persist the setting in your shell profile
echo 'export KIND_EXPERIMENTAL_PROVIDER=podman' >> ~/.zshrc
source ~/.zshrc

# Verify the configuration
kind create cluster --name test-cluster
kind get clusters
```

## Creating a Kind Cluster via Podman Desktop

Podman Desktop can create Kind clusters through its UI:

1. Open Podman Desktop and go to **Settings** > **Resources**.
2. In the **Kind** tile, click **Create new ...**.
3. Create a cluster with the default configuration, or provide a Kind configuration file.
4. Configure the cluster name and any other settings you need.
5. Click **Create** and wait for the cluster to initialize.

The cluster will appear in your Kubernetes contexts automatically.

## Creating a Multi-Node Cluster

For more realistic testing, create a cluster with multiple nodes:

```yaml
# Save as kind-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    kubeadmConfigPatches:
      - |
        kind: InitConfiguration
        nodeRegistration:
          kubeletExtraArgs:
            node-labels: "ingress-ready=true"
    extraPortMappings:
      # Use non-privileged host ports with rootless Podman
      - containerPort: 80
        hostPort: 8080
        protocol: TCP
      - containerPort: 443
        hostPort: 8443
        protocol: TCP
  - role: worker
  - role: worker
```

```bash
# Create the cluster with the custom config
KIND_EXPERIMENTAL_PROVIDER=podman kind create cluster \
  --name multi-node \
  --config kind-config.yaml

# Verify all nodes are ready
kubectl get nodes

# Check the cluster containers in Podman
podman ps --filter "label=io.x-k8s.kind.cluster=multi-node"
```

## Loading Images into Kind

Kind clusters cannot pull images from your local Podman storage by default. Load them explicitly:

```bash
# Build an image locally
podman build -t my-app:latest .

# Save the image to a tar file
podman save -o my-app.tar my-app:latest

# Load the image into the Kind cluster
kind load image-archive --name multi-node my-app.tar

# Verify the image is available in the cluster
podman exec -it multi-node-control-plane crictl images | grep my-app
```

## Deploying Applications to the Kind Cluster

Once the cluster is running, deploy your applications:

```bash
# Ensure the Kind context is active
kubectl config use-context kind-multi-node

# Deploy a sample application
kubectl create deployment hello-server \
  --image=gcr.io/google-samples/hello-app:1.0

# Expose it as a service
kubectl expose deployment hello-server --port=8080 --type=NodePort

# Get the service details
kubectl get svc hello-server

# Port forward to test locally
kubectl port-forward svc/hello-server 8080:8080
```

## Installing an Ingress Controller

For proper HTTP routing, install an ingress controller:

```bash
# Install the Nginx ingress controller for Kind
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# Wait for the ingress controller to be ready
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=90s
```

## Managing Kind Clusters

```bash
# List all Kind clusters
kind get clusters

# Get cluster details
kubectl cluster-info --context kind-multi-node

# Export the kubeconfig for a specific cluster
kind export kubeconfig --name multi-node

# Delete a cluster when done
kind delete cluster --name multi-node

# Delete all Kind clusters
kind delete clusters --all
```

## Troubleshooting Kind with Podman

Common issues when using Kind with Podman:

```bash
# Check if the Podman socket is accessible
podman system service --time=0 &
ls -la $(podman info --format '{{.Host.RemoteSocket.Path}}')

# Restart a stuck cluster
podman restart $(podman ps -q --filter "label=io.x-k8s.kind.cluster")

# View Kind cluster logs
kind export logs --name multi-node ./kind-logs

# Check node status inside the cluster
podman exec -it multi-node-control-plane kubectl get nodes
```

## Summary

Using Podman Desktop with Kind clusters provides a robust local Kubernetes environment for development and testing. The integration allows you to create single or multi-node clusters, load local images, and deploy applications just as you would on a production cluster. Kind clusters are lightweight and ephemeral, making them ideal for CI pipelines and rapid iteration on Kubernetes configurations.
