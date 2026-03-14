# How to Set Up Flux CD on MicroK8s with HA Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, MicroK8s, High Availability, Ubuntu

Description: Configure Flux CD on a multi-node MicroK8s HA cluster using Dqlite for distributed state storage and GitOps-driven workload management.

---

## Introduction

MicroK8s is Canonical's lightweight Kubernetes distribution designed for developers and edge computing scenarios. Its HA mode uses Dqlite - a distributed SQLite database - for cluster state storage, providing a simpler HA story than etcd without an external database dependency. MicroK8s nodes communicate over a built-in peer-to-peer mesh, making HA cluster formation as simple as running a join command.

Flux CD on a MicroK8s HA cluster gives you a fully GitOps-managed lightweight cluster that can run on Ubuntu servers, Raspberry Pis, or small VM fleets. MicroK8s's addon system handles common infrastructure components (DNS, storage, ingress) through simple enable commands, which can also be declared in Git and applied by Flux.

This guide walks through forming a MicroK8s HA cluster, enabling necessary addons, and bootstrapping Flux CD.

## Prerequisites

- Three Ubuntu 20.04/22.04 nodes (2 CPU, 4GB RAM minimum)
- `snap` package manager available on all nodes
- Network connectivity between all nodes
- `flux` CLI on your workstation
- A Git repository for Flux CD bootstrap

## Step 1: Install MicroK8s on All Nodes

```bash
# Run on all three nodes
sudo snap install microk8s --classic --channel=1.29/stable

# Add your user to the microk8s group to avoid sudo
sudo usermod -a -G microk8s $USER
newgrp microk8s

# Wait for MicroK8s to be ready
microk8s status --wait-ready
```

## Step 2: Enable Required Addons on the Primary Node

```bash
# Enable DNS (required for in-cluster service discovery)
microk8s enable dns

# Enable storage (for Flux artifacts and PVCs)
microk8s enable hostpath-storage

# Enable Helm3 (optional, useful for managing charts)
microk8s enable helm3

# Enable metrics-server (for HPA)
microk8s enable metrics-server
```

## Step 3: Form the HA Cluster

On the primary node, generate a join token:

```bash
# On node1 (primary)
microk8s add-node
# Output includes a join command like:
# microk8s join 192.168.1.10:25000/TOKEN --worker (for workers)
# microk8s join 192.168.1.10:25000/TOKEN (for HA control plane)
```

On the second and third nodes, join as control plane members:

```bash
# On node2 and node3 (join as HA control plane, NOT workers)
microk8s join 192.168.1.10:25000/GENERATED_TOKEN
```

## Step 4: Verify HA Cluster Formation

```bash
# On the primary node, check cluster status
microk8s status

# Verify all nodes are in the cluster
microk8s kubectl get nodes
# Expected:
# NAME    STATUS   ROLES    AGE
# node1   Ready    <none>   15m
# node2   Ready    <none>   8m
# node3   Ready    <none>   5m

# Verify Dqlite (HA datastore) is healthy
microk8s kubectl -n kube-system get pod \
  -l k8s-app=calico-kube-controllers
```

## Step 5: Configure kubectl Access from Your Workstation

```bash
# Export the kubeconfig
microk8s config > ~/.kube/microk8s-config

# Copy to your workstation and set the server address
scp node1:~/.kube/microk8s-config ~/.kube/microk8s-ha

# Update the server address to point to a specific node or VIP
sed -i 's/127.0.0.1/192.168.1.10/g' ~/.kube/microk8s-ha
export KUBECONFIG=~/.kube/microk8s-ha

kubectl get nodes
```

## Step 6: Bootstrap Flux CD

```bash
export GITHUB_TOKEN=ghp_your_github_token

flux bootstrap github \
  --owner=my-org \
  --repository=microk8s-fleet \
  --branch=main \
  --path=clusters/microk8s-ha \
  --personal

# Verify Flux pods are running
kubectl get pods -n flux-system
```

## Step 7: Manage MicroK8s Addons via Flux

You can manage MicroK8s addon configurations through Flux by deploying the Helm charts equivalent to MicroK8s addons:

```yaml
# clusters/microk8s-ha/addons/ingress-helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: ingress-nginx
  namespace: flux-system
spec:
  url: https://kubernetes.github.io/ingress-nginx
  interval: 10m
```

```yaml
# clusters/microk8s-ha/addons/ingress-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: ingress-nginx
  namespace: flux-system
spec:
  interval: 15m
  targetNamespace: ingress-nginx
  chart:
    spec:
      chart: ingress-nginx
      version: "4.x.x"
      sourceRef:
        kind: HelmRepository
        name: ingress-nginx
        namespace: flux-system
  values:
    controller:
      # Use NodePort for MicroK8s without MetalLB
      service:
        type: NodePort
```

## Step 8: Test Flux Reconciliation

```yaml
# clusters/microk8s-ha/apps/test-app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-nginx
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: test-nginx
  template:
    metadata:
      labels:
        app: test-nginx
    spec:
      containers:
        - name: nginx
          image: nginx:stable
```

```bash
git add clusters/microk8s-ha/
git commit -m "feat: add test nginx deployment"
git push

flux get kustomizations --watch
kubectl get pods -n default
```

## Best Practices

- Always join additional nodes as HA control plane members (not workers) to participate in Dqlite quorum; you need at least 3 for HA.
- Use `microk8s enable` commands only for initial cluster setup; manage addon upgrades and configuration through Flux HelmRelease resources for auditability.
- Enable the MicroK8s `observability` addon or deploy Prometheus via Flux for cluster monitoring; do not rely on shell commands for production monitoring.
- Configure a load balancer (MetalLB addon or external) in front of all MicroK8s nodes for highly available API access from Flux's GitRepository source.
- Use `microk8s refresh-certs` before certificates expire to avoid cluster failures; automate this with a CronJob managed by Flux.

## Conclusion

MicroK8s HA with Dqlite provides a simple, snap-based Kubernetes cluster that is accessible to teams without deep Kubernetes infrastructure expertise. Flux CD on top transforms it into a production-grade GitOps-managed environment, where everything from addon configuration to application deployments is tracked in Git and automatically reconciled to the cluster.
