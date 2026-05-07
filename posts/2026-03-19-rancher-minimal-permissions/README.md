# How to Lock Down Rancher with Minimal Permissions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, RBAC, Permission, Security, Role

Description: A comprehensive guide to hardening your Rancher installation by configuring minimal permissions at every level of the platform.

Locking down Rancher with minimal permissions reduces your attack surface and limits the blast radius of compromised accounts. This guide walks through hardening every layer of Rancher's access control, from global settings to individual namespace permissions.

## Prerequisites

- Rancher v2.7+ with administrator access
- A working authentication provider
- An inventory of users, teams, and their required access levels
- kubectl access to the Rancher management cluster

## Step 1: Harden Global Settings

Start by reviewing the platform-wide settings in the Rancher UI:

1. Go to **Global Settings**.
2. Set `auth-user-info-max-age-seconds` to `3600` (refresh user info hourly).
3. Set `auth-user-session-ttl-minutes` to `480` (8-hour session timeout).
4. Set `kubeconfig-default-token-ttl-minutes` to `480` (8-hour token TTL).
5. If you still manage older RKE1-provisioned clusters, you can also enable `cluster-template-enforcement` to require standard users to create clusters from a template.

## Step 2: Restrict Default Global Roles

Remove the Standard User default and use the built-in minimal login role instead:

1. Go to **Users & Authentication > Role Templates > Global**.
2. Edit **Standard User** and set **Default role for new users** to **No**.
3. Edit **User-Base** and set **Default role for new users** to **Yes**.
4. Add any extra built-in global permissions or custom global roles only where they are required.

Default global roles are assigned automatically only to users coming from an external authentication provider. Local users still need explicit global permissions when you create them.

## Step 3: Create Purpose-Built Cluster Roles

Replace the broad built-in cluster roles with focused custom roles:

**Cluster Viewer** - for those who need visibility:

```yaml
apiVersion: management.cattle.io/v3
kind: RoleTemplate
metadata:
  name: cluster-viewer
context: cluster
displayName: Cluster Viewer
rules:
  - apiGroups: [""]
    resources: ["nodes", "namespaces", "events", "persistentvolumes"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments", "daemonsets", "statefulsets", "replicasets"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods", "pods/log", "services", "configmaps"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["storage.k8s.io"]
    resources: ["storageclasses"]
    verbs: ["get", "list", "watch"]
```

**Cluster Operator** - for those managing cluster infrastructure:

```yaml
apiVersion: management.cattle.io/v3
kind: RoleTemplate
metadata:
  name: cluster-operator
context: cluster
displayName: Cluster Operator
rules:
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["get", "list", "watch", "update", "patch"]
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["get", "list", "watch", "create"]
  - apiGroups: ["storage.k8s.io"]
    resources: ["storageclasses"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  - apiGroups: [""]
    resources: ["persistentvolumes"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["get", "list", "watch"]
```

```bash
kubectl apply -f cluster-roles.yaml
```

## Step 4: Create Minimal Project Roles

**Application Developer** - can deploy but cannot manage secrets or network policies:

```yaml
apiVersion: management.cattle.io/v3
kind: RoleTemplate
metadata:
  name: app-developer
context: project
displayName: Application Developer
rules:
  - apiGroups: ["apps"]
    resources: ["deployments", "deployments/scale"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  - apiGroups: [""]
    resources: ["services", "configmaps"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods/exec"]
    verbs: ["create"]
  - apiGroups: ["networking.k8s.io"]
    resources: ["ingresses"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  - apiGroups: ["batch"]
    resources: ["jobs", "cronjobs"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
```

**Config Viewer** - can only view configurations:

```yaml
apiVersion: management.cattle.io/v3
kind: RoleTemplate
metadata:
  name: config-viewer
context: project
displayName: Configuration Viewer
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets", "daemonsets"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["services", "pods"]
    verbs: ["get", "list", "watch"]
```

```bash
kubectl apply -f project-roles.yaml
```

## Step 5: Disable Unused Built-in Roles

You cannot delete built-in roles, but you can prevent future assignment of cluster and project roles by locking them:

1. Go to **Users & Authentication > Role Templates**.
2. Open the **Cluster** or **Project/Namespaces** tab.
3. For each built-in role that you do not want assigned, click the three-dot menu and select **Edit Config**.
4. Set **Locked** to **Yes** and save.

