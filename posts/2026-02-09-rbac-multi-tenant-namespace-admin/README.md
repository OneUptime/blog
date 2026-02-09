# How to Configure RBAC for Multi-Tenant Kubernetes Clusters with Namespace-Scoped Admin Roles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RBAC, Multi-Tenancy, Security, Namespace

Description: Learn how to implement namespace-scoped admin roles in multi-tenant Kubernetes clusters using RBAC, providing isolated administrative capabilities while maintaining cluster-wide security.

---

Managing multi-tenant Kubernetes clusters requires careful attention to access control. You need to give teams administrative control over their namespaces without exposing cluster-wide resources or allowing them to impact other tenants. RBAC provides the tools to create this isolation, but configuring it properly takes planning and attention to detail.

In multi-tenant environments, namespace-scoped admin roles strike a balance between autonomy and security. Teams get the permissions they need to manage their workloads while cluster administrators maintain control over cluster-level resources and policies. This approach prevents privilege escalation and ensures tenant isolation.

## Understanding Multi-Tenant RBAC Requirements

Multi-tenant clusters have specific security requirements. Each tenant needs administrative control within their namespace but should not be able to view or modify resources in other namespaces. They should not be able to create cluster-level resources or modify RBAC policies that could affect other tenants.

Traditional cluster-admin roles are too permissive for multi-tenant scenarios. A namespace-scoped admin role should allow teams to manage deployments, services, configmaps, secrets, and other namespace-level resources while restricting access to nodes, persistent volumes, cluster roles, and other cluster-scoped resources.

The key challenge is defining what "namespace admin" means for your organization. Some teams might need the ability to create network policies or resource quotas, while others should only manage application workloads.

## Creating a Namespace Admin Role

Start by defining a ClusterRole that contains the permissions a namespace admin needs. Use a ClusterRole instead of a Role so you can reuse it across multiple namespaces without duplication.

```yaml
# namespace-admin-clusterrole.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: namespace-admin
rules:
# Full control over most namespace-scoped resources
- apiGroups: [""]
  resources:
    - configmaps
    - endpoints
    - persistentvolumeclaims
    - pods
    - pods/log
    - pods/portforward
    - pods/exec
    - replicationcontrollers
    - secrets
    - services
    - serviceaccounts
  verbs: ["*"]

# Apps resources
- apiGroups: ["apps"]
  resources:
    - daemonsets
    - deployments
    - replicasets
    - statefulsets
  verbs: ["*"]

# Batch resources
- apiGroups: ["batch"]
  resources:
    - cronjobs
    - jobs
  verbs: ["*"]

# Networking resources
- apiGroups: ["networking.k8s.io"]
  resources:
    - ingresses
    - networkpolicies
  verbs: ["*"]

# Policy resources (limited)
- apiGroups: ["policy"]
  resources:
    - poddisruptionbudgets
  verbs: ["*"]

# Autoscaling
- apiGroups: ["autoscaling"]
  resources:
    - horizontalpodautoscalers
  verbs: ["*"]

# Events and resource viewing
- apiGroups: [""]
  resources:
    - events
  verbs: ["get", "list", "watch"]

# Read-only access to resource quotas and limit ranges
# This prevents admins from removing org-imposed limits
- apiGroups: [""]
  resources:
    - resourcequotas
    - limitranges
  verbs: ["get", "list", "watch"]

# Explicitly deny cluster-scoped resources
# Note: This is implicit (not included in rules) but documented here
# - No access to: nodes, clusterroles, clusterrolebindings,
#   persistentvolumes, storageclasses, namespaces
```

Apply the ClusterRole:

```bash
kubectl apply -f namespace-admin-clusterrole.yaml
```

## Binding Namespace Admins to Teams

For each tenant namespace, create a RoleBinding that grants the namespace-admin ClusterRole to the appropriate users or groups. Using groups from your identity provider makes management easier as team membership changes.

```yaml
# team-alpha-namespace-admin.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: team-alpha
  labels:
    tenant: team-alpha
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: namespace-admin-binding
  namespace: team-alpha
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: namespace-admin
subjects:
# Bind to an LDAP/OIDC group
- kind: Group
  name: "team-alpha-admins"
  apiGroup: rbac.authorization.k8s.io
# Or bind to specific users
- kind: User
  name: "alice@company.com"
  apiGroup: rbac.authorization.k8s.io
```

Apply the namespace and binding:

```bash
kubectl apply -f team-alpha-namespace-admin.yaml
```

Repeat this pattern for each tenant namespace. The ClusterRole remains the same, but each namespace gets its own RoleBinding pointing to different subjects.

## Restricting Dangerous Permissions

Even within a namespace, some permissions can be dangerous in multi-tenant environments. Consider these additional restrictions:

**ServiceAccount Token Creation**: Prevent namespace admins from creating service account tokens that could be used outside the cluster:

```yaml
# restricted-namespace-admin.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: restricted-namespace-admin
rules:
# Include all rules from namespace-admin role
# ...

# Restrict serviceaccount token operations
- apiGroups: [""]
  resources:
    - serviceaccounts
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: [""]
  resources:
    - serviceaccounts/token
  verbs: ["get", "list", "watch"]  # No create
```

**Role and RoleBinding Management**: Allow namespace admins to create Roles and RoleBindings within their namespace, but prevent them from granting permissions they do not have:

