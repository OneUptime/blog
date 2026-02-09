# How to Troubleshoot Kubernetes RBAC Permission Denied Errors for Service Accounts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RBAC, Security

Description: Learn how to diagnose and fix RBAC permission denied errors for service accounts with practical debugging techniques and role configuration examples.

---

RBAC permission denied errors frustrate developers and block automation workflows. When service accounts can't access required resources, applications fail with cryptic forbidden messages. Understanding how to diagnose and fix RBAC issues quickly restores functionality and maintains security.

## Understanding RBAC Components

Kubernetes RBAC consists of four resource types: Role, ClusterRole, RoleBinding, and ClusterRoleBinding. Roles define permissions, while bindings grant those permissions to users or service accounts.

Roles are namespace-scoped, affecting resources in a single namespace. ClusterRoles work cluster-wide or across namespaces. RoleBindings attach roles to subjects within a namespace, while ClusterRoleBindings work cluster-wide.

## Identifying Permission Errors

RBAC errors clearly indicate the missing permission.

```bash
# Common error format
Error from server (Forbidden): pods is forbidden:
User "system:serviceaccount:production:app-sa" cannot list resource "pods"
in API group "" in the namespace "production"

# Test permissions directly
kubectl auth can-i list pods --as=system:serviceaccount:production:app-sa -n production

# Check all permissions for a service account
kubectl auth can-i --list --as=system:serviceaccount:production:app-sa -n production
```

The error message tells you exactly what permission is missing and for which service account.

## Checking Existing Role Bindings

Find which roles are bound to your service account.

```bash
# List all rolebindings in namespace
kubectl get rolebindings -n production

# Find bindings for specific service account
kubectl get rolebindings -n production -o json | \
  jq -r '.items[] | select(.subjects[]?.name=="app-sa") | .metadata.name'

# Check cluster-wide bindings
kubectl get clusterrolebindings -o json | \
  jq -r '.items[] | select(.subjects[]?.name=="app-sa") | .metadata.name'

# Describe specific binding
kubectl describe rolebinding app-sa-binding -n production
```

This shows what permissions the service account currently has.

## Example: Basic Role and RoleBinding

