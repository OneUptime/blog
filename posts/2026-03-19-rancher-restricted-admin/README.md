# How to Configure Restricted Admin Role in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, RBAC, Permission, Role, Security

Description: Learn how to configure and use Rancher's restricted admin role to delegate administrative tasks without granting full platform access.

Rancher's restricted admin role provides a middle ground between the full administrator role and the standard user role on Rancher versions that still include it. Restricted admins can manage most downstream-cluster operations but cannot alter the local (management) cluster. This guide explains how to assign and use the role on supported Rancher versions.

## Prerequisites

- Rancher v2.7-v2.10 installation
- Full administrator access to assign global permissions
- Understanding of which users need elevated but not unrestricted access

## Understanding the Restricted Admin Role

The restricted admin role was introduced to address a common scenario: organizations need multiple people who can manage clusters, users, and authentication providers, but giving everyone full admin access creates unnecessary risk.

A restricted admin can:

- Manage downstream clusters (create, edit, delete)
- Manage users and assign roles
- Configure authentication providers
- Manage global catalogs and Helm repositories
- List global settings

A restricted admin cannot:

- Alter the local (management) cluster where Rancher itself runs
- Use local-cluster functions such as creating projects/namespaces or adding cluster/project members there
- Modify Rancher settings

## Step 1: Confirm Your Rancher Version Supports Restricted Admin

The built-in `restricted-admin` role is available on Rancher versions that still include it, such as v2.7 through v2.10. In Rancher v2.10 it is deprecated, and newer Rancher documentation no longer includes it.

You do not enable the role with a post-install global setting. It is a built-in global permission on supported versions.

If you are installing Rancher for the first time and want the initial bootstrapped administrator to use this role, start Rancher with:

```bash
CATTLE_RESTRICTED_DEFAULT_ADMIN=true
```

## Step 2: Assign the Restricted Admin Role

On supported versions, the restricted admin role appears in the global permissions list.

**Via the UI:**

1. Go to **Users & Authentication > Users**.
2. Find the user who should become a restricted admin.
3. Click the three-dot menu and select **Edit Config**.
4. Under **Global Permissions**, select **Restricted Administrator**.
5. Click **Save**.

**Via the API:**

```bash
# First, find the Rancher user resource name

curl -s 'https://<rancher-url>/apis/management.cattle.io/v3/users' \
  -H 'Authorization: Bearer <api-token>' | \
  jq -r '.items[] | "\(.metadata.name)\t\(.username)"' | column -t

# Assign the restricted admin role
curl -X POST 'https://<rancher-url>/apis/management.cattle.io/v3/globalrolebindings' \
  -H 'Authorization: Bearer <api-token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "apiVersion": "management.cattle.io/v3",
    "kind": "GlobalRoleBinding",
    "metadata": {
      "generateName": "grb-"
    },
    "globalRoleName": "restricted-admin",
    "userName": "<user-resource-name>"
  }'
```

## Step 3: Verify Restricted Admin Access

Log in as the restricted admin and verify the access boundaries.

**Should be accessible:**

1. Navigate to any downstream cluster - should work.
2. Go to **Users & Authentication** - should be accessible.
3. Create a new cluster - should work.
4. Add users to clusters and projects - should work.

**Should be restricted:**

1. Navigate to the **local** cluster - should be hidden or access denied.
2. Attempt to modify Rancher's infrastructure settings - should be denied.

**Via kubectl as the restricted admin:**

```bash
# Replace these with the actual context names from Rancher-generated kubeconfigs

# Should work - downstream cluster access
kubectl get nodes --context=<downstream-context>

# Should fail - local cluster access
kubectl get nodes --context=<local-context>
```

## Step 4: Configure Local Cluster Access

The built-in `restricted-admin` role does not include local cluster functions. On supported Rancher versions, the local cluster remains outside this role's scope by design.

If a user needs any local cluster access, use a custom global role instead of relying on the built-in `restricted-admin` role alone. Rancher documents `inheritedClusterRoles` as the mechanism for building custom global roles that grant downstream-cluster permissions while you explicitly add only the global resources you need.

## Step 5: Set Up a Restricted Admin Hierarchy

Create a structure where full admins manage the platform, restricted admins manage clusters, and standard users consume resources:

```plaintext
Full Administrators (2-3 people)
├── Manage Rancher installation
├── Access the local cluster
├── Configure global settings
└── Break-glass emergency access

Restricted Administrators (5-10 people)
├── Create and manage downstream clusters
├── Manage user accounts and roles
├── Configure authentication
└── Manage catalogs and repositories

Standard Users (everyone else)
├── Access assigned clusters
├── Deploy workloads in assigned projects
└── View resources in their scope
```

