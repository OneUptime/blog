# How to Set Up Multi-Tenant RBAC on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, RBAC, Multi-Tenancy, Kubernetes, Security, Namespaces

Description: Learn how to configure multi-tenant RBAC on Talos Linux clusters to isolate teams and workloads while sharing the same underlying infrastructure securely.

---

Running multiple teams or customers on a single Kubernetes cluster is a common pattern. It saves infrastructure costs and simplifies management. But it also creates a challenge: how do you make sure one tenant cannot access another tenant's resources? RBAC is a core piece of this puzzle. Combined with namespaces, network policies, and resource quotas, RBAC lets you build strong isolation boundaries on a shared Talos Linux cluster.

## Multi-Tenancy Models

Before diving into configuration, understand the two main multi-tenancy models:

**Soft multi-tenancy** - Teams within the same organization share a cluster. Trust levels are moderate. The main concern is preventing accidental access, not defending against malicious actors.

**Hard multi-tenancy** - Different customers or business units share a cluster. Trust levels are low. You need strong isolation because tenants may be adversarial.

This guide covers both models, starting with soft multi-tenancy and building up to harder isolation.

## Namespace-Per-Tenant Architecture

The foundation of multi-tenant RBAC is giving each tenant their own namespace:

```bash
# Create namespaces for each tenant
kubectl create namespace team-frontend
kubectl create namespace team-backend
kubectl create namespace team-data
kubectl create namespace team-platform
```

Label namespaces for easier management:

```yaml
# team-frontend-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: team-frontend
  labels:
    tenant: frontend
    environment: production
    cost-center: "CC-1001"
```

## Creating Tenant Admin Roles

Each tenant needs an admin who can manage resources within their namespace but cannot access other namespaces or cluster-wide resources.

```yaml
# tenant-admin-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: tenant-admin
  namespace: team-frontend
rules:
  # Full control over workload resources
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets", "daemonsets", "replicasets"]
    verbs: ["*"]

  # Pod management
  - apiGroups: [""]
    resources: ["pods", "pods/log", "pods/exec", "pods/portforward"]
    verbs: ["*"]

  # Service and networking within namespace
  - apiGroups: [""]
    resources: ["services", "endpoints"]
    verbs: ["*"]
  - apiGroups: ["networking.k8s.io"]
    resources: ["ingresses"]
    verbs: ["*"]

  # Configuration management
  - apiGroups: [""]
    resources: ["configmaps", "secrets"]
    verbs: ["*"]

  # Jobs and CronJobs
  - apiGroups: ["batch"]
    resources: ["jobs", "cronjobs"]
    verbs: ["*"]

  # PVCs
  - apiGroups: [""]
    resources: ["persistentvolumeclaims"]
    verbs: ["*"]

  # Service accounts within their namespace
  - apiGroups: [""]
    resources: ["serviceaccounts"]
    verbs: ["*"]

  # Roles and role bindings within their namespace
  - apiGroups: ["rbac.authorization.k8s.io"]
    resources: ["roles", "rolebindings"]
    verbs: ["*"]

  # View events
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["get", "list", "watch"]

  # HPA
  - apiGroups: ["autoscaling"]
    resources: ["horizontalpodautoscalers"]
    verbs: ["*"]
```

Bind this role to the tenant admin:

```yaml
# tenant-admin-binding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: frontend-team-admin
  namespace: team-frontend
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: tenant-admin
subjects:
  - kind: Group
    name: "team-frontend-admins"
    apiGroup: rbac.authorization.k8s.io
```

## Creating Tenant Developer Roles

Developers need less access than admins. They can deploy and debug but cannot manage secrets or RBAC:

```yaml
# tenant-developer-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: tenant-developer
  namespace: team-frontend
rules:
  # Can manage deployments
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]

  # Can view and debug pods
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods/exec", "pods/portforward"]
    verbs: ["create"]

  # Can manage configmaps but NOT secrets
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]

  # Can view services
  - apiGroups: [""]
    resources: ["services", "endpoints"]
    verbs: ["get", "list", "watch"]

  # Can view events
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["get", "list", "watch"]
```

## Creating a Read-Only Viewer Role

For stakeholders who need visibility but should not change anything:

```yaml
# tenant-viewer-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: tenant-viewer
  namespace: team-frontend
rules:
  - apiGroups: ["", "apps", "batch", "networking.k8s.io", "autoscaling"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]
  # Explicitly exclude secrets from view
  - apiGroups: [""]
    resources: ["pods", "services", "configmaps", "events", "endpoints"]
    verbs: ["get", "list", "watch"]
```

## Preventing Cross-Tenant Access

The key to multi-tenancy is making sure that roles and bindings are strictly namespace-scoped. Never give tenants ClusterRoles or ClusterRoleBindings unless absolutely necessary.

```bash
# Verify no tenant has cluster-level access
kubectl get clusterrolebindings -o json | \
    jq -r '.items[] | select(.subjects[]?.name | test("team-")) | .metadata.name'
```

