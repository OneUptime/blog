# How to Set Up Kubernetes RBAC Alongside Portainer RBAC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, RBAC, Security, Access Control, Multi-Tenant

Description: Configure Kubernetes Role-Based Access Control in conjunction with Portainer's access control system to create a layered, least-privilege security model for multi-team Kubernetes clusters.

---

Portainer Business Edition provides its own RBAC layer (environments, teams, roles) that controls what users can do within the Portainer interface. But when Portainer connects to a Kubernetes cluster, it also uses Kubernetes RBAC for the operations it performs on the cluster. Aligning both RBAC systems gives you defense-in-depth: unauthorized actions are blocked at both the Portainer level and the Kubernetes API level.

## Two Layers of Access Control

```mermaid
graph LR
    User[Developer] --> Portainer[Portainer RBAC]
    Portainer -->|Kubernetes API| K8sRBAC[Kubernetes RBAC]
    K8sRBAC --> Namespace[Namespace Resources]
```

- **Portainer RBAC**: Controls what the user sees and can trigger in Portainer (deploy stacks, view logs, manage images)
- **Kubernetes RBAC**: Controls what Kubernetes identities and role bindings can actually do on the cluster

## Step 1: Create a Namespace per Team

In Portainer or via manifest:

```yaml
# namespaces.yaml

apiVersion: v1
kind: Namespace
metadata:
  name: team-backend
---
apiVersion: v1
kind: Namespace
metadata:
  name: team-frontend
```

## Step 2: Create Kubernetes Roles per Team

Define what operations are allowed per namespace:

```yaml
# backend-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: backend-developer
  namespace: team-backend
rules:
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get"]
  - apiGroups: [""]
    resources: ["pods/exec"]
    verbs: ["create"]
  - apiGroups: [""]
    resources: ["services", "configmaps"]
    verbs: ["get", "list", "create", "update"]
  # Secrets - read only, no create/update from developers
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "list"]
```

## Step 3: Bind Roles to Service Accounts

Create service accounts for any direct, namespace-scoped cluster access you want to pair with Portainer:

```yaml
# backend-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: backend-team-sa
  namespace: team-backend
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: backend-developer-binding
  namespace: team-backend
subjects:
  - kind: ServiceAccount
    name: backend-team-sa
    namespace: team-backend
roleRef:
  kind: Role
  name: backend-developer
  apiGroup: rbac.authorization.k8s.io
```

## Step 4: Configure Portainer Access for Each Team

In Portainer, add the Kubernetes cluster as an environment, then grant team access inside Portainer rather than creating a duplicate environment per team. If you use kubeconfig import, note that it is a legacy option and the kubeconfig must have cluster-admin credentials so Portainer can deploy the agent. For namespace-scoped access inside Portainer, use a standard managed environment with Portainer's Kubernetes RBAC policy support to assign users or teams to specific namespaces.

## Step 5: Portainer Team Access Mapping

| Portainer Role | Kubernetes Role | Scope |
|---|---|---|
| Environment Administrator | `cluster-admin` | Entire environment / cluster |
| Standard User | `portainer-basic` + `portainer-edit`, `portainer-view` | Only assigned namespaces |
| Read-Only User | `portainer-basic` + `portainer-view` | Only assigned namespaces |

Set team access in Portainer under **Environment-related > Environments > Manage access**. If you want namespace-scoped assignments through a policy, use **Environment-related > Policies > Create policy** and select **Kubernetes > RBAC**.

## Step 6: Audit Kubernetes RBAC

Periodically review role bindings with `kubectl` from an admin workstation:

```bash
# Who has access to what in each namespace?
kubectl get rolebindings -n team-backend
kubectl auth can-i create deployments.apps --as=system:serviceaccount:team-backend:backend-team-sa -n team-backend
```

## Summary

Running Kubernetes RBAC alongside Portainer RBAC creates a two-layer defense that prevents unauthorized actions even if Portainer's own access controls are misconfigured. Namespace-scoped service accounts for direct cluster access, granular role definitions, and Portainer namespace-scoped access combine to give each team exactly the access they need - nothing more.
