# How to Configure Platform Admin vs Tenant Roles in Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Multi-Tenancy, RBAC, Platform Engineering

Description: Learn how to define and enforce the separation between platform administrator and tenant roles in a multi-tenant Flux CD environment.

---

A multi-tenant Flux CD setup requires a clear separation between the platform administrator role and the tenant role. The platform admin manages the cluster infrastructure, Flux itself, and tenant onboarding, while tenants manage their own application deployments within assigned boundaries. This guide explains how to define, configure, and enforce this separation.

## Role Definitions

**Platform Admin** responsibilities:
- Manages the `flux-system` namespace and all Flux controllers
- Creates and manages tenant namespaces
- Configures RBAC, resource quotas, and network policies
- Manages shared infrastructure (ingress controllers, cert-manager, monitoring)
- Controls which Git repositories and Helm registries tenants can use

**Tenant** responsibilities:
- Deploys applications within their assigned namespace(s)
- Manages application configuration (ConfigMaps, Secrets)
- Defines application-level resources (Deployments, Services, Ingresses)
- Cannot access other tenants' namespaces or cluster-level resources

## Step 1: Repository Structure for Role Separation

Organize your Git repository to enforce the separation between platform admin and tenant concerns.

```bash
# Repository structure separating platform and tenant configs
fleet-repo/
  clusters/
    production/
      flux-system/         # Platform admin only
        gotk-components.yaml
        gotk-sync.yaml
      infrastructure/      # Platform admin only
        kustomization.yaml
      tenants/             # Platform admin manages tenant registration
        kustomization.yaml
  infrastructure/
    controllers/           # Platform admin: shared controllers
    policies/              # Platform admin: cluster policies
  tenants/
    base/                  # Platform admin: tenant templates
    team-alpha/            # Tenant can modify within constraints
    team-beta/             # Tenant can modify within constraints
```

## Step 2: Configure Platform Admin Access

The platform admin's Kustomization runs in `flux-system` with full cluster permissions.

```yaml
# clusters/production/infrastructure/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure
  prune: true
  # No serviceAccountName means it uses the flux-system default
  # which has cluster-admin permissions
```

## Step 3: Configure Tenant Registration

The platform admin creates a Kustomization that manages all tenant configurations. This runs in `flux-system` with full permissions so it can create namespaces and RBAC.

```yaml
# clusters/production/tenants/kustomization.yaml
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
  path: ./tenants
  prune: true
  # Runs as flux-system service account (cluster-admin)
  # This allows creating namespaces and RBAC bindings
```

## Step 4: Configure Tenant Deployment Kustomizations

Each tenant gets a Kustomization that runs under their own service account, restricting what they can do.

```yaml
# tenants/team-alpha/sync.yaml
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
  path: ./deploy
  prune: true
  # This is the key: serviceAccountName restricts permissions
  serviceAccountName: team-alpha
  targetNamespace: team-alpha
```

## Step 5: Create the Platform Admin ClusterRole

Define what the platform admin can do across the cluster.

```yaml
# infrastructure/rbac/platform-admin-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: platform-admin
rules:
  # Full access to Flux CRDs
  - apiGroups: ["source.toolkit.fluxcd.io"]
    resources: ["*"]
    verbs: ["*"]
  - apiGroups: ["kustomize.toolkit.fluxcd.io"]
    resources: ["*"]
    verbs: ["*"]
  - apiGroups: ["helm.toolkit.fluxcd.io"]
    resources: ["*"]
    verbs: ["*"]
  - apiGroups: ["notification.toolkit.fluxcd.io"]
    resources: ["*"]
    verbs: ["*"]
  - apiGroups: ["image.toolkit.fluxcd.io"]
    resources: ["*"]
    verbs: ["*"]
  # Namespace management
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["*"]
  # RBAC management
  - apiGroups: ["rbac.authorization.k8s.io"]
    resources: ["clusterroles", "clusterrolebindings", "roles", "rolebindings"]
    verbs: ["*"]
  # Resource quotas and limit ranges
  - apiGroups: [""]
    resources: ["resourcequotas", "limitranges"]
    verbs: ["*"]
  # Network policies
  - apiGroups: ["networking.k8s.io"]
    resources: ["networkpolicies"]
    verbs: ["*"]
```

## Step 6: Create Restricted Tenant ClusterRole

Define the tenant role that limits what applications can deploy.

```yaml
# infrastructure/rbac/tenant-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: tenant-reconciler
rules:
  # Application workloads
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets", "statefulsets", "daemonsets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Core resources
  - apiGroups: [""]
    resources: ["services", "configmaps", "secrets", "serviceaccounts", "pods"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Networking
  - apiGroups: ["networking.k8s.io"]
    resources: ["ingresses"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Autoscaling
  - apiGroups: ["autoscaling"]
    resources: ["horizontalpodautoscalers"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Batch workloads
  - apiGroups: ["batch"]
    resources: ["jobs", "cronjobs"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Read-only Flux status
  - apiGroups: ["kustomize.toolkit.fluxcd.io"]
    resources: ["kustomizations"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["source.toolkit.fluxcd.io"]
    resources: ["gitrepositories"]
    verbs: ["get", "list", "watch"]
```

## Step 7: Bind Roles to Users

Bind the platform admin role to human users (for kubectl access) and the tenant role to service accounts (for Flux reconciliation).

```yaml
# infrastructure/rbac/bindings.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: platform-admins
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: platform-admin
subjects:
  # Platform admin users
  - apiGroup: rbac.authorization.k8s.io
    kind: Group
    name: platform-admins
---
# Tenant role binding (per namespace)
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-alpha-reconciler
  namespace: team-alpha
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: tenant-reconciler
subjects:
  - kind: ServiceAccount
    name: team-alpha
    namespace: team-alpha
```

## Step 8: Enforce Git Repository Access

Use branch protection and CODEOWNERS on the fleet repository to enforce who can modify what.

```bash
# .github/CODEOWNERS
# Platform admin owns cluster and infrastructure configuration
/clusters/       @platform-admin-team
/infrastructure/ @platform-admin-team
/tenants/base/   @platform-admin-team

# Each tenant team owns their directory
/tenants/team-alpha/ @team-alpha-leads
/tenants/team-beta/  @team-beta-leads
```

## Step 9: Verify Role Separation

Confirm that the separation is working correctly.

```bash
# Verify platform admin can manage namespaces
kubectl auth can-i create namespaces --as=admin@example.com

# Verify tenant cannot create namespaces
kubectl auth can-i create namespaces \
  --as=system:serviceaccount:team-alpha:team-alpha

# Verify tenant can deploy within their namespace
kubectl auth can-i create deployments \
  --as=system:serviceaccount:team-alpha:team-alpha \
  -n team-alpha

# Verify tenant cannot modify Flux resources
kubectl auth can-i create gitrepositories.source.toolkit.fluxcd.io \
  --as=system:serviceaccount:team-alpha:team-alpha \
  -n team-alpha
```

## Summary

The separation between platform admin and tenant roles in Flux CD is enforced through a combination of Kubernetes RBAC, Flux `serviceAccountName` impersonation, Git repository structure, and code review processes. Platform admins manage the cluster infrastructure and tenant lifecycle from the `flux-system` namespace, while tenants deploy applications within their assigned namespaces using restricted service accounts. This separation ensures that tenants cannot escalate their privileges or affect other tenants.
