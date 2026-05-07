# How to Set Up Least Privilege Access in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, RBAC, Permission, Security, Role

Description: A comprehensive guide to implementing the principle of least privilege in Rancher to minimize security risks across your Kubernetes clusters.

The principle of least privilege states that users should have only the minimum permissions necessary to perform their job functions. In Rancher, this means carefully configuring global, cluster, and project roles so that no user has more access than they need. This guide walks through a practical approach to implementing least privilege across your Rancher environment.

## Prerequisites

- Rancher v2.7+ with administrator access
- An external authentication provider configured (LDAP, AD, SAML, or similar)
- A clear understanding of your team structure and responsibilities
- At least one managed cluster

## Step 1: Audit Current Permissions

Before restricting access, understand what currently exists:

```bash
# List all global role bindings

kubectl get globalrolebindings -o custom-columns=\
NAME:.metadata.name,\
ROLE:.globalRoleName,\
USER:.userName,\
GROUP:.groupPrincipalName

# List all cluster role bindings across clusters
kubectl get clusterroletemplatebindings --all-namespaces -o custom-columns=\
NAMESPACE:.metadata.namespace,\
NAME:.metadata.name,\
ROLE:.roleTemplateName,\
USER:.userName,\
GROUP:.groupPrincipalName

# List all project role bindings
kubectl get projectroletemplatebindings --all-namespaces -o custom-columns=\
NAMESPACE:.metadata.namespace,\
NAME:.metadata.name,\
ROLE:.roleTemplateName,\
USER:.userName,\
GROUP:.groupPrincipalName
```

Export the results and review them with your team leads to identify any excessive permissions.

## Step 2: Restrict Default Global Roles

By default, new users who log in through an external auth provider may receive the **Standard User** global role, which allows them to create clusters. Restrict this:

1. Go to **Users & Authentication > Role Templates** and select the **Global** tab.
2. Find the **Standard User** role.
3. Click the **three-dot menu** and select **Edit Config**.
4. Uncheck **Yes: Default role for new users**.
5. Click **Save**.

Now ensure that only the **User-Base** role is set as the default:

```yaml
apiVersion: management.cattle.io/v3
kind: GlobalRole
metadata:
  name: user-base
newUserDefault: true
```

The User-Base role grants only login access. Users will need explicit assignments to access any clusters or projects.

## Step 3: Create Role Tiers

Define a tiered role structure that maps to your organization:

**Tier 1 - View Only**: For stakeholders, auditors, and managers who need visibility but should not change anything.

```yaml
apiVersion: management.cattle.io/v3
kind: RoleTemplate
metadata:
  name: workload-viewer
context: project
displayName: Workload Viewer
rules:
  - apiGroups: ["", "apps", "batch"]
    resources: ["pods", "deployments", "services", "jobs", "cronjobs", "statefulsets", "daemonsets"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get"]
```

**Tier 2 - Deploy Only**: For developers who need to deploy and update applications but not manage infrastructure.

```yaml
apiVersion: management.cattle.io/v3
kind: RoleTemplate
metadata:
  name: app-deployer
context: project
displayName: Application Deployer
rules:
  - apiGroups: ["apps"]
    resources: ["deployments", "deployments/scale"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  - apiGroups: [""]
    resources: ["services", "configmaps"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  - apiGroups: ["", "apps", "batch"]
    resources: ["pods", "replicasets", "statefulsets", "daemonsets", "jobs"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods/log", "pods/exec"]
    verbs: ["get", "create"]
```

**Tier 3 - Full Project Management**: For team leads who manage their team's namespaces.

Use the built-in **Project Owner** role for this tier.

## Step 4: Remove Unnecessary Admin Accounts

List all direct administrator bindings:

```bash
kubectl get globalrolebindings -o json | \
  jq -r '.items[] | select(.globalRoleName == "admin") | (.userName // .groupPrincipalName)'
```

Reduce the number of administrators to only those who genuinely need it. For each individual user who should not be an admin:

1. Go to **Users & Authentication > Users**.
2. Find the user and click **Edit Config**.
3. Uncheck **Administrator** in the **Built-in** section.
4. Assign appropriate scoped roles instead.
5. Click **Save**.

If the administrator binding is assigned to a group instead of an individual user, go to **Users & Authentication > Groups**, edit the group, and remove **Administrator** there instead.

## Step 5: Configure Cluster-Level Least Privilege

Avoid assigning the **Cluster Owner** role unless absolutely necessary. Create a scoped cluster role for most operations:

```yaml
apiVersion: management.cattle.io/v3
kind: RoleTemplate
metadata:
  name: cluster-operator
context: cluster
displayName: Cluster Operator
rules:
  - apiGroups: [""]
    resources: ["namespaces", "nodes", "persistentvolumes"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["storage.k8s.io"]
    resources: ["storageclasses"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["networking.k8s.io"]
    resources: ["ingressclasses"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["get", "list", "watch"]
```

This role lets operators see cluster-level resources without being able to modify them.

## Step 6: Deny Access by Default

Rancher already requires explicit cluster and project membership for users added after creation. To minimize automatic access, review the roles marked as defaults for cluster and project creators:

1. Go to **Users & Authentication > Role Templates**.
2. On the **Cluster** tab, edit any role marked **Cluster Creator Default** and set it to **No** unless creators should receive it automatically.
3. On the **Project/Namespaces** tab, edit any role marked **Project Creator Default** and set it to **No** unless creators should receive it automatically.
4. Assign cluster or project roles explicitly to all other users.

This ensures that cluster and project access is granted intentionally rather than through overly broad creator defaults.

## Step 7: Restrict Sensitive Operations

Create project roles that explicitly exclude sensitive operations:

```yaml
apiVersion: management.cattle.io/v3
kind: RoleTemplate
metadata:
  name: developer-no-direct-secrets
context: project
displayName: Developer (No Direct Secret Read Access)
rules:
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets", "daemonsets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["services", "configmaps", "pods", "pods/log"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["batch"]
    resources: ["jobs", "cronjobs"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["networking.k8s.io"]
    resources: ["ingresses"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

Notice that `secrets` is deliberately omitted from the resources list. This removes direct Secret API access, but it does not fully isolate Secrets: in Kubernetes, users who can create Pods or workload controllers can still expose Secrets mounted in that namespace. Use separate namespaces and tighter workload-creation controls if you need strict Secret isolation.

## Step 8: Implement Time-Based Access Reviews

Set up a regular process to review and clean up permissions:

```bash
#!/bin/bash
# audit-rbac.sh - Run monthly to identify excessive permissions

echo "=== Admin Global Role Bindings ==="
kubectl get globalrolebindings -o json | \
  jq -r '.items[] | select(.globalRoleName == "admin") | "\(.userName // .groupPrincipalName) - \(.metadata.creationTimestamp)"'

echo ""
echo "=== Cluster Owner Assignments ==="
kubectl get clusterroletemplatebindings --all-namespaces -o json | \
  jq -r '.items[] | select(.roleTemplateName == "cluster-owner") | "\(.userName // .groupPrincipalName) - \(.metadata.namespace)"'

echo ""
echo "=== Users and Last Login Timestamps ==="
kubectl get userattributes -o json | \
  jq -r '.items[] | "\(.metadata.name) - Last login: \(.lastLogin // "never recorded")"'
```

Make this script part of your monthly security review process.

## Step 9: Validate the Configuration

After implementing least privilege, validate by testing each role tier with a kubeconfig issued for a test user in that role:

```bash
# Test Tier 1 - View Only (should succeed)
kubectl --kubeconfig viewer-user.kubeconfig auth can-i list pods -n dev
# yes

# Test Tier 1 - View Only (should fail)
kubectl --kubeconfig viewer-user.kubeconfig auth can-i create deployments.apps -n dev
# no

# Test Tier 2 - Deploy Only (should succeed)
kubectl --kubeconfig deployer-user.kubeconfig auth can-i create deployments.apps -n dev
# yes

# Test Tier 2 - Deploy Only (should fail)
kubectl --kubeconfig deployer-user.kubeconfig auth can-i delete namespaces
# no
```

## Best Practices

- **Start restrictive, then add**: Begin with minimal permissions and add more only when users report they cannot perform necessary tasks.
- **Use groups**: Map roles to identity provider groups so that access is managed through your HR onboarding and offboarding processes.
- **Separate production access**: Use stricter roles for production clusters compared to development clusters.
- **Log access**: Enable Rancher audit logging to track who does what.
- **Automate reviews**: Script periodic audits of role assignments to catch permission drift.

## Conclusion

Implementing least privilege in Rancher requires a systematic approach: restrict defaults, create purpose-built roles at each level, and audit regularly. The effort pays off with a significantly reduced attack surface and clearer accountability for actions taken in your Kubernetes clusters. Start by auditing current permissions, reduce administrative access, and build a tiered role structure that matches your organization.
