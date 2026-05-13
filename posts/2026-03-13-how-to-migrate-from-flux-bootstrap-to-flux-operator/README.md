# How to Migrate from Flux Bootstrap to Flux Operator

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Flux-Operator, Migration

Description: A step-by-step guide to migrating your existing Flux Bootstrap installation to the Flux Operator for declarative lifecycle management.

---

## Introduction

Flux Bootstrap has been the standard way to install and manage Flux on Kubernetes clusters. However, the Flux Operator introduces a more Kubernetes-native approach to managing Flux's lifecycle through custom resources. The Flux Operator allows you to declare your desired Flux configuration as a Kubernetes resource, making it easier to manage Flux across multiple clusters, integrate with GitOps workflows, and handle upgrades declaratively.

In this guide, you will learn how to migrate an existing Flux Bootstrap installation to the Flux Operator without disrupting your running workloads or losing your GitOps configuration.

## Prerequisites

- A Kubernetes cluster running Flux installed via `flux bootstrap`
- `kubectl` configured to access your cluster
- `helm` CLI installed (v3.10 or later)
- `flux` CLI installed (v2.0 or later)
- Familiarity with Flux concepts such as GitRepository, Kustomization, and HelmRelease

## Step 1: Assess Your Current Flux Installation

Before migrating, you need to understand what your current Flux Bootstrap installation manages. Run the following commands to inventory your Flux resources:

```bash
flux get all -A
kubectl get gitrepositories -A
kubectl get kustomizations -A
kubectl get helmreleases -A
```

Take note of the namespace where Flux is installed (typically `flux-system`) and any custom configurations applied during bootstrap.

Export your current Flux configuration for reference:

```bash
kubectl get -n flux-system deploy -o yaml > flux-deployments-backup.yaml
kubectl get -n flux-system secret -o yaml > flux-secrets-backup.yaml
```

## Step 2: Install the Flux Operator

Install the Flux Operator alongside your existing Flux installation in the same namespace:

```bash
helm install flux-operator oci://ghcr.io/controlplaneio-fluxcd/charts/flux-operator \
  -n flux-system \
  --create-namespace
```

Verify the operator is running:

```bash
kubectl get pods -n flux-system
```

## Step 3: Create the FluxInstance Resource

The FluxInstance custom resource replaces the bootstrap configuration. Create a FluxInstance that mirrors your current Flux setup:

```yaml
# flux-instance.yaml
apiVersion: fluxcd.controlplane.io/v1
kind: FluxInstance
metadata:
  name: flux
  namespace: flux-system
spec:
  distribution:
    version: "2.8.x"
    registry: "ghcr.io/fluxcd"
  components:
    - source-controller
    - kustomize-controller
    - helm-controller
    - notification-controller
  cluster:
    type: kubernetes
    multitenant: false
    networkPolicy: true
  sync:
    kind: GitRepository
    url: "ssh://git@github.com/your-org/fleet-infra.git"
    ref: "refs/heads/main"
    path: "clusters/my-cluster"
    pullSecret: "flux-system"
  kustomize:
    patches:
      - target:
          kind: Deployment
          name: "(kustomize-controller|helm-controller)"
        patch: |
          - op: add
            path: /spec/template/spec/containers/0/args/-
            value: --concurrent=10
```

## Step 4: Apply the FluxInstance

Apply the FluxInstance resource:

```bash
kubectl apply -f flux-instance.yaml
```

Monitor the Flux Operator as it reconciles the FluxInstance:

```bash
kubectl get fluxinstance -n flux-system -w
```

Or wait for the FluxInstance to become ready:

```bash
kubectl -n flux-system wait fluxinstance/flux --for=condition=Ready
```

Once the resource is reconciled, the operator will take ownership of the Flux components, GitRepository, and Kustomization, and manage them going forward.

## Step 5: Remove Bootstrap Artifacts

Once the FluxInstance is successfully reconciled and all Flux components are healthy, remove the bootstrap component and sync manifests from your Git repository:

```bash
# In your fleet-infra repository
rm -rf clusters/my-cluster/flux-system/gotk-components.yaml
rm -rf clusters/my-cluster/flux-system/gotk-sync.yaml
```

Replace them with the FluxInstance manifest:

```bash
cp flux-instance.yaml clusters/my-cluster/flux-system/flux-instance.yaml
git add -A && git commit -m "Migrate from Flux Bootstrap to Flux Operator"
git push
```

## Step 6: Verify the Migration

Confirm all Flux components are running and managed by the operator:

```bash
kubectl get fluxinstance -n flux-system
flux check
flux get all -A
```

Verify your existing GitOps resources are still reconciling:

```bash
flux get kustomizations -A
flux get helmreleases -A
```

All your existing Kustomizations, HelmReleases, and other Flux resources should continue to function as before.

## Handling Common Migration Scenarios

### Custom Component Arguments

If you had custom arguments in your bootstrap configuration, translate them to kustomize patches in the FluxInstance spec as shown in Step 3.

### Image Pull Secrets

If your cluster uses private registries, configure the distribution registry and pull credentials:

```yaml
spec:
  distribution:
    registry: "my-registry.example.com/fluxcd"
    variant: "upstream-alpine"
    imagePullSecret: "registry-credentials"
```

### Multi-Tenant Clusters

For multi-tenant setups, enable the multitenant flag:

```yaml
spec:
  cluster:
    multitenant: true
    tenantDefaultServiceAccount: "default"
```

## Conclusion

Migrating from Flux Bootstrap to the Flux Operator provides a more declarative and Kubernetes-native way to manage your Flux installation. The operator handles upgrades, configuration changes, and component lifecycle management through a single FluxInstance resource. By following the steps in this guide, you can perform the migration without disrupting existing workloads and retain all your GitOps configurations. The Flux Operator is particularly valuable when managing Flux across multiple clusters, as each cluster's Flux configuration becomes a simple Kubernetes resource that can itself be managed via GitOps.