```yaml
# Add to restricted-namespace-admin rules
- apiGroups: ["rbac.authorization.k8s.io"]
  resources:
    - roles
    - rolebindings
  verbs: ["*"]
# Note: Kubernetes prevents privilege escalation automatically
# Admins cannot create RoleBindings with permissions they don't have
```

Kubernetes RBAC includes built-in privilege escalation prevention. A user cannot create or update a RoleBinding that references a Role with permissions the user does not have. This automatic protection prevents namespace admins from granting themselves additional privileges.

## Implementing Resource Quotas and Limit Ranges

Multi-tenant clusters need resource controls to prevent one tenant from consuming all cluster resources. Create ResourceQuota and LimitRange objects that namespace admins cannot modify:

```yaml
# team-alpha-quotas.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: team-alpha
spec:
  hard:
    requests.cpu: "100"
    requests.memory: 200Gi
    requests.storage: 1Ti
    persistentvolumeclaims: "50"
    pods: "50"
---
apiVersion: v1
kind: LimitRange
metadata:
  name: resource-limits
  namespace: team-alpha
spec:
  limits:
  - max:
      cpu: "4"
      memory: 8Gi
    min:
      cpu: "100m"
      memory: 128Mi
    default:
      cpu: "500m"
      memory: 512Mi
    defaultRequest:
      cpu: "250m"
      memory: 256Mi
    type: Container
```

Apply with cluster-admin privileges:

```bash
kubectl apply -f team-alpha-quotas.yaml
```

Since the namespace-admin role only has read access to resourcequotas and limitranges, namespace admins cannot remove or modify these restrictions. They can view their quota usage and plan accordingly, but cannot bypass the limits.

## Handling CRDs and Custom Resources

Many applications install Custom Resource Definitions. Decide whether namespace admins should manage custom resources in their namespace:

```yaml
# Add to namespace-admin or create separate role
- apiGroups: ["example.com"]  # Your CRD API group
  resources:
    - customresources
  verbs: ["*"]
```

For security-sensitive CRDs like cert-manager or external-secrets-operator, you might want to restrict access:

```yaml
# Read-only access to certificates
- apiGroups: ["cert-manager.io"]
  resources:
    - certificates
    - certificaterequests
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
# No access to ClusterIssuers (cluster-scoped)
```

## Auditing Namespace Admin Actions

Enable audit logging to track what namespace admins do:

```yaml
# audit-policy.yaml (applied at cluster level)
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
# Log all modifications by namespace admins
- level: RequestResponse
  users: ["*"]
  namespaces: ["team-alpha", "team-beta"]  # Multi-tenant namespaces
  verbs: ["create", "update", "patch", "delete"]
# Log RBAC changes at metadata level
- level: Metadata
  resources:
  - group: "rbac.authorization.k8s.io"
```

Configure your API server with audit logging:

```bash
# In kube-apiserver flags
--audit-policy-file=/etc/kubernetes/audit-policy.yaml
--audit-log-path=/var/log/kubernetes/audit.log
--audit-log-maxage=30
```

Review audit logs regularly to detect privilege escalation attempts or suspicious activity.

## Testing the RBAC Configuration

Verify that namespace admins have appropriate access using kubectl auth can-i:

```bash
# Test as namespace admin user
kubectl auth can-i create deployments --namespace=team-alpha
# Should return: yes

kubectl auth can-i create clusterroles
# Should return: no

kubectl auth can-i get pods --namespace=team-beta
# Should return: no

kubectl auth can-i delete resourcequota --namespace=team-alpha
# Should return: no
```

Create a test deployment to confirm the user can manage workloads:

```bash
kubectl create deployment test-app --image=nginx --namespace=team-alpha
kubectl scale deployment test-app --replicas=3 --namespace=team-alpha
kubectl delete deployment test-app --namespace=team-alpha
```

## Automating Namespace Provisioning

As you add tenants, automate namespace creation with the appropriate RBAC bindings:

```bash
#!/bin/bash
# provision-tenant.sh

NAMESPACE=$1
GROUP=$2

if [ -z "$NAMESPACE" ] || [ -z "$GROUP" ]; then
  echo "Usage: $0 <namespace> <group>"
  exit 1
fi

# Create namespace with labels
kubectl create namespace "$NAMESPACE"
kubectl label namespace "$NAMESPACE" tenant="$NAMESPACE"

# Create RoleBinding
kubectl create rolebinding namespace-admin-binding \
  --clusterrole=namespace-admin \
  --group="$GROUP" \
  --namespace="$NAMESPACE"

# Apply resource quotas
kubectl apply -f - <<EOF
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: $NAMESPACE
spec:
  hard:
    requests.cpu: "100"
    requests.memory: 200Gi
    persistentvolumeclaims: "50"
EOF

echo "Tenant namespace $NAMESPACE provisioned for group $GROUP"
```

Use the script to quickly onboard new teams:

```bash
./provision-tenant.sh team-charlie team-charlie-admins
```

Multi-tenant RBAC requires careful balance between autonomy and security. Namespace-scoped admin roles give teams the control they need while maintaining cluster integrity and tenant isolation. Regular audits and clear policies ensure the system remains secure as your multi-tenant environment grows.
