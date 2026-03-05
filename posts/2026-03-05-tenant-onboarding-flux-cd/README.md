# How to Configure Tenant Onboarding in Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Multi-Tenancy, Tenant Onboarding, Automation

Description: Learn how to create a streamlined tenant onboarding process in Flux CD that automates namespace creation, RBAC setup, and Git repository assignment.

---

Onboarding new tenants in a multi-tenant Flux CD environment requires creating several Kubernetes resources in a consistent and repeatable way. This guide covers how to build a standardized onboarding process that platform administrators can use to bring new teams onto a shared cluster quickly and safely.

## The Onboarding Workflow

When onboarding a new tenant, the platform admin needs to:

1. Create a tenant namespace
2. Set up a service account for Flux reconciliation
3. Configure RBAC to restrict the tenant to their namespace
4. Register the tenant's Git repository
5. Create a Kustomization to deploy the tenant's applications

Flux CD provides the `flux create tenant` command to automate most of this process.

## Step 1: Use the flux create tenant Command

The fastest way to onboard a tenant is with the `flux create tenant` command. This creates the namespace, service account, and RBAC bindings in one step.

```bash
# Create a new tenant with namespace and RBAC in one command
flux create tenant team-gamma \
  --with-namespace=team-gamma \
  --export > tenant-team-gamma.yaml
```

This generates the following resources:

```yaml
# Output from flux create tenant (namespace, service account, role binding)
apiVersion: v1
kind: Namespace
metadata:
  name: team-gamma
  labels:
    toolkit.fluxcd.io/tenant: team-gamma
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: team-gamma
  namespace: team-gamma
  labels:
    toolkit.fluxcd.io/tenant: team-gamma
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-gamma-reconciler
  namespace: team-gamma
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
  - apiGroup: rbac.authorization.k8s.io
    kind: User
    name: gotk:team-gamma:reconciler
  - kind: ServiceAccount
    name: team-gamma
    namespace: team-gamma
```

## Step 2: Create a Tenant Onboarding Template

For a more structured approach, create a base template that can be customized per tenant using Kustomize overlays.

```yaml
# tenants/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - service-account.yaml
  - rbac.yaml
  - git-repo.yaml
  - sync.yaml
  - resource-quota.yaml
```

Define the base namespace template.

```yaml
# tenants/base/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: tenant-placeholder
  labels:
    toolkit.fluxcd.io/tenant: tenant-placeholder
    environment: production
```

Define the base service account.

```yaml
# tenants/base/service-account.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: tenant-placeholder
  namespace: tenant-placeholder
```

Define the base RBAC binding.

```yaml
# tenants/base/rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: tenant-placeholder-reconciler
  namespace: tenant-placeholder
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
  - kind: ServiceAccount
    name: tenant-placeholder
    namespace: tenant-placeholder
```

Define the base Git repository source.

```yaml
# tenants/base/git-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: tenant-placeholder-repo
  namespace: tenant-placeholder
spec:
  interval: 1m
  url: https://github.com/org/tenant-placeholder-apps
  ref:
    branch: main
```

Define the base Kustomization for syncing tenant apps.

```yaml
# tenants/base/sync.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: tenant-placeholder-apps
  namespace: tenant-placeholder
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: tenant-placeholder-repo
  prune: true
  serviceAccountName: tenant-placeholder
  targetNamespace: tenant-placeholder
```

Define a default resource quota for the tenant.

```yaml
# tenants/base/resource-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: tenant-placeholder-quota
  namespace: tenant-placeholder
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    pods: "50"
```

## Step 3: Create an Overlay for Each New Tenant

When onboarding a new tenant, create a Kustomize overlay that patches the base template.

```yaml
# tenants/production/team-delta/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: team-delta
namePrefix: ""
resources:
  - ../../base
patches:
  - target:
      kind: Namespace
      name: tenant-placeholder
    patch: |
      - op: replace
        path: /metadata/name
        value: team-delta
      - op: replace
        path: /metadata/labels/toolkit.fluxcd.io~1tenant
        value: team-delta
  - target:
      kind: ServiceAccount
      name: tenant-placeholder
    patch: |
      - op: replace
        path: /metadata/name
        value: team-delta
  - target:
      kind: GitRepository
      name: tenant-placeholder-repo
    patch: |
      - op: replace
        path: /metadata/name
        value: team-delta-repo
      - op: replace
        path: /spec/url
        value: https://github.com/org/team-delta-apps
```

## Step 4: Write an Onboarding Script

Automate the overlay creation with a shell script that the platform admin runs for each new tenant.

```bash
#!/bin/bash
# onboard-tenant.sh - Automate tenant onboarding in Flux CD
# Usage: ./onboard-tenant.sh <tenant-name> <git-repo-url>

TENANT_NAME=$1
GIT_REPO_URL=$2
BASE_DIR="tenants/production"

if [ -z "$TENANT_NAME" ] || [ -z "$GIT_REPO_URL" ]; then
  echo "Usage: $0 <tenant-name> <git-repo-url>"
  exit 1
fi

# Create the tenant overlay directory
mkdir -p "${BASE_DIR}/${TENANT_NAME}"

# Generate the kustomization overlay
cat > "${BASE_DIR}/${TENANT_NAME}/kustomization.yaml" <<EOF
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: ${TENANT_NAME}
resources:
  - ../../base
patches:
  - target:
      kind: Namespace
      name: tenant-placeholder
    patch: |
      - op: replace
        path: /metadata/name
        value: ${TENANT_NAME}
      - op: replace
        path: /metadata/labels/toolkit.fluxcd.io~1tenant
        value: ${TENANT_NAME}
  - target:
      kind: ServiceAccount
      name: tenant-placeholder
    patch: |
      - op: replace
        path: /metadata/name
        value: ${TENANT_NAME}
  - target:
      kind: GitRepository
      name: tenant-placeholder-repo
    patch: |
      - op: replace
        path: /metadata/name
        value: ${TENANT_NAME}-repo
      - op: replace
        path: /spec/url
        value: ${GIT_REPO_URL}
EOF

echo "Tenant ${TENANT_NAME} onboarding files created at ${BASE_DIR}/${TENANT_NAME}/"
echo "Commit and push to apply via GitOps."
```

## Step 5: Register the Tenant in the Cluster

Add a Kustomization to your cluster configuration that points to the new tenant overlay.

```yaml
# clusters/my-cluster/tenants.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: tenants
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./tenants/production
  prune: true
```

## Step 6: Verify the Onboarding

After pushing the changes to Git, verify the tenant was onboarded successfully.

```bash
# Wait for Flux to reconcile
flux reconcile kustomization tenants --with-source

# Check tenant namespace exists
kubectl get namespace team-delta

# Verify tenant resources
flux get all -n team-delta

# Confirm RBAC isolation
kubectl auth can-i create deployments \
  --as=system:serviceaccount:team-delta:team-delta \
  -n team-delta
```

## Summary

A well-designed tenant onboarding process uses templates and automation to ensure consistency across tenants. By combining the `flux create tenant` command with Kustomize base templates and overlay patterns, platform administrators can onboard new tenants in minutes. The key is to standardize the onboarding artifacts and automate their generation so that every tenant receives the same baseline configuration with proper namespace isolation and RBAC controls.
