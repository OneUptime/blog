# How to Deploy Flux CD on Edge Kubernetes Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, Edge Computing, GitOps, K3s, IoT, Resource Constrained

Description: Set up Flux CD on resource-constrained edge Kubernetes clusters, optimizing controller resource usage for minimal footprint deployments.

---

## Introduction

Edge computing pushes workloads closer to where data is generated — factory floors, retail stores, remote monitoring stations, and cell towers. Kubernetes has become the runtime of choice for managing containerized workloads at the edge, but edge nodes have fundamentally different constraints than cloud clusters: limited CPU, limited RAM, intermittent network connectivity, and no elastic scaling.

Flux CD is well-suited for edge environments because it is a pull-based system. Instead of requiring direct connectivity from a central management plane to each edge cluster, Flux controllers running on the edge cluster pull their configuration from Git. This works even over intermittent connections and through restrictive firewalls.

This guide covers deploying Flux CD on edge Kubernetes clusters with resource-optimized settings, handling connectivity constraints, and managing a fleet of edge clusters from a central Git repository.

## Prerequisites

- Edge Kubernetes cluster (K3s, MicroK8s, or standard Kubernetes on ARM/x86 edge hardware)
- At least 512MB free RAM for Flux controllers
- Git repository accessible from the edge cluster (HTTPS or SSH)
- `flux` CLI installed on your management workstation
- `kubectl` configured to reach the edge cluster

## Step 1: Assess Edge Resource Constraints

Before deploying Flux, understand your edge node's resource envelope.

```bash
# Check available resources on edge node
kubectl describe node | grep -A 10 "Allocated resources"

# Typical edge constraints:
# CPU: 2-4 cores (often ARM Cortex-A)
# RAM: 1-4 GB total; 512MB-1GB available for Kubernetes
# Storage: 16-64 GB eMMC or SD card

# Flux default resource requests (all controllers combined):
# CPU: ~200m requests, ~1000m limits
# RAM: ~256Mi requests, ~512Mi limits
```

## Step 2: Create Resource-Optimized Flux Patches

Override Flux's default resource settings to fit edge constraints.

```yaml
# clusters/edge-site-001/flux-system/resource-patches.yaml
# Patch for source-controller
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          resources:
            requests:
              cpu: 25m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 256Mi
---
# Patch for kustomize-controller
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kustomize-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          resources:
            requests:
              cpu: 25m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 256Mi
---
# Patch for helm-controller (disable if not using Helm)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: helm-controller
  namespace: flux-system
spec:
  replicas: 0  # Disable if no HelmReleases at edge
```

## Step 3: Bootstrap Flux with Minimal Components

Install only the Flux components you actually need at the edge.

```bash
# Bootstrap with only source and kustomize controllers (no Helm, no image automation)
flux bootstrap github \
  --owner=my-org \
  --repository=my-fleet \
  --branch=main \
  --path=clusters/edge-site-001 \
  --components=source-controller,kustomize-controller \
  --token-env=GITHUB_TOKEN

# Verify minimal footprint
kubectl get pods -n flux-system
kubectl top pods -n flux-system
```

The `--components` flag allows you to install only the controllers you need, saving hundreds of megabytes of RAM.

## Step 4: Configure for Intermittent Connectivity

Set longer reconciliation intervals and timeouts to accommodate unreliable network connections.

```yaml
# clusters/edge-site-001/flux-system/gitrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 10m    # Less frequent polling reduces bandwidth
  timeout: 60s     # Generous timeout for slow connections
  ref:
    branch: main
  url: https://github.com/my-org/my-fleet
  secretRef:
    name: flux-system
```

```yaml
# clusters/edge-site-001/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 15m      # Reconcile less frequently than cloud clusters
  retryInterval: 5m  # Wait longer between retries on connectivity issues
  timeout: 10m       # Edge apps may take longer to stabilize
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/overlays/edge
```

## Step 5: Use OCI Artifacts to Reduce Bandwidth

Instead of having Flux clone a full Git repository over every sync, package your manifests as OCI artifacts. This dramatically reduces bandwidth.

```bash
# On your CI/CD pipeline, push manifests as OCI artifact
flux push artifact oci://my-registry.example.com/fleet/edge-apps:latest \
  --path=./apps/overlays/edge \
  --source=https://github.com/my-org/my-fleet \
  --revision=main@sha1:$(git rev-parse HEAD)
```

```yaml
# On edge cluster - use OCIRepository instead of GitRepository
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: edge-apps
  namespace: flux-system
spec:
  interval: 15m
  url: oci://my-registry.example.com/fleet/edge-apps
  ref:
    tag: latest
  secretRef:
    name: registry-credentials
```

## Step 6: Monitor Edge Cluster Health Remotely

Use Flux's notification system to report edge cluster health to a central monitoring system.

```yaml
# Send Flux events to a central webhook
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: central-monitoring
  namespace: flux-system
spec:
  type: generic
  address: https://monitoring.example.com/flux-events
  secretRef:
    name: monitoring-webhook-secret

---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: edge-health
  namespace: flux-system
spec:
  providerRef:
    name: central-monitoring
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
```

## Best Practices

- Deploy only the Flux components you use — disable helm-controller and image-reflector-controller on clusters that don't need them.
- Set reconciliation intervals to 10-15 minutes on edge clusters instead of the default 1-5 minutes.
- Use OCI artifacts instead of direct Git cloning to minimize bandwidth usage.
- Store edge-cluster-specific overlays in a dedicated path in your repository.
- Plan for controllers restarting on power cycles — Flux picks up where it left off automatically.
- Use node affinity to keep Flux controllers on the most stable node in a multi-node edge cluster.

## Conclusion

Flux CD is a natural fit for edge Kubernetes deployments. Its pull-based architecture requires no persistent connectivity from central management to the edge, its resource footprint can be trimmed significantly by disabling unused components, and its Git-based model means edge cluster configuration is always version-controlled and auditable. With the right tuning, Flux operates effectively on devices with as little as 512MB of RAM.
