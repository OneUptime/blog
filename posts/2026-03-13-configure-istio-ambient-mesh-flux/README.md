# How to Configure Istio Ambient Mesh with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Istio, Ambient Mesh, Service Mesh, ztunnel, Waypoint

Description: Deploy and configure Istio Ambient Mesh mode using Flux CD to get service mesh features without sidecar injection overhead.

---

## Introduction

Istio Ambient Mesh is a sidecar-less service mesh architecture that moves the data plane out of application pods into shared per-node `ztunnel` proxies and optional per-namespace `waypoint` proxies. This eliminates the resource overhead of injecting Envoy sidecars into every pod while still providing mTLS, observability, and traffic management.

Managing Istio Ambient Mesh through Flux CD gives you all the GitOps benefits — version-controlled mesh configuration, automatic reconciliation, and pull-request-based changes — with the operational simplicity of not managing sidecar injection.

This guide covers deploying Istio in Ambient mode and configuring namespaces and waypoint proxies using Flux CD.

## Prerequisites

- Kubernetes cluster (1.26+) with Cilium or iptables CNI (Ambient requires compatible CNI)
- Flux CD v2 bootstrapped to your Git repository
- Minimum 3 nodes for ztunnel DaemonSet scheduling

## Step 1: Create Namespace and HelmRepository

```yaml
# clusters/my-cluster/istio-ambient/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: istio-system
  labels:
    app.kubernetes.io/managed-by: flux
---
# clusters/my-cluster/istio-ambient/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: istio
  namespace: flux-system
spec:
  interval: 12h
  url: https://istio-release.storage.googleapis.com/charts
```

## Step 2: Deploy Istio Base and Istiod with Ambient Profile

```yaml
# clusters/my-cluster/istio-ambient/helmrelease-base.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: istio-base
  namespace: istio-system
spec:
  interval: 1h
  chart:
    spec:
      chart: base
      version: "1.21.*"
      sourceRef:
        kind: HelmRepository
        name: istio
        namespace: flux-system
      interval: 12h
  values:
    defaultRevision: default
---
# clusters/my-cluster/istio-ambient/helmrelease-istiod.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: istiod
  namespace: istio-system
spec:
  interval: 1h
  dependsOn:
    - name: istio-base
      namespace: istio-system
  chart:
    spec:
      chart: istiod
      version: "1.21.*"
      sourceRef:
        kind: HelmRepository
        name: istio
        namespace: flux-system
      interval: 12h
  values:
    # Enable ambient mesh profile
    profile: ambient
    meshConfig:
      accessLogFile: /dev/stdout
      defaultConfig:
        # Ambient mode — no sidecars
        proxyMetadata:
          ISTIO_META_AMBIENT_COMPATIBLE: "true"
```

## Step 3: Deploy ztunnel (Per-Node Proxy)

```yaml
# clusters/my-cluster/istio-ambient/helmrelease-ztunnel.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: ztunnel
  namespace: istio-system
spec:
  interval: 1h
  dependsOn:
    - name: istiod
      namespace: istio-system
  chart:
    spec:
      chart: ztunnel
      version: "1.21.*"
      sourceRef:
        kind: HelmRepository
        name: istio
        namespace: flux-system
      interval: 12h
  values:
    # ztunnel DaemonSet runs on every node
    resources:
      requests:
        cpu: 200m
        memory: 512Mi
      limits:
        cpu: 1
        memory: 1Gi
    # Enable Prometheus metrics
    podAnnotations:
      prometheus.io/scrape: "true"
      prometheus.io/port: "15020"
      prometheus.io/path: "/stats/prometheus"
```

## Step 4: Enable Ambient Mode for Namespaces

To opt a namespace into Ambient mesh, label it:

```yaml
# clusters/my-cluster/apps/ambient-namespaces.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    # Opt into Ambient mesh (no sidecars needed)
    istio.io/dataplane-mode: ambient
---
apiVersion: v1
kind: Namespace
metadata:
  name: staging
  labels:
    istio.io/dataplane-mode: ambient
```

## Step 5: Deploy a Waypoint Proxy for L7 Policies

For namespaces needing Layer 7 traffic management (not just mTLS):

```yaml
# clusters/my-cluster/apps/waypoint.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: waypoint
  namespace: production
  labels:
    # This label makes the Gateway a waypoint proxy
    istio.io/waypoint-for: service
  annotations:
    istio.io/service-account: default
spec:
  gatewayClassName: istio-waypoint
  listeners:
    - name: mesh
      port: 15008
      protocol: HBONE
```

## Step 6: Create the Flux Kustomization

```yaml
# clusters/my-cluster/istio-ambient/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - helmrepository.yaml
  - helmrelease-base.yaml
  - helmrelease-istiod.yaml
  - helmrelease-ztunnel.yaml
---
# clusters/my-cluster/flux-kustomization-istio-ambient.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: istio-ambient
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/istio-ambient
  prune: false
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: istiod
      namespace: istio-system
    - apiVersion: apps/v1
      kind: DaemonSet
      name: ztunnel
      namespace: istio-system
```

## Validate Ambient Mesh

```bash
# Verify ztunnel DaemonSet is running on all nodes
kubectl get daemonset ztunnel -n istio-system

# Check namespace is in ambient mode
kubectl get namespace production --show-labels | grep ambient

# Verify mTLS is active between pods (no sidecar injection needed)
kubectl exec -n production deploy/my-app -- \
  curl -s http://other-service/health

# Check ztunnel logs for traffic handling
kubectl logs -n istio-system daemonset/ztunnel --tail=20
```

## Best Practices

- Start with the `istio.io/dataplane-mode: ambient` namespace label on non-production namespaces to validate the Ambient mode behavior before enabling it in production.
- Deploy a Waypoint proxy only for namespaces that need L7 features (traffic routing, JWT auth, retries) — for pure mTLS, ztunnel alone is sufficient and lighter.
- Monitor ztunnel resource usage per node; on busy nodes it handles all pod-to-pod traffic, so right-size its CPU and memory limits accordingly.
- Ambient mode is compatible with Gateway API resources but not all legacy Istio Virtual Service features — review your routing rules before migration.
- Use `prune: false` on the Flux Kustomization so that removing a manifest from Git does not accidentally uninstall mesh components.

## Conclusion

Istio Ambient Mesh deployed and managed by Flux CD delivers service mesh security and observability without sidecar overhead. Namespace enrollment, waypoint proxy deployment, and mesh configuration are all managed declaratively in Git, making the ambient mesh as auditable and reproducible as any other GitOps-managed infrastructure.