## Restricting Cluster-Scoped Resource Access

Some resources are cluster-scoped and shared across all namespaces. Tenants generally should not be able to access these:

```yaml
# Explicitly deny cluster-scoped access by NOT granting it
# Tenants should NOT have access to:
# - Nodes
# - PersistentVolumes (they can use PVCs within their namespace)
# - Namespaces
# - ClusterRoles / ClusterRoleBindings
# - CustomResourceDefinitions
# - StorageClasses (read-only at most)
```

If tenants need to see some cluster-scoped resources (like StorageClasses), create a limited ClusterRole:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: tenant-cluster-view
rules:
  - apiGroups: ["storage.k8s.io"]
    resources: ["storageclasses"]
    verbs: ["get", "list"]
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["get"]
    resourceNames: []  # Will be set per-tenant via binding
```

## Automating Tenant Onboarding

When you add a new tenant, you need to create several resources. Automate this with a script:

```bash
#!/bin/bash
# onboard-tenant.sh

TENANT_NAME=$1
ADMIN_GROUP=$2

if [ -z "$TENANT_NAME" ] || [ -z "$ADMIN_GROUP" ]; then
    echo "Usage: ./onboard-tenant.sh <tenant-name> <admin-group>"
    exit 1
fi

NAMESPACE="team-${TENANT_NAME}"

# Create namespace
kubectl create namespace "$NAMESPACE"
kubectl label namespace "$NAMESPACE" \
    tenant="$TENANT_NAME" \
    managed-by=platform-team

# Apply resource quotas
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ResourceQuota
metadata:
  name: tenant-quota
  namespace: $NAMESPACE
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "20"
    limits.memory: 40Gi
    pods: "50"
    services: "20"
    secrets: "30"
    configmaps: "30"
    persistentvolumeclaims: "10"
EOF

# Apply limit ranges
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: LimitRange
metadata:
  name: tenant-limits
  namespace: $NAMESPACE
spec:
  limits:
  - default:
      cpu: "500m"
      memory: 512Mi
    defaultRequest:
      cpu: "100m"
      memory: 128Mi
    type: Container
EOF

# Create RBAC roles
cat <<EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: tenant-admin
  namespace: $NAMESPACE
rules:
  - apiGroups: ["", "apps", "batch", "networking.k8s.io", "autoscaling"]
    resources: ["*"]
    verbs: ["*"]
  - apiGroups: ["rbac.authorization.k8s.io"]
    resources: ["roles", "rolebindings"]
    verbs: ["*"]
EOF

# Bind admin group
cat <<EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: tenant-admin-binding
  namespace: $NAMESPACE
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: tenant-admin
subjects:
- kind: Group
  name: "$ADMIN_GROUP"
  apiGroup: rbac.authorization.k8s.io
EOF

# Apply network policy to isolate the namespace
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: tenant-isolation
  namespace: $NAMESPACE
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          tenant: $TENANT_NAME
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          tenant: $TENANT_NAME
  - to:  # Allow DNS
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: kube-system
    ports:
    - protocol: UDP
      port: 53
EOF

echo "Tenant '$TENANT_NAME' onboarded in namespace '$NAMESPACE'"
```

## Auditing Multi-Tenant Access

Regularly audit who has access to what:

```bash
#!/bin/bash
# audit-tenant-access.sh

echo "=== Multi-Tenant RBAC Audit ==="

for ns in $(kubectl get namespaces -l tenant -o jsonpath='{.items[*].metadata.name}'); do
    echo ""
    echo "Namespace: $ns"
    echo "  Role Bindings:"
    kubectl get rolebindings -n "$ns" -o custom-columns=\
"NAME:.metadata.name,ROLE:.roleRef.name,SUBJECTS:.subjects[*].name" \
        --no-headers | sed 's/^/    /'

    echo "  Service Accounts:"
    kubectl get serviceaccounts -n "$ns" --no-headers | sed 's/^/    /'
done
```

## Testing Tenant Isolation

Verify that tenants cannot access each other's resources:

```bash
# As a frontend team member, try to access backend namespace
kubectl auth can-i get pods \
    --as="dev@example.com" \
    --as-group="team-frontend-admins" \
    -n team-backend
# Expected: no

# As a frontend team member, access their own namespace
kubectl auth can-i get pods \
    --as="dev@example.com" \
    --as-group="team-frontend-admins" \
    -n team-frontend
# Expected: yes

# Try to access cluster-scoped resources
kubectl auth can-i list nodes \
    --as="dev@example.com" \
    --as-group="team-frontend-admins"
# Expected: no
```

## Conclusion

Multi-tenant RBAC on Talos Linux is about layering multiple isolation mechanisms. Namespaces provide the logical boundary. RBAC controls who can do what within those boundaries. Network policies prevent cross-tenant network traffic. Resource quotas ensure fair resource sharing. Together, these create a secure multi-tenant environment on a shared cluster. Start with the namespace-per-tenant model, automate tenant onboarding, and audit access regularly to maintain your security posture.
