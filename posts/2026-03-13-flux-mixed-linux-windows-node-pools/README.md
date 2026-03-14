# How to Configure Flux for Mixed Linux and Windows Node Pools

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, Windows Containers, Linux, GitOps, Mixed Workloads, AKS, Node Pools

Description: Configure Flux CD to manage deployments across mixed Linux and Windows node pools, ensuring workloads are correctly scheduled and maintained.

---

## Introduction

Mixed Linux and Windows Kubernetes clusters are increasingly common as organizations modernize their application portfolios. New microservices run on Linux while legacy .NET Framework applications remain on Windows until they can be rewritten. Managing both types of workloads through a single GitOps pipeline reduces operational overhead and ensures consistent deployment practices across the technology stack.

Flux CD handles mixed clusters naturally — it applies whatever manifests are in Git without caring about the underlying OS. The key is ensuring your manifests correctly express OS affinity so Kubernetes schedules workloads on the right type of node. This guide covers organizing your repository for mixed clusters, configuring OS-specific scheduling constraints, and managing the operational differences between Linux and Windows workloads.

## Prerequisites

- Kubernetes cluster with both Linux and Windows node pools (AKS recommended)
- Flux CD bootstrapped on the cluster
- Container images available for both Linux and Windows workloads
- `flux` and `kubectl` CLI tools

## Step 1: Verify Mixed Cluster Configuration

```bash
# Confirm both Linux and Windows nodes are present
kubectl get nodes -L kubernetes.io/os,node.kubernetes.io/windows-build

# Check node labels
kubectl get nodes --show-labels | grep -E "kubernetes.io/os"

# Verify Flux controllers are running on Linux nodes
kubectl get pods -n flux-system -o wide
# Flux controllers MUST run on Linux nodes - they are Linux containers
```

## Step 2: Repository Structure for Mixed Workloads

```
apps/
  base/
    linux-only/           # Explicitly Linux-targeted workloads
      api-server/
        deployment.yaml   # Has nodeSelector: kubernetes.io/os: linux
    windows-only/         # Explicitly Windows-targeted workloads
      legacy-api/
        deployment.yaml   # Has nodeSelector: kubernetes.io/os: windows
    cross-platform/       # Workloads that can run on either OS
      # These typically use Linux since Linux nodes are default
  overlays/
    production-mixed/
      kustomization.yaml
      linux-patch.yaml    # Ensures Linux workloads target Linux nodes
      windows-patch.yaml  # Ensures Windows workloads target Windows nodes
```

## Step 3: Ensure Flux System Controllers Target Linux Nodes

Flux CD's controllers are Linux containers and must only be scheduled on Linux nodes.

```yaml
# clusters/production/flux-system/linux-patch.yaml
# Ensure all Flux controllers run on Linux nodes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    spec:
      nodeSelector:
        kubernetes.io/os: linux
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kustomize-controller
  namespace: flux-system
spec:
  template:
    spec:
      nodeSelector:
        kubernetes.io/os: linux
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: helm-controller
  namespace: flux-system
spec:
  template:
    spec:
      nodeSelector:
        kubernetes.io/os: linux
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notification-controller
  namespace: flux-system
spec:
  template:
    spec:
      nodeSelector:
        kubernetes.io/os: linux
```

```yaml
# clusters/production/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - path: linux-patch.yaml
    target:
      kind: Deployment
      namespace: flux-system
```

## Step 4: Linux Workload Configuration

```yaml
# apps/base/linux-only/api-server/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      # Explicit Linux node targeting (recommended even when Linux is default)
      nodeSelector:
        kubernetes.io/os: linux
      containers:
        - name: api-server
          image: my-registry.example.com/api-server:v2.1.0
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
```

## Step 5: Windows Workload Configuration

```yaml
# apps/base/windows-only/legacy-api/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: legacy-api
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: legacy-api
  template:
    metadata:
      labels:
        app: legacy-api
    spec:
      nodeSelector:
        kubernetes.io/os: windows
        # Target specific Windows Server version to ensure image compatibility
        node.kubernetes.io/windows-build: "10.0.20348"  # Server 2022
      tolerations:
        - key: os
          value: windows
          effect: NoSchedule
      containers:
        - name: legacy-api
          image: my-registry.example.com/windows/legacy-api:v1.0.5
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: 2000m
              memory: 4Gi
          readinessProbe:
            httpGet:
              path: /api/health
              port: 80
            initialDelaySeconds: 90  # Windows apps need more startup time
            periodSeconds: 20
```

## Step 6: Separate Kustomizations for Each OS

Create separate Flux Kustomizations for Linux and Windows workloads to track health independently.

```yaml
# clusters/production/linux-workloads.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: linux-workloads
  namespace: flux-system
spec:
  interval: 5m
  timeout: 5m
  path: ./apps/base/linux-only
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: api-server
      namespace: production
```

```yaml
# clusters/production/windows-workloads.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: windows-workloads
  namespace: flux-system
spec:
  interval: 5m
  timeout: 15m  # Windows workloads need longer timeout for health checks
  path: ./apps/base/windows-only
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: legacy-api
      namespace: production
```

## Best Practices

- Always explicitly set `nodeSelector: kubernetes.io/os: linux` on Flux controllers in mixed clusters.
- Patch Windows workloads to explicitly target Windows nodes — rely on node selectors, not defaults.
- Set separate Kustomization timeouts for Windows workloads (longer) and Linux workloads (shorter).
- Keep Windows and Linux workload manifests in separate directories for clarity and independent management.
- Match the Windows Server build version in your node selector to your container image's base OS version.
- Monitor node pool scaling separately — Windows nodes are typically more expensive and should not autoscale unnecessarily.

## Conclusion

Mixed Linux and Windows Kubernetes clusters are manageable with Flux CD when manifests are explicit about OS targeting. The most critical configuration is ensuring Flux's own controllers target Linux nodes, and that Windows workload manifests include both the correct node selector and the Windows OS toleration. With these in place, Flux reconciles Linux and Windows workloads identically through the same GitOps workflow.
