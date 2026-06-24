# How to Use Portainer with Containerd (Without Docker)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Containerd, Kubernetes, CRI, Container

Description: Deploy and configure Portainer to manage containers running directly on containerd without requiring the Docker daemon.

## Introduction

Containerd is a high-performance container runtime originally extracted from Docker and now a graduated CNCF project. Many Kubernetes distributions (K3s, RKE2, EKS) use containerd directly. Portainer does not support containerd directly, but it can manage containerd-based environments through its Kubernetes integration.

## Understanding the Architecture

When Docker is absent, Portainer does not connect to containerd directly. The supported approaches are:
1. **Kubernetes environment** (recommended) - Portainer manages workloads through the Kubernetes API on a cluster that uses containerd
2. **Portainer Agent or Edge Agent on Kubernetes** - Portainer deploys its agent components into the Kubernetes cluster
3. **nerdctl / crictl for host-side debugging** - useful for troubleshooting containerd on the node, but not a Portainer integration layer

## Method 1: Managing Containerd via Kubernetes (Recommended)

Most containerd deployments run inside Kubernetes. Use Portainer's Kubernetes environment type:

```bash
# Install k3s (uses containerd by default)
curl -sfL https://get.k3s.io | sh -

# Verify containerd is the runtime
sudo k3s crictl info | grep runtimeType

# Generate a self-contained kubeconfig for Portainer BE import
sudo k3s kubectl config view --flatten=true --minify=true > k3s-portainer-kubeconfig.yaml
```

Add to Portainer:
- Environment type: **Kubernetes**
- Use the **Agent** or **Edge Agent** workflow to connect the cluster
- If you're using **Portainer Business Edition**, you can also import the generated kubeconfig file on clusters with a load balancer configured
- If Portainer is running off-cluster, make sure the kubeconfig `server:` value points to the K3s server's reachable IP or DNS name

## Method 2: Using the Portainer Agent on Kubernetes

Portainer does not support deploying its standalone agent directly as a raw containerd task. For containerd-based hosts, deploy the Portainer Agent or Edge Agent into the Kubernetes cluster from the **Kubernetes** environment wizard instead.

## Setting Up Portainer on Kubernetes

```bash
# Check for a default StorageClass
sudo k3s kubectl get sc

# If needed, mark a StorageClass as default
sudo k3s kubectl patch storageclass <storage-class-name> -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
```

## Running Portainer Agent via Kubernetes

Use the Kubernetes-based Agent or Edge Agent workflow instead of `nerdctl run` on a raw containerd host. After deploying the manifest from the Portainer wizard, verify that the agent is running:

```bash
sudo k3s kubectl get pods --namespace=portainer
```

## Deploying Portainer Server

```bash
# Install Portainer CE on Kubernetes with Helm
helm repo add portainer https://portainer.github.io/k8s/
helm repo update

helm upgrade --install --create-namespace -n portainer portainer portainer/portainer \
  --set tls.force=true \
  --set image.tag=lts
```

By default, this exposes Portainer over HTTPS on NodePort `30779`.

## Using crictl for Debugging

crictl is a CLI tool for container runtimes implementing the CRI spec:

```bash
# List running pods/containers
sudo k3s crictl pods
sudo k3s crictl ps

# Inspect a container
sudo k3s crictl inspect <container-id>
```

## Containerd Namespaces

Containerd uses namespaces to isolate resources:

```bash
# List all namespaces on a K3s node
sudo k3s ctr namespaces list

# Kubernetes uses the 'k8s.io' namespace
sudo k3s ctr -n k8s.io containers list

# If you use nerdctl for host-side debugging, target the same namespace
sudo nerdctl --namespace k8s.io ps -a
```

## Conclusion

Portainer works with containerd-based environments through Kubernetes integration, not as a direct containerd client. For host-side troubleshooting, `nerdctl` and `crictl` are useful companion tools, but Portainer itself should be deployed or connected through Kubernetes when Docker is not present.
