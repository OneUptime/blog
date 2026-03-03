# How to Configure RBAC per Namespace on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, RBAC, Security, Namespace Management

Description: A detailed guide to implementing fine-grained RBAC permissions per namespace on Talos Linux for secure multi-team cluster sharing.

---

When multiple teams share a Talos Linux cluster, you need to make sure each team can manage their own namespace without being able to see or modify resources in other namespaces. Kubernetes role-based access control (RBAC) makes this possible by letting you define permissions that are scoped to individual namespaces. A developer on Team A can deploy applications in their namespace but cannot access secrets, pods, or configurations in Team B's namespace.

This post covers how to set up namespace-scoped RBAC on Talos Linux, from basic role definitions to advanced patterns for managing access across a multi-team cluster.

## RBAC Building Blocks

Kubernetes RBAC has four key objects.

**Role** defines permissions within a specific namespace. It lists which API resources can be accessed and what actions (verbs) are allowed.

**ClusterRole** defines permissions that are either cluster-wide or can be reused across namespaces.

**RoleBinding** grants a Role to a user, group, or service account within a specific namespace.

**ClusterRoleBinding** grants a ClusterRole across the entire cluster.

For namespace isolation, you primarily use Role and RoleBinding. ClusterRoles can be useful as templates that get bound per namespace, but ClusterRoleBindings should be used sparingly because they grant access everywhere.

## Defining Namespace Roles

Start by defining roles that match your team's needs. Most teams need a few different levels of access.

### Developer Role

Developers need to deploy applications, check logs, and debug pods. They should not be able to modify namespace-level settings or access secrets they do not own.

```yaml
# developer-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: developer
  namespace: team-backend
rules:
  # Manage deployments and related resources
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets", "statefulsets"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  # Manage pods (but not delete, to prevent accidental deletions)
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]
  # Access pod logs and exec for debugging
  - apiGroups: [""]
    resources: ["pods/log", "pods/exec", "pods/portforward"]
    verbs: ["get", "create"]
  # Manage services and ingresses
  - apiGroups: [""]
    resources: ["services"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  - apiGroups: ["networking.k8s.io"]
    resources: ["ingresses"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  # Read configmaps but not secrets
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  # View events
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["get", "list", "watch"]
```

### Namespace Admin Role

Team leads or senior engineers might need broader access, including the ability to manage secrets, network policies, and service accounts within their namespace.

```yaml
# namespace-admin-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: namespace-admin
  namespace: team-backend
rules:
  # Full access to most namespace resources
  - apiGroups: ["", "apps", "batch", "networking.k8s.io"]
    resources: ["*"]
    verbs: ["*"]
  # Manage RBAC within the namespace
  - apiGroups: ["rbac.authorization.k8s.io"]
    resources: ["roles", "rolebindings"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Manage service accounts
  - apiGroups: [""]
    resources: ["serviceaccounts"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

### Read-Only Role

For users who just need to observe the namespace without making changes.

```yaml
# reader-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: reader
  namespace: team-backend
rules:
  - apiGroups: ["", "apps", "batch", "networking.k8s.io"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]
  # Explicitly exclude secrets from read access
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: []
```

## Binding Roles to Users and Groups

With roles defined, bind them to users or groups.

```yaml
# role-bindings.yaml
# Bind the developer role to the backend-devs group
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: backend-developers
  namespace: team-backend
subjects:
  - kind: Group
    name: backend-devs
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: developer
  apiGroup: rbac.authorization.k8s.io
---
# Bind the namespace-admin role to specific users
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: backend-admins
  namespace: team-backend
subjects:
  - kind: User
    name: jane@company.com
    apiGroup: rbac.authorization.k8s.io
  - kind: User
    name: john@company.com
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: namespace-admin
  apiGroup: rbac.authorization.k8s.io
---
# Bind the reader role to the QA team
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: qa-readers
  namespace: team-backend
subjects:
  - kind: Group
    name: qa-team
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: reader
  apiGroup: rbac.authorization.k8s.io
```

```bash
kubectl apply -f role-bindings.yaml
```

## Using ClusterRoles as Reusable Templates

If you have the same roles across many namespaces, define them as ClusterRoles and bind them per namespace with RoleBindings. This avoids duplicating Role definitions.

```yaml
# Reusable ClusterRole
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: namespace-developer
rules:
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets", "statefulsets"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  - apiGroups: [""]
    resources: ["pods", "pods/log", "services", "configmaps"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods/exec", "pods/portforward"]
    verbs: ["get", "create"]
---
# Bind the ClusterRole to team-a in their namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-a-developers
  namespace: team-a
subjects:
  - kind: Group
    name: team-a-devs
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: namespace-developer
  apiGroup: rbac.authorization.k8s.io
---
# Same ClusterRole, different team, different namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-b-developers
  namespace: team-b
subjects:
  - kind: Group
    name: team-b-devs
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: namespace-developer
  apiGroup: rbac.authorization.k8s.io
```

The key here is that a RoleBinding with a ClusterRole reference only grants permissions within the namespace where the RoleBinding lives. It does not grant cluster-wide access.

## Service Account RBAC

Applications running in pods use service accounts. Each namespace should have service accounts with minimal permissions.

```yaml
# Application service account with limited permissions
apiVersion: v1
kind: ServiceAccount
metadata:
  name: api-service
  namespace: team-backend
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: api-service-role
  namespace: team-backend
rules:
  # The API service only needs to read configmaps and secrets
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "watch"]
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get"]
    resourceNames:
      # Only allow access to specific secrets
      - api-database-credentials
      - api-tls-cert
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: api-service-binding
  namespace: team-backend
