# How to Deploy Flux CD on MicroK8s Edge Nodes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, MicroK8s, Kubernetes, Edge Computing, GitOps, Ubuntu, Snap

Description: Configure Flux CD on MicroK8s for edge node deployments, leveraging MicroK8s addons and snap-based management for simplified operations.

---

## Introduction

MicroK8s is Canonical's lightweight Kubernetes distribution, distributed as a snap package on Ubuntu and Ubuntu Core. It is particularly popular for edge deployments on Ubuntu-based hardware — from industrial PCs to digital signage systems. MicroK8s has a unique addon system that provides one-command installation of common components, and its snap-based delivery ensures automatic security updates.

Flux CD integrates naturally with MicroK8s, taking advantage of its addon ecosystem for observability and storage while providing GitOps-driven application management. The combination is especially powerful for organizations already using Ubuntu as their edge OS standard.

This guide covers installing MicroK8s with the right addons, bootstrapping Flux CD, and configuring GitOps-managed edge workloads optimized for MicroK8s's specific architecture.

## Prerequisites

- Edge hardware running Ubuntu 22.04 LTS or later (x86_64 or ARM64)
- `snap` package manager (built into Ubuntu)
- Internet connectivity for initial MicroK8s installation
- Git repository for Flux manifests
- `flux` CLI on your management workstation

## Step 1: Install MicroK8s with Edge-Appropriate Addons

```bash
# Install MicroK8s via snap
sudo snap install microk8s --classic --channel=1.29/stable

# Add current user to microk8s group
sudo usermod -aG microk8s $USER
sudo chown -R $USER ~/.kube
newgrp microk8s

# Wait for MicroK8s to be ready
microk8s status --wait-ready

# Enable required addons for edge workloads
microk8s enable dns          # CoreDNS - required
microk8s enable hostpath-storage  # Local storage for edge PVCs
microk8s enable metrics-server    # Resource monitoring

# Optional addons based on edge use case
# microk8s enable ingress    # NGINX ingress controller
# microk8s enable registry   # Local container registry (reduces bandwidth)
```

## Step 2: Configure kubectl Access

```bash
# Export MicroK8s kubeconfig
mkdir -p ~/.kube
microk8s config > ~/.kube/config-microk8s
export KUBECONFIG=~/.kube/config-microk8s

# Verify access
kubectl get nodes
kubectl get pods -A

# Alias for convenience
alias kubectl='microk8s kubectl'
```

## Step 3: Enable the Local Registry for Edge Bandwidth Reduction

MicroK8s includes a built-in container registry addon that can cache images locally, dramatically reducing bandwidth for air-gapped or bandwidth-constrained edge deployments.

```bash
# Enable built-in registry (runs on port 32000)
microk8s enable registry

# Configure containerd to use the local registry as a mirror
# /var/snap/microk8s/current/args/containerd-template.toml
sudo cat >> /var/snap/microk8s/current/args/containerd-template.toml << 'EOF'
[plugins."io.containerd.grpc.v1.cri".registry.mirrors."docker.io"]
  endpoint = ["http://localhost:32000", "https://registry-1.docker.io"]
EOF

# Restart containerd to apply
sudo snap restart microk8s
```

## Step 4: Bootstrap Flux on MicroK8s

```bash
export KUBECONFIG=~/.kube/config-microk8s

# Bootstrap with minimal components for edge
flux bootstrap github \
  --owner=my-org \
  --repository=my-fleet \
  --branch=main \
  --path=clusters/microk8s-edge-001 \
  --components=source-controller,kustomize-controller \
  --token-env=GITHUB_TOKEN

# Verify Flux controllers are running
kubectl get pods -n flux-system
kubectl top pods -n flux-system
```

## Step 5: Configure MicroK8s-Specific Storage for Flux

MicroK8s uses the `microk8s-hostpath` storage class by default. Configure your Flux manifests to use it.

```yaml
# apps/overlays/microk8s/storage-patch.yaml
# Patch PVCs to use MicroK8s storage class
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data
  namespace: production
spec:
  storageClassName: microk8s-hostpath
  accessModes: ["ReadWriteOnce"]
  resources:
    requests:
      storage: 5Gi
```

```yaml
# Kustomization for MicroK8s overlay
# clusters/microk8s-edge-001/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  retryInterval: 5m
  path: ./apps/overlays/microk8s
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substitute:
      EDGE_SITE_ID: "microk8s-edge-001"
      STORAGE_CLASS: "microk8s-hostpath"
```

## Step 6: Handle MicroK8s Updates with Flux

MicroK8s snaps can auto-update. Configure Flux to handle version transitions gracefully.

```bash
# Pin MicroK8s to a specific channel for production stability
sudo snap refresh microk8s --channel=1.29/stable
sudo snap set microk8s refresh.timer=mon5,04:00  # Update only Monday mornings

# Create a Flux alert to notify when MicroK8s version changes
```

```yaml
# Monitor the Kubernetes version via Flux alert
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: microk8s-health
  namespace: flux-system
spec:
  providerRef:
    name: slack-edge-ops
  eventSeverity: warning
  eventSources:
    - kind: Kustomization
      name: "*"
  summary: "MicroK8s edge node {{ .InvolvedObject.Name }} alert"
```

```yaml
# Flux Provider for Slack notifications
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack-edge-ops
  namespace: flux-system
spec:
  type: slack
  channel: edge-ops
  secretRef:
    name: slack-webhook-secret
```

## Best Practices

- Use MicroK8s `--channel=LTS/stable` to avoid unexpected updates disrupting edge workloads.
- Enable the built-in registry addon to reduce bandwidth consumption from repeated image pulls.
- Configure snap refresh windows to occur during maintenance hours at the edge site.
- Use MicroK8s `hostpath-storage` for edge PVCs since cloud storage is not available.
- Set up a MicroK8s HA cluster with 3 nodes for production-critical edge sites.
- Automate MicroK8s installation with Ansible playbooks and store playbooks in Git.

## Conclusion

MicroK8s provides a polished edge Kubernetes experience with its addon system and snap-based delivery, while Flux CD adds GitOps-driven configuration management. Together they create an edge platform that is easy to install, automatically maintained, and centrally managed through Git. The built-in registry addon makes MicroK8s especially well-suited for bandwidth-constrained edge environments where reducing image pull traffic is essential.
