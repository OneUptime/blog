# How to Use flux create tenant Command in Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Multi-Tenancy, CLI, Automation

Description: Learn how to use the flux create tenant command to quickly set up tenant namespaces, service accounts, and RBAC bindings in a multi-tenant Flux CD environment.

---

The `flux create tenant` command is a built-in CLI tool that simplifies tenant creation in multi-tenant Flux CD environments. It generates the namespace, service account, and RBAC bindings needed for a tenant in a single command. This guide covers all the options and patterns for using this command effectively.

## What flux create tenant Creates

When you run `flux create tenant`, it generates three types of resources:

1. A Namespace for the tenant
2. A ServiceAccount within that namespace
3. A RoleBinding that grants the service account permissions within the namespace

These are the foundational resources needed for Flux to reconcile tenant-specific Kustomizations under the tenant's identity.

## Basic Usage

The simplest form of the command creates a tenant with a single namespace.

```bash
# Create a tenant named "team-alpha" with its own namespace
flux create tenant team-alpha \
  --with-namespace=team-alpha
```

This applies the resources directly to the cluster. To generate manifests without applying them, use the `--export` flag.

```bash
# Export tenant manifests to a file for GitOps management
flux create tenant team-alpha \
  --with-namespace=team-alpha \
  --export > team-alpha-tenant.yaml
```

## Examining the Output

The exported YAML contains all three resource types.

```yaml
# Output of flux create tenant team-alpha --with-namespace=team-alpha --export
apiVersion: v1
kind: Namespace
metadata:
  labels:
    toolkit.fluxcd.io/tenant: team-alpha
  name: team-alpha
---
apiVersion: v1
kind: ServiceAccount
metadata:
  labels:
    toolkit.fluxcd.io/tenant: team-alpha
  name: team-alpha
  namespace: team-alpha
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  labels:
    toolkit.fluxcd.io/tenant: team-alpha
  name: team-alpha-reconciler
  namespace: team-alpha
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
  - apiGroup: rbac.authorization.k8s.io
    kind: User
    name: gotk:team-alpha:reconciler
  - kind: ServiceAccount
    name: team-alpha
    namespace: team-alpha
```

Note that the RoleBinding references the `cluster-admin` ClusterRole, but it is a namespace-scoped RoleBinding. This means the service account has cluster-admin permissions only within the `team-alpha` namespace.

## Creating a Tenant with Multiple Namespaces

A tenant can have multiple namespaces. Use the `--with-namespace` flag multiple times.

```bash
# Create a tenant with staging and production namespaces
flux create tenant team-alpha \
  --with-namespace=team-alpha-staging \
  --with-namespace=team-alpha-production \
  --export > team-alpha-tenant.yaml
```

This generates a namespace, service account, and role binding for each specified namespace.

## Using a Custom Cluster Role

By default, the tenant gets `cluster-admin` within their namespace. To use a more restrictive role, specify the `--cluster-role` flag.

```bash
# Create a tenant with a custom restricted role
flux create tenant team-alpha \
  --with-namespace=team-alpha \
  --cluster-role=tenant-reconciler \
  --export > team-alpha-tenant.yaml
```

The custom ClusterRole must already exist in the cluster. The generated RoleBinding will reference it instead of `cluster-admin`.

```yaml
# Generated RoleBinding with custom cluster role
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  labels:
    toolkit.fluxcd.io/tenant: team-alpha
  name: team-alpha-reconciler
  namespace: team-alpha
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: tenant-reconciler
subjects:
  - apiGroup: rbac.authorization.k8s.io
    kind: User
    name: gotk:team-alpha:reconciler
  - kind: ServiceAccount
    name: team-alpha
    namespace: team-alpha
```

## Integrating with GitOps Workflow

The recommended workflow is to export the tenant manifests and store them in your fleet repository.

```bash
# Step 1: Create the tenant directory
mkdir -p tenants/base/team-alpha

# Step 2: Export the tenant base resources
flux create tenant team-alpha \
  --with-namespace=team-alpha \
  --cluster-role=tenant-reconciler \
  --export > tenants/base/team-alpha/tenant.yaml

# Step 3: Create additional resources for the tenant
# (git repo, kustomization, quotas, etc.)
```

Then create a kustomization.yaml that assembles all tenant resources.

```yaml
# tenants/base/team-alpha/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - tenant.yaml
  - git-repo.yaml
  - sync.yaml
  - resource-quota.yaml
```

## Scripting Tenant Creation

Use the command in scripts to onboard multiple tenants at once.

```bash
#!/bin/bash
# batch-create-tenants.sh
# Create tenant resources for multiple teams

TENANTS=("team-alpha" "team-beta" "team-gamma" "team-delta")
CLUSTER_ROLE="tenant-reconciler"
BASE_DIR="tenants/base"

for tenant in "${TENANTS[@]}"; do
  echo "Creating tenant: ${tenant}"
  mkdir -p "${BASE_DIR}/${tenant}"

  # Generate the tenant base resources
  flux create tenant "${tenant}" \
    --with-namespace="${tenant}" \
    --cluster-role="${CLUSTER_ROLE}" \
    --export > "${BASE_DIR}/${tenant}/tenant.yaml"

  echo "Tenant ${tenant} created at ${BASE_DIR}/${tenant}/tenant.yaml"
done

echo "All tenants created. Commit and push to apply."
```

## Verifying Tenant Creation

After applying the tenant resources, verify everything was created correctly.

```bash
# Check the tenant namespace
kubectl get namespace team-alpha --show-labels

# Check the service account
kubectl get serviceaccount -n team-alpha

# Check the role binding
kubectl get rolebinding -n team-alpha

# Verify permissions
kubectl auth can-i create deployments \
  --as=system:serviceaccount:team-alpha:team-alpha \
  -n team-alpha

# Verify isolation
kubectl auth can-i create deployments \
  --as=system:serviceaccount:team-alpha:team-alpha \
  -n default
```

## Limitations of flux create tenant

The command only creates the basic tenant structure (namespace, service account, RBAC). It does not create:

- GitRepository or HelmRepository sources
- Kustomization or HelmRelease resources
- ResourceQuotas or LimitRanges
- NetworkPolicies
- Notification providers or alerts

These must be created separately and added to the tenant configuration. The command is best used as a starting point that generates the foundational resources, which you then extend with additional configuration.

## Summary

The `flux create tenant` command provides a quick and consistent way to create the foundational resources for a tenant in a multi-tenant Flux CD setup. It generates namespaces, service accounts, and RBAC bindings in a single command. Use the `--export` flag to generate manifests for GitOps management, `--with-namespace` for multiple namespaces, and `--cluster-role` for custom permission sets. Combine the generated resources with additional configuration like sources, quotas, and network policies to build a complete tenant setup.
