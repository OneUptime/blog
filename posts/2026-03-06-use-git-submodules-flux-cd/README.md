# How to Use Git Submodules with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, git submodules, gitops, kubernetes, repository patterns

Description: Learn how to use Git submodules with Flux CD to manage shared configurations and reusable components across multiple repositories.

---

## Introduction

Git submodules allow you to include one Git repository inside another. When combined with Flux CD, submodules enable teams to share common Kubernetes manifests, Helm values, or Kustomize bases across multiple projects without duplicating code. This guide walks you through setting up and managing Git submodules in a Flux CD workflow.

## Why Use Git Submodules with Flux CD

There are several scenarios where submodules make sense in a GitOps workflow:

- **Shared base configurations**: Common network policies, RBAC rules, or security policies used across teams.
- **Reusable Helm value templates**: Standardized Helm values that multiple services inherit from.
- **Centralized policy management**: A single source of truth for organization-wide policies.
- **Versioned dependencies**: Pinning shared configurations to specific versions.

## Prerequisites

Before starting, ensure you have:

- A running Kubernetes cluster
- Flux CD installed and bootstrapped
- At least two Git repositories (one main, one shared)
- `git` CLI installed locally

## Setting Up the Shared Repository

First, create a shared repository that contains common Kubernetes manifests.

```yaml
# shared-configs/base/namespace.yaml
# Standard namespace template with labels required by the organization
apiVersion: v1
kind: Namespace
metadata:
  name: app-namespace
  labels:
    managed-by: flux
    environment: base
```

```yaml
# shared-configs/base/network-policy.yaml
# Default deny-all network policy for security compliance
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: app-namespace
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

```yaml
# shared-configs/base/resource-quota.yaml
# Standard resource quota applied to all namespaces
apiVersion: v1
kind: ResourceQuota
metadata:
  name: default-quota
  namespace: app-namespace
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    pods: "20"
```

```yaml
# shared-configs/base/kustomization.yaml
# Kustomize file that bundles all base resources together
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - network-policy.yaml
  - resource-quota.yaml
```

## Adding the Submodule to Your Fleet Repository

Add the shared repository as a submodule in your fleet repository.

```bash
# Navigate to your fleet repository root
cd fleet-repo

# Add the shared-configs repo as a submodule under the 'shared' directory
git submodule add https://github.com/your-org/shared-configs.git shared

# Pin the submodule to a specific tag for stability
cd shared
git checkout v1.2.0
cd ..

# Commit the submodule reference
git add .gitmodules shared
git commit -m "Add shared-configs submodule at v1.2.0"
```

## Configuring Flux CD GitRepository with Submodules

Flux CD needs to be told to recurse into submodules when cloning the repository. Configure the `GitRepository` resource with the `recurseSubmodules` option.

```yaml
# flux-system/git-repository.yaml
# GitRepository resource configured to clone submodules automatically
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: fleet-repo
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/your-org/fleet-repo.git
  ref:
    branch: main
  secretRef:
    # Secret containing Git credentials for private repos
    name: flux-git-credentials
  recurseSubmodules: true  # This tells Flux to initialize and update submodules
```

## Creating a Kustomization That References Submodule Paths

Now create a Flux Kustomization that points to the shared configurations pulled in via the submodule.

```yaml
# flux-system/shared-configs-kustomization.yaml
# Flux Kustomization that applies resources from the submodule path
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: shared-configs
  namespace: flux-system
spec:
  interval: 10m
  # Target the path inside the submodule
  path: ./shared/base
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  targetNamespace: default
  healthChecks:
    - apiVersion: v1
      kind: Namespace
      name: app-namespace
```

## Layering Application-Specific Configs on Top of Shared Configs

Use Kustomize overlays to extend the shared base with application-specific settings.

```yaml
# apps/my-service/kustomization.yaml
# Overlay that builds on top of the shared base from the submodule
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  # Reference the shared base pulled in via submodule
  - ../../shared/base
  # Add application-specific resources
  - deployment.yaml
  - service.yaml