Create a Role with appropriate permissions and bind it to a service account.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-reader
  namespace: production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: production
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["pods/log"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: app-reader-binding
  namespace: production
subjects:
- kind: ServiceAccount
  name: app-reader
  namespace: production
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

This grants the app-reader service account read-only access to pods and logs.

## Granting Multiple Resource Types

Applications often need access to multiple resource types.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: app-manager
  namespace: production
rules:
# Access to pods
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch", "create", "delete"]
# Access to services
- apiGroups: [""]
  resources: ["services"]
  verbs: ["get", "list", "watch"]
# Access to configmaps
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list", "watch", "update"]
# Access to deployments
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch", "update", "patch"]
```

Group related permissions logically for easier maintenance.

## ClusterRole for Cross-Namespace Access

When service accounts need access to resources across namespaces, use ClusterRole.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: namespace-reader
rules:
- apiGroups: [""]
  resources: ["namespaces"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: monitoring-namespace-reader
subjects:
- kind: ServiceAccount
  name: monitoring-sa
  namespace: monitoring
roleRef:
  kind: ClusterRole
  name: namespace-reader
  apiGroup: rbac.authorization.k8s.io
```

This allows the monitoring service account to read pods and namespaces cluster-wide.

## Using Built-in ClusterRoles

Kubernetes includes several built-in ClusterRoles for common permissions.

```bash
# List built-in ClusterRoles
kubectl get clusterroles | grep "^system:"

# View cluster-admin permissions
kubectl describe clusterrole cluster-admin

# View edit role permissions
kubectl describe clusterrole edit

# View view role permissions
kubectl describe clusterrole view
```

Bind service accounts to built-in roles instead of creating custom roles.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: app-editor
  namespace: production
subjects:
- kind: ServiceAccount
  name: deployment-manager
  namespace: production
roleRef:
  kind: ClusterRole
  name: edit  # Built-in edit role
  apiGroup: rbac.authorization.k8s.io
```

## Resource Names for Specific Permissions

Grant access to specific resources by name for fine-grained control.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: specific-config-reader
  namespace: production
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  resourceNames: ["app-config", "database-config"]
  verbs: ["get", "list"]
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["app-secret"]
  verbs: ["get"]
```

This limits access to only the specified ConfigMaps and Secrets.

## Debugging Permission Issues

Use kubectl auth to test permissions before applying roles.

```bash
# Test if service account can perform action
kubectl auth can-i create deployments \
  --as=system:serviceaccount:production:app-sa \
  -n production

# Test specific resource name
kubectl auth can-i get configmap/app-config \
  --as=system:serviceaccount:production:app-sa \
  -n production

# Get detailed reasoning
kubectl auth can-i create pods \
  --as=system:serviceaccount:production:app-sa \
  -n production -v=8
```

Verbose output shows which RBAC rules are evaluated.

## Common Permission Patterns

Here are role patterns for common use cases.

```yaml
# Pattern 1: Read-only monitoring access
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: monitoring-reader
rules:
- apiGroups: [""]
  resources: ["pods", "services", "endpoints", "nodes"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets", "statefulsets"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["batch"]
  resources: ["jobs", "cronjobs"]
  verbs: ["get", "list", "watch"]

---
# Pattern 2: Deployment operator
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployment-operator
  namespace: production
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["pods/log"]
  verbs: ["get", "list"]

---
# Pattern 3: Secret manager
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: secret-manager
  namespace: production
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "list", "watch", "create", "update", "patch"]
```

## Wildcard Permissions

Use wildcards carefully for broad permissions.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: namespace-admin
  namespace: production
rules:
# All resources in core API group
- apiGroups: [""]
  resources: ["*"]
  verbs: ["*"]
# All resources in apps API group
- apiGroups: ["apps"]
  resources: ["*"]
  verbs: ["*"]
# All resources in batch API group
- apiGroups: ["batch"]
  resources: ["*"]
  verbs: ["*"]
```

Wildcards grant broad access and should be limited to admin roles.

## Aggregated ClusterRoles

Create composable roles using aggregation.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: aggregate-read-write
  labels:
    rbac.example.com/aggregate-to-monitoring: "true"
aggregationRule:
  clusterRoleSelectors:
  - matchLabels:
      rbac.example.com/aggregate-to-monitoring: "true"
rules: []  # Automatically filled by aggregation
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: pod-reader
  labels:
    rbac.example.com/aggregate-to-monitoring: "true"
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: service-reader
  labels:
    rbac.example.com/aggregate-to-monitoring: "true"
rules:
- apiGroups: [""]
  resources: ["services"]
  verbs: ["get", "list", "watch"]
```

The aggregate role automatically includes all rules from roles with matching labels.

## Troubleshooting Binding Issues

Sometimes roles exist but bindings are incorrect.

```bash
# Check if role exists
kubectl get role pod-reader -n production

# Check if service account exists
kubectl get serviceaccount app-sa -n production

# Verify binding references correct role and subject
kubectl get rolebinding app-sa-binding -n production -o yaml

# Look for typos in names or namespaces
kubectl describe rolebinding app-sa-binding -n production
```

Mismatched names or namespaces prevent bindings from working.

## Permissions for Custom Resources

Grant access to custom resources created by CRDs.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: custom-resource-manager
  namespace: production
rules:
# Standard Kubernetes resources
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get", "list", "watch"]
# Custom resources
- apiGroups: ["myapp.example.com"]
  resources: ["myresources"]
  verbs: ["get", "list", "watch", "create", "update", "delete"]
- apiGroups: ["myapp.example.com"]
  resources: ["myresources/status"]
  verbs: ["get", "update", "patch"]
```

Include the correct API group for your custom resources.

## Escalation Prevention

RBAC includes escalation prevention. Users can't grant permissions they don't have.

```bash
# This fails if you don't have permission to create cluster-admin bindings
kubectl create clusterrolebinding test \
  --clusterrole=cluster-admin \
  --serviceaccount=default:test-sa

Error from server (Forbidden): clusterrolebindings.rbac.authorization.k8s.io is forbidden:
User "your-user" cannot bind ClusterRole "cluster-admin"
```

Only cluster-admin users can grant cluster-admin permissions.

## Auditing RBAC Changes

Track who creates or modifies RBAC resources.

```bash
# Enable audit logging in API server
# --audit-log-path=/var/log/kubernetes/audit.log
# --audit-policy-file=/etc/kubernetes/audit-policy.yaml

# Sample audit policy for RBAC
cat > audit-policy.yaml <<'EOF'
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
- level: RequestResponse
  verbs: ["create", "update", "patch", "delete"]
  resources:
  - group: "rbac.authorization.k8s.io"
    resources: ["roles", "rolebindings", "clusterroles", "clusterrolebindings"]
EOF
```

Audit logs show who made RBAC changes and when.

## Best Practices

Follow the principle of least privilege. Grant only permissions actually needed.

Use namespace-scoped Roles when possible instead of ClusterRoles. This limits blast radius.

Create service accounts per application or function. Don't share service accounts across unrelated workloads.

Document why each role exists and what it's used for. Include this in role annotations.

Regularly audit RBAC permissions. Remove unused roles and bindings.

Test permissions in development environments before applying to production.

Use built-in roles when they match your needs. They're well-maintained and understood.

## Conclusion

RBAC permission denied errors for service accounts are straightforward to diagnose and fix once you understand the role-binding model. Identify the missing permission from error messages, create appropriate roles with required permissions, and bind them to service accounts. Use kubectl auth to test permissions before deploying. Follow least privilege principles and document your RBAC strategy. With proper RBAC configuration, service accounts securely access the resources they need without overly broad permissions.
