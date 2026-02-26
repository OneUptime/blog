# How to Deploy ServiceAccounts and ClusterRoles with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, RBAC, ServiceAccounts

Description: Learn how to deploy ServiceAccounts, Roles, ClusterRoles, and RoleBindings with ArgoCD for secure identity management and least-privilege access control.

---

ServiceAccounts and RBAC resources (Roles, ClusterRoles, RoleBindings, ClusterRoleBindings) control who can do what in your Kubernetes cluster. Every pod runs as a ServiceAccount, and every ServiceAccount has permissions defined by RBAC rules. Managing these through ArgoCD ensures your access control is declarative, auditable, and consistently applied.

## Why RBAC in GitOps Matters

RBAC configuration is often the most security-sensitive part of your cluster. When managed through ArgoCD:

- Every permission change goes through code review
- You have a complete Git history of who had what access and when
- Self-healing prevents unauthorized permission escalation
- Rollback is a Git revert away

## ServiceAccount Basics

Every pod runs as a ServiceAccount. If you do not specify one, it uses the `default` ServiceAccount, which may have more permissions than you want:

```yaml
# apps/myapp/serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp
  namespace: production
  labels:
    app: myapp
# Disable automatic token mounting for security
automountServiceAccountToken: false
```

Reference it in your Deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      serviceAccountName: myapp
      automountServiceAccountToken: false  # Unless the app needs API access
      containers:
        - name: myapp
          image: myapp:1.0.0
```

Setting `automountServiceAccountToken: false` is a security best practice. Only mount the token if your application actually needs to talk to the Kubernetes API.

## Namespace-Scoped Roles

Roles define permissions within a single namespace. Use them for application-specific access:

```yaml
# apps/myapp/role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: myapp-role
  namespace: production
rules:
  # Read ConfigMaps and Secrets for configuration
  - apiGroups: [""]
    resources: ["configmaps", "secrets"]
    verbs: ["get", "list", "watch"]

  # Manage pods for health checking
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]

  # Read services for service discovery
  - apiGroups: [""]
    resources: ["services", "endpoints"]
    verbs: ["get", "list", "watch"]
---
# apps/myapp/rolebinding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: myapp-binding
  namespace: production
subjects:
  - kind: ServiceAccount
    name: myapp
    namespace: production
roleRef:
  kind: Role
  name: myapp-role
  apiGroup: rbac.authorization.k8s.io
