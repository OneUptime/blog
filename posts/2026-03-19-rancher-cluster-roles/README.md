# How to Assign Cluster Roles in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, RBAC, Permission, Role, Security

Description: A step-by-step guide to assigning cluster roles in Rancher for controlling user access at the cluster level.

Cluster roles in Rancher define what users can do within a specific Kubernetes cluster. Unlike global roles, which apply across the entire Rancher instance, cluster roles are scoped to individual clusters. This guide explains how to assign both built-in and custom cluster roles to users and groups.

## Prerequisites

- A running Rancher v2.7+ installation
- Administrator or cluster owner access
- At least one downstream cluster managed by Rancher
- Users or groups configured in your authentication provider

## Understanding Built-in Cluster Roles

Rancher provides two primary cluster roles, along with several built-in custom cluster roles for more granular access:

- **Cluster Owner**: Full administrative access to the cluster, including the ability to manage members, projects, and all resources.
- **Cluster Member**: Can create projects and view cluster-level resources, but does not have full cluster administration privileges.
- **Built-in custom cluster roles**: Rancher also includes more granular roles such as **Create Projects**, **View Nodes**, and **View Cluster Members**.

These roles serve as the foundation for cluster-level access control. You can also create your own custom cluster roles for more specialized permission sets.

## Step 1: Navigate to the Cluster

1. Log in to the Rancher UI.
2. Click the **hamburger menu** in the top-left corner.
3. Select **Cluster Management**.
4. Find the cluster where you want to assign roles, then click **⋮ > Edit Config**.

## Step 2: Access Member Roles

1. In the cluster configuration view, open the **Member Roles** tab.

This page shows all users and groups currently assigned to the cluster along with their roles.

## Step 3: Add a User with a Cluster Role

1. Click **Add Member** in the top-right corner of the **Member Roles** tab.
2. In the **Member** field, search for the user by username or display name.
3. In the **Cluster Permissions** dropdown, select the desired role:
   - **Cluster Owner** for full cluster administration
   - **Cluster Member** for project creation and resource viewing
   - Any built-in or **custom cluster roles** you have created
4. Click **Create** to save the assignment.

The user will now have the assigned permissions when they access this cluster through Rancher.

## Step 4: Assign Cluster Roles to Groups

If you have an external authentication provider configured (such as LDAP, Active Directory, or SAML), you can assign cluster roles to entire groups:

1. Go to the **Member Roles** tab and click **Add Member**.
2. Use the member type selector to switch from **User** to **Group**.
3. Search for and select the group from your authentication provider.
4. Choose the cluster role to assign.
5. Click **Create**.

All members of that group will inherit the cluster role. This is the recommended approach for organizations with many users.

## Step 5: Assign Cluster Roles via the Rancher API

For automation on Rancher v2.8+, you can assign cluster roles using the Rancher Kubernetes API (RK-API). First, get your API token from **User Avatar > Account & API Keys**.

```bash
# Assign a user to a cluster with the Cluster Member role

curl -X POST \
  'https://<rancher-url>/apis/management.cattle.io/v3/namespaces/c-m-xxxxx/clusterroletemplatebindings' \
  -H 'Authorization: Bearer <api-token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "apiVersion": "management.cattle.io/v3",
    "kind": "ClusterRoleTemplateBinding",
    "metadata": {
      "generateName": "cluster-member-binding-",
      "namespace": "c-m-xxxxx"
    },
    "clusterName": "c-m-xxxxx",
    "roleTemplateName": "cluster-member",
    "userPrincipalName": "local://<principal-id>"
  }'
```

To find the cluster ID, navigate to the cluster in Rancher and check the URL, or use:

```bash
curl -s 'https://<rancher-url>/apis/management.cattle.io/v3/clusters' \
  -H 'Authorization: Bearer <api-token>' | jq '.items[] | {id: .metadata.name, name: .spec.displayName}'
```

## Step 6: Assign Cluster Roles via Terraform

