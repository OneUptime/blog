# How to Use Hierarchical Namespaces with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Hierarchical Namespaces, HNC, Multi-Tenancy, Namespace Management

Description: Learn how to use Kubernetes Hierarchical Namespace Controller (HNC) with Flux CD to create parent-child namespace relationships with inherited policies and resources.

---

The Hierarchical Namespace Controller (HNC) extends Kubernetes namespaces with parent-child relationships. Child namespaces automatically inherit resources like RBAC roles, network policies, resource quotas, and secrets from their parent. When combined with Flux CD, you can define namespace hierarchies in Git and have policies propagate automatically to all child namespaces. This approach simplifies multi-tenant and multi-environment cluster management.

## What Are Hierarchical Namespaces?

In standard Kubernetes, namespaces are flat -- there is no relationship between them. HNC introduces a tree structure where a parent namespace can have child namespaces. Resources marked for propagation in the parent are automatically copied to all children. When the parent resource changes, the copies in child namespaces are updated.

Common use cases include:

- **Multi-tenancy**: A team gets a parent namespace with shared policies; each application gets a child namespace inheriting those policies.
- **Environment isolation**: A parent namespace defines shared secrets and config; dev, staging, and production child namespaces inherit them.
- **Resource quota inheritance**: Set quotas on a parent and have them apply to all children.

## Prerequisites

- A Kubernetes cluster (v1.24 or later)
- Flux CD installed and bootstrapped
- kubectl and flux CLI tools
- Cluster-admin access

## Step 1: Install HNC with Flux

Deploy HNC using Flux-managed manifests:

```yaml
# infrastructure/hnc/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: hnc-system
```

```yaml
# infrastructure/hnc/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: hnc
  namespace: flux-system
spec:
  interval: 1h
  url: https://kubernetes-sigs.github.io/hierarchical-namespaces/charts
```

```yaml
# infrastructure/hnc/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: hnc-manager
  namespace: hnc-system
spec:
  interval: 30m
  chart:
    spec:
      chart: hnc-manager
      version: "1.1.x"
      sourceRef:
        kind: HelmRepository
        name: hnc
        namespace: flux-system
  install:
    createNamespace: true
```

Add to your infrastructure Kustomization:

```yaml
# infrastructure/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - hnc/namespace.yaml
  - hnc/helmrepository.yaml
  - hnc/helmrelease.yaml
```

## Step 2: Configure Resource Propagation

HNC uses `HNCConfiguration` to define which resource types should propagate from parent to child namespaces:

```yaml
# infrastructure/hnc/config.yaml
apiVersion: hnc.x-k8s.io/v1alpha2
kind: HNCConfiguration
metadata:
  name: config
spec:
  resources:
    - resource: secrets
      mode: Propagate
    - resource: configmaps
      mode: Propagate
    - resource: roles.rbac.authorization.k8s.io
      mode: Propagate
    - resource: rolebindings.rbac.authorization.k8s.io
      mode: Propagate
    - resource: networkpolicies.networking.k8s.io
      mode: Propagate
    - resource: resourcequotas
      mode: Propagate
    - resource: limitranges
      mode: Propagate
```

The `Propagate` mode copies resources from parent to child namespaces. Other modes include `Remove` (delete propagated copies) and `Ignore` (do not manage).

## Step 3: Create Namespace Hierarchies

Define parent and child namespaces using SubnamespaceAnchor resources:

```yaml
# tenants/team-alpha/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: team-alpha
---
# tenants/team-alpha/subnamespaces.yaml
apiVersion: hnc.x-k8s.io/v1alpha2
kind: SubnamespaceAnchor
metadata:
  name: team-alpha-dev
  namespace: team-alpha
---
apiVersion: hnc.x-k8s.io/v1alpha2
kind: SubnamespaceAnchor
metadata:
  name: team-alpha-staging
  namespace: team-alpha
---
apiVersion: hnc.x-k8s.io/v1alpha2
kind: SubnamespaceAnchor
metadata:
  name: team-alpha-prod
  namespace: team-alpha
```

