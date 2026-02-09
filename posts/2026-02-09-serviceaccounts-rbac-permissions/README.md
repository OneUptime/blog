# How to Use ServiceAccounts with RBAC for Fine-Grained Permissions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RBAC, Security

Description: Master Kubernetes RBAC with ServiceAccounts to implement fine-grained access control through roles, bindings, and least privilege principles.

---

ServiceAccounts provide identity, but without RBAC (Role-Based Access Control), they have no permissions. Combining ServiceAccounts with RBAC creates a powerful security model that lets you grant exactly the permissions each workload needs, following the principle of least privilege.

## Understanding the ServiceAccount and RBAC Relationship

A ServiceAccount by itself is just an identity. When a pod authenticates with a ServiceAccount token, the API server knows who the requester is, but not what they're allowed to do. RBAC provides the authorization layer.

RBAC uses four main resources: Roles define sets of permissions within a namespace. ClusterRoles define permissions cluster-wide or for cluster-scoped resources. RoleBindings grant Role permissions to subjects (including ServiceAccounts) within a namespace. ClusterRoleBindings grant ClusterRole permissions cluster-wide.

The workflow is straightforward: create a ServiceAccount, define what permissions it needs through a Role or ClusterRole, then bind those permissions to the ServiceAccount with a RoleBinding or ClusterRoleBinding.

## Creating a ServiceAccount with Read-Only Permissions

Start with a common pattern - a ServiceAccount that can read pods:

```yaml
# readonly-serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: pod-reader
  namespace: production
---
# Define permissions
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader-role
  namespace: production
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
---
# Bind permissions to the ServiceAccount
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: pod-reader-binding
  namespace: production
subjects:
- kind: ServiceAccount
  name: pod-reader
  namespace: production
roleRef:
  kind: Role
  name: pod-reader-role
  apiGroup: rbac.authorization.k8s.io
```

Apply this configuration:

```bash
kubectl apply -f readonly-serviceaccount.yaml

# Verify the setup
kubectl get serviceaccount pod-reader -n production
kubectl get role pod-reader-role -n production
kubectl get rolebinding pod-reader-binding -n production
```

Now any pod using the pod-reader ServiceAccount can list and watch pods in the production namespace, but cannot modify them or access other resources.

## Granting Specific Resource Permissions

Different workloads need different permissions. Here's a ServiceAccount for a deployment controller:

```yaml
# deployment-manager-sa.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: deployment-manager
  namespace: production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployment-manager-role
  namespace: production
rules:
# Permission to manage deployments
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
# Permission to manage replica sets (created by deployments)
- apiGroups: ["apps"]
  resources: ["replicasets"]
  verbs: ["get", "list", "watch"]
# Permission to manage pods
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: deployment-manager-binding
  namespace: production
subjects:
- kind: ServiceAccount
  name: deployment-manager
  namespace: production
roleRef:
  kind: Role
  name: deployment-manager-role
  apiGroup: rbac.authorization.k8s.io
```

This ServiceAccount can fully manage deployments while only having read access to the related resources.

## Implementing Least Privilege with Resource Names

Sometimes you need to grant access to specific resources, not all resources of a type:

```yaml
# specific-config-reader.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-config-reader
  namespace: production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: specific-config-role
  namespace: production
rules:
# Only access to specific configmaps
- apiGroups: [""]
  resources: ["configmaps"]
  resourceNames: ["app-config", "app-secrets-config"]
  verbs: ["get"]
# Only access to a specific secret
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["app-credentials"]
  verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: specific-config-binding
  namespace: production
subjects:
- kind: ServiceAccount
  name: app-config-reader
  namespace: production
roleRef:
  kind: Role
  name: specific-config-role
  apiGroup: rbac.authorization.k8s.io
```

This ServiceAccount can only read two specific ConfigMaps and one specific Secret, nothing else. This follows least privilege perfectly.

## Using ClusterRoles for Cross-Namespace Access

When a ServiceAccount needs to access resources across namespaces, use ClusterRoles:

```yaml
# multi-namespace-reader.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cluster-pod-reader
  namespace: monitoring
---
# ClusterRole for reading pods in all namespaces
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cluster-pod-reader-role
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["namespaces"]
  verbs: ["get", "list"]
---
# ClusterRoleBinding grants cluster-wide permissions
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cluster-pod-reader-binding
subjects:
- kind: ServiceAccount
  name: cluster-pod-reader
  namespace: monitoring
roleRef:
  kind: ClusterRole
  name: cluster-pod-reader-role
  apiGroup: rbac.authorization.k8s.io
```

This monitoring ServiceAccount can read pods across all namespaces, useful for monitoring and observability tools.

## Creating ServiceAccounts for CI/CD Pipelines

