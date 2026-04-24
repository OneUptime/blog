# How to Set Up Kubernetes RBAC Alongside Portainer RBAC - K8s

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, RBAC, Security, Access Control

Description: Configure Kubernetes native RBAC policies alongside Portainer's access control to provide layered security for cluster resources.

## Introduction

Portainer Business Edition provides team-based and namespace-scoped access for Kubernetes environments, but Kubernetes RBAC must be enabled and working for that access control to function. For production environments, it is important to understand both Portainer's role assignments and the Kubernetes permissions they map to, and to remember that some Portainer restrictions apply only in the UI.

## How Portainer and Kubernetes RBAC Interact

When Portainer manages a Kubernetes cluster:
1. Portainer installation creates a service account and ClusterRoleBinding so Portainer can access the cluster
2. Kubernetes RBAC must be enabled and working for Portainer access control
3. Portainer maps its roles to Kubernetes cluster and namespace roles, while some security settings remain UI-only

## Creating Kubernetes RBAC for Portainer Access

```yaml
# portainer-rbac.yml - deploy via Portainer

# Service account for developers
apiVersion: v1
kind: ServiceAccount
metadata:
  name: developer-sa
  namespace: development
---
# Create a namespace-scoped role for developers
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: developer-role
  namespace: development
rules:
- apiGroups: [""]
  resources: ["pods", "services", "configmaps", "persistentvolumeclaims"]
  verbs: ["get", "list", "watch", "create", "update", "patch"]
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "watch", "create", "update", "patch"]
- apiGroups: [""]
  resources: ["pods/log", "pods/exec"]
  verbs: ["get", "create"]
# No secrets or RBAC rules are granted because they are omitted
---
# Bind the role to a service account
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developer-binding
  namespace: development
subjects:
- kind: ServiceAccount
  name: developer-sa
  namespace: development
roleRef:
  kind: Role
  name: developer-role
  apiGroup: rbac.authorization.k8s.io
---
# Service account for QA/Audit
apiVersion: v1
kind: ServiceAccount
metadata:
  name: qa-sa
  namespace: default
---
# Bind QA to the built-in read-only view role.
# The built-in view ClusterRole does not allow reading Secrets.
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: qa-readonly-binding
subjects:
- kind: ServiceAccount
  name: qa-sa
  namespace: default
roleRef:
  kind: ClusterRole
  name: view
  apiGroup: rbac.authorization.k8s.io
---
# Service account for the platform team
apiVersion: v1
kind: ServiceAccount
metadata:
  name: platform-sa
  namespace: default
---
# Platform team: broad workload access without RBAC permissions
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: platform-team
rules:
- apiGroups: ["", "apps", "autoscaling", "batch", "networking.k8s.io", "policy", "storage.k8s.io"]
  resources: ["*"]
  verbs: ["*"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: platform-team-binding
subjects:
- kind: ServiceAccount
  name: platform-sa
  namespace: default
roleRef:
  kind: ClusterRole
  name: platform-team
  apiGroup: rbac.authorization.k8s.io
```

## Portainer Team to Kubernetes RBAC Mapping

```bash
# In Portainer:
# 1. Create Teams: developer-team, qa-team, platform-team
# 2. Assign namespace access after Kubernetes RBAC is enabled
# 3. Use a namespace-scoped role such as Namespace Operator when you want access limited to specific namespaces

# In Kubernetes:
# Apply the service accounts, roles, and bindings from the manifest above
kubectl apply -f portainer-rbac.yml

# Portainer itself runs in the portainer namespace and installs its own service account
kubectl get serviceaccount -n portainer

# Verify the example service accounts
kubectl get serviceaccount -n development
kubectl get serviceaccount -n default

# If a team also needs direct kubectl or API access outside Portainer,
# generate a short-lived token for that service account
kubectl create token developer-sa -n development --duration=8h
```

## Reviewing Portainer's Own Service Account

```bash
# Portainer installation creates the ServiceAccount and ClusterRoleBinding
# it needs to access the cluster. Review those objects before changing them,
# because reducing permissions may limit Portainer functionality.
kubectl get serviceaccount -n portainer
kubectl get clusterrolebinding -o wide
kubectl get clusterrole -o wide
```

## Audit RBAC Configurations

```bash
# Check effective permissions for a service account
kubectl auth can-i --list --as=system:serviceaccount:development:developer-sa -n development

# Check specific permission
kubectl auth can-i delete pods \
  --as=system:serviceaccount:development:developer-sa \
  -n development

# View all RoleBindings in a namespace
kubectl get rolebindings -n development -o wide
```

## Conclusion

Using Portainer with Kubernetes RBAC provides clearer and safer access control for cluster resources. Portainer manages users, teams, and namespace access in the UI, while Kubernetes RBAC remains the authoritative control at the API layer. This works best when you keep Kubernetes roles narrowly scoped, use built-in roles such as `view` where appropriate, and remember that UI-only restrictions do not replace Kubernetes RBAC.