If you manage Rancher with Terraform, use the `rancher2_cluster_role_template_binding` resource:

```hcl
resource "rancher2_cluster_role_template_binding" "dev_cluster_member" {
  name             = "dev-cluster-member"
  cluster_id       = rancher2_cluster.dev.id
  role_template_id = "cluster-member"
  user_id          = rancher2_user.developer.id
}

resource "rancher2_cluster_role_template_binding" "ops_cluster_owner" {
  name             = "ops-cluster-owner"
  cluster_id       = rancher2_cluster.production.id
  role_template_id = "cluster-owner"
  group_principal_id = "openldap_group://cn=ops,ou=groups,dc=example,dc=com"
}
```

Apply the configuration:

```bash
terraform plan
terraform apply
```

## Step 7: Modify an Existing Cluster Role Assignment

To change a user's cluster role:

1. Go to **Cluster Management** for the target cluster and open **⋮ > Edit Config**.
2. Open the **Member Roles** tab.
3. Delete the existing user or group membership.
4. Click **Add Member** and recreate the assignment with the new cluster role.

The updated permissions take effect immediately after the new assignment is created.

## Step 8: Remove a Cluster Role Assignment

To remove a user from a cluster:

1. Go to **Cluster Management** for the target cluster and open **⋮ > Edit Config**.
2. Open the **Member Roles** tab.
3. Select the user or group.
4. Click **Delete**.
5. Confirm the deletion.

The user will immediately lose access to the cluster through Rancher.

## Step 9: Assign Multiple Cluster Roles

A user can have multiple cluster roles assigned simultaneously. The effective permissions are the union of all assigned roles. For example, if a user has both a custom read-only role and a custom role that allows managing deployments, they will be able to view everything and manage deployments.

To assign multiple roles:

1. Go to **Member Roles** and click **Add Member**.
2. Select the user or group.
3. In **Cluster Permissions**, add each role you want to assign.
4. Click **Create**.

## Verifying Cluster Role Assignments

After assigning roles, verify they work correctly:

```bash
# Log in with the assigned user's kubeconfig for the target cluster and check permissions
kubectl auth can-i list pods --namespace default
kubectl auth can-i create deployments --namespace default
kubectl auth can-i delete nodes
```

You can also verify the Rancher binding directly through the API:

```bash
curl -s \
  'https://<rancher-url>/apis/management.cattle.io/v3/namespaces/<cluster-id>/clusterroletemplatebindings' \
  -H 'Authorization: Bearer <api-token>' | jq '.items[] | {name: .metadata.name, role: .roleTemplateName, user: .userPrincipalName, group: .groupPrincipalName}'
```

## Best Practices

- **Use groups over individual users**: Assigning roles to groups from your identity provider is easier to manage and audit.
- **Start with Cluster Member or a narrower custom role**: Grant Cluster Owner sparingly.
- **Document role assignments**: Keep records of who has access to which clusters and why.
- **Review regularly**: Audit cluster role assignments quarterly to remove stale access.
- **Use automation**: Manage role assignments through Terraform or the API for consistency across environments.

## Troubleshooting

If a user cannot access a cluster after role assignment:

1. Verify the role binding exists: Go to **Member Roles** and confirm the user appears.
2. Check the authentication provider: Ensure the user's account is active.
3. Confirm the assigned role includes the action they are trying to perform: **Cluster Member** can create projects and view cluster-level resources, but it is not equivalent to **Cluster Owner**.
4. Check for conflicting admission policies: **Pod Security Admission** or OPA/Gatekeeper rules might still restrict actions that Rancher RBAC allows.

## Conclusion

Assigning cluster roles in Rancher is the primary mechanism for controlling who can do what within your Kubernetes clusters. By using built-in roles for common scenarios and custom roles for specialized needs, you can implement precise access controls. Prefer group-based assignments for scalability and use automation tools like Terraform for consistency across your infrastructure.
