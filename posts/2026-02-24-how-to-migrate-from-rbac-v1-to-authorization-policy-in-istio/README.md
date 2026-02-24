# How to Migrate from RBAC v1 to Authorization Policy in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, RBAC, Migration, Authorization, Kubernetes

Description: A step-by-step guide to migrating from Istio's deprecated RBAC v1 API (ServiceRole and ServiceRoleBinding) to the modern AuthorizationPolicy API.

---

If you have been running Istio for a while, you might still have the old RBAC v1 resources in your cluster. The `ServiceRole` and `ServiceRoleBinding` API was the original way to do authorization in Istio, but it was deprecated in Istio 1.4 and removed entirely in Istio 1.6. The replacement is the `AuthorizationPolicy` resource, which is simpler and more powerful. If you are upgrading Istio or cleaning up old configs, here is how to migrate.

## Understanding the Old API

The RBAC v1 API had three resources:

- `ClusterRbacConfig` - Enabled or disabled RBAC globally or per namespace
- `ServiceRole` - Defined a set of permissions (methods, paths, etc.)
- `ServiceRoleBinding` - Bound a role to a subject (user, service, etc.)

Here is what a typical v1 setup looked like:

```yaml
# Enable RBAC for the default namespace
apiVersion: "rbac.istio.io/v1alpha1"
kind: ClusterRbacConfig
metadata:
  name: default
spec:
  mode: 'ON_WITH_INCLUSION'
  inclusion:
    namespaces: ["default"]
---
# Define a role that allows GET on /products
apiVersion: "rbac.istio.io/v1alpha1"
kind: ServiceRole
metadata:
  name: product-reader
  namespace: default
spec:
  rules:
  - services: ["product-service.default.svc.cluster.local"]
    methods: ["GET"]
    paths: ["/products/*"]
---
# Bind the role to the frontend service account
apiVersion: "rbac.istio.io/v1alpha1"
kind: ServiceRoleBinding
metadata:
  name: frontend-product-reader
  namespace: default
spec:
  subjects:
  - user: "cluster.local/ns/default/sa/frontend"
  roleRef:
    kind: ServiceRole
    name: "product-reader"
```

## The New API: AuthorizationPolicy

The `AuthorizationPolicy` combines the role definition and the binding into a single resource. The same configuration in the new API:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: product-reader
  namespace: default
spec:
  selector:
    matchLabels:
      app: product-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/default/sa/frontend"
    to:
    - operation:
        methods: ["GET"]
        paths: ["/products/*"]
```

Notice that:
- No separate `ClusterRbacConfig` is needed. Authorization is always active when policies exist.
- The `ServiceRole` and `ServiceRoleBinding` are merged into one `AuthorizationPolicy`.
- The target service is identified by a label selector, not by hostname.
- The subject goes in the `from.source` field.
- The permissions go in the `to.operation` field.

## Migration Mapping Table

Here is how each field in the old API maps to the new one:

| RBAC v1 | AuthorizationPolicy |
|---------|-------------------|
| `ClusterRbacConfig` | Not needed (policies are always active) |
| `ServiceRole.spec.rules[].services` | `spec.selector.matchLabels` |
| `ServiceRole.spec.rules[].methods` | `spec.rules[].to[].operation.methods` |
| `ServiceRole.spec.rules[].paths` | `spec.rules[].to[].operation.paths` |
| `ServiceRoleBinding.spec.subjects[].user` | `spec.rules[].from[].source.principals` |
| `ServiceRoleBinding.spec.subjects[].group` | `spec.rules[].from[].source.requestPrincipals` |
| `ServiceRoleBinding.spec.subjects[].properties.source.namespace` | `spec.rules[].from[].source.namespaces` |
| `ServiceRoleBinding.spec.subjects[].properties.source.ip` | `spec.rules[].from[].source.ipBlocks` |
| `ServiceRoleBinding.spec.subjects[].properties.request.headers` | `spec.rules[].when[].key: request.headers[name]` |

## Step-by-Step Migration Process

### Step 1: Inventory Your Existing RBAC v1 Resources

List all v1 resources:

```bash
kubectl get clusterrbacconfig --all-namespaces 2>/dev/null
kubectl get servicerole --all-namespaces
kubectl get servicerolebinding --all-namespaces
```

If these commands return "the server doesn't have a resource type" errors, the CRDs have already been removed (likely because you upgraded past Istio 1.6). In that case, check your GitOps repo or configuration management for the YAML files.

### Step 2: Convert Each ServiceRole + ServiceRoleBinding Pair

For each pair, create an equivalent AuthorizationPolicy. Here are several common patterns:

**Simple service-to-service access:**

Old:
```yaml
apiVersion: "rbac.istio.io/v1alpha1"
kind: ServiceRole
metadata:
  name: order-writer
  namespace: default
