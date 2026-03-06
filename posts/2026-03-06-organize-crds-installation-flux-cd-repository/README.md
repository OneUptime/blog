# How to Organize CRDs Installation in a Flux CD Repository

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, gitops, kubernetes, crds, custom resource definitions, dependency management

Description: Learn how to properly organize and manage Custom Resource Definition (CRD) installation in your Flux CD repository to avoid ordering issues and ensure reliable deployments.

---

## Introduction

Custom Resource Definitions (CRDs) are a fundamental building block in Kubernetes, extending the API with custom resources. However, CRDs must be installed before any custom resources (CRs) that depend on them. This ordering requirement can cause issues with GitOps tools if not handled carefully.

This guide shows you how to organize CRD installation in your Flux CD repository to ensure reliable, conflict-free deployments.

## The CRD Ordering Problem

When Flux tries to apply a set of manifests, it needs CRDs to exist before it can create instances of those custom resources. If a Kustomization contains both a CRD and a CR that uses it, the CR will fail to apply because the CRD has not been registered yet.

Consider this failure scenario:

```
# This will fail because the Certificate CR is applied
# before the cert-manager CRDs are registered
Error: unable to recognize "certificate.yaml":
  no matches for kind "Certificate" in version "cert-manager.io/v1"
```

## Repository Structure for CRDs

The solution is to separate CRDs into their own Flux Kustomization with a dependency chain.

```
fleet-repo/
├── crds/
│   ├── kustomization.yaml
│   ├── cert-manager/
│   │   ├── kustomization.yaml
│   │   └── crds.yaml
│   ├── prometheus-operator/
│   │   ├── kustomization.yaml
│   │   └── crds.yaml
│   └── istio/
│       ├── kustomization.yaml
│       └── crds.yaml
├── infrastructure/
│   ├── sources/
│   │   └── kustomization.yaml
│   ├── controllers/
│   │   ├── kustomization.yaml
│   │   ├── cert-manager/
│   │   ├── prometheus/
│   │   └── istio/
│   └── configs/
│       ├── kustomization.yaml
│       ├── cluster-issuers/
│       ├── service-monitors/
│       └── virtual-services/
└── clusters/
    └── production/
        └── flux-config.yaml
```

## The Three-Layer Approach

Organize your deployments into three layers with explicit dependencies:

1. CRDs layer - installs Custom Resource Definitions
2. Controllers layer - installs the operators and controllers
3. Configs layer - installs custom resources that use the CRDs

```yaml
# clusters/production/flux-config.yaml
# Layer 1: CRDs must be installed first
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: crds
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  path: ./crds
  prune: false
  # Never prune CRDs to avoid data loss
  timeout: 5m
---
# Layer 2: Controllers depend on CRDs being installed
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: controllers
  namespace: flux-system
spec:
  dependsOn:
    - name: crds
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  path: ./infrastructure/controllers
  prune: true
  timeout: 5m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: cert-manager
      namespace: cert-manager
    - apiVersion: apps/v1
      kind: Deployment
      name: cert-manager-webhook
      namespace: cert-manager
---
# Layer 3: Custom resources depend on controllers being ready
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: configs
  namespace: flux-system
spec:
  dependsOn:
    - name: controllers
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  path: ./infrastructure/configs
  prune: true
  timeout: 5m
```

## Installing CRDs from URLs

For CRDs distributed as raw YAML files, you can reference them directly.

```yaml
# crds/cert-manager/kustomization.yaml
# Install cert-manager CRDs from the official release
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - https://github.com/cert-manager/cert-manager/releases/download/v1.14.4/cert-manager.crds.yaml
```

## Installing CRDs from Helm Charts

Many Helm charts include CRDs. Use the HelmRelease CRD install policy to manage them.

```yaml
# infrastructure/controllers/cert-manager/helmrelease.yaml
# Let Helm manage CRD installation via the HelmRelease
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: cert-manager
  namespace: cert-manager
spec:
  interval: 30m
  chart:
    spec:
      chart: cert-manager
      version: "1.14.x"
      sourceRef:
        kind: HelmRepository
        name: jetstack
        namespace: flux-system
  install:
    # Create CRDs on install, replace if they already exist
    crds: CreateReplace
    remediation:
      retries: 3
  upgrade:
    # Update CRDs on upgrade
    crds: CreateReplace
    remediation:
      retries: 3
  values:
    installCRDs: false
    # Set to false because we handle CRDs via the crds policy above
```

## Managing CRDs Separately from Helm

For more control, extract CRDs from Helm charts and manage them independently.

