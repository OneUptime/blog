# How to Configure Kubernetes RBAC on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, RBAC, Access Control, Security

Description: A practical guide to configuring Kubernetes role-based access control on Talos Linux clusters with examples for common access patterns.

---

Kubernetes RBAC controls who can do what within your cluster. While Talos Linux RBAC governs access to the operating system API, Kubernetes RBAC governs access to the Kubernetes API - managing pods, services, deployments, and all other Kubernetes resources. Setting up proper RBAC is one of the most important security tasks when running a production Talos Linux cluster.

This guide covers configuring Kubernetes RBAC from scratch, with practical examples for common scenarios.

## How Kubernetes RBAC Works

Kubernetes RBAC uses four main objects:

- **Role**: Defines a set of permissions within a single namespace
- **ClusterRole**: Defines a set of permissions across the entire cluster
- **RoleBinding**: Grants a Role to a user, group, or service account within a namespace
- **ClusterRoleBinding**: Grants a ClusterRole across the entire cluster

Permissions are additive - there are no deny rules. If no rule grants access, access is denied by default.

## Verifying RBAC is Enabled

On Talos Linux, Kubernetes RBAC is enabled by default. Verify it is active:

```bash
# Check the API server flags
talosctl -n 10.0.1.10 read /etc/kubernetes/manifests/kube-apiserver.yaml | \
  grep authorization-mode
# Should show: --authorization-mode=Node,RBAC

# Test that RBAC is enforcing permissions
kubectl auth can-i list pods
# Should return "yes" for an admin user
```

## Creating Namespaced Roles

### Developer Role

Give developers access to manage workloads in their namespace but not cluster-wide resources.

```yaml
# developer-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: development
  name: developer
rules:
  # Can manage deployments, statefulsets, and daemonsets
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets", "daemonsets", "replicasets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

  # Can manage pods
  - apiGroups: [""]
    resources: ["pods", "pods/log", "pods/exec"]
    verbs: ["get", "list", "watch", "create", "delete"]

  # Can manage services
  - apiGroups: [""]
    resources: ["services"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

  # Can manage configmaps and secrets
  - apiGroups: [""]
    resources: ["configmaps", "secrets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

  # Can view events
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["get", "list", "watch"]

  # Can manage ingresses
  - apiGroups: ["networking.k8s.io"]
    resources: ["ingresses"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

```bash
# Apply the role
kubectl apply -f developer-role.yaml
```

### Read-Only Role

For monitoring tools or stakeholders who need visibility but should not change anything.

```yaml
# readonly-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: production
  name: readonly
rules:
  - apiGroups: ["", "apps", "batch", "networking.k8s.io"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]
```

```bash
kubectl apply -f readonly-role.yaml
```

## Creating ClusterRoles

### Cluster Viewer

A cluster-wide read-only role for operations team members.

```yaml
# cluster-viewer.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cluster-viewer
rules:
  # View all standard resources
  - apiGroups: ["", "apps", "batch", "networking.k8s.io", "storage.k8s.io"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]

  # View nodes
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["get", "list", "watch"]

  # View namespaces
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["get", "list", "watch"]

  # View persistent volumes
  - apiGroups: [""]
    resources: ["persistentvolumes"]
    verbs: ["get", "list", "watch"]

  # View RBAC configuration
  - apiGroups: ["rbac.authorization.k8s.io"]
    resources: ["roles", "rolebindings", "clusterroles", "clusterrolebindings"]
    verbs: ["get", "list", "watch"]
```

### Namespace Admin

Gives full control within specific namespaces but no cluster-level access.

```yaml
# namespace-admin.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: namespace-admin
rules:
  - apiGroups: ["", "apps", "batch", "networking.k8s.io", "autoscaling", "policy"]
    resources: ["*"]
    verbs: ["*"]
  - apiGroups: ["rbac.authorization.k8s.io"]
    resources: ["roles", "rolebindings"]
    verbs: ["*"]
```

## Creating Bindings

### Bind a User to a Role

```yaml
# developer-binding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developer-binding
  namespace: development
subjects:
  - kind: User
    name: alice@example.com
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: developer
  apiGroup: rbac.authorization.k8s.io
```

### Bind a Group to a ClusterRole

```yaml
# ops-viewer-binding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: ops-viewer-binding
subjects:
  - kind: Group
    name: operations-team
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: cluster-viewer
  apiGroup: rbac.authorization.k8s.io
```

### Bind a Service Account

```yaml
# monitoring-binding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: monitoring-binding
subjects:
  - kind: ServiceAccount
    name: prometheus
    namespace: monitoring
roleRef:
  kind: ClusterRole
  name: cluster-viewer
  apiGroup: rbac.authorization.k8s.io