spec:
  rules:
  - services: ["order-service.default.svc.cluster.local"]
    methods: ["POST", "PUT"]
    paths: ["/orders/*"]
---
apiVersion: "rbac.istio.io/v1alpha1"
kind: ServiceRoleBinding
metadata:
  name: api-order-writer
  namespace: default
spec:
  subjects:
  - user: "cluster.local/ns/default/sa/api-gateway"
  roleRef:
    kind: ServiceRole
    name: "order-writer"
```

New:
```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: order-writer
  namespace: default
spec:
  selector:
    matchLabels:
      app: order-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/default/sa/api-gateway"
    to:
    - operation:
        methods: ["POST", "PUT"]
        paths: ["/orders/*"]
```

**Namespace-based access:**

Old:
```yaml
apiVersion: "rbac.istio.io/v1alpha1"
kind: ServiceRoleBinding
metadata:
  name: backend-access
  namespace: default
spec:
  subjects:
  - properties:
      source.namespace: "backend"
  roleRef:
    kind: ServiceRole
    name: "some-role"
```

New:
```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: backend-access
  namespace: default
spec:
  selector:
    matchLabels:
      app: some-service
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces:
        - "backend"
```

**Wildcard user (any authenticated):**

Old:
```yaml
subjects:
- user: "*"
```

New:
```yaml
from:
- source:
    principals:
    - "*"
```

### Step 3: Handle ClusterRbacConfig

If you had `ClusterRbacConfig` with `ON_WITH_INCLUSION`, you were selectively enabling RBAC per namespace. In the new API, there is no equivalent. Authorization policies are always evaluated when they exist. To replicate the "only enforce in these namespaces" behavior, simply apply your authorization policies in the relevant namespaces and leave other namespaces without policies.

If you had `ON_WITH_EXCLUSION`, you were enabling RBAC everywhere except certain namespaces. The equivalent is to add a permissive policy in the excluded namespaces:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-all
  namespace: excluded-namespace
spec:
  action: ALLOW
  rules:
  - {}
```

### Step 4: Apply New Policies Alongside Old Ones

If your Istio version still supports both APIs (versions 1.4 to 1.5), apply the new AuthorizationPolicy resources first while keeping the old resources in place. Both APIs work simultaneously during this transition period.

```bash
kubectl apply -f new-authorization-policies/
```

Test thoroughly. Make sure all your services can still communicate.

### Step 5: Remove Old RBAC v1 Resources

Once you have verified that the new policies work correctly:

```bash
kubectl delete servicerole --all -n default
kubectl delete servicerolebinding --all -n default
kubectl delete clusterrbacconfig default
```

### Step 6: Validate After Migration

Run through your test suite or manually verify key communication paths:

```bash
# Check that allowed paths work
kubectl exec deploy/api-gateway -- curl -s -w "%{http_code}" http://order-service:8080/orders/

# Check that denied paths are blocked
kubectl exec deploy/frontend -- curl -s -w "%{http_code}" -X DELETE http://order-service:8080/orders/123
```

Check for authorization errors in the proxy logs:

```bash
kubectl logs deploy/order-service -c istio-proxy | grep rbac
```

## Advantages of the New API

- **Simpler** - One resource instead of three
- **DENY support** - v1 only had ALLOW. The new API supports DENY and CUSTOM actions
- **Better matching** - Support for notPrincipals, notNamespaces, notPaths, and other exclusion fields
- **Workload selector** - Target pods by labels instead of hostname
- **Conditions** - The `when` field supports matching on any Envoy attribute

The migration from RBAC v1 to AuthorizationPolicy is mostly a straightforward mapping exercise. The hardest part is usually finding all the old resources and understanding what they were doing. Once you have that inventory, converting them is mechanical. The new API is genuinely better, and you will appreciate the simplicity once the migration is complete.
