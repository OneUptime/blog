# How to Configure RBAC Roles That Allow Exec and Port-Forward to Specific Namespaces Only

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RBAC, Security

Description: Configure RBAC roles that grant exec and port-forward permissions to specific namespaces only, enabling debugging access while maintaining security boundaries.

---

Pod exec and port-forward are powerful debugging tools that can also be security risks. Limiting these capabilities to specific namespaces and user groups prevents unauthorized access to production workloads while enabling developers to debug their applications. Namespace-scoped roles provide this balance.

## Understanding Exec and Port-Forward Risks

The pods/exec permission allows running commands inside containers, while pods/portforward enables network access to container ports. Both can expose sensitive data or enable lateral movement in a cluster. Granting these permissions requires careful consideration of trust boundaries.

In development namespaces, developers need debugging access. In production, only designated oncall engineers should have these capabilities. RBAC namespace scoping enforces these policies.

## Creating Development Namespace Exec Access

Grant exec and port-forward to developers in non-production namespaces.

```yaml
# rbac-dev-debug-access.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: developer-debug
  namespace: development
rules:
# Read pods
- apiGroups: [""]
  resources: ["pods", "pods/status"]
  verbs: ["get", "list", "watch"]

# Exec into pods
- apiGroups: [""]
  resources: ["pods/exec"]
  verbs: ["create"]

# Port-forward to pods
- apiGroups: [""]
  resources: ["pods/portforward"]
  verbs: ["create"]

# Read logs
- apiGroups: [""]
  resources: ["pods/log"]
  verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developer-debug-binding
  namespace: development
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: developer-debug
subjects:
- kind: Group
  name: "developers"
  apiGroup: rbac.authorization.k8s.io
```

Developers can now exec into pods in the development namespace.

```bash
# This works - development namespace
kubectl exec -it mypod -n development -- /bin/bash

# This fails - production namespace
kubectl exec -it mypod -n production -- /bin/bash
# Error: User cannot create resource "pods/exec" in namespace "production"
```

## Implementing Staging Namespace Debug Access

Create similar access for staging with additional restrictions.

```yaml
# rbac-staging-debug-access.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: staging-debug
  namespace: staging
rules:
# Read pods
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]

# Exec and port-forward (debug only)
- apiGroups: [""]
  resources: ["pods/exec", "pods/portforward"]
  verbs: ["create"]

# Read logs
- apiGroups: [""]
  resources: ["pods/log"]
  verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: staging-debug-binding
  namespace: staging
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: staging-debug
subjects:
- kind: Group
  name: "senior-developers"
  apiGroup: rbac.authorization.k8s.io
- kind: Group
  name: "qa-team"
  apiGroup: rbac.authorization.k8s.io
```

## Creating Production Emergency Access

Grant exec access to production for oncall engineers only.

```yaml
# rbac-production-emergency-access.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: production-emergency
  namespace: production
  annotations:
    description: "Emergency debugging access for production incidents"
    approval-required: "true"
    audit-level: "high"
rules:
# Read pods
- apiGroups: [""]
  resources: ["pods", "pods/status"]
  verbs: ["get", "list", "watch"]

# Read logs
- apiGroups: [""]
  resources: ["pods/log"]
  verbs: ["get"]

# Exec into pods (emergency only)
- apiGroups: [""]
  resources: ["pods/exec"]
  verbs: ["create"]

# Port-forward (for debugging)
- apiGroups: [""]
  resources: ["pods/portforward"]
  verbs: ["create"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: production-emergency-binding
  namespace: production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: production-emergency
subjects:
- kind: Group
  name: "oncall-engineers"
  apiGroup: rbac.authorization.k8s.io
- kind: Group
  name: "sre-team"
  apiGroup: rbac.authorization.k8s.io
```

## Implementing Read-Only Production Access

Most users should only read production, not exec.

```yaml
# rbac-production-readonly.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: production-readonly
  namespace: production
rules:
# Read pods
- apiGroups: [""]
  resources: ["pods", "pods/status"]
  verbs: ["get", "list", "watch"]

# Read logs (no exec or port-forward)
- apiGroups: [""]
  resources: ["pods/log"]
  verbs: ["get"]

# Read deployments and services
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets", "statefulsets"]
  verbs: ["get", "list", "watch"]

- apiGroups: [""]
  resources: ["services", "configmaps"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: production-readonly-binding
  namespace: production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: production-readonly
subjects:
- kind: Group
  name: "developers"
  apiGroup: rbac.authorization.k8s.io
- kind: Group
  name: "support-team"
  apiGroup: rbac.authorization.k8s.io
```

## Creating Multi-Namespace Debug Access

Grant exec access across multiple non-production namespaces.