subjects:
  - kind: ServiceAccount
    name: api-service
    namespace: team-backend
roleRef:
  kind: Role
  name: api-service-role
  apiGroup: rbac.authorization.k8s.io
```

## Verifying RBAC Configuration

After setting up RBAC, verify that permissions work as expected.

```bash
# Test if a user can perform a specific action
kubectl auth can-i create deployments -n team-backend --as jane@company.com
# Expected: yes

kubectl auth can-i create deployments -n team-frontend --as jane@company.com
# Expected: no (if jane only has access to team-backend)

kubectl auth can-i get secrets -n team-backend --as dev@company.com
# Expected: no (if dev has developer role without secret access)

# List all permissions for a user in a namespace
kubectl auth can-i --list -n team-backend --as jane@company.com
```

## Automating RBAC Setup for New Namespaces

When you create a new namespace, automate the RBAC setup to ensure consistency.

```bash
#!/bin/bash
# setup-namespace-rbac.sh
# Usage: ./setup-namespace-rbac.sh <namespace> <admin-group> <dev-group>

NAMESPACE=$1
ADMIN_GROUP=$2
DEV_GROUP=$3

# Create the namespace
kubectl create namespace "$NAMESPACE"

# Apply the standard roles (using ClusterRoles as templates)
# Bind admin role
kubectl -n "$NAMESPACE" create rolebinding "${NAMESPACE}-admins" \
  --clusterrole=namespace-admin \
  --group="$ADMIN_GROUP"

# Bind developer role
kubectl -n "$NAMESPACE" create rolebinding "${NAMESPACE}-developers" \
  --clusterrole=namespace-developer \
  --group="$DEV_GROUP"

# Create default service account with limited permissions
kubectl -n "$NAMESPACE" apply -f - <<EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: workload-sa
  annotations:
    description: "Default service account for workloads in this namespace"
EOF

echo "RBAC configured for namespace: $NAMESPACE"
echo "  Admins: $ADMIN_GROUP"
echo "  Developers: $DEV_GROUP"
```

## Auditing RBAC

Regularly audit RBAC to ensure no permissions have drifted from the intended state.

```bash
# List all role bindings across namespaces
kubectl get rolebindings --all-namespaces \
  -o custom-columns=\
NAMESPACE:.metadata.namespace,\
NAME:.metadata.name,\
ROLE:.roleRef.name,\
SUBJECTS:.subjects[*].name

# Find any cluster-admin bindings (these should be minimal)
kubectl get clusterrolebindings \
  -o custom-columns=NAME:.metadata.name,ROLE:.roleRef.name,SUBJECTS:.subjects[*].name \
  | grep cluster-admin

# Check for service accounts with overly broad permissions
kubectl get rolebindings --all-namespaces -o json | \
  jq '.items[] | select(.subjects[]?.kind == "ServiceAccount") |
      {namespace: .metadata.namespace, binding: .metadata.name, role: .roleRef.name}'
```

## Integrating with Identity Providers

On Talos Linux clusters, you typically use OIDC (OpenID Connect) for user authentication. Configure the Kubernetes API server to accept tokens from your identity provider.

```yaml
# Talos machine config patch for OIDC on the API server
cluster:
  apiServer:
    extraArgs:
      oidc-issuer-url: https://accounts.google.com
      oidc-client-id: your-client-id
      oidc-username-claim: email
      oidc-groups-claim: groups
```

With OIDC configured, users authenticate through your identity provider, and the groups from their OIDC token are used for RBAC group bindings. This means adding or removing someone from a team in your identity provider automatically changes their Kubernetes access.

## Conclusion

Namespace-scoped RBAC on Talos Linux gives you precise control over who can do what in each namespace. Define roles that match your team structure (developer, namespace admin, reader), bind them to groups from your identity provider, and automate the setup for new namespaces. Use ClusterRoles as reusable templates to avoid duplication, keep service account permissions minimal, and audit regularly. Combined with network policies and resource quotas, RBAC completes the picture of namespace isolation that makes shared Talos clusters safe for multiple teams.
