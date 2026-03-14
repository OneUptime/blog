# Flux CD vs Rancher Fleet: Edge Computing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Rancher Fleet, Edge Computing, GitOps, Kubernetes, IoT

Description: Compare Flux CD and Rancher Fleet for edge computing use cases, covering how each tool handles thousands of edge clusters with limited connectivity.

---

## Introduction

Edge computing presents unique challenges for GitOps: intermittent network connectivity, limited hardware resources, heterogeneous hardware, and the need to manage potentially thousands of geographically dispersed clusters. Both Flux CD and Rancher Fleet target this use case but with different approaches to connectivity, resource constraints, and operational complexity.

This comparison helps architects and platform engineers choose the right GitOps tool for edge Kubernetes deployments using K3s, MicroK8s, or similar lightweight distributions.

## Prerequisites

- Edge clusters running K3s or similar lightweight Kubernetes
- A central Git repository accessible from edge sites
- Basic familiarity with Flux CD or Rancher Fleet

## Step 1: Flux CD for Edge Deployments

Flux CD's pull-based model is naturally suited for edge: each edge cluster independently pulls from Git, with no inbound connectivity required from the central site:

```yaml
# Edge cluster bootstrap with limited resources
flux install \
  --components=source-controller,kustomize-controller,helm-controller \
  --toleration-keys=node.kubernetes.io/not-ready \
  --network-policy=false  # Disable for resource-constrained clusters
```

Configure generous intervals for intermittent connectivity:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: fleet-repo
  namespace: flux-system
spec:
  interval: 10m  # Longer interval for bandwidth-constrained sites
  url: https://github.com/your-org/fleet-repo
  ref:
    branch: main
  timeout: 60s   # Longer timeout for slow connections
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: edge-apps
  namespace: flux-system
spec:
  interval: 15m
  retryInterval: 5m  # Retry on network failure
  path: ./clusters/edge/site-001
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
```

## Step 2: Rancher Fleet for Edge Deployments

Rancher Fleet requires connectivity from the hub to Fleet Agents on edge clusters, or agent-initiated registration:

```yaml
# Fleet cluster group for edge sites
apiVersion: fleet.cattle.io/v1alpha1
kind: ClusterGroup
metadata:
  name: edge-sites
  namespace: fleet-default
spec:
  selector:
    matchLabels:
      tier: edge
---
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: edge-apps
  namespace: fleet-default
spec:
  repo: https://github.com/your-org/fleet-repo
  branch: main
  paths:
    - apps/edge
  targets:
    - clusterGroup: edge-sites
  pollingInterval: 10m  # Reduced polling for edge
```

## Step 3: Resource Comparison for Edge

| Resource | Flux CD (minimal) | Rancher Fleet Agent |
|---|---|---|
| Memory | ~80 MB | ~50 MB |
| CPU | ~50m | ~25m |
| Pods | 3 controllers | 1 fleet-agent |
| Network requirement | Pull-only (Git access) | Pull + hub registration |

For extremely resource-constrained devices, Rancher Fleet Agent has a smaller footprint.

## Step 4: Handling Intermittent Connectivity

**Flux CD** handles disconnection gracefully: controllers continue running with the last applied state. When connectivity resumes, Flux fetches new commits and reconciles:

```yaml
# Configure Flux to survive network outages
spec:
  interval: 10m
  retryInterval: 2m
  timeout: 30s
  # Suspend Flux temporarily during planned outages
  suspend: false
```

**Rancher Fleet** agents queue changes locally and apply them when the hub connection is restored. The Fleet Manager tracks agent status per cluster.

## Step 5: Site-Specific Configuration

```yaml
# Flux: Site-specific overlays per edge cluster
# clusters/edge/site-001/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patches:
  - patch: |
      - op: replace
        path: /spec/replicas
        value: 1  # Single replica at edge
    target:
      kind: Deployment
configMapGenerator:
  - name: site-config
    literals:
      - SITE_ID=site-001
      - REGION=us-west
```

## Best Practices

- Use Flux CD for edge sites that need full independence from the central cluster; a network partition should never prevent local reconciliation.
- Use Rancher Fleet when you have Rancher Manager already deployed and need centralized visibility of edge fleet status.
- Set longer `interval` and `timeout` values for edge Flux installations to account for slow or unreliable connections.
- Use OCI artifacts (Flux OCIRepository) instead of Git for edges with very slow connections; OCI pulls can be more efficiently compressed.
- Implement local Git mirrors at each edge site for fully disconnected operation with Flux CD.

## Conclusion

For pure edge independence and disconnected operation, Flux CD's distributed model is the stronger choice. Each cluster operates autonomously, with no dependency on a central control plane for local reconciliation. Rancher Fleet offers better central visibility and a smaller agent footprint, making it attractive when you have Rancher infrastructure and acceptable connectivity from hub to edge. The choice hinges on whether central visibility or autonomous operation is the primary requirement.
