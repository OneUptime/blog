# How to Create Custom RBAC Roles in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, RBAC, Access Control

Description: Step-by-step guide to creating custom RBAC roles in ArgoCD with practical examples for deployers, viewers, project managers, and CI/CD service accounts.

---

The built-in admin and readonly roles in ArgoCD cover the extremes, but real teams need something in between. A developer who can sync apps in their project but cannot delete production resources. A CI pipeline that can trigger deployments but cannot modify RBAC policies. These require custom RBAC roles.

ArgoCD uses Casbin for its RBAC engine, which means policies are defined as simple CSV rules. Once you understand the format, creating custom roles becomes straightforward.

## Understanding the Policy Format

Every RBAC rule in ArgoCD follows this pattern:

```
p, <subject>, <resource>, <action>, <object>, <effect>
```

Here is what each field means:

- **subject** - The role name (e.g., `role:deployer`) or a specific user/group
- **resource** - The ArgoCD resource type: `applications`, `clusters`, `repositories`, `accounts`, `certificates`, `gpgkeys`, `logs`, `exec`
- **action** - What the subject can do: `get`, `create`, `update`, `delete`, `sync`, `override`, `action`
- **object** - The specific resource, using format `<project>/<application>` for apps or `*` for all
- **effect** - Either `allow` or `deny`

Group mappings use a different prefix:

```
g, <user-or-group>, <role>
```

## Creating Your First Custom Role

Let's create a deployer role that can view and sync applications but cannot create, delete, or modify them.

Edit the `argocd-rbac-cm` ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.csv: |
    # Custom deployer role
    p, role:deployer, applications, get, */*, allow
    p, role:deployer, applications, sync, */*, allow
    p, role:deployer, applications, action, */*, allow
    p, role:deployer, logs, get, */*, allow

    # Assign users to the role
    g, deploy-user@company.com, role:deployer
    g, ci-pipeline, role:deployer

  policy.default: role:readonly
```

Apply it:

```bash
kubectl apply -f argocd-rbac-cm.yaml
```

The deployer role above allows users to:
- View all applications (`get`)
- Trigger syncs (`sync`)
- Perform resource actions like restart (`action`)
- View application logs (`logs get`)

But they cannot:
- Create new applications
- Delete existing applications
- Modify application settings
- Manage repositories or clusters

## Common Custom Role Patterns

Here are roles I have used across multiple production environments.

### Project Deployer

This role restricts sync access to a specific project:

```yaml
policy.csv: |
  # Can view all apps, but only sync apps in the "frontend" project
  p, role:frontend-deployer, applications, get, */*, allow
  p, role:frontend-deployer, applications, sync, frontend/*, allow
  p, role:frontend-deployer, applications, action, frontend/*, allow
  p, role:frontend-deployer, logs, get, frontend/*, allow
```

### Application Manager

This role can manage applications within a project but cannot touch cluster or repository settings:

```yaml
policy.csv: |
  # Full application management within a project
  p, role:app-manager, applications, get, */*, allow
  p, role:app-manager, applications, create, myproject/*, allow
  p, role:app-manager, applications, update, myproject/*, allow
  p, role:app-manager, applications, delete, myproject/*, allow
  p, role:app-manager, applications, sync, myproject/*, allow
  p, role:app-manager, applications, action, myproject/*, allow
  p, role:app-manager, applications, override, myproject/*, allow
  p, role:app-manager, logs, get, myproject/*, allow
  p, role:app-manager, exec, create, myproject/*, allow
```

### Repository Manager

For teams that need to add and manage Git repositories but should not touch applications:

```yaml
policy.csv: |
  # Repository management only
  p, role:repo-manager, repositories, get, *, allow
  p, role:repo-manager, repositories, create, *, allow
  p, role:repo-manager, repositories, update, *, allow
  p, role:repo-manager, repositories, delete, *, allow
  p, role:repo-manager, certificates, get, *, allow
  p, role:repo-manager, certificates, create, *, allow
```

### Operations Viewer with Log Access

A role for on-call engineers who need deep visibility but should not change anything:

```yaml
policy.csv: |
  # Enhanced readonly with log and exec access
  p, role:ops-viewer, applications, get, */*, allow
  p, role:ops-viewer, clusters, get, *, allow
  p, role:ops-viewer, repositories, get, *, allow
  p, role:ops-viewer, logs, get, */*, allow
  p, role:ops-viewer, exec, create, */*, allow
