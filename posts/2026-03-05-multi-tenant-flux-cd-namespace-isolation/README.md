# How to Set Up Multi-Tenant Flux CD with Namespace Isolation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Multi-Tenancy, Namespace Isolation, RBAC

Description: Learn how to configure a multi-tenant Flux CD environment where each tenant is isolated within its own Kubernetes namespace with proper access controls.

---

Multi-tenancy in Flux CD allows platform teams to share a single Kubernetes cluster among multiple teams or customers while maintaining strict isolation. Each tenant operates within its own namespace and can only access resources assigned to them. This guide walks through setting up namespace-based isolation with Flux CD.

## Understanding Multi-Tenancy in Flux CD

Flux CD supports multi-tenancy by allowing platform administrators to define tenants, each with their own namespace, service account, and RBAC policies. The platform admin manages the `flux-system` namespace and controls what each tenant can do. Tenants get their own namespaces where they can deploy applications using GitOps workflows.

The key principle is separation of concerns: the platform team manages cluster-wide resources and Flux itself, while tenants manage their own application deployments within their assigned namespaces.

## Prerequisites

Before you begin, ensure you have the following:

- A Kubernetes cluster (v1.20 or later)
- Flux CD installed in the `flux-system` namespace
- `kubectl` and `flux` CLI tools installed
- Cluster admin access

## Step 1: Define Your Tenant Structure

Start by creating a directory structure in your fleet repository that separates platform configuration from tenant configuration.

```bash
# Create the directory structure for multi-tenant management
mkdir -p clusters/my-cluster/tenants
mkdir -p tenants/base
mkdir -p tenants/production
```

## Step 2: Create Tenant Namespaces

Define the namespace for each tenant. This manifest creates an isolated namespace for a tenant called "team-alpha."

```yaml
# tenants/base/team-alpha/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: team-alpha
  labels:
    toolkit.fluxcd.io/tenant: team-alpha
```

## Step 3: Create Service Accounts for Tenants

Each tenant needs a service account that Flux will use to reconcile resources in the tenant namespace.

```yaml
# tenants/base/team-alpha/service-account.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: team-alpha
  namespace: team-alpha
  labels:
    toolkit.fluxcd.io/tenant: team-alpha
```

## Step 4: Configure RBAC for Namespace Isolation

Create a RoleBinding that grants the tenant service account permissions only within its own namespace.

```yaml
# tenants/base/team-alpha/rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-alpha-reconciler
  namespace: team-alpha
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
  - kind: ServiceAccount
    name: team-alpha
    namespace: team-alpha
```

This RoleBinding gives the tenant service account full control within the `team-alpha` namespace only, without any access to other namespaces.

## Step 5: Assign a Git Repository to the Tenant

Define a GitRepository source that points to the tenant's application repository. The `serviceAccountName` field ensures the reconciliation happens under the tenant's identity.

```yaml
# tenants/base/team-alpha/git-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: team-alpha-repo
  namespace: team-alpha
spec:
  interval: 1m
  url: https://github.com/org/team-alpha-apps
  ref:
    branch: main
```

## Step 6: Create a Kustomization for the Tenant

Define a Kustomization that reconciles the tenant's applications. The `serviceAccountName` field enforces that only resources allowed by the tenant's RBAC can be created.

```yaml
# tenants/base/team-alpha/kustomization-deploy.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-alpha-apps
  namespace: team-alpha
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: team-alpha-repo
  prune: true
  serviceAccountName: team-alpha
  targetNamespace: team-alpha
```

The `serviceAccountName` is what enforces namespace isolation. When Flux reconciles this Kustomization, it impersonates the tenant service account, which only has permissions in the `team-alpha` namespace. Any attempt to create resources in other namespaces will be denied.

## Step 7: Create the Tenant Kustomization File

Create a kustomization.yaml that includes all the tenant resources.

```yaml
# tenants/base/team-alpha/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - service-account.yaml
  - rbac.yaml
  - git-repo.yaml
  - kustomization-deploy.yaml
```

## Step 8: Register Tenants in the Cluster Configuration

Add the tenant configuration to your cluster's Flux setup so that Flux manages the tenant resources.

```yaml
# clusters/my-cluster/tenants/team-alpha.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: tenant-team-alpha
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./tenants/base/team-alpha
  prune: true
```

## Step 9: Verify Isolation

After applying the configuration, verify that the tenant is properly isolated.

```bash
# Check that the tenant namespace was created
kubectl get namespace team-alpha

# Verify the service account exists
kubectl get serviceaccount -n team-alpha

# Verify RBAC is correctly configured
kubectl auth can-i create deployments --as=system:serviceaccount:team-alpha:team-alpha -n team-alpha
# Expected: yes

# Verify the tenant cannot access other namespaces
kubectl auth can-i create deployments --as=system:serviceaccount:team-alpha:team-alpha -n default
# Expected: no

# Check Flux reconciliation status
flux get kustomizations -n team-alpha
```

## Adding More Tenants

To add another tenant, replicate the directory structure under `tenants/base/` with a new tenant name. For example, for "team-beta," create `tenants/base/team-beta/` with the same set of files, replacing all references to `team-alpha` with `team-beta`.

## Security Considerations

When running multi-tenant Flux CD, keep these points in mind:

- Always use `serviceAccountName` in tenant Kustomizations to enforce RBAC boundaries
- Consider adding NetworkPolicies to prevent cross-tenant network traffic
- Apply ResourceQuotas to prevent any single tenant from consuming excessive cluster resources
- Regularly audit tenant permissions with `kubectl auth can-i`
- Use `targetNamespace` to force resources into the tenant namespace, even if the manifests specify a different namespace

## Summary

Setting up multi-tenant Flux CD with namespace isolation involves creating dedicated namespaces, service accounts, and RBAC bindings for each tenant. The key mechanism is the `serviceAccountName` field in Kustomization resources, which causes Flux to impersonate the tenant's service account during reconciliation. This ensures tenants can only create and manage resources within their assigned namespaces, providing effective isolation on a shared cluster.