## Step 6: Migrate From Full Admin to Restricted Admin

If you currently have too many full administrators, migrate them to restricted admin:

```bash
#!/bin/bash
# migrate-to-restricted-admin.sh

# List current admins
echo "Current full administrators:"
kubectl get globalrolebindings -o json | \
  jq -r '.items[] | select(.globalRoleName == "admin") | .userName'

# For each user to migrate (except the core platform team):
# 1. Remove the admin global role binding
# 2. Add the restricted-admin global role binding

USER_TO_MIGRATE="<user-resource-name>"

# Find and delete the admin binding
ADMIN_BINDING=$(kubectl get globalrolebindings -o json | \
  jq -r ".items[] | select(.globalRoleName == \"admin\" and .userName == \"$USER_TO_MIGRATE\") | .metadata.name")

if [ -n "$ADMIN_BINDING" ]; then
  echo "Removing admin binding: $ADMIN_BINDING"
  kubectl delete globalrolebinding $ADMIN_BINDING

  echo "Creating restricted-admin binding"
  kubectl create -f - <<EOF
apiVersion: management.cattle.io/v3
kind: GlobalRoleBinding
metadata:
  generateName: grb-
globalRoleName: restricted-admin
userName: $USER_TO_MIGRATE
EOF

  echo "Migration complete for $USER_TO_MIGRATE"
fi
```

## Step 7: Audit Restricted Admin Actions

Monitor what restricted admins do:

Audit logging must be enabled first. By default Rancher writes audit logs to the `rancher-audit-log` sidecar; the file path below applies when `auditLog.destination=hostPath` is configured.

```bash
# Check audit logs for restricted admin actions
# Filter by users with the restricted-admin role

export RESTRICTED_ADMINS=$(kubectl get globalrolebindings -o json | \
  jq -r '.items[] | select(.globalRoleName == "restricted-admin") | .userName')

echo "Restricted admin users:"
printf '%s\n' "$RESTRICTED_ADMINS"

# Check for any attempts to access the local cluster when using hostPath audit logs
jq -r '
  select(.user.username as $u | (env.RESTRICTED_ADMINS | split("\n") | map(select(length > 0))) | index($u)) |
  select(.requestURI | contains("/k8s/clusters/local/")) |
  "\(.requestReceivedTimestamp) \(.user.username) \(.verb) \(.requestURI)"
' /var/log/rancher/audit/audit.log
```

## Step 8: Customize Restricted Admin Permissions

If the built-in restricted admin role does not exactly match your needs, create a custom global role that uses `inheritedClusterRoles` for downstream cluster access and adds only the global resources you need:

```yaml
apiVersion: management.cattle.io/v3
kind: GlobalRole
metadata:
  name: custom-restricted-admin
displayName: Custom Restricted Admin
description: "Downstream cluster-owner access without user management"
inheritedClusterRoles:
  - cluster-owner
rules:
  - apiGroups: ["management.cattle.io"]
    resources: ["clusters"]
    verbs: ["create", "get", "list", "watch", "update", "delete"]
  - apiGroups: ["catalog.cattle.io"]
    resources: ["clusterrepos"]
    verbs: ["create", "get", "list", "watch", "update", "delete"]
  - apiGroups: ["management.cattle.io"]
    resources: ["settings"]
    verbs: ["get", "list", "watch"]
```

This example grants `cluster-owner` on all downstream clusters via `inheritedClusterRoles`, adds cluster creation and catalog repository management, and keeps settings read-only without granting user or global-role management. Avoid using `*` on `globalroles`, because it also includes the `bind` and `escalate` verbs.

## Best Practices

- **Use it only on supported versions**: The built-in restricted admin role is available on Rancher versions that still include it. On newer releases, create a custom global role instead.
- **Keep full admins to 2-3**: Only the core platform team should have full administrator access.
- **Plan the role model early**: Decide whether you need the built-in role or a custom global role before you have many administrator users to migrate.
- **Document the boundary**: Make sure restricted admins understand what they can and cannot do.
- **Use with auth provider groups**: Assign the role or its custom replacement to an identity provider group for easier lifecycle management.
- **Audit the local cluster boundary**: Monitor attempts to access the local cluster and review any custom global roles for overbroad permissions.

## Conclusion

The restricted admin role in Rancher can be a secure way to delegate administrative responsibilities on Rancher versions that still include it. By assigning it carefully, migrating excess full admins, and monitoring access patterns, you create a clearer separation between platform management and downstream cluster management. On newer Rancher releases, use a custom global role instead of the built-in restricted admin role.