```

## Combining Multiple Roles

A single user can be assigned multiple roles. ArgoCD evaluates all matching policies and allows the action if any role permits it:

```yaml
policy.csv: |
  # Define roles
  p, role:viewer, applications, get, */*, allow
  p, role:frontend-deployer, applications, sync, frontend/*, allow
  p, role:backend-deployer, applications, sync, backend/*, allow

  # User gets multiple roles
  g, senior-dev@company.com, role:viewer
  g, senior-dev@company.com, role:frontend-deployer
  g, senior-dev@company.com, role:backend-deployer
```

This user can view all applications and sync applications in both the frontend and backend projects.

## Using Deny Rules

ArgoCD supports explicit deny rules, which take precedence over allow rules. This is useful for carving out exceptions:

```yaml
policy.csv: |
  # Allow sync for all apps in production project
  p, role:prod-deployer, applications, *, production/*, allow

  # But deny deletion
  p, role:prod-deployer, applications, delete, production/*, deny
```

The deny rule prevents deletion even though the wildcard action would otherwise allow it. Be careful with deny rules though - they can create confusing policy interactions when combined with multiple role assignments.

## Mapping Groups to Custom Roles

When using SSO, you typically map identity provider groups to ArgoCD roles rather than individual users:

```yaml
policy.csv: |
  # Map SSO groups to custom roles
  g, team-frontend, role:frontend-deployer
  g, team-backend, role:backend-deployer
  g, team-platform, role:admin
  g, team-qa, role:viewer

  # Define the custom roles
  p, role:frontend-deployer, applications, get, */*, allow
  p, role:frontend-deployer, applications, sync, frontend/*, allow

  p, role:backend-deployer, applications, get, */*, allow
  p, role:backend-deployer, applications, sync, backend/*, allow

  p, role:viewer, applications, get, */*, allow
  p, role:viewer, logs, get, */*, allow
```

The group names must match the group claims from your OIDC provider. Configure the group claim in `argocd-cm`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  oidc.config: |
    name: Okta
    issuer: https://your-org.okta.com
    clientID: your-client-id
    clientSecret: $oidc.okta.clientSecret
    requestedScopes:
      - openid
      - profile
      - email
      - groups
```

## Testing Custom Roles Before Deployment

Always test your RBAC policies before applying them. Use the `argocd admin settings rbac` command:

```bash
# Test if the deployer role can sync an app
argocd admin settings rbac can role:deployer sync applications 'frontend/web-app' \
  --policy-file policy.csv
# Output: Yes

# Test if the deployer role can delete an app
argocd admin settings rbac can role:deployer delete applications 'frontend/web-app' \
  --policy-file policy.csv
# Output: No

# Validate the entire policy file
argocd admin settings rbac validate --policy-file policy.csv
```

You can also test against the live cluster:

```bash
# Test against the running ArgoCD instance
argocd admin settings rbac can role:deployer sync applications 'frontend/web-app' \
  --namespace argocd
```

## Full Production Example

Here is a complete `argocd-rbac-cm` ConfigMap that covers a typical multi-team setup:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.csv: |
    # Platform team - full admin
    g, platform-engineering, role:admin

    # Deployer role - can sync and view
    p, role:deployer, applications, get, */*, allow
    p, role:deployer, applications, sync, */*, allow
    p, role:deployer, applications, action, */*, allow
    p, role:deployer, logs, get, */*, allow

    # Project-scoped app managers
    p, role:frontend-manager, applications, *, frontend/*, allow
    p, role:frontend-manager, applications, get, */*, allow
    p, role:frontend-manager, logs, get, frontend/*, allow

    p, role:backend-manager, applications, *, backend/*, allow
    p, role:backend-manager, applications, get, */*, allow
    p, role:backend-manager, logs, get, backend/*, allow

    # Assign teams
    g, team-frontend, role:frontend-manager
    g, team-backend, role:backend-manager
    g, ci-bot, role:deployer

  # Authenticated users get readonly by default
  policy.default: role:readonly
```

## Summary

Custom RBAC roles in ArgoCD let you define exactly who can do what. Start by identifying the actions each team needs, build roles using the Casbin policy format, test them with `argocd admin settings rbac can`, and then apply them to your cluster. The key patterns are project-scoped roles for team isolation, action-limited roles for CI/CD pipelines, and deny rules for preventing dangerous operations in sensitive environments.

For more on project-level RBAC, see our guide on [configuring project-level RBAC in ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-project-level-rbac/view).