CI/CD pipelines often need specific permissions for deployments:

```yaml
# cicd-serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cicd-deployer
  namespace: production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: cicd-deployer-role
  namespace: production
rules:
# Deployment permissions
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "create", "update", "patch"]
# Service permissions
- apiGroups: [""]
  resources: ["services"]
  verbs: ["get", "list", "create", "update", "patch"]
# ConfigMap permissions
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list", "create", "update", "patch"]
# Permission to check rollout status
- apiGroups: ["apps"]
  resources: ["deployments/status"]
  verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cicd-deployer-binding
  namespace: production
subjects:
- kind: ServiceAccount
  name: cicd-deployer
  namespace: production
roleRef:
  kind: Role
  name: cicd-deployer-role
  apiGroup: rbac.authorization.k8s.io
```

This ServiceAccount can deploy and update applications but cannot delete resources, providing a safe CI/CD permission boundary.

## Testing ServiceAccount Permissions

Verify that permissions work as expected using kubectl auth can-i:

```bash
# Test if the ServiceAccount can list pods
kubectl auth can-i list pods \
  --as=system:serviceaccount:production:pod-reader \
  -n production

# Test if it can delete pods (should be "no")
kubectl auth can-i delete pods \
  --as=system:serviceaccount:production:pod-reader \
  -n production

# Test access to a specific resource
kubectl auth can-i get configmap/app-config \
  --as=system:serviceaccount:production:app-config-reader \
  -n production

# List all permissions for a ServiceAccount
kubectl auth can-i --list \
  --as=system:serviceaccount:production:deployment-manager \
  -n production
```

These commands help you verify RBAC configuration before deploying applications.

## Creating a ServiceAccount for Log Reading

Here's a practical example for a log aggregation system:

```yaml
# log-reader-sa.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: log-reader
  namespace: logging
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: log-reader-role
rules:
# Read pods to discover log sources
- apiGroups: [""]
  resources: ["pods", "pods/log"]
  verbs: ["get", "list"]
# Read namespaces to organize logs
- apiGroups: [""]
  resources: ["namespaces"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: log-reader-binding
subjects:
- kind: ServiceAccount
  name: log-reader
  namespace: logging
roleRef:
  kind: ClusterRole
  name: log-reader-role
  apiGroup: rbac.authorization.k8s.io
```

The `pods/log` resource permission allows reading pod logs through the API.

## Implementing Verb-Level Access Control

Different verbs provide different levels of access. Understand what each allows:

```yaml
# verb-examples.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: verb-examples
  namespace: production
rules:
# Read-only access
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list", "watch"]

# Modification without deletion
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "create", "update", "patch"]

# Full access including deletion
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# Special verb: deletecollection allows deleting multiple resources
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["deletecollection"]
```

Choose verbs carefully based on actual needs. Avoid granting "delete" unless necessary.

## Aggregating Roles with AggregationRules

For complex permissions, aggregate multiple roles:

```yaml
# aggregated-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: application-operator
aggregationRule:
  clusterRoleSelectors:
  - matchLabels:
      rbac.example.com/aggregate-to-app-operator: "true"
rules: []  # Rules are automatically filled from aggregated roles
---
# First component role
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: app-deployment-manager
  labels:
    rbac.example.com/aggregate-to-app-operator: "true"
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["*"]
---
# Second component role
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: app-service-manager
  labels:
    rbac.example.com/aggregate-to-app-operator: "true"
rules:
- apiGroups: [""]
  resources: ["services"]
  verbs: ["*"]
```

The application-operator role automatically includes permissions from all roles with the matching label.

## Troubleshooting RBAC Issues

When permissions don't work as expected:

```bash
# Check if a RoleBinding exists
kubectl get rolebinding -n production | grep pod-reader

# Describe the RoleBinding to see details
kubectl describe rolebinding pod-reader-binding -n production

# View the Role to verify permissions
kubectl get role pod-reader-role -n production -o yaml

# Check from the ServiceAccount's perspective
kubectl auth can-i list pods \
  --as=system:serviceaccount:production:pod-reader

# View API server audit logs for permission denials
kubectl logs -n kube-system -l component=kube-apiserver | grep -i forbidden
```

Common issues include incorrect namespace in bindings, typos in ServiceAccount names, or missing verbs in Role rules.

## Conclusion

ServiceAccounts combined with RBAC provide fine-grained access control for Kubernetes workloads. By creating dedicated ServiceAccounts for each component, defining minimal necessary permissions through Roles, and binding them appropriately, you implement robust security that follows least privilege. Test permissions before deployment, use specific resource names when possible, and prefer namespace-scoped Roles over ClusterRoles unless cross-namespace access is truly needed.
