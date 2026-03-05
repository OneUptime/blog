# How to Restrict Cross-Namespace References in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Security, Multi-Tenancy, Namespace Isolation

Description: Learn how to use the --no-cross-namespace-refs flag in Flux CD to prevent resources from referencing objects in other namespaces for stronger tenant isolation.

---

In multi-tenant Kubernetes clusters, namespace boundaries serve as security perimeters. By default, Flux CD allows resources like Kustomizations and HelmReleases to reference sources, secrets, and other objects in different namespaces. This can break tenant isolation if one team references another team's resources. The `--no-cross-namespace-refs` flag prevents this behavior.

This guide explains how to enable and enforce cross-namespace reference restrictions in Flux CD.

## The Problem with Cross-Namespace References

By default, a Flux Kustomization in one namespace can reference a GitRepository in another namespace:

```yaml
# This Kustomization in namespace "team-alpha" references a source in "flux-system"
# Without restrictions, any tenant can reference any source in any namespace
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app
  namespace: team-alpha
spec:
  sourceRef:
    kind: GitRepository
    name: shared-repo
    namespace: flux-system  # Cross-namespace reference
  interval: 10m
  path: ./apps
```

This means a tenant could:

- Reference a GitRepository containing sensitive configurations.
- Reference a Secret in another namespace for decryption keys.
- Reference a HelmRepository belonging to another team.

## Enabling --no-cross-namespace-refs

To restrict cross-namespace references, configure each Flux controller with the `--no-cross-namespace-refs` flag. This is done by patching the controller Deployments.

Create a Kustomize overlay that patches all relevant controllers:

```yaml
# kustomization.yaml
# Overlay to enable cross-namespace reference restrictions on all Flux controllers
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  # Patch kustomize-controller
  - target:
      kind: Deployment
      name: kustomize-controller
    patch: |
      - op: add
        path: /spec/template/spec/containers/0/args/-
        value: --no-cross-namespace-refs=true
  # Patch helm-controller
  - target:
      kind: Deployment
      name: helm-controller
    patch: |
      - op: add
        path: /spec/template/spec/containers/0/args/-
        value: --no-cross-namespace-refs=true
  # Patch notification-controller
  - target:
      kind: Deployment
      name: notification-controller
    patch: |
      - op: add
        path: /spec/template/spec/containers/0/args/-
        value: --no-cross-namespace-refs=true
  # Patch image-reflector-controller
  - target:
      kind: Deployment
      name: image-reflector-controller
    patch: |
      - op: add
        path: /spec/template/spec/containers/0/args/-
        value: --no-cross-namespace-refs=true
  # Patch image-automation-controller
  - target:
      kind: Deployment
      name: image-automation-controller
    patch: |
      - op: add
        path: /spec/template/spec/containers/0/args/-
        value: --no-cross-namespace-refs=true
```

## Applying the Configuration

Apply the patched configuration using Flux bootstrap or manually:

```bash
# If using flux bootstrap, commit the kustomization.yaml to your fleet repo
# and Flux will apply it during the next reconciliation

# To apply manually:
kubectl apply -k /path/to/flux-system/

# Verify the flag is set on each controller
kubectl get deployment kustomize-controller -n flux-system -o yaml | grep no-cross-namespace
kubectl get deployment helm-controller -n flux-system -o yaml | grep no-cross-namespace

# Restart controllers to pick up the changes
kubectl rollout restart deployment -n flux-system
```

## What Gets Restricted

When `--no-cross-namespace-refs=true` is enabled, the following cross-namespace references are blocked:

For **kustomize-controller**:
- Kustomization `spec.sourceRef` cannot reference a source in a different namespace.
- Kustomization `spec.decryption.secretRef` must be in the same namespace.

For **helm-controller**:
- HelmRelease `spec.chart.spec.sourceRef` cannot reference a HelmRepository in a different namespace.
- HelmRelease `spec.valuesFrom` cannot reference ConfigMaps or Secrets in a different namespace.

For **notification-controller**:
- Alert `spec.providerRef` must be in the same namespace as the Alert.
- Receiver `spec.resources` must reference objects in the same namespace.

## Restructuring for Namespace Isolation

After enabling the restriction, you need to restructure your Flux resources so that sources and their consumers are in the same namespace. Here is the recommended pattern:

```yaml
# Each tenant namespace gets its own GitRepository
# tenant-alpha-source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: team-alpha-repo
  namespace: team-alpha  # Source is in the same namespace as the Kustomization
spec:
  interval: 5m
  url: https://github.com/org/team-alpha-apps.git
  secretRef:
    name: team-alpha-git-credentials  # Secret must also be in team-alpha namespace
  ref:
    branch: main
---
# Kustomization references the source in its own namespace
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-alpha-apps
  namespace: team-alpha
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: team-alpha-repo
    # No namespace field needed - defaults to the Kustomization's namespace
  path: ./apps
  prune: true
  serviceAccountName: team-alpha-deployer
```

## Handling Shared Resources

If multiple teams need access to the same Helm repository, create a copy in each tenant namespace:

```yaml
# shared-helmrepo-per-namespace.yaml
# Each tenant gets its own copy of the shared HelmRepository
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: team-alpha
spec:
  interval: 30m
  url: https://charts.bitnami.com/bitnami
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: team-beta
spec:
  interval: 30m
  url: https://charts.bitnami.com/bitnami
```

## Verifying the Restriction Works

Test that cross-namespace references are properly blocked:

```bash
# Create a test Kustomization that references a source in another namespace
cat <<EOF | kubectl apply -f -
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: test-cross-ns
  namespace: team-alpha
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
    namespace: flux-system
  path: ./test
EOF

# Check the status - it should show a cross-namespace reference error
kubectl get kustomization test-cross-ns -n team-alpha -o yaml | grep -A5 status

# Clean up the test resource
kubectl delete kustomization test-cross-ns -n team-alpha
```

## Best Practices

1. **Enable on all controllers**: Apply the flag to every Flux controller, not just the kustomize-controller.
2. **Plan the migration**: Before enabling, audit all existing cross-namespace references and restructure them.
3. **Use platform admin namespace**: Keep a dedicated `flux-system` namespace for platform-level resources that are managed only by cluster administrators.
4. **Combine with RBAC**: Use RBAC to prevent tenants from creating resources in namespaces they do not own.
5. **Combine with service account impersonation**: Together with `--no-cross-namespace-refs`, service account impersonation provides strong tenant isolation.

Restricting cross-namespace references is essential for multi-tenant Flux CD deployments. It ensures that tenants cannot access or depend on resources outside their namespace boundary, maintaining clean isolation between teams.
