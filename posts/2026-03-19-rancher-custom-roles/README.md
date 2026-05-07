# How to Create Custom Roles in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, RBAC, Permission, Role, Security

Description: Learn how to create custom roles in Rancher to define fine-grained access control tailored to your organization's needs.

Rancher provides a flexible role-based access control (RBAC) system that goes beyond Kubernetes' built-in RBAC. While Rancher ships with several default roles, you will often need custom roles that match your organization's specific access requirements. This guide walks you through creating custom roles at every level in Rancher.

## Prerequisites

Before you begin, make sure you have the following in place:

- A running Rancher v2.7+ installation
- Administrator access to Rancher
- At least one downstream cluster managed by Rancher
- Basic understanding of Kubernetes RBAC concepts

## Understanding Rancher Role Types

Rancher supports three types of roles:

- **Global Roles** apply across the entire Rancher instance
- **Cluster Roles** apply within a specific cluster
- **Project Roles** apply within a specific project inside a cluster

Custom roles can be created at each of these levels. When you create a custom role, you select which Kubernetes API permissions to include.

## Step 1: Navigate to Role Management

Log in to the Rancher UI and navigate to the role management section:

1. Click the **hamburger menu** (three horizontal lines) in the top-left corner.
2. Select **Users & Authentication** under the **Configuration** section.
3. In the left navigation bar, click **Role Templates** to see all existing role templates.

You will see three tabs: **Global**, **Cluster**, and **Project/Namespaces**. Each tab lets you manage roles at that scope.

## Step 2: Create a Custom Cluster Role

Let us create a custom cluster role that allows a user to view deployments, daemonsets, statefulsets, and replicasets, but only manage deployments.

1. Click the **Cluster** tab under **Role Templates**.
2. Click **Create Cluster Role** in the top-right corner.
3. Fill in the following fields:
   - **Name**: `deployment-manager`
   - **Description**: `Can view deployments, daemonsets, statefulsets, and replicasets, and manage deployments`
4. Under **Grant Resources**, add the following rules:

For viewing deployments, daemonsets, statefulsets, and replicasets:

```yaml
apiGroups: ["apps"]
resources: ["deployments", "daemonsets", "statefulsets", "replicasets"]
verbs: ["get", "list", "watch"]
```

For managing deployments:

```yaml
apiGroups: ["apps"]
resources: ["deployments"]
verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

For scaling deployments:

```yaml
apiGroups: ["apps"]
resources: ["deployments/scale"]
verbs: ["get", "update", "patch"]
```

5. Click **Create** to save the role.

## Step 3: Create a Custom Cluster Role via kubectl

You can also create custom roles using kubectl against the Rancher management cluster. Create a file named `custom-cluster-role.yaml`:

```yaml
apiVersion: management.cattle.io/v3
kind: RoleTemplate
metadata:
  name: deployment-manager
spec:
  context: cluster
  displayName: Deployment Manager
  rules:
    - apiGroups:
        - "apps"
      resources:
        - deployments
        - daemonsets
        - statefulsets
        - replicasets
      verbs:
        - get
        - list
        - watch
    - apiGroups:
        - "apps"
      resources:
        - deployments
      verbs:
        - get
        - list
        - watch
        - create
        - update
        - patch
        - delete
    - apiGroups:
        - "apps"
      resources:
        - deployments/scale
      verbs:
        - get
        - update
        - patch
```

Apply this manifest:

```bash
kubectl apply -f custom-cluster-role.yaml
```

The role will now appear in the Rancher UI under **Role Templates > Cluster**.

## Step 4: Create a Custom Project Role

Project roles are scoped to namespaces within a Rancher project. Create a project role for managing ConfigMaps and Secrets:

1. Go to **Users & Authentication > Role Templates > Project/Namespaces**.
2. Click **Create Project/Namespaces Role**.
3. Set the name to `config-manager`.
4. Add these rules:

```yaml
apiGroups: [""]
resources: ["configmaps", "secrets"]
verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

5. Click **Create**.

Via kubectl:

```yaml
apiVersion: management.cattle.io/v3
kind: RoleTemplate
metadata:
  name: config-manager
spec:
  context: project
  displayName: Config Manager
  rules:
    - apiGroups:
        - ""
      resources:
        - configmaps
        - secrets
      verbs:
        - get
        - list
        - watch
        - create
        - update
        - patch
        - delete
```

## Step 5: Create Roles That Inherit From Existing Roles

Rancher allows custom cluster and project roles to inherit permissions from other roles. This is useful when you want to extend a built-in role with additional permissions.

```yaml
apiVersion: management.cattle.io/v3
kind: RoleTemplate
metadata:
  name: extended-project-member
spec:
  context: project
  displayName: Extended Project Member
  roleTemplateNames:
    - project-member
  rules:
    - apiGroups:
        - "networking.k8s.io"
      resources:
        - networkpolicies
      verbs:
        - get
        - list
        - watch
        - create
        - update
        - patch
        - delete
```

This role inherits all permissions from the built-in `project-member` role and adds the ability to manage network policies.

## Step 6: Assign the Custom Role to a User

Once the custom role exists, assign it to a user:

1. Navigate to the cluster or project where you want to assign the role.
2. Click on **Cluster Members** or open the project's **Members** tab.
3. Click **Add**.
4. Search for the user by name or email.
5. Select your custom role from the **Cluster/Project Permissions** dropdown.
6. Click **Create**.

## Step 7: Verify the Custom Role

To verify that the role works as expected, log in as the user who was assigned the custom role and test the permissions:

```bash
# Should succeed for deployment-manager role

kubectl get deployments -n default

# Should succeed
kubectl create deployment test --image=nginx -n default

# Should be denied (no pod management permissions)
kubectl delete pod <pod-name> -n default
```

## Best Practices for Custom Roles

When designing custom roles, keep these guidelines in mind:

- **Follow least privilege**: Only grant permissions that the user actually needs. Avoid wildcard permissions unless absolutely necessary.
- **Use descriptive names**: Name roles so that their purpose is immediately clear to administrators who manage them later.
- **Document your roles**: Add meaningful descriptions to every custom role explaining its intended use case.
- **Leverage inheritance**: Build on existing roles using `roleTemplateNames` rather than duplicating permission sets.
- **Audit regularly**: Review custom roles periodically to remove any permissions that are no longer needed.

## Troubleshooting

If a user reports they cannot perform an action that should be allowed by their custom role:

1. Check the role assignment under **Cluster Members** or the project's **Members** tab.
2. Verify the role template exists with `kubectl get roletemplates <role-name> -o yaml`.
3. Check whether another authorizer, admission policy, or external policy is blocking the action. Rancher and Kubernetes RBAC permissions are additive and do not have deny rules.
4. Review the Rancher audit logs for denied API requests.

## Conclusion

Custom roles in Rancher give you the flexibility to implement access control policies that match your organization's structure and security requirements. By creating roles that grant only the necessary permissions and assigning them appropriately, you maintain a secure and manageable Kubernetes environment. Start with the built-in roles as a foundation and create custom roles only when the defaults do not meet your needs.
