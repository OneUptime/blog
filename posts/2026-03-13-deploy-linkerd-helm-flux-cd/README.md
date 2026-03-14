# How to Deploy Linkerd with Helm via Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Linkerd, Service Mesh, Helm, mTLS, Observability

Description: Deploy Linkerd service mesh using Helm charts with Flux CD for lightweight, ultra-low latency mTLS and observability on Kubernetes.

---

## Introduction

Linkerd is a lightweight, Rust-based service mesh designed for simplicity and ultra-low overhead. Unlike Istio's Envoy-based proxies, Linkerd's micro-proxies (written in Rust) consume significantly less CPU and memory per pod while still providing automatic mTLS, golden metrics (success rate, RPS, latency), and distributed tracing.

Managing Linkerd through Flux CD gives you a declarative, GitOps-driven service mesh deployment. Linkerd upgrades, configuration changes, and namespace injection policies are all managed through Git — making the mesh as reproducible and auditable as your applications.

This guide covers deploying Linkerd using Helm charts with Flux CD, including certificate management and namespace injection.

## Prerequisites

- Kubernetes cluster (1.25+)
- Flux CD v2 bootstrapped to your Git repository
- `step` CLI or cert-manager for Linkerd's trust anchor certificate
- Linkerd CLI installed locally for validation

## Step 1: Create Linkerd Trust Anchor Certificate

Linkerd requires a trust anchor (root CA) certificate. Generate it locally and store in a Secret:

```bash
# Generate trust anchor (valid for 10 years)
step certificate create root.linkerd.cluster.local ca.crt ca.key \
  --profile root-ca \
  --no-password \
  --insecure \
  --not-after=87600h

# Store as a Kubernetes Secret (use SOPS to encrypt for GitOps)
kubectl create secret tls linkerd-trust-anchor \
  --cert=ca.crt \
  --key=ca.key \
  --namespace=linkerd
```

## Step 2: Create Namespace and HelmRepository

```yaml
# clusters/my-cluster/linkerd/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: linkerd
  labels:
    app.kubernetes.io/managed-by: flux
    linkerd.io/is-control-plane: "true"
---
# clusters/my-cluster/linkerd/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: linkerd
  namespace: flux-system
spec:
  interval: 12h
  url: https://helm.linkerd.io/stable
```

## Step 3: Deploy Linkerd CRDs

```yaml
# clusters/my-cluster/linkerd/helmrelease-crds.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: linkerd-crds
  namespace: linkerd
spec:
  interval: 1h
  chart:
    spec:
      chart: linkerd-crds
      version: "1.8.*"
      sourceRef:
        kind: HelmRepository
        name: linkerd
        namespace: flux-system
      interval: 12h
```

## Step 4: Deploy Linkerd Control Plane

```yaml
# clusters/my-cluster/linkerd/helmrelease-control-plane.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: linkerd-control-plane
  namespace: linkerd
spec:
  interval: 1h
  dependsOn:
    - name: linkerd-crds
      namespace: linkerd
  chart:
    spec:
      chart: linkerd-control-plane
      version: "1.16.*"
      sourceRef:
        kind: HelmRepository
        name: linkerd
        namespace: flux-system
      interval: 12h
  values:
    # Identity configuration using the trust anchor secret
    identity:
      issuer:
        scheme: kubernetes.io/tls
    identityTrustAnchorsPEM: |
      # Populated from the trust anchor certificate (use valuesFrom in production)
    # Control plane resources
    controllerResources:
      cpu:
        request: 100m
      memory:
        request: 50Mi
    destinationResources:
      cpu:
        request: 100m
      memory:
        request: 50Mi
    # Enable high availability
    controllerReplicas: 3
    enablePodAntiAffinity: true
    # Prometheus for metrics
    prometheusUrl: http://prometheus.monitoring.svc.cluster.local:9090
```

## Step 5: Deploy the Linkerd Viz Extension

```yaml
# clusters/my-cluster/linkerd/helmrepository-viz.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: linkerd-viz
  namespace: flux-system
spec:
  interval: 12h
  url: https://helm.linkerd.io/stable
---
# clusters/my-cluster/linkerd/helmrelease-viz.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: linkerd-viz
  namespace: linkerd-viz
spec:
  interval: 1h
  dependsOn:
    - name: linkerd-control-plane
      namespace: linkerd
  chart:
    spec:
      chart: linkerd-viz
      version: "30.12.*"
      sourceRef:
        kind: HelmRepository
        name: linkerd-viz
        namespace: flux-system
      interval: 12h
  values:
    # Use external Prometheus
    prometheus:
      enabled: false
    prometheusUrl: http://prometheus.monitoring.svc.cluster.local:9090
```

## Step 6: Inject Linkerd into Application Namespaces

```yaml
# clusters/my-cluster/apps/namespace-injection.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  annotations:
    # Enable Linkerd proxy injection for all pods in this namespace
    linkerd.io/inject: enabled
```

## Step 7: Create the Flux Kustomization

```yaml
# clusters/my-cluster/flux-kustomization-linkerd.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: linkerd
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/linkerd
  prune: false
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: linkerd-destination
      namespace: linkerd
    - apiVersion: apps/v1
      kind: Deployment
      name: linkerd-identity
      namespace: linkerd
```

## Validate Linkerd Installation

```bash
# Check Flux reconciliation
flux get kustomizations linkerd

# Run Linkerd's built-in check
linkerd check

# Verify injection in production namespace
kubectl get pods -n production -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .spec.containers[*]}{.name}{" "}{end}{"\n"}{end}'
# Each pod should show "linkerd-proxy" container

# View golden metrics
linkerd viz stat deployment -n production

# Access the Linkerd dashboard
linkerd viz dashboard
```

## Best Practices

- Manage the Linkerd trust anchor certificate with cert-manager or a Vault PKI backend for automated rotation, rather than manually created certificates.
- Use `dependsOn` in HelmReleases to ensure `linkerd-crds` is applied before `linkerd-control-plane`, and the control plane before `linkerd-viz`.
- Enable `controllerReplicas: 3` and `enablePodAntiAffinity: true` for production high availability — Linkerd's control plane should not be a single point of failure.
- Use `valuesFrom` in HelmRelease to pull sensitive values (identity certificates) from Kubernetes Secrets rather than embedding them in the HelmRelease spec.
- Run `linkerd check --pre` locally against staging before promoting Linkerd version changes to production.

## Conclusion

Deploying Linkerd with Helm through Flux CD gives your team a lightweight, GitOps-managed service mesh with automatic mTLS, golden metrics, and distributed tracing. The low resource overhead of Linkerd's Rust proxies combined with Flux CD's continuous reconciliation makes it an excellent choice for teams that want service mesh benefits without the operational complexity of heavier alternatives.
