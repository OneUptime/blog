# How to Build Custom RBAC Roles for Kubernetes Operators with CRD Management Permissions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RBAC, Operators, CRD, Custom Resources

Description: Learn how to create precise RBAC roles for Kubernetes operators that need to manage Custom Resource Definitions and custom resources securely without excessive cluster permissions.

---

Kubernetes operators extend cluster functionality by managing custom resources. They watch for changes to Custom Resource Definitions, reconcile desired state with actual state, and manage related Kubernetes resources. Operators need specific RBAC permissions to function, but determining the right permissions requires understanding what the operator does at a granular level.

Too many operators receive cluster-admin privileges because it is easier than defining precise permissions. This creates security risks. If an operator is compromised or contains a bug, it can damage the entire cluster. Properly scoped RBAC roles limit blast radius and follow the principle of least privilege.

## Understanding Operator Permission Requirements

Operators typically need several categories of permissions:

**CRD Management**: Ability to create, read, update, and delete Custom Resource Definitions if the operator installs its own CRDs.

**Custom Resource Management**: Full access to the custom resources the operator manages.

**Native Resource Management**: Access to create and manage standard Kubernetes resources like Deployments, Services, and ConfigMaps that the operator provisions.

**Status Updates**: Permission to update the status subresource of custom resources to report reconciliation state.

**Leader Election**: For high-availability operators, access to create and update leases or configmaps for leader election.

**Events**: Ability to create events for logging operator actions and errors.

## Creating a Basic Operator Role

Start with a minimal operator that manages a custom resource called `Application` and creates Deployments and Services. First, define the permissions needed:

```yaml
# application-operator-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: application-operator
rules:
# Permission to manage the custom resource
- apiGroups: ["example.com"]
  resources:
    - applications
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# Permission to update custom resource status
- apiGroups: ["example.com"]
  resources:
    - applications/status
  verbs: ["get", "update", "patch"]

# Permission to create and manage Deployments
- apiGroups: ["apps"]
  resources:
    - deployments
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# Permission to create and manage Services
- apiGroups: [""]
  resources:
    - services
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# Permission to read ConfigMaps and Secrets referenced by Applications
- apiGroups: [""]
  resources:
    - configmaps
    - secrets
  verbs: ["get", "list", "watch"]

# Permission to create events
- apiGroups: [""]
  resources:
    - events
  verbs: ["create", "patch"]
```

Apply the role:

```bash
kubectl apply -f application-operator-role.yaml
```

Create a ServiceAccount for the operator:

```bash
kubectl create namespace operator-system
kubectl create serviceaccount application-operator -n operator-system
```

Bind the role to the ServiceAccount:

```yaml
# application-operator-binding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: application-operator-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: application-operator
subjects:
- kind: ServiceAccount
  name: application-operator
  namespace: operator-system
```

Apply the binding:

```bash
kubectl apply -f application-operator-binding.yaml
```

## Handling CRD Installation Permissions

If your operator installs its own CRDs at startup, it needs permission to manage CRDs. This is a privileged operation, so consider separating CRD installation from operator runtime permissions.

**Option 1: Separate CRD Installation**

Install CRDs separately using Helm or kubectl before deploying the operator. This is the most secure approach:

```bash
# Install CRDs first
kubectl apply -f crds/

# Then deploy operator without CRD permissions
kubectl apply -f operator/
```

**Option 2: Grant CRD Permissions**

If the operator must manage CRDs, grant specific permissions:

```yaml
# Add to operator role
- apiGroups: ["apiextensions.k8s.io"]
  resources:
    - customresourcedefinitions
  verbs: ["get", "list", "watch", "create", "update", "patch"]
  # No delete permission - prevents accidental CRD removal
```

Be cautious with CRD delete permissions. Deleting a CRD removes all instances of that custom resource cluster-wide. Only grant delete if absolutely necessary:

```yaml
# Only for operators that cleanup CRDs on uninstall
- apiGroups: ["apiextensions.k8s.io"]
  resources:
    - customresourcedefinitions
  verbs: ["delete"]
  resourceNames:
    - applications.example.com  # Specific CRD only
```

## Managing Webhooks and Conversion

Operators using admission webhooks or CRD conversion webhooks need additional permissions:

```yaml
# Webhook management permissions
- apiGroups: ["admissionregistration.k8s.io"]
  resources:
    - validatingwebhookconfigurations
    - mutatingwebhookconfigurations
  verbs: ["get", "list", "watch", "create", "update", "patch"]
  resourceNames:
    - application-webhook  # Specific webhook only

# Certificate management for webhook TLS
- apiGroups: [""]
  resources:
    - secrets
  verbs: ["get", "list", "watch", "create", "update", "patch"]
  resourceNames:
    - webhook-server-cert
  # Limit to specific namespace in RoleBinding
```

For CRD conversion webhooks:

```yaml
# CRD conversion webhook permissions
- apiGroups: ["apiextensions.k8s.io"]
  resources:
    - customresourcedefinitions
  verbs: ["get", "update", "patch"]
  resourceNames:
    - applications.example.com
# Operator updates CRD with conversion webhook configuration
```

