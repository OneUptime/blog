# How to Restrict User Access to Specific Clusters in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, RBAC, Permission, Security, Role

Description: Learn how to limit users to only the clusters they need in Rancher by configuring cluster-level role bindings and removing broad access.

When managing multiple Kubernetes clusters through Rancher, you often need to ensure that users can only access specific clusters. A developer working on the staging environment should not see or interact with production clusters. This guide explains how to restrict user access so that each user or team only sees the clusters they are authorized to use.

## Prerequisites

- Rancher v2.8+ with administrator access
- Multiple downstream clusters managed by Rancher
- An external authentication provider configured
- Users or groups that need scoped access

## How Cluster Access Works in Rancher

Users can access a cluster in Rancher only if one of the following is true:

1. They have the **Administrator** global role (which grants access to everything).
2. They have a custom **GlobalRole** that grants **inheritedClusterRoles** on downstream clusters.
3. They have a **Cluster Role Template Binding** for that specific cluster.
4. They have a **Project Role Template Binding** within a project on that cluster.

If none of these conditions are met, the user cannot see or interact with the cluster.

## Step 1: Review Default Cluster-Wide Access on Global Roles

Rancher does not grant access to existing clusters to non-administrative users by default. However, a GlobalRole can grant permissions on every downstream cluster through `inheritedClusterRoles`. Review any default global roles and remove cluster-wide inherited roles you do not want new users to receive:

1. Go to **Users & Authentication > Role Templates** and select the **Global** tab.
2. Review the roles marked as default for new users.
3. If a custom default global role includes inherited cluster roles, edit or replace it.

Via kubectl:

```bash
kubectl get globalroles.management.cattle.io \
  -o custom-columns=NAME:.metadata.name,NEW_USER_DEFAULT:.newUserDefault,INHERITED_CLUSTER_ROLES:.inheritedClusterRoles
```

Only global roles that should grant access to every downstream cluster should have `inheritedClusterRoles` set.

## Step 2: Remove the Standard User Global Role as Default

For users who sign in through an external authentication provider, Rancher assigns the **Standard User** global role by default. This role allows users to log in and create clusters, so remove it if you want login-only access by default:

1. Go to **Users & Authentication > Role Templates** and select the **Global** tab.
2. Find **Standard User**.
3. Click the three-dot menu and select **Edit Config**.
4. Set **New User Default** to **No**.
5. Click **Save**.
6. If you want login-only access by default, ensure **User-Base** is the only default global role.

## Step 3: Grant Access to a Specific Cluster

Now grant access to individual clusters on a per-user or per-group basis.

**Via the UI:**

1. Click **☰ > Cluster Management**.
2. Go to the target cluster and click **⋮ > Edit Config**.
3. In the **Member Roles** tab, click **Add Member**.
4. Search for the user or group.
5. Select the appropriate cluster role (for example, **Cluster Member** or a custom cluster role).
6. Click **Create**.

If this is their only cluster or project membership, the user will only see this specific cluster in their Rancher dashboard.

**Via kubectl:**

```yaml
apiVersion: management.cattle.io/v3
kind: ClusterRoleTemplateBinding
metadata:
  generateName: crtb-
  namespace: c-m-xxxxx  # cluster ID
clusterName: c-m-xxxxx
roleTemplateName: cluster-member
userPrincipalName: "local://u-xxxxx"
```

```bash
kubectl create -f cluster-access.yaml
```

## Step 4: Restrict Access Using Groups

Map your organizational structure to cluster access using groups:

```bash
# Grant the dev-team group access to the development cluster

curl -X POST 'https://<rancher-url>/v3/clusterroletemplatebindings' \
  -H 'Authorization: Bearer <api-token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "clusterId": "c-m-dev01",
    "roleTemplateId": "cluster-member",
    "groupPrincipalId": "openldap_group://cn=dev-team,ou=groups,dc=example,dc=com"
  }'

# Grant the ops-team group access to the production cluster
curl -X POST 'https://<rancher-url>/v3/clusterroletemplatebindings' \
  -H 'Authorization: Bearer <api-token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "clusterId": "c-m-prod01",
    "roleTemplateId": "cluster-member",
    "groupPrincipalId": "openldap_group://cn=ops-team,ou=groups,dc=example,dc=com"
  }'
```

## Step 5: Manage Access with Terraform

For infrastructure-as-code workflows, manage cluster access through Terraform:

