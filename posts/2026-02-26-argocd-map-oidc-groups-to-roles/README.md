# How to Map OIDC Groups to ArgoCD Roles

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, OIDC, RBAC

Description: A practical guide to mapping OIDC identity provider groups to ArgoCD RBAC roles, covering built-in roles, custom roles, and advanced policy patterns.

---

Mapping OIDC groups to ArgoCD roles is the bridge between your identity provider and ArgoCD's permission system. Without this mapping, users can authenticate but have no useful permissions. With the right mapping, your team's existing organizational structure in the identity provider directly controls who can deploy what and where in ArgoCD.

This guide focuses specifically on the mapping mechanics - the syntax, patterns, and strategies for connecting groups to roles.

## Understanding ArgoCD's RBAC Model

ArgoCD uses a Casbin-based RBAC system with two types of rules:

- **`p` rules** (policies) - Define what a role can do
- **`g` rules** (group mappings) - Map users or groups to roles

```text
# Policy: role can perform action on resource
p, <role>, <resource>, <action>, <object>, <effect>

# Group mapping: subject has role
g, <subject>, <role>
```

The `subject` in a `g` rule can be a username, email, or group name from the OIDC token.

## Built-in Roles

ArgoCD comes with two built-in roles:

### role:admin

Full access to everything:
- Create, read, update, delete applications
- Sync applications
- Manage repositories and clusters
- Manage projects
- Manage accounts

### role:readonly

Read-only access:
- View applications and their details
- View repositories
- View projects
- View clusters

## Mapping Groups to Built-in Roles

The simplest mapping assigns OIDC groups to the built-in roles:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.default: ""
  policy.csv: |
    g, platform-engineers, role:admin
    g, all-employees, role:readonly
  scopes: '[groups]'
```

The `policy.default` setting determines what permissions authenticated users get if they do not match any group mapping. Setting it to an empty string means no access by default.

## Creating Custom Roles

Built-in roles are often too broad. Create custom roles for specific access patterns:

```yaml
  policy.csv: |
    # Custom role: can view and sync applications in staging
    p, role:staging-deployer, applications, get, staging/*, allow
    p, role:staging-deployer, applications, sync, staging/*, allow
    p, role:staging-deployer, applications, action/*, staging/*, allow
    p, role:staging-deployer, logs, get, staging/*, allow

    # Custom role: can view everything, sync only in dev
    p, role:dev-contributor, applications, get, */*, allow
    p, role:dev-contributor, applications, sync, dev/*, allow
    p, role:dev-contributor, applications, create, dev/*, allow
    p, role:dev-contributor, applications, delete, dev/*, allow
    p, role:dev-contributor, applications, update, dev/*, allow
    p, role:dev-contributor, logs, get, */*, allow
    p, role:dev-contributor, repositories, get, *, allow

    # Map groups to custom roles
    g, backend-developers, role:dev-contributor
    g, frontend-developers, role:dev-contributor
    g, release-team, role:staging-deployer
