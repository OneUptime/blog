# How to Deploy Istio with istioctl Manifest via Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Istio, Service Mesh, istioctl, Manifest

Description: Deploy Istio using the istioctl manifest install approach managed by Flux CD by generating and committing manifests to your GitOps repository.

---

## Introduction

While the Helm chart approach is the recommended way to install Istio for GitOps, many teams start with `istioctl install` and want to bring that workflow under Flux CD control. The solution is to use `istioctl manifest generate` to produce Kubernetes manifests and commit them to Git, then manage them with a Flux Kustomization.

This approach gives you the flexibility of `istioctl`'s profile system (default, minimal, demo) while maintaining full GitOps auditability. The generated manifests are the source of truth, not a binary installed by hand.

This guide covers generating Istio manifests with istioctl and managing them with Flux CD.

## Prerequisites

- Kubernetes cluster (1.26+)
- Flux CD v2 bootstrapped to your Git repository
- `istioctl` CLI installed locally (matching the Istio version you want to deploy)

## Step 1: Generate Istio Manifests

Generate manifests from an IstioOperator config:

```yaml
# istio-config/istio-operator.yaml (local file used for generation)
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-control-plane
  namespace: istio-system
spec:
  # Use the default profile
  profile: default
  # Mesh configuration
  meshConfig:
    accessLogFile: /dev/stdout
    enableTracing: true
    defaultConfig:
      holdApplicationUntilProxyStarts: true
  # Component configuration
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: 500m
            memory: 2048Mi
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          service:
            type: LoadBalancer
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 2000m
            memory: 1024Mi
```

Generate the manifests locally:

```bash
# Generate Kubernetes manifests from the IstioOperator config
istioctl manifest generate \
  -f istio-config/istio-operator.yaml \
  > clusters/my-cluster/istio/istio-manifest.yaml

# Verify the output
wc -l clusters/my-cluster/istio/istio-manifest.yaml

# Split into logical files (optional, for readability)
istioctl manifest generate -f istio-config/istio-operator.yaml \
  --component Base > clusters/my-cluster/istio/base.yaml

istioctl manifest generate -f istio-config/istio-operator.yaml \
  --component Pilot > clusters/my-cluster/istio/istiod.yaml

istioctl manifest generate -f istio-config/istio-operator.yaml \
  --component IngressGateways > clusters/my-cluster/istio/gateway.yaml
```

## Step 2: Organize Manifests in Git

```
clusters/my-cluster/istio/
├── kustomization.yaml
├── namespace.yaml
├── base.yaml          # CRDs and cluster-level resources
├── istiod.yaml        # Istiod control plane
└── gateway.yaml       # Ingress gateway
```

```yaml
# clusters/my-cluster/istio/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - base.yaml
  - istiod.yaml
  - gateway.yaml
```

## Step 3: Create the Namespace

```yaml
# clusters/my-cluster/istio/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: istio-system
  labels:
    app.kubernetes.io/managed-by: flux
```

## Step 4: Create the Flux Kustomization

```yaml
# clusters/my-cluster/flux-kustomization-istio.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: istio
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/istio
  # Do not prune CRDs or cluster-level resources aggressively
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
      kind: Deployment
      name: istio-ingressgateway
      namespace: istio-system
  timeout: 5m
```

## Step 5: Update Istio Version via istioctl

When upgrading Istio:

```bash
# Install the new istioctl version
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.22.0 sh -
export PATH=$PWD/istio-1.22.0/bin:$PATH

# Regenerate manifests with the new version
istioctl manifest generate \
  -f istio-config/istio-operator.yaml \
  > clusters/my-cluster/istio/istio-manifest.yaml

# Review the diff
git diff clusters/my-cluster/istio/

# Commit and push — Flux handles the upgrade
git add clusters/my-cluster/istio/
git commit -m "chore: upgrade Istio from 1.21.x to 1.22.0"
git push
```

## Step 6: Validate the Deployment

```bash
# Check Flux reconciliation
flux get kustomizations istio

# Verify Istio components
kubectl get pods -n istio-system
kubectl get svc -n istio-system

# Check manifest differences between running and desired
istioctl manifest diff \
  <(istioctl manifest generate -f istio-config/istio-operator.yaml) \
  <(kubectl get all -n istio-system -o yaml)

# Run Istio analysis
istioctl analyze --all-namespaces
```

## Best Practices

- Commit the `istio-operator.yaml` source config alongside the generated manifests so future operators know how the manifests were produced.
- Run `istioctl manifest diff` as part of your CI pipeline to detect any drift between the generated manifests and the running cluster state.
- Set `prune: false` on the Flux Kustomization for Istio — CRDs and cluster-level resources should not be pruned automatically.
- Use Flux's `timeout` field on the Kustomization to allow for longer Istio reconciliation time, as some components take minutes to become healthy.
- Test manifest upgrades in a staging cluster before committing to the production branch, using Flux's environment-per-branch pattern.

## Conclusion

Managing `istioctl`-generated manifests through Flux CD bridges the gap between the familiar `istioctl` workflow and GitOps practices. The manifests become the versioned source of truth, Istio upgrades become pull requests, and the cluster continuously reconciles to the committed mesh configuration — all without requiring `istioctl` to be run directly against production clusters.