```

```bash
# Apply all bindings
kubectl apply -f developer-binding.yaml
kubectl apply -f ops-viewer-binding.yaml
kubectl apply -f monitoring-binding.yaml
```

## Creating User Certificates for RBAC

On Talos Linux, user authentication for Kubernetes typically uses client certificates. The Common Name (CN) becomes the username and the Organization (O) becomes the group.

```bash
# Generate a certificate for a developer
openssl genrsa -out alice.key 4096

# CN = username, O = group
openssl req -new \
  -key alice.key \
  -out alice.csr \
  -subj "/CN=alice@example.com/O=developers"

# Sign with the Kubernetes CA
# First, extract the Kubernetes CA from Talos
talosctl -n 10.0.1.10 get machineconfig -o yaml | \
  yq '.cluster.ca.crt' | base64 -d > k8s-ca.crt
talosctl -n 10.0.1.10 get machineconfig -o yaml | \
  yq '.cluster.ca.key' | base64 -d > k8s-ca.key

openssl x509 -req \
  -in alice.csr \
  -CA k8s-ca.crt \
  -CAkey k8s-ca.key \
  -CAcreateserial \
  -out alice.crt \
  -days 365 \
  -sha256

# Create a kubeconfig for Alice
kubectl config set-cluster talos-cluster \
  --server=https://k8s.example.com:6443 \
  --certificate-authority=k8s-ca.crt \
  --embed-certs=true \
  --kubeconfig=alice-kubeconfig.yaml

kubectl config set-credentials alice \
  --client-certificate=alice.crt \
  --client-key=alice.key \
  --embed-certs=true \
  --kubeconfig=alice-kubeconfig.yaml

kubectl config set-context alice-context \
  --cluster=talos-cluster \
  --user=alice \
  --namespace=development \
  --kubeconfig=alice-kubeconfig.yaml

kubectl config use-context alice-context \
  --kubeconfig=alice-kubeconfig.yaml
```

## Testing Permissions

```bash
# Test what a user can do
kubectl auth can-i list pods --as=alice@example.com --namespace=development
# Should return "yes"

kubectl auth can-i list pods --as=alice@example.com --namespace=production
# Should return "no"

kubectl auth can-i delete nodes --as=alice@example.com
# Should return "no"

# Test what a service account can do
kubectl auth can-i list pods \
  --as=system:serviceaccount:monitoring:prometheus
# Should return "yes" (bound to cluster-viewer)

# List all permissions for a user
kubectl auth can-i --list --as=alice@example.com --namespace=development
```

## Aggregated ClusterRoles

Use label-based aggregation to build composite roles.

```yaml
# base-viewer.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: aggregate-viewer
aggregationRule:
  clusterRoleSelectors:
    - matchLabels:
        rbac.example.com/aggregate-to-viewer: "true"
rules: []  # Rules are auto-filled by aggregation

---
# Custom resource viewer that aggregates into the base
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: custom-resource-viewer
  labels:
    rbac.example.com/aggregate-to-viewer: "true"
rules:
  - apiGroups: ["example.com"]
    resources: ["myresources"]
    verbs: ["get", "list", "watch"]
```

## Auditing RBAC Configuration

Regularly review your RBAC setup to catch overly permissive configurations.

```bash
# List all ClusterRoleBindings
kubectl get clusterrolebindings -o wide

# Find all users with cluster-admin access
kubectl get clusterrolebindings -o json | \
  jq -r '.items[] | select(.roleRef.name=="cluster-admin") | .subjects[]?.name'

# List all RoleBindings in a namespace
kubectl get rolebindings -n production -o wide

# Check for service accounts with excessive permissions
kubectl get clusterrolebindings -o json | \
  jq -r '.items[] | select(.subjects[]?.kind=="ServiceAccount") |
    "\(.metadata.name) -> \(.roleRef.name) (\(.subjects[].namespace)/\(.subjects[].name))"'
```

## Best Practices for Talos Linux Clusters

1. **Use groups instead of individual users**: Assign certificates to groups (via the O field) and bind roles to groups. This simplifies management.
2. **Principle of least privilege**: Start with minimal permissions and add more as needed.
3. **Separate namespaces for teams**: Use namespace isolation combined with RBAC for multi-tenant clusters.
4. **Regular audits**: Review RBAC configurations monthly.
5. **Short-lived certificates**: Issue user certificates with short validity periods and automate renewal.
6. **Avoid cluster-admin**: Limit the number of users with cluster-admin privileges. Create specific ClusterRoles instead.

## Conclusion

Kubernetes RBAC on Talos Linux follows standard Kubernetes practices but with the added security benefit of Talos's immutable OS layer. By creating appropriate Roles, ClusterRoles, and Bindings, you can give each user and service exactly the access they need. Combine this with Talos RBAC for the OS layer, and you have comprehensive access control across your entire cluster stack. Start with restrictive defaults and open up access incrementally as requirements become clear.
