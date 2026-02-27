# How to Handle Cluster RBAC When Adding to ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, RBAC, Security

Description: Learn how to configure proper Kubernetes RBAC when adding clusters to ArgoCD, covering least-privilege roles, namespace-scoped access, custom ClusterRoles.

---

When you add a cluster to ArgoCD, you give ArgoCD a set of permissions in that cluster. By default, the `argocd cluster add` command creates a service account with `cluster-admin` privileges, which is fine for development but inappropriate for production. Getting the RBAC right is essential for security compliance, audit requirements, and the principle of least privilege.

In this guide, I will show you how to configure RBAC that gives ArgoCD exactly the permissions it needs and nothing more.

## Default Permissions: What argocd cluster add Creates

When you run `argocd cluster add`, it creates:

```yaml
# ServiceAccount in the remote cluster
apiVersion: v1
kind: ServiceAccount
metadata:
  name: argocd-manager
  namespace: kube-system

---
# ClusterRole with FULL admin access
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: argocd-manager-role
rules:
  - apiGroups: ["*"]
    resources: ["*"]
    verbs: ["*"]
  - nonResourceURLs: ["*"]
    verbs: ["*"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: argocd-manager-role-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: argocd-manager-role
subjects:
  - kind: ServiceAccount
    name: argocd-manager
    namespace: kube-system
```

This gives ArgoCD full control over everything in the cluster. For production, we need to restrict this.

## Understanding What ArgoCD Needs

ArgoCD performs several types of operations:

1. **Read all resources** - For health checks, diff calculation, and resource tree display
2. **Write workload resources** - To create/update Deployments, Services, etc.
3. **Write configuration resources** - ConfigMaps, Secrets, etc.
4. **Write namespace** - If using the CreateNamespace sync option
5. **Write cluster-scoped resources** - If deploying CRDs, ClusterRoles, etc.

## Least-Privilege ClusterRole

Here is a ClusterRole that covers most application deployment scenarios:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: argocd-manager
rules:
  # ========================================
  # READ ACCESS - needed for health checks, diff, and UI
  # ========================================
  - apiGroups: ["*"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]

  # ========================================
  # CORE WORKLOAD RESOURCES
  # ========================================
  - apiGroups: [""]
    resources:
      - configmaps
      - endpoints
      - persistentvolumeclaims
      - pods
      - secrets
      - serviceaccounts
      - services
    verbs: ["create", "update", "patch", "delete"]

  - apiGroups: ["apps"]
    resources:
      - deployments
      - daemonsets
      - replicasets
      - statefulsets
    verbs: ["create", "update", "patch", "delete"]

  - apiGroups: ["batch"]
    resources:
      - jobs
      - cronjobs
    verbs: ["create", "update", "patch", "delete"]

  # ========================================
  # NETWORKING
  # ========================================
  - apiGroups: ["networking.k8s.io"]
    resources:
      - ingresses
      - networkpolicies
    verbs: ["create", "update", "patch", "delete"]

  - apiGroups: ["gateway.networking.k8s.io"]
    resources:
      - gateways
      - httproutes
      - grpcroutes
    verbs: ["create", "update", "patch", "delete"]

  # ========================================
  # NAMESPACE MANAGEMENT
  # ========================================
  - apiGroups: [""]
    resources:
      - namespaces
    verbs: ["create", "update", "patch"]
    # Note: no "delete" to prevent accidental namespace deletion

  # ========================================
  # AUTOSCALING
  # ========================================
  - apiGroups: ["autoscaling"]
    resources:
      - horizontalpodautoscalers
    verbs: ["create", "update", "patch", "delete"]

  - apiGroups: ["policy"]
    resources:
      - poddisruptionbudgets
    verbs: ["create", "update", "patch", "delete"]

  # ========================================
  # RBAC (if ArgoCD manages roles)
  # ========================================
  - apiGroups: ["rbac.authorization.k8s.io"]
    resources:
      - roles
      - rolebindings
    verbs: ["create", "update", "patch", "delete"]
    # Note: ClusterRoles and ClusterRoleBindings excluded for safety