```hcl
# Development cluster - accessible by developers
resource "rancher2_cluster_role_template_binding" "dev_access" {
  name               = "dev-team-access"
  cluster_id         = rancher2_cluster.development.id
  role_template_id   = "cluster-member"
  group_principal_id = data.rancher2_principal.dev_team.id
}

# Staging cluster - accessible by developers and QA
resource "rancher2_cluster_role_template_binding" "staging_dev_access" {
  name               = "staging-dev-access"
  cluster_id         = rancher2_cluster.staging.id
  role_template_id   = "cluster-member"
  group_principal_id = data.rancher2_principal.dev_team.id
}

resource "rancher2_cluster_role_template_binding" "staging_qa_access" {
  name               = "staging-qa-access"
  cluster_id         = rancher2_cluster.staging.id
  role_template_id   = "cluster-member"
  group_principal_id = data.rancher2_principal.qa_team.id
}

# Production cluster - accessible only by ops
resource "rancher2_cluster_role_template_binding" "prod_access" {
  name               = "prod-ops-access"
  cluster_id         = rancher2_cluster.production.id
  role_template_id   = "cluster-member"
  group_principal_id = data.rancher2_principal.ops_team.id
}
```

## Step 6: Verify Access Restrictions

Log in as a restricted user and verify they can only see their assigned clusters:

1. Open an incognito browser window.
2. Log in with the restricted user's credentials.
3. The cluster list should show only the clusters the user has been granted access to.
4. Attempting to access another cluster's URL directly should return a forbidden error.

From the command line:

```bash
# As the restricted user, list accessible clusters
curl -s 'https://<rancher-url>/v3/clusters' \
  -H 'Authorization: Bearer <user-api-token>' | jq '.data[] | {name, id}'
```

The output should only contain clusters where the user has a cluster or project role binding.

## Step 7: Revoke Cluster Access

To remove a user's cluster membership:

**Via the UI:**
1. Click **☰ > Cluster Management**.
2. Go to the cluster and click **⋮ > Edit Config**.
3. In the **Member Roles** tab, find the user or group.
4. Click the three-dot menu and select **Delete**.

**Via kubectl:**

```bash
# Find the binding
kubectl get clusterroletemplatebindings.management.cattle.io -n <cluster-id> \
  -o custom-columns=NAME:.metadata.name,USER:.userName,USER_PRINCIPAL:.userPrincipalName,GROUP:.groupName,GROUP_PRINCIPAL:.groupPrincipalName,ROLE:.roleTemplateName \
  | grep <username-or-group>

# Delete it
kubectl delete clusterroletemplatebindings.management.cattle.io <binding-name> -n <cluster-id>
```

If the user also has project memberships on the same cluster, remove the related **ProjectRoleTemplateBindings** as well. Rancher retains project access when only cluster membership is revoked.

## Step 8: Audit Cluster Access

Regularly audit who has access to each cluster:

```bash
#!/bin/bash
# List cluster-level and project-level access for each cluster
for cluster in $(kubectl get clusters.management.cattle.io -o jsonpath='{.items[*].metadata.name}'); do
  echo "=== Cluster: $cluster ==="

  echo "-- ClusterRoleTemplateBindings --"
  kubectl get clusterroletemplatebindings.management.cattle.io -n "$cluster" \
    -o custom-columns=USER:.userName,USER_PRINCIPAL:.userPrincipalName,GROUP:.groupName,GROUP_PRINCIPAL:.groupPrincipalName,ROLE:.roleTemplateName

  echo "-- ProjectRoleTemplateBindings --"
  for project_ns in $(kubectl get projects.management.cattle.io -n "$cluster" -o jsonpath='{.items[*].status.backingNamespace}'); do
    kubectl get projectroletemplatebindings.management.cattle.io -n "$project_ns" \
      -o custom-columns=PROJECT:.projectName,USER:.userName,USER_PRINCIPAL:.userPrincipalName,GROUP:.groupName,GROUP_PRINCIPAL:.groupPrincipalName,ROLE:.roleTemplateName
  done

  echo ""
done
```

## Best Practices

- **Default deny**: Remove broad default global permissions and avoid default global roles with `inheritedClusterRoles`.
- **Use groups**: Map cluster access to identity provider groups for easier management.
- **Separate environments**: Never give development teams access to production clusters unless they have an operational role.
- **Read-only where possible**: Use project **Read Only** or custom cluster roles for stakeholders who need visibility without the ability to make changes.
- **Regular audits**: Run monthly audits to identify and remove stale cluster access.
- **Use Terraform**: Manage access as code so that changes are tracked, reviewed, and reproducible.

## Conclusion

Restricting cluster access in Rancher is essential for maintaining security boundaries between environments and teams. By removing default access, assigning cluster roles explicitly, and using group-based bindings, you ensure that users can only interact with the clusters they are authorized to use. Combine this with regular audits to keep your access controls current.
