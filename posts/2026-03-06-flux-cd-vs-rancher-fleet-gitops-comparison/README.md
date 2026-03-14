# Flux CD vs Rancher Fleet: GitOps Comparison

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Rancher fleet, GitOps, Kubernetes, Comparison, Multi-Cluster, Deployments, Rancher

Description: A detailed comparison of Flux CD and Rancher Fleet for GitOps-based Kubernetes deployments, covering multi-cluster management, configuration approaches, and integration with the Rancher ecosystem.

---

## Introduction

Flux CD and Rancher Fleet are both GitOps tools for managing Kubernetes deployments, but they come from different backgrounds and target different use cases. Flux CD is a standalone CNCF Graduated GitOps toolkit, while Rancher Fleet is the GitOps engine built into SUSE Rancher for managing large fleets of clusters. This guide compares their features, architectures, and ideal use cases.

## Architecture Overview

### Flux CD Architecture

Flux CD operates as a set of independent Kubernetes controllers, each handling a specific domain (sources, Kustomize, Helm, notifications, images). It follows a decentralized model where each cluster typically runs its own Flux installation.

### Rancher Fleet Architecture

Fleet uses a manager-agent architecture:

- **Fleet Manager**: Runs on the management cluster, manages GitRepo resources and distributes work to downstream clusters.
- **Fleet Agent**: Runs on each managed cluster, applies bundles received from the manager.
- **Fleet Controller**: Processes GitRepo resources and creates Bundle resources.

This centralized model is designed for managing hundreds or thousands of clusters from a single control plane.

## Feature Comparison Table

| Feature | Flux CD | Rancher Fleet |
|---|---|---|
| CNCF Status | Graduated | Not a CNCF project |
| Primary Backing | CNCF community | SUSE/Rancher |
| Multi-Cluster Model | Decentralized (per-cluster install) | Centralized (manager-agent) |
| Cluster Grouping | Labels and namespaces | ClusterGroup CRD |
| Manifest Support | Kustomize, Helm, plain YAML | Kustomize, Helm, plain YAML |
| Git Source CRD | GitRepository | GitRepo |
| Application CRD | Kustomization / HelmRelease | Bundle / BundleDeployment |
| Drift Detection | Yes | Yes |
| Auto-remediation | Yes (configurable) | Yes |
| Image Automation | Built-in controllers | Not built-in |
| Notification System | Built-in controller | Via Rancher alerts |
| OCI Registry Support | Yes | Limited |
| SOPS Encryption | Native support | Not built-in |
| Dependency Management | Kustomization dependencies | Fleet dependency ordering |
| Health Checks | Built-in | Built-in |
| UI Dashboard | Third-party (Weave GitOps) | Rancher Dashboard (built-in) |
| Standalone Usage | Yes | Possible but designed for Rancher |
| Edge/IoT Support | Via lightweight install | Purpose-built for fleet management |
| Cluster Registration | Manual setup | Automated via Rancher |
| Resource Footprint | ~200 MB | ~300 MB (agent) + manager |

## Configuration Comparison

### Flux CD: Source and Kustomization

```yaml
# Flux CD: GitRepository source
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/my-org/my-app.git
  ref:
    branch: main
  # Authentication
  secretRef:
    name: git-credentials
---
# Flux CD: Kustomization for deployment
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  path: ./k8s/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: my-app
  # Health checks to verify deployment success
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-app
      namespace: default
  # Timeout for the reconciliation
  timeout: 3m
```

### Rancher Fleet: GitRepo Configuration

```yaml
# Fleet: GitRepo resource (deployed on the management cluster)
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: my-app
  # Fleet uses a specific namespace for GitRepo resources
  namespace: fleet-default
spec:
  # Git repository URL
  repo: https://github.com/my-org/my-app.git
  branch: main
  # Path within the repository
  paths:
    - k8s/production
  # Target clusters using label selectors
  targets:
    - name: production-clusters
      clusterSelector:
        matchLabels:
          env: production
    - name: staging-clusters
      clusterSelector:
        matchLabels:
          env: staging
  # Polling interval
  pollingInterval: 5m
  # Authentication
  clientSecretName: git-credentials
  # Force sync interval
  forceSyncGeneration: 1
```

## Multi-Cluster Management

### Flux CD: Decentralized Approach

