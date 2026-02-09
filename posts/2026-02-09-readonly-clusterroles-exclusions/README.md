# How to Build Custom ClusterRoles for Read-Only Cluster-Wide Access with Specific Resource Exclusions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RBAC, Security

Description: Build custom read-only ClusterRoles with specific resource exclusions to provide safe cluster-wide visibility while protecting sensitive information like secrets and credentials.

---

Read-only access enables users to view cluster resources without modification rights, but standard view roles grant access to everything. Custom ClusterRoles with resource exclusions provide visibility into operational resources while protecting sensitive data like secrets, config containing credentials, and security policies.

## Understanding the Default View Role

Kubernetes includes a built-in view ClusterRole that grants read access to most resources.

```bash
# Examine the default view role
kubectl describe clusterrole view
```

The default view role includes access to pods, services, deployments, and configmaps but excludes secrets and role bindings. However, it may still expose more than needed for certain use cases.

## Creating a Basic Read-Only ClusterRole

Build a ClusterRole that grants read access without sensitive resources.

```yaml
# clusterrole-readonly-basic.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: readonly-basic
  labels:
    rbac.example.com/type: readonly
rules:
# Read pods but not logs (logs may contain sensitive data)
- apiGroups: [""]
  resources: ["pods", "pods/status"]
  verbs: ["get", "list", "watch"]

# Read deployments and replicasets
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets", "daemonsets", "statefulsets"]
  verbs: ["get", "list", "watch"]

# Read services and endpoints
- apiGroups: [""]
  resources: ["services", "endpoints"]
  verbs: ["get", "list", "watch"]

# Read ingress
- apiGroups: ["networking.k8s.io"]
  resources: ["ingresses"]
  verbs: ["get", "list", "watch"]

# Explicitly no access to:
# - secrets
# - configmaps (may contain credentials)
# - pods/log (may contain sensitive output)
# - pods/exec (execution access)
# - serviceaccounts (identity resources)
# - roles, rolebindings (RBAC resources)
```

## Excluding Sensitive ConfigMaps

Some ConfigMaps contain credentials or sensitive configuration. Grant access to most ConfigMaps while excluding specific ones.

```yaml
# clusterrole-readonly-configmaps.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: readonly-configmaps-filtered
rules:
# General configmap access
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list", "watch"]

# Create a separate role for sensitive configmaps (not bound to users)
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: sensitive-configmap-access
  namespace: production
rules:
# Explicitly deny (by omission) access to these configmaps
# Users won't have access unless specifically granted
- apiGroups: [""]
  resources: ["configmaps"]
  resourceNames:
    - "database-config"
    - "api-keys"
    - "oauth-credentials"
  verbs: []  # No verbs = no access
```

## Creating Resource-Specific Read Roles

Build fine-grained roles for specific resource types.

```yaml
# clusterrole-readonly-workloads.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: readonly-workloads
  labels:
    rbac.example.com/category: workloads
rules:
# Deployments
- apiGroups: ["apps"]
  resources: ["deployments", "deployments/status", "deployments/scale"]
  verbs: ["get", "list", "watch"]

# StatefulSets
- apiGroups: ["apps"]
  resources: ["statefulsets", "statefulsets/status", "statefulsets/scale"]
  verbs: ["get", "list", "watch"]

# DaemonSets
- apiGroups: ["apps"]
  resources: ["daemonsets", "daemonsets/status"]
  verbs: ["get", "list", "watch"]

# ReplicaSets
- apiGroups: ["apps"]
  resources: ["replicasets", "replicasets/status", "replicasets/scale"]
  verbs: ["get", "list", "watch"]

# Jobs and CronJobs
- apiGroups: ["batch"]
  resources: ["jobs", "jobs/status", "cronjobs", "cronjobs/status"]
  verbs: ["get", "list", "watch"]

# Pods (no exec, no logs)
- apiGroups: [""]
  resources: ["pods", "pods/status"]
  verbs: ["get", "list", "watch"]
```

## Building Network Resource Viewer Role

Grant read access to network resources without security policies.

```yaml
# clusterrole-readonly-network.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: readonly-network
  labels:
    rbac.example.com/category: network
rules:
# Services and Endpoints
- apiGroups: [""]
  resources: ["services", "services/status", "endpoints"]
  verbs: ["get", "list", "watch"]

# Ingresses
- apiGroups: ["networking.k8s.io"]
  resources: ["ingresses", "ingresses/status"]
  verbs: ["get", "list", "watch"]

# Ingress Classes
- apiGroups: ["networking.k8s.io"]
  resources: ["ingressclasses"]
  verbs: ["get", "list", "watch"]

# Network Policies - EXCLUDED for security reasons
# Users with this role cannot view network security policies
```

## Creating Monitoring-Focused Read Role

Build roles for monitoring tools that need specific access.