```

## RBAC Resource and Action Reference

Here are the available resources and actions for building custom roles:

| Resource | Actions | Object Format |
|---|---|---|
| applications | get, create, update, delete, sync, override, action/* | `<project>/<application>` |
| applicationsets | get, create, update, delete | `<project>/<applicationset>` |
| clusters | get, create, update, delete | `<cluster-url>` |
| repositories | get, create, update, delete | `<repository-url>` |
| projects | get, create, update, delete | `<project-name>` |
| accounts | get, update | `<account-name>` |
| gpgkeys | get, create, delete | `*` |
| logs | get | `<project>/<application>` |
| exec | create | `<project>/<application>` |
| certificates | get, create, delete | `*` |

## Wildcard Patterns

ArgoCD RBAC supports glob patterns for flexible matching:

```yaml
  policy.csv: |
    # Match all applications in the "production" project
    p, role:prod-viewer, applications, get, production/*, allow

    # Match all applications across all projects
    p, role:global-viewer, applications, get, */*, allow

    # Match specific application name pattern
    p, role:api-deployer, applications, sync, production/api-*, allow

    # Match all actions on specific resources
    p, role:dev-admin, applications, *, dev/*, allow
```

## Multi-Group Mapping

A single role can be assigned to multiple groups, and a single group can receive multiple roles:

```yaml
  policy.csv: |
    # Multiple groups mapped to the same role
    g, backend-team, role:developer
    g, frontend-team, role:developer
    g, mobile-team, role:developer

    # One group with multiple roles (additive)
    g, sre-team, role:admin
    g, sre-team, role:on-call-responder

    # Define the on-call role
    p, role:on-call-responder, applications, sync, production/*, allow
    p, role:on-call-responder, exec, create, production/*, allow
```

When a user belongs to multiple groups, they get the union of all permissions.

## Deny Rules

ArgoCD supports explicit deny rules, which take precedence over allow rules:

```yaml
  policy.csv: |
    # Developers can do everything in dev
    p, role:developer, applications, *, dev/*, allow

    # But explicitly deny deletion in dev
    p, role:developer, applications, delete, dev/*, deny

    g, developers, role:developer
```

With this configuration, developers can create, read, update, and sync applications in the dev project, but they cannot delete them.

## Practical Examples

### Example 1: Microservices Team Structure

```yaml
  policy.csv: |
    # Each microservice team manages their own applications
    p, role:team-payments, applications, *, payments/*, allow
    p, role:team-payments, projects, get, payments, allow
    g, payments-team, role:team-payments

    p, role:team-orders, applications, *, orders/*, allow
    p, role:team-orders, projects, get, orders, allow
    g, orders-team, role:team-orders

    p, role:team-users, applications, *, users/*, allow
    p, role:team-users, projects, get, users, allow
    g, users-team, role:team-users

    # Platform team manages everything
    g, platform-team, role:admin
```

### Example 2: Environment-Based Promotion

```yaml
  policy.csv: |
    # Anyone can deploy to dev
    p, role:dev-deployer, applications, *, dev/*, allow
    g, engineering, role:dev-deployer

    # Team leads can promote to staging
    p, role:staging-deployer, applications, sync, staging/*, allow
    p, role:staging-deployer, applications, get, staging/*, allow
    g, team-leads, role:staging-deployer

    # Release managers can promote to production
    p, role:prod-deployer, applications, sync, production/*, allow
    p, role:prod-deployer, applications, get, production/*, allow
    g, release-managers, role:prod-deployer

    # Everyone can view everything
    p, role:viewer, applications, get, */*, allow
    p, role:viewer, logs, get, */*, allow
    g, engineering, role:viewer
```

### Example 3: CI/CD Service Account with Limited Access

```yaml
  policy.csv: |
    # CI/CD service can only sync applications, nothing else
    p, role:ci-sync, applications, sync, */*, allow
    p, role:ci-sync, applications, get, */*, allow

    # Map the CI service account (identified by its OIDC subject or email)
    g, ci-service@example.com, role:ci-sync

    # Human admins
    g, platform-admins, role:admin
```

## Testing Your RBAC Configuration

Before applying RBAC changes, test them:

### Method 1: argocd admin CLI

```bash
# Download the policy file
kubectl -n argocd get configmap argocd-rbac-cm -o jsonpath='{.data.policy\.csv}' > /tmp/policy.csv

# Test a permission
argocd admin settings rbac can role:developer get applications 'staging/my-app' \
  --policy-file /tmp/policy.csv

# Test with a group
argocd admin settings rbac can backend-team sync applications 'dev/my-app' \
  --policy-file /tmp/policy.csv --default-role role:readonly
```

### Method 2: Check After Login

```bash
argocd login argocd.example.com --sso
argocd account get-user-info
# This shows the groups ArgoCD detected from the token
```

### Method 3: Check Server Logs

```bash
kubectl -n argocd logs deploy/argocd-server | grep -i "rbac\|denied\|policy"
```

## Common Mistakes

### 1. Forgetting scopes in argocd-rbac-cm

Without the `scopes` field, ArgoCD does not know which token claim contains the groups:

```yaml
# This is required!
scopes: '[groups]'
```

### 2. Group Names Do Not Match

The group names in `policy.csv` must exactly match what the IdP puts in the token. Check for:
- Case differences (`Admins` vs `admins`)
- Prefixes (`org:team` for GitHub)
- GUIDs vs names (Azure AD)

### 3. policy.default Too Permissive

```yaml
# Dangerous - gives admin to everyone who authenticates
policy.default: role:admin

# Safe - no access by default
policy.default: ""

# Reasonable - read-only for authenticated users
policy.default: role:readonly
```

### 4. Missing Project in Object Path

The object path for applications is `project/application`, not just `application`:

```yaml
# Correct
p, role:dev, applications, sync, dev/my-app, allow

# Wrong - will not match anything
p, role:dev, applications, sync, my-app, allow
```

## Summary

Mapping OIDC groups to ArgoCD roles is the foundation of team-based access control in ArgoCD. The process involves defining custom roles with `p` rules, then linking identity provider groups to those roles with `g` rules. Use wildcards for flexible matching, layer multiple roles for additive permissions, and always test your policies before deploying them. The goal is a configuration where changes in your identity provider's group memberships automatically reflect in ArgoCD permissions.

For related guides, see [How to Configure OIDC Groups in ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-oidc-groups-team-based-access/view) and [How to Create ArgoCD Project Roles](https://oneuptime.com/blog/post/2026-01-30-argocd-project-roles/view).