```yaml
# Flux manages multiple clusters via a fleet repository
# Each cluster has its own directory with Flux configuration

# Management cluster orchestrates other clusters
# clusters/
#   production-us/
#     flux-system/
#       gotk-components.yaml
#       gotk-sync.yaml
#       kustomization.yaml
#   production-eu/
#     flux-system/
#       gotk-components.yaml
#       gotk-sync.yaml
#       kustomization.yaml
#   staging/
#     flux-system/
#       gotk-components.yaml
#       gotk-sync.yaml
#       kustomization.yaml

# Shared application definitions with per-cluster overlays
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  # Each cluster points to its own overlay
  path: ./apps/overlays/production-us
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  # Dependencies ensure infrastructure is ready first
  dependsOn:
    - name: infrastructure
---
# Base application definition shared across clusters
# apps/base/my-app/kustomization.yaml
# apiVersion: kustomize.config.k8s.io/v1beta1
# kind: Kustomization
# resources:
#   - deployment.yaml
#   - service.yaml
#   - ingress.yaml

# Per-cluster overlay
# apps/overlays/production-us/kustomization.yaml
# apiVersion: kustomize.config.k8s.io/v1beta1
# kind: Kustomization
# resources:
#   - ../../base/my-app
# patches:
#   - path: replica-patch.yaml
```

### Rancher Fleet: Centralized Fleet Management

```yaml
# Fleet manages clusters from a central management cluster
# using cluster groups and targeted deployments

# Define a ClusterGroup for organizing clusters
apiVersion: fleet.cattle.io/v1alpha1
kind: ClusterGroup
metadata:
  name: production-clusters
  namespace: fleet-default
spec:
  selector:
    matchLabels:
      env: production
---
# GitRepo with per-target customization
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: platform-services
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/platform-services.git
  branch: main
  paths:
    - monitoring/
    - logging/
    - ingress/
  targets:
    # Production clusters get specific values
    - name: production
      clusterSelector:
        matchLabels:
          env: production
      # Override Helm values for production
      helm:
        values:
          replicaCount: 3
          resources:
            limits:
              cpu: "2"
              memory: 4Gi
    # Staging clusters get different values
    - name: staging
      clusterSelector:
        matchLabels:
          env: staging
      helm:
        values:
          replicaCount: 1
          resources:
            limits:
              cpu: 500m
              memory: 1Gi
    # Edge clusters get minimal configuration
    - name: edge
      clusterGroup: edge-locations
      helm:
        values:
          replicaCount: 1
          resources:
            limits:
              cpu: 200m
              memory: 256Mi
```

## Fleet-Specific Features

### Fleet Bundle Lifecycle

Fleet introduces the concept of Bundles, which are the unit of deployment distributed to clusters.

```yaml
# Fleet automatically creates Bundle resources from GitRepo
# You can also create Bundles directly for advanced use cases
apiVersion: fleet.cattle.io/v1alpha1
kind: Bundle
metadata:
  name: my-app-production
  namespace: fleet-default
spec:
  # Bundle targets
  targets:
    - clusterSelector:
        matchLabels:
          env: production
  # Resources to deploy (usually auto-generated from GitRepo)
  resources:
    - content: |
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: my-app
        spec:
          replicas: 3
          selector:
            matchLabels:
              app: my-app
          template:
            metadata:
              labels:
                app: my-app
            spec:
              containers:
                - name: my-app
                  image: my-app:v2.0.0
                  ports:
                    - containerPort: 8080
  # Diff options for drift detection
  diff:
    comparePatches:
      - apiVersion: apps/v1
        kind: Deployment
        operations:
          - op: remove
            path: /spec/template/spec/containers/0/resources
```

### Fleet.yaml Configuration

Fleet uses a `fleet.yaml` file in the Git repository to configure deployment behavior.

