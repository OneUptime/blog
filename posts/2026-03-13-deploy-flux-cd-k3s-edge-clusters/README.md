# How to Deploy Flux CD on K3s Edge Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, K3s, Kubernetes, Edge Computing, GitOps, Lightweight Kubernetes, Raspberry Pi

Description: Deploy Flux CD on K3s lightweight Kubernetes for edge computing environments, with configuration optimized for K3s-specific architecture and constraints.

---

## Introduction

K3s is Rancher's lightweight Kubernetes distribution, designed specifically for edge, IoT, and resource-constrained environments. It packages Kubernetes into a single binary under 100MB, uses SQLite instead of etcd by default, and runs comfortably on hardware as modest as a Raspberry Pi 4 with 2GB RAM. It is the most popular Kubernetes distribution for edge deployments.

Flux CD and K3s are a natural combination. K3s handles the heavy lifting of running containers at the edge, while Flux ensures those containers are running the right workloads from your Git repository. Together, they provide a GitOps-managed edge computing platform that can be deployed to thousands of sites from a single repository.

This guide covers installing K3s, bootstrapping Flux with K3s-specific optimizations, and managing a fleet of K3s edge clusters from a central Git repository.

## Prerequisites

- Edge hardware running Linux (x86_64 or ARM64; ARM32 is supported but less capable)
- Minimum 512MB RAM (1GB+ recommended), 1 CPU core
- Internet or VPN connectivity to your Git repository
- SSH access to the edge device for initial setup
- `kubectl` and `flux` CLI on your management workstation

## Step 1: Install K3s on Edge Hardware

```bash
# Install K3s with minimal features for edge use
# --disable=traefik: Remove Traefik if using NGINX or no ingress
# --disable=servicelb: Remove Klipper LB if not needed
curl -sfL https://get.k3s.io | sh -s - \
  --disable=traefik \
  --disable=servicelb \
  --write-kubeconfig-mode=644

# Verify K3s is running
sudo k3s kubectl get nodes
sudo k3s kubectl get pods -A

# Copy kubeconfig for local management
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
```

For ARM64 devices (Raspberry Pi, NVIDIA Jetson):

```bash
# K3s detects ARM architecture automatically
curl -sfL https://get.k3s.io | K3S_URL=https://myserver:6443 \
  K3S_TOKEN=mynodetoken sh -
```

## Step 2: Configure K3s for Flux Compatibility

K3s uses containerd with a specific configuration path. Ensure Flux can access the cluster.

```bash
# Export kubeconfig with a stable server address
sudo cat /etc/rancher/k3s/k3s.yaml | \
  sed 's/127.0.0.1/edge-site-001.internal.example.com/' > \
  /tmp/edge-site-001-kubeconfig.yaml

# Store in your secrets manager or central management cluster
# Do NOT commit kubeconfig to Git
kubectl create secret generic edge-site-001-kubeconfig \
  -n flux-system \
  --from-file=value=/tmp/edge-site-001-kubeconfig.yaml
```

## Step 3: Bootstrap Flux on K3s

```bash
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

# Bootstrap with only the controllers needed for edge
flux bootstrap github \
  --owner=my-org \
  --repository=my-fleet \
  --branch=main \
  --path=clusters/edge-site-001 \
  --components=source-controller,kustomize-controller \
  --token-env=GITHUB_TOKEN

# Verify Flux is running
kubectl get pods -n flux-system
```

## Step 4: K3s-Specific Kustomization Configuration

K3s uses containerd and has specific paths. Configure Flux manifests to account for this.

```yaml
# clusters/edge-site-001/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  retryInterval: 5m
  timeout: 5m
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/k3s
  # K3s-specific health checks
  healthChecks:
    - apiVersion: apps/v1
      kind: DaemonSet
      name: local-path-provisioner
      namespace: kube-system
```

```yaml
# infrastructure/k3s/local-path-storage.yaml
# Configure K3s local path storage for edge PVCs
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-path
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: rancher.io/local-path
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Retain  # Retain data on pod deletion at edge
```

## Step 5: Handle K3s SQLite vs etcd

K3s uses SQLite by default instead of etcd, which changes the backup strategy.

```bash
# Backup K3s SQLite database (instead of etcd snapshot)
#!/bin/bash
K3S_DATA_DIR="/var/lib/rancher/k3s"
BACKUP_DIR="/backup/k3s"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

mkdir -p "$BACKUP_DIR"

# Stop K3s briefly for consistent SQLite backup
# (Or use SQLite online backup which doesn't require stopping)
sqlite3 "${K3S_DATA_DIR}/server/db/state.db" ".backup ${BACKUP_DIR}/k3s-${TIMESTAMP}.db"

# Upload to central backup store
aws s3 cp "${BACKUP_DIR}/k3s-${TIMESTAMP}.db" \
  "s3://my-edge-backups/edge-site-001/k3s-${TIMESTAMP}.db"

echo "K3s backup complete: k3s-${TIMESTAMP}.db"
```

For production K3s clusters, use external etcd or the built-in embedded etcd cluster mode:

```bash
# Install K3s with embedded etcd (recommended for HA edge sites)
curl -sfL https://get.k3s.io | sh -s - \
  --cluster-init \
  --disable=traefik
```

## Step 6: Manage Multiple K3s Sites with Flux

Use a single Git repository to manage hundreds of K3s edge sites.

```
clusters/
  edge-site-001/          # Retail store - Austin
    flux-system/
    apps.yaml
  edge-site-002/          # Retail store - Denver
    flux-system/
    apps.yaml
  edge-site-003/          # Factory - Detroit
    flux-system/
    apps.yaml
apps/
  overlays/
    retail/               # Shared config for all retail sites
    factory/              # Shared config for factory sites
    edge-site-001/        # Site-specific overrides
```

```yaml
# Deploy site-specific configuration
# clusters/edge-site-001/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/overlays/edge-site-001
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Best Practices

- Use K3s embedded etcd mode for edge sites that require data durability, not just SQLite.
- Configure K3s `--data-dir` to point at fast local storage (NVMe over SD card).
- Set K3s service to auto-restart with `systemd` so it recovers from power cycles automatically.
- Use Flux's `prune: false` for infrastructure components that survive pod restarts.
- Automate initial K3s installation with Ansible or cloud-init for consistent site deployments.
- Monitor K3s node health remotely via Prometheus federation or Flux notification webhooks.

## Conclusion

K3s and Flux CD together create a powerful, lightweight edge computing platform. K3s handles the resource constraints of edge hardware with its minimal footprint, while Flux ensures every K3s cluster runs the correct configuration from your Git repository. A single Git commit can update dozens or hundreds of edge sites simultaneously, making fleet management at scale tractable even for small operations teams.
