# How to Understand ArgoCD's Built-in Roles: admin and readonly

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, RBAC, Security

Description: Learn how ArgoCD's built-in admin and readonly roles work, what permissions each role grants, and how to use them as building blocks for your access control strategy.

---

ArgoCD ships with two built-in roles that form the foundation of its role-based access control system: `role:admin` and `role:readonly`. Understanding exactly what these roles can and cannot do is the first step toward building a secure RBAC configuration for your team.

Most teams start by assigning everyone the admin role just to get things working. That is a mistake that leads to accidental deletions, unauthorized deployments, and audit nightmares. Let me walk you through exactly what each built-in role provides and how to use them properly.

## The Admin Role

The `role:admin` is the superuser role in ArgoCD. When you first install ArgoCD, the default admin account gets this role automatically. It has unrestricted access to every resource and every action.

Here is what the admin role can do:

- Create, update, delete, and sync any application
- Create, update, and delete projects
- Add and remove repositories and clusters
- Manage user accounts and RBAC policies
- Access all API endpoints
- View logs, events, and resource details

The admin role is defined internally in ArgoCD and cannot be modified. You can verify the permissions granted to admin by checking the RBAC policy:

```yaml
# The admin role effectively has this policy (built-in, not configurable)
p, role:admin, applications, *, */*, allow
p, role:admin, clusters, *, *, allow
p, role:admin, repositories, *, *, allow
p, role:admin, accounts, *, *, allow
p, role:admin, certificates, *, *, allow
p, role:admin, gpgkeys, *, *, allow
p, role:admin, logs, *, *, allow
p, role:admin, exec, *, */*, allow
```

Each line follows the Casbin policy format: `p, subject, resource, action, object, effect`. The wildcards (`*`) mean "everything," so the admin role is allowed to perform any action on any resource.

## The Readonly Role

The `role:readonly` is the opposite extreme. It grants view-only access to all resources but prevents any modifications.

```yaml
# The readonly role effectively has this policy (built-in, not configurable)
p, role:readonly, applications, get, */*, allow
p, role:readonly, clusters, get, *, allow
p, role:readonly, repositories, get, *, allow
p, role:readonly, accounts, get, *, allow
p, role:readonly, certificates, get, *, allow
p, role:readonly, gpgkeys, get, *, allow
p, role:readonly, logs, get, *, allow
```

Users with the readonly role can:

- View all applications across all projects
- See sync status, health status, and resource details
- Browse repository and cluster configurations
- View logs and events

Users with the readonly role cannot:

- Create, update, or delete applications
- Trigger syncs or rollbacks
- Modify repositories or clusters
- Change RBAC policies or user accounts

## How Roles Get Assigned

Roles are assigned to users or groups in the `argocd-rbac-cm` ConfigMap. Here is how you assign the built-in roles:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  # Assign admin role to a specific user
  policy.csv: |
    g, admin-user@company.com, role:admin
    g, dev-team, role:readonly

  # Set the default role for authenticated users
  policy.default: role:readonly
```

The `g` lines are group mappings. They map a user or group to a role. The `policy.default` setting determines what role authenticated users get if no specific mapping exists.

## Checking Which Role a User Has

You can verify role assignments using the ArgoCD CLI:

```bash
# Check if a user can perform a specific action
argocd admin settings rbac can role:readonly get applications '*/*'
# Output: Yes

argocd admin settings rbac can role:readonly sync applications '*/*'
# Output: No

argocd admin settings rbac can role:admin sync applications '*/*'
# Output: Yes
```

This is invaluable for testing your RBAC configuration before applying it to production. You can also validate specific user permissions:

```bash
# Check what a specific user can do
argocd admin settings rbac can admin-user@company.com sync applications 'my-project/my-app' \
  --policy-file policy.csv
```

## The Default Policy and Its Impact

The `policy.default` setting in `argocd-rbac-cm` is critical. It determines the baseline permissions for any authenticated user who does not match a specific policy rule.

```yaml
data:
  # Option 1: Give everyone readonly by default (common for internal teams)
  policy.default: role:readonly

  # Option 2: Give no permissions by default (most secure)
  policy.default: ""

  # Option 3: Give everyone admin (NEVER do this in production)
  policy.default: role:admin
```

If you do not set `policy.default`, ArgoCD defaults to no permissions. This means authenticated users who are not explicitly granted a role will see an empty dashboard and cannot perform any actions.

For most organizations, setting `policy.default: role:readonly` strikes a good balance. Everyone can see what is deployed, but only authorized users can make changes.

## When to Use Built-in Roles vs Custom Roles

The built-in roles are good for two specific scenarios:

**Use `role:admin` for:**
- Platform team leads who manage ArgoCD itself
- Initial setup and emergency access
- Automated admin tasks (with dedicated service accounts)

**Use `role:readonly` for:**
- Developers who need visibility but not deployment control
- Auditors and compliance reviewers
- Dashboard viewers and stakeholders

For everything in between, you need custom roles. The built-in roles are all-or-nothing - there is no built-in role that lets a user sync applications but not delete them, or manage apps in one project but not another.

Here is a common pattern that combines built-in and custom roles:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.csv: |
    # Platform team gets full admin access
    g, platform-admins, role:admin

    # Custom deployer role for CI/CD pipelines
    p, role:deployer, applications, get, */*, allow
    p, role:deployer, applications, sync, */*, allow
    g, ci-bot, role:deployer

    # Everyone else gets readonly
  policy.default: role:readonly
```

## Security Considerations

A few important security points about the built-in roles:

1. **The admin account** - ArgoCD creates a local admin account during installation. Disable it once you have SSO configured:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Disable the built-in admin account
  admin.enabled: "false"
```

2. **Role inheritance** - Built-in roles do not inherit from each other. The admin role is not "readonly plus more permissions." They are separate, independent role definitions.

3. **No deny rules in built-in roles** - The built-in roles only use allow rules. If you need deny rules, you must create custom policies.

4. **Scope matters** - The admin role has access to everything, including cluster-level operations. Be very careful about who gets this role.

## Viewing Role Assignments in Practice

You can see the current RBAC configuration directly:

```bash
# View the RBAC ConfigMap
kubectl get configmap argocd-rbac-cm -n argocd -o yaml

# Test a specific permission scenario
argocd admin settings rbac can role:readonly delete applications 'default/my-app' \
  --policy-file /path/to/policy.csv
```

## Summary

The built-in `role:admin` and `role:readonly` roles in ArgoCD serve as the two extremes of access control. Admin gives unrestricted access to everything, while readonly provides view-only access across all resources. Most production environments will use these as starting points and layer custom roles on top for fine-grained control.

Start with `policy.default: role:readonly` so everyone can see what is happening, then create specific custom roles for users who need to deploy, sync, or manage applications. Keep the admin role limited to a small set of platform engineers who genuinely need full control over ArgoCD itself.

For more details on creating custom roles, see the next post in this series on [creating custom RBAC roles in ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-custom-rbac-roles/view).