```yaml
# fleet.yaml - placed in the Git repository alongside manifests
defaultNamespace: default

# Helm chart configuration (if the path contains a Helm chart)
helm:
  releaseName: my-app
  chart: ""
  repo: ""
  version: ""
  # Inline values
  values:
    replicaCount: 2
  # Values files relative to the chart
  valuesFiles:
    - values.yaml
  # Atomic install/upgrade
  atomic: true
  # Force resource updates
  force: false
  # Wait for resources to be ready
  waitForJobs: true

# Kustomize configuration
kustomize:
  dir: ""

# Target customization
targetCustomizations:
  - name: production
    clusterSelector:
      matchLabels:
        env: production
    helm:
      values:
        replicaCount: 5
      valuesFiles:
        - values-production.yaml
  - name: staging
    clusterSelector:
      matchLabels:
        env: staging
    helm:
      values:
        replicaCount: 1

# Dependencies on other bundles
dependsOn:
  - name: infrastructure
    selector:
      matchLabels:
        bundle: infra

# YAML options
yaml:
  overlays:
    - custom-overlay
```

## Rancher Integration

Fleet is deeply integrated with the Rancher dashboard, providing a visual management experience.

```yaml
# When using Fleet with Rancher, clusters are automatically
# registered and labeled based on Rancher metadata

# Rancher automatically creates Fleet cluster resources
# for every cluster managed by Rancher

# You can target clusters using Rancher-provided labels
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: monitoring-stack
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/monitoring.git
  branch: main
  paths:
    - prometheus/
    - grafana/
  targets:
    # Use Rancher management labels
    - name: all-managed-clusters
      clusterSelector:
        matchExpressions:
          - key: management.cattle.io/cluster-display-name
            operator: Exists
    # Target specific Rancher-provisioned clusters
    - name: rke2-clusters
      clusterSelector:
        matchLabels:
          provider.cattle.io: rke2
```

## Flux CD Unique Features

Features available in Flux CD but not in Fleet:

```yaml
# 1. Image Automation (not available in Fleet)
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      range: ">=1.0.0"

---
# 2. SOPS Secret Decryption (not available in Fleet)
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: secrets
  namespace: flux-system
spec:
  interval: 5m
  path: ./secrets
  prune: true
  sourceRef:
    kind: GitRepository
    name: secrets-repo
  decryption:
    provider: sops
    secretRef:
      name: sops-age-key

---
# 3. OCI Artifact Sources
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: manifests
  namespace: flux-system
spec:
  interval: 5m
  url: oci://ghcr.io/my-org/manifests
  ref:
    tag: latest
  verify:
    provider: cosign

---
# 4. Advanced Notification System
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: slack-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: "*"
```

## Performance at Scale

| Scenario | Flux CD | Rancher Fleet |
|---|---|---|
| 10 clusters | Install Flux per cluster | Single Fleet manager |
| 100 clusters | Install Flux per cluster + management repo | Single Fleet manager with agents |
| 1000+ clusters | Shard by namespace/label per cluster | Purpose-built for this scale |
| Edge/IoT | Lightweight agent possible | Lightweight agent with K3s |
| Air-gapped | Supported with OCI | Supported with Rancher |
| Git operations | Per-cluster polling | Centralized polling + bundle distribution |

## When to Choose Which

### Choose Flux CD If

- You want a standalone GitOps tool independent of any platform
- You need image automation for continuous deployment workflows
- You require SOPS-encrypted secrets in Git
- You prefer a decentralized multi-cluster model where each cluster is autonomous
- You want CNCF Graduated project maturity and broad community support
- You need deep Kustomize integration with post-rendering capabilities
- You want OCI artifact support with Cosign verification
- You use a mix of Kubernetes distributions (EKS, GKE, AKS, on-premise)

### Choose Rancher Fleet If

- You are already using Rancher to manage your Kubernetes clusters
- You need to manage hundreds or thousands of clusters from a single control plane
- You want a visual dashboard for fleet-wide GitOps management
- You are running edge or IoT workloads on K3s clusters
- You need centralized control over what gets deployed to which clusters
- You want automatic cluster registration and discovery through Rancher
- You prefer a manager-agent model over per-cluster GitOps installations
- You need per-target customization without maintaining separate overlay directories

## Conclusion

Flux CD and Rancher Fleet serve different segments of the GitOps market. Flux CD is a versatile, standalone GitOps toolkit with strong CNCF backing, rich feature set (image automation, SOPS, OCI), and broad ecosystem compatibility. Rancher Fleet is purpose-built for managing large fleets of clusters within the Rancher ecosystem, offering centralized management with automatic cluster discovery and per-target customization. If you are a Rancher shop managing many clusters, Fleet is the natural choice. If you want a platform-agnostic GitOps tool with the deepest feature set, Flux CD is the stronger option.