## Implementing Leader Election Permissions

High-availability operators use leader election to ensure only one instance reconciles resources. Leader election requires coordination resource access:

```yaml
# Leader election using Leases (recommended)
- apiGroups: ["coordination.k8s.io"]
  resources:
    - leases
  verbs: ["get", "list", "watch", "create", "update", "patch"]
  # Typically scoped to operator namespace using RoleBinding

# Or using ConfigMaps (legacy)
- apiGroups: [""]
  resources:
    - configmaps
  verbs: ["get", "list", "watch", "create", "update", "patch"]
  resourceNames:
    - application-operator-leader
```

Create a namespace-scoped RoleBinding for leader election:

```yaml
# leader-election-binding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: application-operator-leader-election
  namespace: operator-system
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: leader-election-role
subjects:
- kind: ServiceAccount
  name: application-operator
  namespace: operator-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: leader-election-role
  namespace: operator-system
rules:
- apiGroups: ["coordination.k8s.io"]
  resources:
    - leases
  verbs: ["get", "list", "watch", "create", "update", "patch"]
```

## Scoping Operator Permissions by Namespace

For operators that only need to work in specific namespaces, use Roles and RoleBindings instead of cluster-wide permissions:

```yaml
# namespace-scoped-operator-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: application-operator
  namespace: applications  # Target namespace
rules:
- apiGroups: ["example.com"]
  resources:
    - applications
    - applications/status
  verbs: ["*"]
- apiGroups: ["apps"]
  resources:
    - deployments
  verbs: ["*"]
- apiGroups: [""]
  resources:
    - services
    - configmaps
    - secrets
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: application-operator-binding
  namespace: applications
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: application-operator
subjects:
- kind: ServiceAccount
  name: application-operator
  namespace: operator-system
```

The operator can still live in a separate `operator-system` namespace but only has permissions in the `applications` namespace.

## Watching Cluster-Scoped Resources

Some operators need to watch cluster-scoped resources like Nodes or PersistentVolumes. Grant read-only access:

```yaml
# Read-only cluster resource access
- apiGroups: [""]
  resources:
    - nodes
  verbs: ["get", "list", "watch"]
# No create, update, delete permissions

- apiGroups: [""]
  resources:
    - persistentvolumes
  verbs: ["get", "list", "watch"]
```

Only grant write access if the operator truly needs to modify these resources:

```yaml
# Example: Storage operator managing PVs
- apiGroups: [""]
  resources:
    - persistentvolumes
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

- apiGroups: ["storage.k8s.io"]
  resources:
    - storageclasses
  verbs: ["get", "list", "watch"]
```

## Testing Operator Permissions

Before deploying, verify the operator has exactly the permissions it needs:

```bash
# Test as the operator ServiceAccount
kubectl auth can-i create applications.example.com \
  --as=system:serviceaccount:operator-system:application-operator

kubectl auth can-i create deployments \
  --as=system:serviceaccount:operator-system:application-operator

# Test that it cannot do things it shouldn't
kubectl auth can-i delete customresourcedefinitions \
  --as=system:serviceaccount:operator-system:application-operator
# Should return: no
```

Deploy a test operator and monitor for permission errors:

```bash
# Watch operator logs for RBAC errors
kubectl logs -n operator-system -l app=application-operator -f | grep -i forbidden
```

Common error message format:

```
Error: Forbidden: User "system:serviceaccount:operator-system:application-operator"
cannot create resource "deployments" in API group "apps" in the namespace "default"
```

Add the missing permission to your operator role and reapply.

## Generating RBAC Manifests with Controller-Gen

For operators built with kubebuilder or controller-runtime, use controller-gen to auto-generate RBAC rules from code annotations:

```go
// In your controller code

//+kubebuilder:rbac:groups=example.com,resources=applications,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=example.com,resources=applications/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=apps,resources=deployments,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups="",resources=services,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups="",resources=events,verbs=create;patch

func (r *ApplicationReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    // Controller logic
}
```

Generate the RBAC manifests:

```bash
make manifests
# Outputs to config/rbac/role.yaml
```

This keeps RBAC definitions in sync with code changes and reduces the chance of missing permissions.

## Documenting Operator Permissions

Document why each permission is needed in your operator's README:

```markdown
## Required RBAC Permissions

### Custom Resources
- `applications.example.com`: Full access to manage Application custom resources
- `applications/status`: Update status to report reconciliation state

### Native Resources
- `deployments`: Create and manage deployments for each Application
- `services`: Create and manage services to expose Applications
- `configmaps`, `secrets`: Read configuration referenced by Applications

### System Resources
- `events`: Record operator actions for debugging
- `leases`: Coordinate leader election for HA deployments
```

Include the exact RBAC manifests in your operator's Helm chart or deployment files, making it easy for users to understand and customize permissions.

Building operators with precise RBAC permissions takes more effort than using cluster-admin, but it significantly improves security posture. By carefully defining what your operator needs to do and granting only those permissions, you limit the damage a compromised or buggy operator can cause while maintaining full functionality.