```

## Namespace-Scoped Access

For maximum restriction, limit ArgoCD to specific namespaces:

```yaml
# ClusterRole for read-only cluster-wide access
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: argocd-manager-readonly
rules:
  - apiGroups: ["*"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: argocd-manager-readonly
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: argocd-manager-readonly
subjects:
  - kind: ServiceAccount
    name: argocd-manager
    namespace: kube-system

---
# Role for write access in specific namespaces
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: argocd-manager-write
  namespace: app-namespace  # Repeat for each namespace
rules:
  - apiGroups: ["*"]
    resources: ["*"]
    verbs: ["create", "update", "patch", "delete"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: argocd-manager-write
  namespace: app-namespace
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: argocd-manager-write
subjects:
  - kind: ServiceAccount
    name: argocd-manager
    namespace: kube-system
```

## Per-Team RBAC

For multi-team environments, create separate service accounts per team:

```yaml
# Team A service account - can deploy to team-a-* namespaces
apiVersion: v1
kind: ServiceAccount
metadata:
  name: argocd-team-a
  namespace: kube-system

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: argocd-team-a-readonly
rules:
  - apiGroups: ["*"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: argocd-team-a-readonly
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: argocd-team-a-readonly
subjects:
  - kind: ServiceAccount
    name: argocd-team-a
    namespace: kube-system

---
# Write access only to team-a namespaces
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: argocd-team-a-write
  namespace: team-a-apps
rules:
  - apiGroups: ["*"]
    resources: ["*"]
    verbs: ["create", "update", "patch", "delete"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: argocd-team-a-write
  namespace: team-a-apps
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: argocd-team-a-write
subjects:
  - kind: ServiceAccount
    name: argocd-team-a
    namespace: kube-system
```

Register the cluster with the team-specific service account:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: production-team-a
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: cluster
    team: team-a
type: Opaque
stringData:
  name: production-team-a
  server: "https://production.k8s.example.com"
  config: |
    {
      "bearerToken": "<team-a-service-account-token>",
      "tlsClientConfig": {
        "insecure": false,
        "caData": "<ca-data>"
      }
    }
```

## Preventing Privilege Escalation

Prevent ArgoCD from creating resources that could grant additional privileges:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: argocd-manager-no-escalation
rules:
  # Read access
  - apiGroups: ["*"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]

  # Standard workload write access
  - apiGroups: ["", "apps", "batch"]
    resources: ["*"]
    verbs: ["create", "update", "patch", "delete"]

  # EXPLICITLY DENY cluster-level RBAC changes
  # (by not including these verbs for these resources)
  # This prevents ArgoCD from:
  # - Creating ClusterRoles with elevated permissions
  # - Creating ClusterRoleBindings that grant cluster-admin
  # - Modifying the argocd-manager's own permissions
```

Additionally, use ArgoCD Project restrictions to limit what can be deployed:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: team-a
  namespace: argocd
spec:
  # Deny cluster-scoped resources
  clusterResourceBlacklist:
    - group: rbac.authorization.k8s.io
      kind: ClusterRole
    - group: rbac.authorization.k8s.io
      kind: ClusterRoleBinding
    - group: apiextensions.k8s.io
      kind: CustomResourceDefinition

  # Only allow specific namespaces
  destinations:
    - server: "https://production.k8s.example.com"
      namespace: "team-a-*"

  # Only allow specific resource types
  namespaceResourceWhitelist:
    - group: ""
      kind: ConfigMap
    - group: ""
      kind: Secret
    - group: ""
      kind: Service
    - group: apps
      kind: Deployment
    - group: networking.k8s.io
      kind: Ingress
```

## Auditing RBAC

Check what permissions ArgoCD has in a cluster:

```bash
# Check what the service account can do
kubectl auth can-i --list --as=system:serviceaccount:kube-system:argocd-manager \
  --context remote-cluster

# Check specific actions
kubectl auth can-i create deployments \
  --as=system:serviceaccount:kube-system:argocd-manager \
  --namespace=production \
  --context remote-cluster

# Check cluster-level permissions
kubectl auth can-i create clusterroles \
  --as=system:serviceaccount:kube-system:argocd-manager \
  --context remote-cluster
```

## Handling CRDs

If ArgoCD needs to manage Custom Resource Definitions (CRDs) and their instances:

```yaml
rules:
  # Allow managing specific CRDs
  - apiGroups: ["apiextensions.k8s.io"]
    resources: ["customresourcedefinitions"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
    # Note: consider restricting to specific CRD names

  # Allow managing instances of specific CRDs
  - apiGroups: ["cert-manager.io"]
    resources: ["*"]
    verbs: ["create", "update", "patch", "delete"]

  - apiGroups: ["external-secrets.io"]
    resources: ["*"]
    verbs: ["create", "update", "patch", "delete"]

  - apiGroups: ["monitoring.coreos.com"]
    resources: ["*"]
    verbs: ["create", "update", "patch", "delete"]
```

## Testing RBAC Changes

Before applying RBAC changes to production, test them:

```bash
# Create a test namespace
kubectl create namespace rbac-test --context remote-cluster

# Test creating resources as the ArgoCD service account
kubectl create deployment test-deploy \
  --image=nginx \
  --namespace=rbac-test \
  --as=system:serviceaccount:kube-system:argocd-manager \
  --context remote-cluster

# Test that restricted operations are blocked
kubectl create clusterrole test-role \
  --verb=get --resource=pods \
  --as=system:serviceaccount:kube-system:argocd-manager \
  --context remote-cluster
# Expected: forbidden

# Clean up
kubectl delete namespace rbac-test --context remote-cluster
```

## Summary

Getting RBAC right when adding clusters to ArgoCD is a balancing act between giving ArgoCD enough permissions to do its job and restricting it enough to maintain security. Start with a ClusterRole that provides read access to everything and write access to common workload resources. Use namespace-scoped RoleBindings for additional restriction. Combine Kubernetes RBAC with ArgoCD Project restrictions for defense in depth. And always audit permissions regularly to ensure they match your actual deployment needs. For the broader picture on ArgoCD RBAC, see our guide on [configuring RBAC policies in ArgoCD](https://oneuptime.com/blog/post/2026-01-25-rbac-policies-argocd/view).