patches:
  # Override the namespace name for this specific application
  - target:
      kind: Namespace
      name: app-namespace
    patch: |
      - op: replace
        path: /metadata/name
        value: my-service
  # Adjust resource quotas for this service
  - target:
      kind: ResourceQuota
      name: default-quota
    patch: |
      - op: replace
        path: /spec/hard/requests.cpu
        value: "8"
```

```yaml
# apps/my-service/deployment.yaml
# Application deployment that lives alongside the shared base
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  namespace: my-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-service
  template:
    metadata:
      labels:
        app: my-service
    spec:
      containers:
        - name: my-service
          image: my-org/my-service:latest
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
```

## Setting Up Authentication for Private Submodules

If your submodule repository is private, you need to configure authentication.

```yaml
# flux-system/git-credentials-secret.yaml
# Secret containing credentials for accessing private Git repositories
# The same credentials must have access to both the main repo and submodule repos
apiVersion: v1
kind: Secret
metadata:
  name: flux-git-credentials
  namespace: flux-system
type: Opaque
stringData:
  # Use a personal access token or deploy key with read access
  username: flux-bot
  password: <your-token-here>
```

For SSH-based authentication:

```bash
# Create a secret from an SSH key that has access to both repositories
flux create secret git flux-git-credentials \
  --url=ssh://git@github.com/your-org/fleet-repo \
  --private-key-file=/path/to/identity
```

## Updating the Submodule Version

When the shared repository releases a new version, update the submodule reference.

```bash
# Update the submodule to a new tag
cd fleet-repo/shared
git fetch --tags
git checkout v1.3.0
cd ..

# Commit the updated submodule reference
git add shared
git commit -m "Update shared-configs submodule to v1.3.0"
git push
```

Flux will detect the change in the fleet repository and automatically pull the updated submodule content on its next reconciliation cycle.

## Repository Structure Overview

Here is the recommended directory layout when using submodules with Flux CD:

```
fleet-repo/
  .gitmodules              # Git submodule configuration
  shared/                  # Submodule: shared-configs repo
    base/
      kustomization.yaml
      namespace.yaml
      network-policy.yaml
      resource-quota.yaml
  apps/
    my-service/
      kustomization.yaml   # Overlay referencing shared/base
      deployment.yaml
      service.yaml
    another-service/
      kustomization.yaml
      deployment.yaml
      service.yaml
  flux-system/
    git-repository.yaml    # GitRepository with recurseSubmodules: true
    shared-configs-kustomization.yaml
    my-service-kustomization.yaml
```

## Troubleshooting Common Issues

### Submodule Not Cloned

If Flux reports missing files from the submodule path, verify that `recurseSubmodules: true` is set in the GitRepository resource:

```bash
# Check the GitRepository status
flux get sources git fleet-repo

# Inspect the resource for the recurseSubmodules field
kubectl get gitrepository fleet-repo -n flux-system -o yaml | grep recurse
```

### Authentication Failures for Submodules

Ensure the credentials provided to Flux have read access to all submodule repositories, not just the main repository.

```bash
# Verify the secret exists and has the right data
kubectl get secret flux-git-credentials -n flux-system -o jsonpath='{.data}' | base64 -d
```

### Submodule Pinned to Wrong Commit

If the wrong version of the submodule is being applied, check the commit reference:

```bash
# See what commit the submodule is pinned to
git submodule status

# Verify it matches the expected tag
cd shared && git describe --tags
```

## Best Practices

1. **Always pin submodules to tags** rather than branches to ensure reproducible deployments.
2. **Use a single credential** that has access to all repositories, including submodule targets.
3. **Keep shared configurations minimal** to avoid tight coupling between teams.
4. **Document submodule update procedures** so all team members know how to bump versions.
5. **Test submodule updates in staging** before promoting to production.

## Conclusion

Git submodules provide a straightforward way to share Kubernetes configurations across multiple Flux CD repositories. By configuring `recurseSubmodules: true` on your GitRepository resource and structuring your repository with clear separation between shared and application-specific configs, you can maintain a clean, DRY GitOps workflow. The key is to pin submodule versions carefully and ensure Flux has the necessary credentials to access all referenced repositories.