```yaml
# rbac-multi-namespace-debug.yaml
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: debug-access
  namespace: development
rules:
- apiGroups: [""]
  resources: ["pods/exec", "pods/portforward", "pods/log"]
  verbs: ["create", "get"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: debug-access
  namespace: staging
rules:
- apiGroups: [""]
  resources: ["pods/exec", "pods/portforward", "pods/log"]
  verbs: ["create", "get"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: debug-access
  namespace: qa
rules:
- apiGroups: [""]
  resources: ["pods/exec", "pods/portforward", "pods/log"]
  verbs: ["create", "get"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developers-debug
  namespace: development
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: debug-access
subjects:
- kind: Group
  name: "developers"
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developers-debug
  namespace: staging
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: debug-access
subjects:
- kind: Group
  name: "developers"
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developers-debug
  namespace: qa
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: debug-access
subjects:
- kind: Group
  name: "developers"
  apiGroup: rbac.authorization.k8s.io
```

## Implementing Port-Forward Only Access

Allow port-forward without exec for added security.

```yaml
# rbac-portforward-only.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: portforward-access
  namespace: production
  annotations:
    description: "Port-forward only, no exec access"
rules:
# Read pods
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]

# Port-forward only
- apiGroups: [""]
  resources: ["pods/portforward"]
  verbs: ["create"]

# No pods/exec permission
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developers-portforward
  namespace: production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: portforward-access
subjects:
- kind: Group
  name: "developers"
  apiGroup: rbac.authorization.k8s.io
```

Developers can port-forward to debug connectivity but cannot exec to run commands.

```bash
# This works - port-forward
kubectl port-forward mypod -n production 8080:8080

# This fails - exec
kubectl exec -it mypod -n production -- /bin/bash
# Error: User cannot create resource "pods/exec"
```

## Testing Namespace-Scoped Access

Verify permissions work correctly.

```bash
# Test development namespace (should work)
kubectl auth can-i create pods/exec -n development --as=user@company.com
# yes

kubectl exec -it debug-pod -n development -- /bin/bash
# Success

# Test production namespace (should fail for regular user)
kubectl auth can-i create pods/exec -n production --as=user@company.com
# no

kubectl exec -it app-pod -n production -- /bin/bash
# Error: Forbidden

# Test as oncall engineer (should work in production)
kubectl auth can-i create pods/exec -n production \
  --as-group=oncall-engineers
# yes
```

## Auditing Exec and Port-Forward Usage

Monitor who uses these capabilities.

```bash
# Find exec events in audit logs
jq -r 'select(.verb=="create" and
    (.objectRef.subresource=="exec" or .objectRef.subresource=="portforward")) |
  "\(.requestReceivedTimestamp) \(.user.username) \(.verb) \(.objectRef.subresource) in \(.objectRef.namespace)/\(.objectRef.name)"' \
  /var/log/kubernetes/audit.log

# List users with exec permissions
kubectl get roles,clusterroles --all-namespaces -o json | \
  jq -r '.items[] | select(.rules[]?.resources[]? | contains("pods/exec")) |
    {namespace: .metadata.namespace, role: .metadata.name}'

# Check specific user's exec permissions across namespaces
for ns in $(kubectl get ns -o jsonpath='{.items[*].metadata.name}'); do
  CAN_EXEC=$(kubectl auth can-i create pods/exec -n $ns --as=user@company.com)
  if [ "$CAN_EXEC" = "yes" ]; then
    echo "User can exec in namespace: $ns"
  fi
done
```

## Implementing Time-Based Access

Grant temporary exec access with expiring role bindings.

```yaml
# rbac-temporary-exec.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: temp-debug-access
  namespace: production
  annotations:
    expires-at: "2026-02-10T18:00:00Z"
    incident-ticket: "INC-12345"
    granted-by: "sre-lead@company.com"
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: production-emergency
subjects:
- kind: User
  name: "developer@company.com"
  apiGroup: rbac.authorization.k8s.io
```

Use a controller to remove expired bindings automatically.

## Creating Namespace-Specific Debug Containers

Use ephemeral debug containers with RBAC controls.

```yaml
# rbac-debug-containers.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: debug-container-access
  namespace: staging
rules:
# Create ephemeral containers for debugging
- apiGroups: [""]
  resources: ["pods/ephemeralcontainers"]
  verbs: ["update"]

# Read pods
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]

# Exec into debug containers
- apiGroups: [""]
  resources: ["pods/exec"]
  verbs: ["create"]
```

Use debug containers instead of exec into application containers.

```bash
# Create ephemeral debug container
kubectl debug mypod -n staging \
  --image=busybox \
  --target=mycontainer

# This requires both pods/ephemeralcontainers and pods/exec permissions
```

Namespace-scoped exec and port-forward permissions balance debugging needs with security. Grant these capabilities to development and staging namespaces for all developers, but restrict production access to oncall engineers and SRE teams. Use audit logs to monitor usage and implement time-based access for temporary debugging needs in production.
