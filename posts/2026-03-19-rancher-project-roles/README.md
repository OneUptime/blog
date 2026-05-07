# How to Assign Project Roles in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, RBAC, Permission, Role, Project

Description: Learn how to assign project-level roles in Rancher to give users scoped access to specific namespaces and workloads.

Rancher projects group one or more Kubernetes namespaces together and let you assign roles that apply across those namespaces. Project roles give you granular control over who can deploy workloads, manage configurations, and view resources within a defined scope. This guide covers assigning project roles through the UI, API, and Terraform.

## Prerequisites

- Rancher v2.7+ with administrator or cluster owner access
- At least one project created in a managed cluster
- Users or groups configured in your authentication provider

## Understanding Built-in Project Roles

Rancher ships with three built-in project roles:

- **Project Owner**: Full control over the project, including managing members, namespaces, and all workloads within the project.
- **Project Member**: Can manage project-scoped resources such as namespaces, workloads, services, and configurations within the project but cannot manage project membership.
- **Read Only**: Can view all resources within the project but cannot modify anything.

## Step 1: Navigate to the Project

1. Log in to the Rancher UI.
2. Click **☰ > Cluster Management**.
3. On the **Clusters** page, locate your cluster and click **Explore**.
4. Click **Cluster > Projects/Namespaces** in the left sidebar.
5. Locate the project you want to manage.

## Step 2: Access Project Members

1. On the **Projects/Namespaces** page, go to the project you want to manage.
2. Next to the **Create Namespace** button above the project name, click **☰**.
3. Select **Edit Config**.
4. Open the **Members** tab.

This displays all users and groups assigned to this project and their current roles.

## Step 3: Add a User with a Project Role

1. Click **Add** at the top right.
2. In the **Member** field, search for the user.
3. In the **Project Permissions** dropdown, choose the appropriate role:
   - **Project Owner** for full project administration
   - **Project Member** for workload management
   - **Read Only** for view-only access
   - Any custom project roles you have created
4. Click **Create**.

The user will immediately gain access to all namespaces within the project according to the assigned role.

## Step 4: Assign Project Roles to Groups

For team-based access, assign roles to groups from your identity provider:

1. On the project's **Members** tab, click **Add**.
2. Use the member type dropdown to select **Group**.
3. Search for and select the group.
4. Choose the project role.
5. Click **Create**.

Example scenarios:

- Assign the `developers` group as **Project Member** on the development project
- Assign the `qa-team` group as **Project Member** on the staging project
- Assign the `managers` group as **Read Only** on the production project

## Step 5: Assign Project Roles via the Rancher API

Use the Rancher management API for programmatic role assignment:

```bash
# List projects with their project name and backing namespace
curl -s 'https://<rancher-url>/apis/management.cattle.io/v3/projects' \
  -H 'Authorization: Bearer <api-token>' |
  jq '.items[] | {
    projectName: (.spec.clusterName + ":" + .metadata.name),
    displayName: .spec.displayName,
    backingNamespace: .status.backingNamespace
  }'

# Assign a user as Project Member
curl -X POST \
  'https://<rancher-url>/apis/management.cattle.io/v3/namespaces/<project-backing-namespace>/projectroletemplatebindings' \
  -H 'Authorization: Bearer <api-token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "apiVersion": "management.cattle.io/v3",
    "kind": "ProjectRoleTemplateBinding",
    "metadata": {
      "generateName": "prtb-",
      "namespace": "<project-backing-namespace>"
    },
    "projectName": "c-m-xxxxx:p-xxxxx",
    "roleTemplateName": "project-member",
    "userPrincipalName": "<user-principal>"
  }'
```

To assign a group:

```bash
curl -X POST \
  'https://<rancher-url>/apis/management.cattle.io/v3/namespaces/<project-backing-namespace>/projectroletemplatebindings' \
  -H 'Authorization: Bearer <api-token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "apiVersion": "management.cattle.io/v3",
    "kind": "ProjectRoleTemplateBinding",
    "metadata": {
      "generateName": "prtb-",
      "namespace": "<project-backing-namespace>"
    },
    "projectName": "c-m-xxxxx:p-xxxxx",
    "roleTemplateName": "project-member",
    "groupPrincipalName": "openldap_group://cn=developers,ou=groups,dc=example,dc=com"
  }'
```

## Step 6: Assign Project Roles via Terraform

```hcl
resource "rancher2_project_role_template_binding" "dev_member" {
  name             = "dev-project-member"
  project_id       = rancher2_project.development.id
  role_template_id = "project-member"
  user_id          = rancher2_user.developer.id
}

resource "rancher2_project_role_template_binding" "qa_readonly" {
  name               = "qa-readonly"
  project_id         = rancher2_project.staging.id
  role_template_id   = "read-only"
  group_principal_id = "openldap_group://cn=qa,ou=groups,dc=example,dc=com"
}
```

```bash
terraform plan
terraform apply
```

## Step 7: Assign Custom Project Roles

If the built-in roles are too broad, create a custom project role first and then assign it. For example, a role that only allows managing ConfigMaps:

```yaml
apiVersion: management.cattle.io/v3
kind: RoleTemplate
metadata:
  name: configmap-editor
context: project
displayName: ConfigMap Editor
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

Apply the role template:

```bash
kubectl apply -f configmap-editor-role.yaml
```

Then assign it through the UI or API as described in the previous steps. The custom role will appear in the **Project Permissions** dropdown.

## Step 8: Verify Project Role Assignments

Check that the assigned role works correctly by switching to the user's perspective:

```bash
# As the assigned user, check permissions within a project namespace
kubectl auth can-i list pods -n <project-namespace>
kubectl auth can-i create deployments.apps -n <project-namespace>

# This should be denied if the user only has project-level access
kubectl auth can-i list nodes
```

You can also verify through the Rancher UI by logging in as the assigned user and confirming they see only the expected project and its namespaces.

## Step 9: Modify or Remove Project Role Assignments

To change a role:

1. Go to the project's **Members** tab.
2. Remove the existing membership entry for the user or group.
3. Add the user or group again.
4. Assign the new role and click **Create**.

To remove access entirely:

1. Go to the project's **Members** tab.
2. Select the user or group and click **Delete**.
3. Confirm the removal.

## Best Practices

- **Map teams to projects**: Create one project per team and assign group-based roles for straightforward management.
- **Use Project Member as the default**: Most developers need Project Member access. Reserve Project Owner for team leads.
- **Separate environments**: Use different projects for development, staging, and production with appropriate role assignments for each.
- **Avoid direct namespace access**: Always assign roles at the project level rather than creating individual namespace role bindings. This keeps your RBAC configuration manageable.
- **Combine with resource quotas**: Pair project role assignments with resource quotas to prevent any single team from consuming too many cluster resources.

## Troubleshooting

If a user cannot access project resources:

1. Confirm the user is listed on the project's **Members** tab with the correct role.
2. Verify that the project contains the expected namespaces.
3. Check that the user does not have a conflicting cluster-level restriction.
4. Ensure the cluster is in an **Active** state.
5. Review RBAC bindings in the namespace: `kubectl get rolebindings -n <namespace>`.

## Conclusion

Project roles in Rancher provide scoped access control that maps naturally to team structures. By assigning users and groups to projects with appropriate roles, you give teams the access they need while keeping resources isolated. Use group-based assignments for scalability, custom roles for precision, and automation for consistency.
