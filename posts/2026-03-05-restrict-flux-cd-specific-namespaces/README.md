# How to Restrict Flux CD to Specific Namespaces

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, RBAC, Multi-Tenancy, Namespace, Security

Description: Learn how to restrict Flux CD controllers and resources to specific namespaces for multi-tenant isolation and security boundaries.

---

By default, Flux CD controllers operate cluster-wide, managing resources across all namespaces. In multi-tenant environments or for security compliance, you may need to restrict Flux to operate only within specific namespaces. This guide covers multiple approaches to namespace restriction, from Kustomization-level controls to RBAC-based isolation.

## Approaches to Namespace Restriction

There are several ways to limit Flux's scope:

1. **Kustomization targetNamespace**: Force all resources from a Kustomization to deploy into a specific namespace.
2. **Kustomization serviceAccountName**: Use a namespace-scoped service account with limited RBAC.
3. **Multi-tenancy lockdown**: Deploy separate Flux instances per tenant namespace.
4. **Network policies**: Restrict controller network access.

## Using targetNamespace

The simplest approach is to use the `targetNamespace` field on a Kustomization to override the namespace of all resources it manages:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-a-apps
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: team-a-repo
  path: ./apps
  prune: true
  targetNamespace: team-a
```

Every resource applied by this Kustomization will be placed in the `team-a` namespace, regardless of what namespace is specified in the manifest. This prevents a team from accidentally or intentionally deploying resources outside their namespace.

## Using serviceAccountName for RBAC Isolation

For stronger isolation, configure the Kustomization to impersonate a service account with limited permissions:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-a-apps
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: team-a-repo
  path: ./apps
  prune: true
  targetNamespace: team-a
  serviceAccountName: team-a-deployer
```

Create the service account and bind it to a role that only allows operations within the team's namespace:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: team-a-deployer
  namespace: team-a
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: team-a-deployer
  namespace: team-a
rules:
  - apiGroups: ["*"]
    resources: ["*"]
    verbs: ["*"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-a-deployer
  namespace: team-a
subjects:
  - kind: ServiceAccount
    name: team-a-deployer
    namespace: team-a
roleRef:
  kind: Role
  name: team-a-deployer
  apiGroup: rbac.authorization.k8s.io
```

With this configuration, even if team-a's manifests contain resources targeting other namespaces, the kustomize-controller will fail to apply them because the service account lacks permissions outside `team-a`.

## Restricting Resource Types

You can further restrict what resource types a team can deploy by limiting the Role:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: team-a-deployer
  namespace: team-a
rules:
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets", "statefulsets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["services", "configmaps", "secrets", "serviceaccounts"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["networking.k8s.io"]
    resources: ["ingresses"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

This prevents the team from creating cluster-scoped resources like ClusterRoles, Namespaces, or CustomResourceDefinitions.

## Multi-Tenancy with Separate Git Sources

For complete tenant isolation, give each team its own GitRepository source:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: team-a-repo
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/myorg/team-a-config
  ref:
    branch: main
  secretRef:
    name: team-a-git-credentials
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: team-b-repo
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/myorg/team-b-config
  ref:
    branch: main
  secretRef:
    name: team-b-git-credentials
```

Then create separate Kustomizations with namespace restrictions:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-a-apps
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: team-a-repo
  path: ./apps
  prune: true
  targetNamespace: team-a
  serviceAccountName: team-a-deployer
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-b-apps
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: team-b-repo
  path: ./apps
  prune: true
  targetNamespace: team-b
  serviceAccountName: team-b-deployer
```

## Cross-Namespace References

When restricting namespaces, be aware of cross-namespace references. A Kustomization in `flux-system` referencing a service account in `team-a` requires the kustomize-controller to have permission to impersonate that service account. This is granted by default but can be restricted.

To explicitly allow impersonation:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: flux-kustomize-controller
subjects:
  - kind: ServiceAccount
    name: kustomize-controller
    namespace: flux-system
roleRef:
  kind: ClusterRole
  name: cluster-admin
  apiGroup: rbac.authorization.k8s.io
```

For tighter security, replace `cluster-admin` with a custom ClusterRole that only allows impersonation of specific service accounts.

## HelmRelease Namespace Restrictions

For HelmRelease resources, use the `targetNamespace` field:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: team-a-app
  namespace: flux-system
spec:
  interval: 10m
  chart:
    spec:
      chart: my-app
      sourceRef:
        kind: HelmRepository
        name: my-charts
  targetNamespace: team-a
  serviceAccountName: team-a-deployer
  install:
    createNamespace: false
```

Setting `createNamespace: false` ensures the HelmRelease does not attempt to create namespaces, which would require cluster-level permissions.

## Validating Namespace Restrictions

Test that restrictions are working:

```bash
# Try to deploy a resource outside the allowed namespace
# This should fail if RBAC is configured correctly

# Check what the service account can do
kubectl auth can-i --list --as=system:serviceaccount:team-a:team-a-deployer -n team-a
kubectl auth can-i create deployments --as=system:serviceaccount:team-a:team-a-deployer -n team-b
# Expected: no
```

## Troubleshooting

**Kustomization fails with forbidden error**: The service account lacks permissions. Check the Role and RoleBinding in the target namespace.

**Resources deployed to wrong namespace**: Ensure `targetNamespace` is set. Without it, resources use whatever namespace is in their manifest.

**Cross-namespace source access fails**: GitRepository and HelmRepository resources in `flux-system` are accessible to Kustomizations in the same namespace by default. Verify the source reference is correct.

Namespace restriction is a fundamental building block for multi-tenant Flux deployments. By combining `targetNamespace`, service account impersonation, and RBAC roles, you create secure boundaries that prevent tenants from interfering with each other while maintaining the benefits of a shared Flux infrastructure.
