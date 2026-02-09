# Using RBAC Markers in Kubernetes Operator Development for Fine-Grained Access Control
Author: [nawazdhandala](https://github.com/nawazdhandala)
Tags: Kubernetes Operator, RBAC, Markers, Security, Go
Description: Learn how to use RBAC markers in Kubernetes operator development to generate precise ClusterRole and Role manifests for fine-grained access control using controller-gen and kubebuilder.
---

When you build a Kubernetes operator, your controller needs permissions to read, create, update, and delete resources in the cluster. Kubernetes uses Role-Based Access Control (RBAC) to manage these permissions. Rather than manually writing RBAC manifests, the Kubebuilder and Operator SDK frameworks use special Go code comments called RBAC markers to automatically generate the required ClusterRole and Role YAML files. This guide explains how RBAC markers work, how to use them correctly, and how to avoid the common pitfalls that lead to either overly permissive or insufficient permissions.

## What Are RBAC Markers

RBAC markers are specially formatted comments in your Go source files that the `controller-gen` tool reads to produce RBAC manifests. They follow the format:

```go
//+kubebuilder:rbac:groups=<api-group>,resources=<resources>,verbs=<verbs>
```

These markers are typically placed directly above the `Reconcile` method in your controller file, though they can appear anywhere in your Go code within the controller package. The `controller-gen` tool scans all Go files and aggregates the markers into a single ClusterRole manifest.

## Basic RBAC Marker Syntax

Here is a simple example. Suppose your operator manages a custom resource called `Database` in the `myapp.example.com` API group, and it also needs to read Kubernetes Services and create Events.

```go
//+kubebuilder:rbac:groups=myapp.example.com,resources=databases,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=myapp.example.com,resources=databases/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=myapp.example.com,resources=databases/finalizers,verbs=update
//+kubebuilder:rbac:groups="",resources=services,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups="",resources=events,verbs=create;patch

func (r *DatabaseReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    // reconciliation logic
}
```

Let us break down each marker:

- The first marker grants full CRUD access to the `databases` resource. This is your primary custom resource.
- The second marker grants access to the `databases/status` subresource, which is needed to update the status of your custom resource.
- The third marker grants access to `databases/finalizers`, which is required if your controller adds finalizers for cleanup logic.
- The fourth marker targets the core API group (empty string `""`) for Services. Your operator might create a Service for each Database instance.
- The fifth marker allows creating and patching Events, which is standard for any operator that records events on resources.

## Generating RBAC Manifests

After adding your markers, run the `controller-gen` tool to produce the manifests:

```bash
make manifests
```

Under the hood, this runs:

```bash
controller-gen rbac:roleName=manager-role paths="./..." output:rbac:artifacts:config=config/rbac
```

This produces a file at `config/rbac/role.yaml` that looks like:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: manager-role
rules:
  - apiGroups:
      - ""
    resources:
      - events
    verbs:
      - create
      - patch
  - apiGroups:
      - ""
    resources:
      - services
    verbs:
      - create
      - delete
      - get
      - list
      - patch
      - update
      - watch
  - apiGroups:
      - myapp.example.com
    resources:
      - databases
    verbs:
      - create
      - delete
      - get
      - list
      - patch
      - update
      - watch
  - apiGroups:
      - myapp.example.com
    resources:
      - databases/finalizers
    verbs:
      - update
  - apiGroups:
      - myapp.example.com
    resources:
      - databases/status
    verbs:
      - get
      - patch
      - update
```

The generated ClusterRole is bound to the operator's ServiceAccount through a ClusterRoleBinding, which is typically scaffolded in `config/rbac/role_binding.yaml`.

## Namespace-Scoped RBAC with Role Markers

By default, markers generate ClusterRole resources. If your operator only operates within a single namespace, you can generate a namespaced Role instead:

```go
//+kubebuilder:rbac:groups=myapp.example.com,resources=databases,verbs=get;list;watch,namespace=system
```

The `namespace` parameter tells controller-gen to generate a Role instead of a ClusterRole. However, most operators use ClusterRoles even for namespace-scoped operations, because the binding can be scoped with a RoleBinding that references a ClusterRole.

## Advanced Marker Patterns

### Watching Resources Across Multiple API Groups

If your operator needs to watch resources from multiple API groups, add separate markers for each:

```go
//+kubebuilder:rbac:groups=apps,resources=deployments,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=apps,resources=statefulsets,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=networking.k8s.io,resources=ingresses,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=policy,resources=poddisruptionbudgets,verbs=get;list;watch;create;update;patch;delete
```

### Read-Only Access for Referenced Resources

Often your operator reads ConfigMaps or Secrets that it does not own but references. Use minimal verbs:

```go
//+kubebuilder:rbac:groups="",resources=configmaps,verbs=get;list;watch
//+kubebuilder:rbac:groups="",resources=secrets,verbs=get;list;watch
```

### Resource Names Restriction

You can restrict access to specific named resources:

```go
//+kubebuilder:rbac:groups="",resources=configmaps,verbs=get,resourceNames=my-operator-config
```

This generates a rule that only allows getting the ConfigMap named `my-operator-config`. This is useful for the operator's own configuration but should not be used for user-created resources.

### URLs for Non-Resource Endpoints

Some operators need access to non-resource URLs like health check endpoints or metrics:

```go
//+kubebuilder:rbac:urls="/healthz;/readyz",verbs=get
```

## The Principle of Least Privilege

One of the most important security principles in operator development is granting only the permissions your controller actually needs. Here are concrete guidelines:

**Do not use wildcard verbs.** Never write `verbs=*`. Always enumerate the exact verbs your controller uses.

**Do not use wildcard resources.** Never write `resources=*`. This gives your operator access to every resource in the API group, including secrets and sensitive configuration.

**Do not use wildcard API groups.** Never write `groups=*`. This is equivalent to giving your operator cluster-admin access for the specified resources.

**Separate read and write access.** If your controller only reads Nodes to check capacity but never modifies them, only grant `get;list;watch`:

```go
//+kubebuilder:rbac:groups="",resources=nodes,verbs=get;list;watch
```

**Audit your markers regularly.** As your operator evolves, you may add new features that require new permissions and remove old features that no longer need certain permissions. Stale markers lead to overly permissive roles.

## Common Mistakes and How to Fix Them

### Missing Status Subresource Permissions

If your controller updates the status of your custom resource and you forget the status marker, you will see errors like:

```
the server does not allow this method on the requested resource
```

Fix: Add the status subresource marker:

```go
//+kubebuilder:rbac:groups=myapp.example.com,resources=databases/status,verbs=get;update;patch
```

### Missing Finalizer Permissions

If your controller uses finalizers and you forget the finalizer marker, you will see errors when trying to add or remove finalizers:

```
databases.myapp.example.com "my-database" is forbidden: User "system:serviceaccount:..." cannot update resource "databases/finalizers"
```

Fix: Add the finalizer marker:

```go
//+kubebuilder:rbac:groups=myapp.example.com,resources=databases/finalizers,verbs=update
```

### Forgetting to Regenerate Manifests

After adding or changing RBAC markers, you must run `make manifests` to regenerate the RBAC YAML. If you deploy without regenerating, the old permissions remain in effect.

### Event Recording Without Permissions

If your controller records events using the Kubernetes event recorder but lacks the event permission, events will silently fail to be created. Always include:

```go
//+kubebuilder:rbac:groups="",resources=events,verbs=create;patch
```

## Testing RBAC Configuration

You can verify your operator's effective permissions using `kubectl auth can-i`:

```bash
kubectl auth can-i get databases.myapp.example.com \
  --as=system:serviceaccount:my-operator-system:my-operator-controller-manager \
  -n default
```

For a comprehensive check, use `kubectl auth can-i --list`:

```bash
kubectl auth can-i --list \
  --as=system:serviceaccount:my-operator-system:my-operator-controller-manager
```

This lists all permissions the operator's service account has. Compare this against your RBAC markers to ensure alignment.

## Integrating RBAC Reviews into CI

Add a CI step that regenerates manifests and checks for differences:

```bash
make manifests
git diff --exit-code config/rbac/
```

If there is a diff, it means someone changed RBAC markers without regenerating manifests, or vice versa. This prevents RBAC drift between code and deployment artifacts.

## Conclusion

RBAC markers are a powerful feature of the Kubebuilder and Operator SDK ecosystems that turn access control from a manual, error-prone task into a code-driven, auditable process. By placing markers directly in your controller code, you keep permissions declarations close to the code that uses them. Follow the principle of least privilege, audit your markers as your operator evolves, and integrate manifest generation checks into your CI pipeline. Well-configured RBAC is the foundation of a secure operator deployment, and markers make it straightforward to get right.