```bash
# Extract CRDs from a Helm chart for independent management
helm template cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --include-crds \
  --set installCRDs=true | \
  kubectl split-yaml --output crds/cert-manager/

# Or download CRDs directly
curl -sL https://github.com/cert-manager/cert-manager/releases/download/v1.14.4/cert-manager.crds.yaml \
  -o crds/cert-manager/crds.yaml
```

```yaml
# crds/kustomization.yaml
# Aggregates all CRD installations
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - cert-manager/
  - prometheus-operator/
  - istio/
```

```yaml
# crds/prometheus-operator/kustomization.yaml
# Prometheus Operator CRDs
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - crds.yaml
```

## Setting Up Controller Installations

With CRDs handled separately, configure controllers to skip CRD installation.

```yaml
# infrastructure/controllers/kustomization.yaml
# All controllers - installed after CRDs are ready
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - cert-manager/
  - prometheus/
  - istio/
```

```yaml
# infrastructure/controllers/cert-manager/helmrelease.yaml
# cert-manager controller - CRDs are managed separately
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: cert-manager
  namespace: cert-manager
spec:
  interval: 30m
  chart:
    spec:
      chart: cert-manager
      version: "1.14.x"
      sourceRef:
        kind: HelmRepository
        name: jetstack
        namespace: flux-system
  install:
    # Skip CRDs since they are managed in the crds layer
    crds: Skip
  upgrade:
    crds: Skip
  values:
    installCRDs: false
    replicaCount: 2
```

## Creating Custom Resources in the Configs Layer

Custom resources go in the configs layer, which depends on controllers being ready.

```yaml
# infrastructure/configs/kustomization.yaml
# Custom resources that depend on CRDs and controllers
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - cluster-issuers/
  - service-monitors/
```

```yaml
# infrastructure/configs/cluster-issuers/letsencrypt.yaml
# ClusterIssuer CR - requires cert-manager CRDs and controller
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-account-key
    solvers:
      - http01:
          ingress:
            class: nginx
```

```yaml
# infrastructure/configs/service-monitors/api-server-monitor.yaml
# ServiceMonitor CR - requires Prometheus Operator CRDs and controller
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: api-server
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: api-server
  endpoints:
    - port: metrics
      interval: 30s
```

## CRD Upgrade Strategy

Upgrading CRDs requires special care because changes can affect existing custom resources.

```yaml
# When upgrading CRDs, use a specific version pinned in the kustomization
# crds/cert-manager/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  # Pin to a specific version for predictable upgrades
  - https://github.com/cert-manager/cert-manager/releases/download/v1.14.4/cert-manager.crds.yaml
```

To upgrade, update the version in the URL and commit:

```bash
# Update CRD version
sed -i 's/v1.14.4/v1.15.0/g' crds/cert-manager/kustomization.yaml

# Commit the CRD upgrade
git add crds/cert-manager/kustomization.yaml
git commit -m "Upgrade cert-manager CRDs to v1.15.0"
git push origin main
```

## Important: Never Prune CRDs

Always set `prune: false` on the CRDs Kustomization. Pruning CRDs would delete all custom resources that depend on them, causing data loss.

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: crds
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  path: ./crds
  # CRITICAL: Never prune CRDs to prevent accidental data loss
  prune: false
```

## Verifying CRD Installation

```bash
# List all installed CRDs
kubectl get crds

# Check CRDs from a specific group
kubectl get crds | grep cert-manager.io

# Verify a CRD is properly installed
kubectl get crd certificates.cert-manager.io -o yaml

# Check Flux reconciliation status for the CRDs layer
flux get kustomization crds

# Check the dependency chain
flux get kustomizations
```

## Best Practices

### Version Lock CRDs

Always pin CRD versions explicitly. Unexpected CRD changes can break existing custom resources.

### Test CRD Upgrades in Development First

CRD upgrades can introduce breaking changes. Always test in a non-production cluster before rolling out.

### Use Health Checks on Controllers

Add health checks to the controllers Kustomization so the configs layer only applies after controllers are fully operational and ready to process custom resources.

### Keep CRDs Close to Their Controllers

While CRDs are separated for ordering, keep them versioned in sync with their controllers. If you upgrade a controller, upgrade its CRDs in the same commit.

## Conclusion

Properly organizing CRD installation in your Flux CD repository is critical for reliable GitOps workflows. The three-layer approach (CRDs, controllers, configs) with explicit `dependsOn` chains ensures that resources are applied in the correct order. Remember to never prune CRDs, pin versions explicitly, and always test upgrades in non-production environments first.
