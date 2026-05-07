# How to Create Global Roles in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, RBAC, Permission, Role, Security

Description: A practical guide to creating and managing global roles in Rancher for controlling platform-wide access and permissions.

Global roles in Rancher control what users can do at the platform level, outside the scope of any specific cluster or project. These roles determine whether a user can create clusters, manage authentication providers, access the Rancher catalog, or perform other system-wide operations. This guide shows you how to create, assign, and manage global roles.

## Prerequisites

- Rancher v2.7+ installation
- Administrator access to Rancher
- Understanding of your organization's platform-level access requirements

## Understanding Built-in Global Roles

Rancher includes several built-in global roles:

- **Administrator**: Full access to the entire Rancher instance, including all clusters, projects, settings, and user management.
- **Standard User**: Can create new clusters and is granted cluster owner access to clusters they create. Can log in and access available clusters and projects.
- **User-Base**: Provides the minimum basic login access that other global permissions build on.

Additional built-in global roles include:
- **Manage Catalogs**: Allows managing Helm chart repositories
- **Manage Cluster Drivers**: Allows adding and configuring cluster provisioning drivers
- **Manage Node Drivers**: Allows managing node drivers for infrastructure provisioning

## Step 1: Review Existing Global Roles

Before creating new roles, review what already exists:

1. Log in to the Rancher UI as an administrator.
2. Click the **hamburger menu**.
3. Go to **Users & Authentication**.
4. In the left navigation bar, click **Role Templates**.
5. Select the **Global** tab.

This lists all built-in and custom global roles. Review the permissions of each to identify gaps.

## Step 2: Create a Custom Global Role via the UI

Let us create a global role that allows a user to manage authentication configuration but nothing else.

1. On the **Role Templates** page, make sure the **Global** tab is selected, then click **Create Global Role**.
2. Fill in the basic information:
   - **Name**: `auth-manager`
   - **Description**: `Can manage authentication providers`
3. Under **Grant Resources**, add rules for authentication management:
   - **New Rule**: Select the API resources related to authentication.
4. Configure the permissions:

```plaintext
Resource: authconfigs
Verbs: get, list, watch, update
```

5. Click **Create**.

## Step 3: Create a Custom Global Role via kubectl

For more control, create global roles using kubectl against the Rancher management cluster:

```yaml
apiVersion: management.cattle.io/v3
kind: GlobalRole
metadata:
  name: catalog-viewer
displayName: Catalog Viewer
description: "Can view Helm chart repositories and catalog resources"
rules:
  - apiGroups:
      - "catalog.cattle.io"
    resources:
      - clusterrepos
      - operations
      - releases
      - apps
    verbs:
      - get
      - list
      - watch
newUserDefault: false
```

Apply the manifest:

```bash
kubectl apply -f catalog-viewer-role.yaml
```

## Step 4: Create a Global Role for Cluster Provisioning

A common need is to let certain users provision clusters without giving them full admin access:

```yaml
apiVersion: management.cattle.io/v3
kind: GlobalRole
metadata:
  name: cluster-provisioner
displayName: Cluster Provisioner
description: "Can create clusters using Rancher provisioning resources but not manage users or settings"
rules:
  - apiGroups:
      - "management.cattle.io"
    resources:
      - clusters
    verbs:
      - create
  - apiGroups:
      - "provisioning.cattle.io"
    resources:
      - clusters
    verbs:
      - create
  - apiGroups:
      - "management.cattle.io"
    resources:
      - templates
      - templateversions
      - nodedrivers
      - kontainerdrivers
      - podsecurityadmissionconfigurationtemplates
    verbs:
      - get
      - list
      - watch
  - apiGroups:
      - "catalog.cattle.io"
    resources:
      - clusterrepos
    verbs:
      - get
      - list
      - watch
  - apiGroups:
      - "rke-machine-config.cattle.io"
    resources:
      - "*"
    verbs:
      - create
  - apiGroups:
      - "rke.cattle.io"
    resources:
      - etcdsnapshots
    verbs:
      - get
      - list
      - watch
namespacedRules:
  cattle-global-data:
    - apiGroups:
        - ""
      resources:
        - secrets
      verbs:
        - create
  fleet-default:
    - apiGroups:
        - ""
      resources:
        - secrets
      verbs:
        - create
newUserDefault: false
```