Global roles cannot be locked.

## Step 6: Restrict API Key Creation

Limit who can create API keys, as API keys have their own TTL and are not governed by the Rancher UI session timeout:

1. When using the Rancher API, always set an expiration on API keys and keep `auth-token-max-ttl-minutes` aligned with your maximum allowed lifetime.
2. On Rancher v2.13 and later, audit existing API keys regularly:

```bash
# List all API keys (tokens)
kubectl get tokens.ext.cattle.io -o wide
```

Remove API keys that do not have an expiration date set:

```bash
# Find tokens without expiration
kubectl get tokens.ext.cattle.io -o json | \
  jq -r '.items[] | select(.status.expiresAt == null or .status.expiresAt == "") | .metadata.name'
```

On older Rancher releases, the legacy `tokens.management.cattle.io` resource is used instead.

## Step 7: Enable Audit Logging

Track all access and changes with audit logging:

```yaml
# In your Rancher Helm values
auditLog:
  enabled: true
  level: 2
  destination: hostPath
  hostPath: /var/log/rancher/audit
  maxAge: 90
  maxBackup: 30
  maxSize: 100
```

Level 2 logs request metadata and response status, providing a good balance between detail and volume.

## Step 8: Restrict kubectl Shell Access

The Rancher UI includes a kubectl shell that uses the logged-in user's permissions. Ensure this is limited by the user's RBAC:

- Users with minimal roles will have limited kubectl access through the shell.
- Cluster Viewers cannot modify resources even through the shell.
- The shell respects all role bindings, but it also creates Rancher `kubectl-shell-*` tokens, so review those alongside other API keys.

## Step 9: Apply Network-Level Restrictions

Complement RBAC with network policies in your Rancher projects:

1. Go to the project settings.
2. Enable **Project Network Isolation**.
3. On CNIs that enforce Kubernetes `NetworkPolicy`, this blocks cross-project pod traffic by default.

## Step 10: Validate the Lockdown

Run a comprehensive permission check:

```bash
#!/bin/bash
# validate-lockdown.sh

echo "=== Validating Rancher Lockdown ==="

# Check default roles
echo ""
echo "1. Default Global Roles:"
kubectl get globalroles -o json | \
  jq -r '.items[] | select(.newUserDefault == true) | "  DEFAULT: \(.displayName)"'

# Check admin count
echo ""
echo "2. Admin Count:"
admin_count=$(kubectl get globalrolebindings -o json | jq '[.items[] | select(.globalRoleName == "admin")] | length')
echo "  Administrators: $admin_count"
if [ "$admin_count" -gt 5 ]; then
  echo "  WARNING: More than 5 administrators detected"
fi

# Check for wildcard roles
echo ""
echo "3. Wildcard Permissions:"
kubectl get roletemplates -o json | \
  jq -r '.items[] | select(.rules[]? | .verbs[]? == "*" and .resources[]? == "*") | "  WARNING: \(.displayName) has wildcard permissions"'

# Check session settings
echo ""
echo "4. Session Settings:"
kubectl get setting kubeconfig-default-token-ttl-minutes -o jsonpath='  Token TTL: {.value} minutes{"\n"}'
kubectl get setting auth-user-session-ttl-minutes -o jsonpath='  Session TTL: {.value} minutes{"\n"}'

echo ""
echo "=== Validation Complete ==="
```

## Best Practices

- **Default deny**: Configure Rancher so that new users get no access by default.
- **Purpose-built roles**: Create roles for specific job functions rather than using broad built-in roles.
- **Short session timeouts**: Configure session and token timeouts appropriate for your security requirements.
- **Audit everything**: Enable audit logging and review it regularly.
- **No wildcards**: Never use wildcard verbs or resources in custom roles.
- **Regular reviews**: Audit permissions quarterly and after any organizational changes.
- **Document exceptions**: When broader access is needed, document the justification and set a review date.

## Conclusion

Locking down Rancher with minimal permissions is a multi-layered process that spans global settings, role definitions, and individual assignments. By restricting defaults, creating focused roles, enabling audit logging, and validating the configuration regularly, you build a secure Kubernetes management platform where every user has exactly the access they need and nothing more.
