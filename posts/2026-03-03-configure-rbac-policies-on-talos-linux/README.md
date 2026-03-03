# How to Configure RBAC Policies on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, RBAC, Kubernetes, Security, Access Control, Authorization

Description: A comprehensive guide to configuring Role-Based Access Control policies on Talos Linux clusters for fine-grained authorization and least-privilege access.

---

Role-Based Access Control is how Kubernetes decides what users and service accounts can do. It is the authorization layer that sits behind authentication. Once Kubernetes knows who you are (authentication), RBAC determines what you are allowed to do (authorization). On Talos Linux clusters, RBAC is enabled by default, and configuring it properly is essential for running a secure production cluster.

## How RBAC Works in Kubernetes

RBAC in Kubernetes is built around four key resources:

**Role** - Defines a set of permissions within a specific namespace. For example, "can list and get pods in the default namespace."

**ClusterRole** - Like a Role, but applies cluster-wide. For example, "can list nodes across the entire cluster."

**RoleBinding** - Grants a Role to a user, group, or service account within a namespace.

**ClusterRoleBinding** - Grants a ClusterRole to a user, group, or service account cluster-wide.

The relationship is straightforward: Roles define what can be done, and Bindings define who can do it.

## Verifying RBAC is Enabled

On Talos Linux, RBAC is enabled by default. You can verify this:

```bash
# Check the API server authorization mode
talosctl logs kube-apiserver -n <control-plane-ip> | grep authorization-mode

# You should see: --authorization-mode=Node,RBAC
```

## Understanding the Default Roles

Kubernetes ships with several built-in ClusterRoles:

```bash
# List all default ClusterRoles
kubectl get clusterroles | grep -v "system:"

# The key ones are:
# cluster-admin - Full access to everything
# admin - Full access within a namespace (no resource quotas or namespace itself)
# edit - Read/write access to most resources in a namespace
# view - Read-only access to most resources in a namespace
```

View the details of a built-in role:

```bash
# See what the 'edit' role can do
kubectl describe clusterrole edit
```

## Creating Custom Roles

Built-in roles are a good starting point, but most organizations need custom roles tailored to their specific needs.

### Example: Deployment Manager Role

A role that can manage deployments but not access secrets:

```yaml
# deployment-manager-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployment-manager
  namespace: production
rules:
  # Can manage deployments
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

  # Can view pods and their logs
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "list", "watch"]

  # Can manage services
  - apiGroups: [""]
    resources: ["services"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

  # Can manage configmaps
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

  # Cannot access secrets - intentionally omitted
```

### Example: Monitoring Role

A role for monitoring tools that need to read metrics but not modify anything:

```yaml
# monitoring-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: monitoring-reader
rules:
  - apiGroups: [""]
    resources: ["pods", "nodes", "services", "endpoints", "namespaces"]
    verbs: ["get", "list", "watch"]

  - apiGroups: ["apps"]
    resources: ["deployments", "daemonsets", "statefulsets", "replicasets"]
    verbs: ["get", "list", "watch"]

  - apiGroups: ["metrics.k8s.io"]
    resources: ["pods", "nodes"]
    verbs: ["get", "list"]

  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get"]
```

### Example: Namespace Admin Role

A role that gives full admin access within a specific namespace:

```yaml
# namespace-admin-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: namespace-admin
  namespace: team-a
rules:
  - apiGroups: ["*"]
    resources: ["*"]
    verbs: ["*"]
```

## Creating Role Bindings

Roles are useless without bindings. Here is how to bind roles to users, groups, and service accounts:

### Binding to a User

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: deploy-manager-jane
  namespace: production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: deployment-manager
subjects:
  - kind: User
    name: "jane@example.com"
    apiGroup: rbac.authorization.k8s.io
```

### Binding to a Group

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: monitoring-team-access
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: monitoring-reader
subjects:
  - kind: Group
    name: "monitoring-team"
    apiGroup: rbac.authorization.k8s.io
```

### Binding to a ServiceAccount

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ci-deploy-binding
  namespace: production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: deployment-manager
subjects:
  - kind: ServiceAccount
    name: ci-deployer
    namespace: ci-cd
```

## Implementing Least Privilege

The principle of least privilege means giving users and services only the permissions they actually need. Here is a practical approach:

### Step 1: Audit Current Access

```bash
# List all role bindings in a namespace
kubectl get rolebindings -n production -o wide

# List all cluster role bindings
kubectl get clusterrolebindings -o wide

# Check what a specific user can do
kubectl auth can-i --list --as="jane@example.com"

# Check specific permissions
kubectl auth can-i create deployments --as="jane@example.com" -n production
kubectl auth can-i delete secrets --as="jane@example.com" -n production
```

### Step 2: Start Restrictive, Then Open Up

Begin with the most restrictive permissions and add more as needed:

```yaml
# Start with view-only access
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: new-developer-view
  namespace: development
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: view
subjects:
  - kind: User
    name: "new-dev@example.com"
    apiGroup: rbac.authorization.k8s.io
```

### Step 3: Use Resource Names for Extra Precision

You can restrict access to specific named resources:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: specific-configmap-editor
  namespace: production
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    resourceNames: ["app-config", "feature-flags"]
    verbs: ["get", "update", "patch"]
```

## Restricting Access to Sensitive Resources

Some resources need extra protection:

```yaml
# Secret access should be tightly controlled
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: secret-reader
  namespace: production
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get"]
    resourceNames: ["app-tls-cert", "db-connection-string"]
    # Only specific secrets, not all secrets
```

## Testing RBAC Policies

Always test your RBAC policies before applying them to production:

```bash
# Test as a specific user
kubectl auth can-i create pods --as="developer@example.com" -n production
# Expected: yes or no

# Test as a specific group
kubectl auth can-i delete nodes --as="" --as-group="developers"
# Expected: no

# Get a full list of what a user can do in a namespace
kubectl auth can-i --list --as="developer@example.com" -n production

# Impersonate a user to test access
kubectl get pods -n production --as="developer@example.com"
```

## Aggregated ClusterRoles

Kubernetes supports aggregated ClusterRoles, which automatically combine permissions from multiple roles. This is useful for extending built-in roles:

```yaml
# Add custom resource access to the built-in 'view' role
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: custom-resource-viewer
  labels:
    rbac.authorization.k8s.io/aggregate-to-view: "true"
rules:
  - apiGroups: ["mycompany.com"]
    resources: ["widgets"]
    verbs: ["get", "list", "watch"]
```

Any ClusterRoleBinding that references the `view` role will automatically include the permissions from this aggregated role.

## Auditing RBAC

Enable audit logging to track who is accessing what:

```yaml
# Add audit policy to the API server via Talos machine config
cluster:
  apiServer:
    extraArgs:
      audit-log-path: "/var/log/kubernetes/audit.log"
      audit-log-maxage: "30"
      audit-log-maxbackup: "10"
      audit-log-maxsize: "100"
      audit-policy-file: "/etc/kubernetes/audit-policy.yaml"
```

## Conclusion

RBAC is the foundation of Kubernetes security, and configuring it correctly on Talos Linux is straightforward because it is enabled by default. Start with the built-in roles for simple setups, create custom roles as your needs grow, and always follow the principle of least privilege. Test your policies with `kubectl auth can-i`, audit access regularly, and keep your RBAC configurations in version control. A well-configured RBAC setup protects your cluster from both accidental and malicious actions.