```bash
kubectl apply -f cluster-provisioner-role.yaml
```

## Step 5: Set a Global Role as Default for New Users

When a user from an external authentication provider logs in for the first time, Rancher assigns them the default global roles. You can configure which roles are assigned by default.

Via the UI:

1. Go to **Users & Authentication > Role Templates**.
2. Make sure the **Global** tab is selected, then find the role you want to set as default.
3. Click the **three-dot menu** and select **Edit Config**.
4. Check the **Yes: Default role for new users** option.
5. Click **Save**.

Via kubectl, set `newUserDefault: true` on the GlobalRole:

```yaml
newUserDefault: true
```

For local users, Rancher does not apply default global roles automatically; you assign global permissions when you create or edit the user.

Be cautious with this setting. Only roles with minimal permissions should be set as defaults.

## Step 6: Assign a Global Role to a User

1. Go to **Users & Authentication > Users**.
2. Find the user and click the **three-dot menu**.
3. Select **Edit Config**.
4. Under **Global Permissions**, use the **Built-in** and **Custom** sections to check or uncheck the desired global roles.
5. Click **Save**.

Via the v3 API:

```bash
curl -X POST \
  'https://<rancher-url>/v3/globalrolebindings' \
  -H 'Authorization: Bearer <api-token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "globalRoleId": "catalog-viewer",
    "userId": "<user-id>"
  }'
```

## Step 7: Assign Global Roles to Groups

For LDAP or SAML-based authentication, assign global roles to groups with the v3 API:

```bash
curl -X POST \
  'https://<rancher-url>/v3/globalrolebindings' \
  -H 'Authorization: Bearer <api-token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "globalRoleId": "cluster-provisioner",
    "groupPrincipalId": "openldap_group://cn=platform-team,ou=groups,dc=example,dc=com"
  }'
```

## Step 8: List and Audit Global Role Assignments

Check who has which global roles:

```bash
# List all global role bindings

kubectl get globalrolebindings -o custom-columns=NAME:.metadata.name,ROLE:.globalRoleName,USER:.userName,GROUP:.groupPrincipalName

# List all global roles
kubectl get globalroles -o custom-columns=NAME:.metadata.name,DISPLAY:.displayName,DEFAULT:.newUserDefault
```

## Common Custom Global Role Examples

**Settings Viewer** - can view Rancher settings but not change them:

```yaml
apiVersion: management.cattle.io/v3
kind: GlobalRole
metadata:
  name: settings-viewer
displayName: Settings Viewer
rules:
  - apiGroups: ["management.cattle.io"]
    resources: ["settings"]
    verbs: ["get", "list", "watch"]
```

**User Manager** - can manage users and their role assignments:

```yaml
apiVersion: management.cattle.io/v3
kind: GlobalRole
metadata:
  name: user-manager
displayName: User Manager
rules:
  - apiGroups: ["management.cattle.io"]
    resources: ["users", "globalrolebindings"]
    verbs: ["*"]
  - apiGroups: ["management.cattle.io"]
    resources: ["globalroles"]
    verbs: ["get", "list", "watch"]
```

## Best Practices

- **Minimize global roles**: Most users only need the `User-Base` global role plus cluster or project-level roles.
- **Do not modify built-in roles**: Create new global roles instead of editing Rancher's defaults.
- **Audit default roles**: Review which global roles are marked as defaults to avoid granting new users excessive permissions.
- **Separate duties**: Create focused global roles for specific tasks like catalog management, user management, and cluster provisioning rather than broad roles.
- **Use groups**: Assign global roles to groups from your identity provider for easier lifecycle management.

## Conclusion

Global roles in Rancher control platform-level access and should be configured carefully. By creating custom global roles for specific responsibilities, you can give teams the access they need at the Rancher level without granting full administrator privileges. Always follow the principle of least privilege and prefer group-based assignments for scalability.