This creates three child namespaces under the `team-alpha` parent. Any propagated resources in `team-alpha` will be automatically copied to all three children.

## Step 4: Define Shared Policies in the Parent

Resources in the parent namespace propagate to all children:

```yaml
# tenants/team-alpha/shared-policies.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: team-alpha-developer
  namespace: team-alpha
rules:
  - apiGroups: ["", "apps", "batch"]
    resources: ["*"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-alpha-developers
  namespace: team-alpha
subjects:
  - kind: Group
    name: team-alpha-devs
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: team-alpha-developer
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: team-alpha
spec:
  podSelector: {}
  policyTypes:
    - Ingress
---
apiVersion: v1
kind: Secret
metadata:
  name: registry-credentials
  namespace: team-alpha
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: eyJhdXRocyI6e319
```

The Role, RoleBinding, NetworkPolicy, and Secret will appear in `team-alpha-dev`, `team-alpha-staging`, and `team-alpha-prod` automatically.

## Step 5: Structure the Git Repository

Organize your Flux repository to reflect the namespace hierarchy:

```
clusters/
  my-cluster/
    flux-system/
    infrastructure.yaml
    tenants.yaml
infrastructure/
  hnc/
    helmrepository.yaml
    helmrelease.yaml
    config.yaml
tenants/
  team-alpha/
    namespace.yaml
    subnamespaces.yaml
    shared-policies.yaml
    apps/
      dev/
        kustomization.yaml
      staging/
        kustomization.yaml
      prod/
        kustomization.yaml
  team-beta/
    namespace.yaml
    subnamespaces.yaml
    shared-policies.yaml
```

Create Flux Kustomizations for each tenant:

```yaml
# clusters/my-cluster/tenants.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: tenant-team-alpha
  namespace: flux-system
spec:
  interval: 10m
  path: ./tenants/team-alpha
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: infrastructure
```

## Step 6: Deploy Applications to Child Namespaces

Deploy applications to specific child namespaces using `targetNamespace`:

```yaml
# tenants/team-alpha/apps/dev/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
namespace: team-alpha-dev
```

Applications in `team-alpha-dev` automatically inherit the RBAC roles, network policies, and image pull secrets from the `team-alpha` parent.

## Step 7: Verify the Hierarchy

After Flux reconciles, verify the hierarchy and resource propagation:

```bash
# Check the namespace hierarchy
kubectl hns tree team-alpha
# Output:
# team-alpha
# +-- team-alpha-dev
# +-- team-alpha-staging
# +-- team-alpha-prod

# Verify resource propagation
kubectl get roles -n team-alpha-dev
kubectl get networkpolicies -n team-alpha-staging
kubectl get secrets -n team-alpha-prod

# Check propagation labels
kubectl get role team-alpha-developer -n team-alpha-dev -o yaml | grep hnc
```

Propagated resources have labels indicating their origin namespace.

## Handling Propagation Exceptions

To prevent specific resources from propagating to certain children, use the `propagate.hnc.x-k8s.io/none` annotation:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: prod-only-secret
  namespace: team-alpha
  annotations:
    propagate.hnc.x-k8s.io/treeSelect: team-alpha-prod
data:
  key: dmFsdWU=
```

The `treeSelect` annotation restricts propagation to only the named child namespace.

## Summary

Hierarchical Namespaces with Flux CD provide a structured way to manage multi-tenant and multi-environment clusters. HNC handles the automatic propagation of policies, RBAC, secrets, and network policies from parent to child namespaces, while Flux ensures the namespace hierarchy and all resources are reconciled from Git. Define your hierarchy using SubnamespaceAnchor resources, place shared policies in parent namespaces, and deploy applications to child namespaces. This combination reduces duplication and ensures consistent policy enforcement across all related namespaces.