```

## Cluster-Scoped Roles

ClusterRoles define permissions across all namespaces. Use them for infrastructure components:

```yaml
# platform/rbac/monitoring-clusterrole.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: prometheus-scraper
rules:
  # Read pods and services across all namespaces for scraping
  - apiGroups: [""]
    resources: ["pods", "services", "endpoints", "nodes"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["nodes/metrics"]
    verbs: ["get"]
  # Read custom metrics
  - apiGroups: ["metrics.k8s.io"]
    resources: ["pods", "nodes"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: prometheus-scraper-binding
subjects:
  - kind: ServiceAccount
    name: prometheus
    namespace: monitoring
roleRef:
  kind: ClusterRole
  name: prometheus-scraper
  apiGroup: rbac.authorization.k8s.io
```

## ArgoCD Application for RBAC

Organize RBAC resources as a platform concern:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cluster-rbac
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/gitops
    targetRevision: main
    path: platform/rbac
  destination:
    server: https://kubernetes.default.svc
  syncPolicy:
    automated:
      prune: true       # Remove revoked permissions
      selfHeal: true     # Revert unauthorized changes
```

Application-specific RBAC should live with the application:

```
apps/
  myapp/
    deployment.yaml
    service.yaml
    serviceaccount.yaml
    role.yaml
    rolebinding.yaml
```

## Sync Waves for RBAC

RBAC resources must exist before the pods that use them:

```yaml
# Wave -3: ServiceAccount
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp
  annotations:
    argocd.argoproj.io/sync-wave: "-3"

---
# Wave -2: Role
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: myapp-role
  annotations:
    argocd.argoproj.io/sync-wave: "-2"

---
# Wave -2: RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: myapp-binding
  annotations:
    argocd.argoproj.io/sync-wave: "-2"

---
# Wave 0: Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  annotations:
    argocd.argoproj.io/sync-wave: "0"
```

## Common RBAC Patterns for Applications

### Leader Election

Applications that use leader election need permission to create and update leases:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: leader-election
  namespace: production
rules:
  - apiGroups: ["coordination.k8s.io"]
    resources: ["leases"]
    verbs: ["get", "create", "update", "patch"]
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["create", "patch"]
```

### Operator Permissions

Operators need broader permissions to manage the resources they control:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: my-operator
rules:
  # Manage the operator's CRDs
  - apiGroups: ["myorg.io"]
    resources: ["myresources", "myresources/status"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

  # Manage child resources
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

  - apiGroups: [""]
    resources: ["services", "configmaps", "secrets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

  # Read events
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["create", "patch"]
```

### CI/CD Pipeline ServiceAccount

A ServiceAccount for CI/CD tools that need to deploy:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ci-deployer
  namespace: cicd
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: ci-deployer-role
rules:
  # Deploy to specific namespaces
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets", "daemonsets"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  - apiGroups: [""]
    resources: ["services", "configmaps"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  # Read only for cluster info
  - apiGroups: [""]
    resources: ["namespaces", "nodes"]
    verbs: ["get", "list", "watch"]
---
# Bind to specific namespaces only
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ci-deployer-production
  namespace: production
subjects:
  - kind: ServiceAccount
    name: ci-deployer
    namespace: cicd
roleRef:
  kind: ClusterRole
  name: ci-deployer-role
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ci-deployer-staging
  namespace: staging
subjects:
  - kind: ServiceAccount
    name: ci-deployer
    namespace: cicd
roleRef:
  kind: ClusterRole
  name: ci-deployer-role
  apiGroup: rbac.authorization.k8s.io
```

## ServiceAccount Token for External Access

For external systems that need cluster access, create a long-lived token:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ci-deployer-token
  namespace: cicd
  annotations:
    kubernetes.io/service-account.name: ci-deployer
type: kubernetes.io/service-account-token
```

In Kubernetes 1.24+, tokens are no longer auto-created. You must explicitly create a Secret for long-lived tokens.

## Cloud Provider IAM Integration

Map Kubernetes ServiceAccounts to cloud IAM roles:

### AWS (IRSA)

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp
  namespace: production
  annotations:
    # Map to AWS IAM role
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789:role/myapp-role
```

### GCP (Workload Identity)

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp
  namespace: production
  annotations:
    # Map to GCP service account
    iam.gke.io/gcp-service-account: myapp@my-project.iam.gserviceaccount.com
```

### Azure (Workload Identity)

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp
  namespace: production
  annotations:
    azure.workload.identity/client-id: "12345678-1234-1234-1234-123456789012"
  labels:
    azure.workload.identity/use: "true"
```

## Auditing RBAC Through ArgoCD

ArgoCD's self-heal feature acts as a continuous audit mechanism. Any manual RBAC change is automatically reverted and logged:

```bash
# Check ArgoCD events for RBAC drift
argocd app get cluster-rbac --show-operation

# View sync history
argocd app history cluster-rbac
```

## Least Privilege Verification

Before deploying, verify your RBAC follows least privilege:

```bash
# Check what a ServiceAccount can do
kubectl auth can-i --list --as=system:serviceaccount:production:myapp -n production

# Test specific permissions
kubectl auth can-i get pods --as=system:serviceaccount:production:myapp -n production
kubectl auth can-i delete deployments --as=system:serviceaccount:production:myapp -n production
```

## Protecting Critical RBAC Resources

Prevent accidental deletion of critical RBAC resources:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cluster-admin-custom
  annotations:
    argocd.argoproj.io/sync-options: Prune=false
```

## Summary

ServiceAccounts and RBAC resources managed through ArgoCD provide declarative, auditable access control for your Kubernetes cluster. Every permission is defined in Git, every change goes through review, and ArgoCD's self-healing prevents unauthorized privilege escalation. Use namespace-scoped Roles for application permissions, ClusterRoles for infrastructure components, and always follow the principle of least privilege. Pair ServiceAccounts with cloud IAM integration for secure access to cloud resources without static credentials.