```yaml
# clusterrole-readonly-monitoring.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: readonly-monitoring
  labels:
    rbac.example.com/category: monitoring
rules:
# Nodes (for metrics)
- apiGroups: [""]
  resources: ["nodes", "nodes/status", "nodes/metrics"]
  verbs: ["get", "list"]

# Pods (for metrics scraping)
- apiGroups: [""]
  resources: ["pods", "pods/status"]
  verbs: ["get", "list"]

# Metrics APIs
- apiGroups: ["metrics.k8s.io"]
  resources: ["pods", "nodes"]
  verbs: ["get", "list"]

# Resource metrics
- apiGroups: [""]
  resources: ["limitranges", "resourcequotas"]
  verbs: ["get", "list"]

# Namespaces
- apiGroups: [""]
  resources: ["namespaces", "namespaces/status"]
  verbs: ["get", "list"]

# Deployments for status
- apiGroups: ["apps"]
  resources: ["deployments", "daemonsets", "statefulsets"]
  verbs: ["get", "list"]

# No access to logs, exec, or configuration
```

## Excluding RBAC and Security Resources

Prevent viewing of security-sensitive resources.

```yaml
# clusterrole-readonly-no-rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: readonly-no-security
rules:
# Standard workload access
- apiGroups: ["apps"]
  resources: ["deployments", "statefulsets", "daemonsets"]
  verbs: ["get", "list", "watch"]

# Pods
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]

# Services
- apiGroups: [""]
  resources: ["services"]
  verbs: ["get", "list", "watch"]

# Explicitly excluded (by omission):
# - roles, clusterroles (RBAC configuration)
# - rolebindings, clusterrolebindings (RBAC bindings)
# - secrets (sensitive data)
# - serviceaccounts (identity)
# - certificatesigningrequests (PKI)
# - podsecuritypolicies (security policies)
# - networkpolicies (network security)
```

## Implementing Namespace-Filtered Read Access

Create read access with namespace restrictions.

```yaml
# clusterrole-readonly-filtered.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: readonly-non-system
rules:
# Can read cluster-scoped resources
- apiGroups: [""]
  resources: ["namespaces", "nodes"]
  verbs: ["get", "list"]

# Can read namespaced resources
- apiGroups: ["apps", ""]
  resources: ["deployments", "pods", "services"]
  verbs: ["get", "list", "watch"]
---
# Use with RoleBinding to exclude system namespaces
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: readonly-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: readonly-non-system
subjects:
- kind: Group
  name: "developers"
  apiGroup: rbac.authorization.k8s.io
```

Users can view resources but you can exclude system namespaces using additional RBAC rules or admission controllers.

## Building Composite Read-Only Role

Combine multiple read-only access patterns.

```yaml
# clusterrole-readonly-composite.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: readonly-composite
aggregationRule:
  clusterRoleSelectors:
  - matchLabels:
      rbac.example.com/aggregate-to-readonly: "true"
rules: []
---
# Workload viewing
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: readonly-workloads-component
  labels:
    rbac.example.com/aggregate-to-readonly: "true"
rules:
- apiGroups: ["apps"]
  resources: ["deployments", "statefulsets", "daemonsets"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
---
# Network viewing
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: readonly-network-component
  labels:
    rbac.example.com/aggregate-to-readonly: "true"
rules:
- apiGroups: [""]
  resources: ["services", "endpoints"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["networking.k8s.io"]
  resources: ["ingresses"]
  verbs: ["get", "list", "watch"]
---
# Storage viewing
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: readonly-storage-component
  labels:
    rbac.example.com/aggregate-to-readonly: "true"
rules:
- apiGroups: [""]
  resources: ["persistentvolumes", "persistentvolumeclaims"]
  verbs: ["get", "list", "watch"]
```

## Testing Read-Only Access

Verify the role grants appropriate access.

```bash
# Test pod access
kubectl auth can-i get pods --as=system:serviceaccount:default:readonly-user
# yes

# Test secret access (should be denied)
kubectl auth can-i get secrets --as=system:serviceaccount:default:readonly-user
# no

# Test pod logs (should be denied)
kubectl auth can-i get pods/log --as=system:serviceaccount:default:readonly-user
# no

# Test pod exec (should be denied)
kubectl auth can-i create pods/exec --as=system:serviceaccount:default:readonly-user
# no

# List all allowed operations
kubectl auth can-i --list --as=system:serviceaccount:default:readonly-user
```

## Documenting Exclusions

Document why resources are excluded.

```yaml
# clusterrole-readonly-documented.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: readonly-secure
  annotations:
    description: "Read-only cluster access with security exclusions"
    excluded-resources: "secrets, serviceaccounts, roles, rolebindings"
    exclusion-reason: "Prevents exposure of credentials and RBAC configuration"
    use-case: "Monitoring, debugging, and operational visibility"
rules:
- apiGroups: ["apps"]
  resources: ["deployments", "statefulsets", "daemonsets"]
  verbs: ["get", "list", "watch"]

- apiGroups: [""]
  resources: ["pods", "services"]
  verbs: ["get", "list", "watch"]

# Exclusions (documented via omission):
# - secrets: Contains credentials and TLS certificates
# - configmaps: May contain API keys and connection strings
# - serviceaccounts: Identity resources
# - roles/rolebindings: RBAC configuration
# - pods/log: May contain sensitive application output
# - pods/exec: Would allow code execution
```

Custom read-only ClusterRoles with resource exclusions provide safe operational visibility. Grant access to workloads, services, and deployments while excluding secrets, RBAC resources, and execution capabilities. Use aggregation to compose modular roles and document exclusions to help future administrators understand security decisions.
