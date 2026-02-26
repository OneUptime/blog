# How to Restrict Users to Specific Projects in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, RBAC, Security

Description: Learn how to configure ArgoCD RBAC policies and SSO groups to restrict users to their team's projects, preventing unauthorized access to other teams' applications and resources.

---

Creating ArgoCD projects with source and destination restrictions is only half the battle. You also need to ensure that users can only see and manage applications within their assigned projects. Without proper RBAC configuration, any authenticated ArgoCD user can view and potentially modify applications across all projects.

This guide covers how to use ArgoCD's RBAC system to restrict users to specific projects through role policies, SSO group mappings, and project-level roles.

## How ArgoCD RBAC Works

ArgoCD uses a Casbin-based RBAC system defined in the `argocd-rbac-cm` ConfigMap. Policies follow this format:

```
p, <subject>, <resource>, <action>, <object>, <effect>
```

Where:
- **subject**: A role name, SSO group, or user
- **resource**: `applications`, `projects`, `repositories`, `clusters`, `logs`, `exec`
- **action**: `get`, `create`, `update`, `delete`, `sync`, `override`, `action/*`
- **object**: `<project>/<application>` pattern (supports wildcards)
- **effect**: `allow` or `deny`

## Configuring Global RBAC Policies

### Step 1: Define Roles per Team

Edit the `argocd-rbac-cm` ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.default: role:readonly
  policy.csv: |
    # Platform team - full access to platform project
    p, role:platform-team, applications, *, platform/*, allow
    p, role:platform-team, projects, get, platform, allow
    p, role:platform-team, repositories, *, *, allow
    p, role:platform-team, clusters, get, *, allow

    # Backend team - full access to backend project
    p, role:backend-team, applications, *, backend/*, allow
    p, role:backend-team, projects, get, backend, allow
    p, role:backend-team, repositories, get, *, allow
    p, role:backend-team, clusters, get, *, allow

    # Frontend team - full access to frontend project
    p, role:frontend-team, applications, *, frontend/*, allow
    p, role:frontend-team, projects, get, frontend, allow
    p, role:frontend-team, repositories, get, *, allow
    p, role:frontend-team, clusters, get, *, allow

    # Read-only role for everyone
    p, role:readonly, applications, get, */*, allow
    p, role:readonly, projects, get, *, allow

    # Map SSO groups to roles
    g, my-org:platform-engineers, role:platform-team
    g, my-org:backend-developers, role:backend-team
    g, my-org:frontend-developers, role:frontend-team
```

### Step 2: Set the Default Policy

The `policy.default` field determines what unauthenticated or unmapped users can do:

```yaml
data:
  # Option 1: Read-only access by default
  policy.default: role:readonly

  # Option 2: No access by default (most secure)
  policy.default: ""
```

Setting `policy.default` to an empty string means users with no role mapping cannot see anything. This is the most secure option but requires that every user has an explicit role mapping.

## SSO Group Integration

The most scalable approach is mapping SSO (OIDC/SAML) groups to ArgoCD roles.

### GitHub Organizations

```yaml
data:
  policy.csv: |
    p, role:platform-team, applications, *, platform/*, allow
    p, role:backend-team, applications, *, backend/*, allow

    # Map GitHub team slugs to ArgoCD roles
    g, my-org:platform, role:platform-team
    g, my-org:backend, role:backend-team
    g, my-org:frontend, role:frontend-team

  # Scopes to request from GitHub
  scopes: "[groups]"
```

### Okta/OIDC Groups

```yaml
data:
  policy.csv: |
    p, role:platform-team, applications, *, platform/*, allow
    p, role:backend-team, applications, *, backend/*, allow

    # Map Okta groups to ArgoCD roles
    g, Platform Engineers, role:platform-team
    g, Backend Developers, role:backend-team
    g, Frontend Developers, role:frontend-team

  scopes: "[groups, email]"
```

### Azure AD Groups

```yaml
data:
  policy.csv: |
    p, role:platform-team, applications, *, platform/*, allow
    p, role:backend-team, applications, *, backend/*, allow

    # Map Azure AD group object IDs to ArgoCD roles
    g, "a1b2c3d4-e5f6-7890-abcd-ef1234567890", role:platform-team
    g, "b2c3d4e5-f6a7-8901-bcde-f12345678901", role:backend-team
```

## Fine-Grained Permission Patterns

### Full Access to Project

The team can do everything with applications in their project:

```
p, role:team-a, applications, *, team-a/*, allow
```

### Read-Only Access with Sync Permission

The team can view and sync but not create or delete:

```
p, role:team-b-deployer, applications, get, team-b/*, allow
p, role:team-b-deployer, applications, sync, team-b/*, allow
```

### Different Permissions per Environment

Restrict production access while keeping dev open:

```
# Full access to dev applications
p, role:developer, applications, *, dev/*, allow

# Read + sync for staging
p, role:developer, applications, get, staging/*, allow
p, role:developer, applications, sync, staging/*, allow

# Read-only for production
p, role:developer, applications, get, prod/*, allow

# Leads can sync production
p, role:tech-lead, applications, *, prod/*, allow
```

### Deny Specific Actions

Explicitly deny dangerous actions:

```
# Allow all actions on backend project
p, role:backend-dev, applications, *, backend/*, allow

# But deny delete (even though * above allows it)
p, role:backend-dev, applications, delete, backend/*, deny
```

Note: deny rules take precedence over allow rules.

## Project-Level Roles

In addition to global RBAC, ArgoCD supports project-level roles. These are defined in the AppProject spec and generate JWT tokens for automation.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: backend
  namespace: argocd
spec:
  roles:
    - name: ci-deployer
      description: "CI/CD pipeline deployer"
      policies:
        - p, proj:backend:ci-deployer, applications, sync, backend/*, allow
        - p, proj:backend:ci-deployer, applications, get, backend/*, allow
      # Map SSO groups
      groups:
        - my-org:backend-ci

    - name: viewer
      description: "Read-only viewer"
      policies:
        - p, proj:backend:viewer, applications, get, backend/*, allow
      groups:
        - my-org:backend-viewers
```

Project roles follow the format `proj:<project>:<role>`.

## Multi-Project Access

Some users need access to multiple projects. You can assign multiple roles:

```yaml
policy.csv: |
  # User belongs to both platform and backend teams
  g, john@example.com, role:platform-team
  g, john@example.com, role:backend-team
```

Or create a cross-team role:

```yaml
policy.csv: |
  # SRE role with read-only access across all projects
  p, role:sre, applications, get, */*, allow
  p, role:sre, applications, sync, */*, allow
  p, role:sre, logs, get, */*, allow

  g, my-org:sre-team, role:sre
```

## Testing RBAC Configuration

### Verify with CLI

```bash
# Check if a subject can perform an action
argocd admin rbac can role:backend-team get applications backend/my-app
# Output: Yes

argocd admin rbac can role:backend-team get applications frontend/my-app
# Output: No

# Validate the entire policy
argocd admin rbac validate --policy-file policy.csv
```

### Verify with a Test User

Log in as a specific user and check what they can see:

```bash
# Login as a backend team member
argocd login argocd.example.com --username backend-user

# List applications - should only show backend project apps
argocd app list

# Try to get a frontend app - should be denied
argocd app get frontend-web
# Expected: permission denied
```

## Common RBAC Patterns

### Hub-and-Spoke Model

A central platform team manages ArgoCD, and application teams have restricted access:

```
# Platform team: full admin
p, role:platform-admin, *, *, *, allow

# App teams: project-scoped access
p, role:team-a, applications, *, team-a/*, allow
p, role:team-a, projects, get, team-a, allow

# Default: nothing
policy.default: ""
```

### Self-Service Model

Teams have broad access within their projects, including managing project settings:

```
p, role:team-a-admin, applications, *, team-a/*, allow
p, role:team-a-admin, projects, *, team-a, allow
p, role:team-a-admin, repositories, *, *, allow
```

Note that allowing `projects, *` lets the team modify their own project settings, which could weaken restrictions. Use this carefully.

## Troubleshooting

**User can see all applications**: Check `policy.default`. If it is set to `role:admin` or any role with broad access, all users inherit those permissions.

**User cannot see anything**: Verify SSO group mapping with `g, <group>, <role>` lines. Check that the SSO provider is sending group claims and that the scope includes groups.

**Permission denied for specific action**: Check for deny rules that may override allow rules. Deny always wins in Casbin.

```bash
# Check current RBAC policy
kubectl get configmap argocd-rbac-cm -n argocd -o yaml

# Check user's groups from the SSO token
argocd account get-user-info
```

## Summary

Restricting users to specific projects requires a combination of ArgoCD projects (for resource boundaries) and RBAC policies (for access control). Map SSO groups to ArgoCD roles for scalable team management, use the `policy.default: ""` setting for maximum security, and always test your RBAC configuration before rolling it out. The goal is that each team can only see and manage their own applications while the platform team retains cross-project visibility.

For the full ArgoCD RBAC reference, see our guide on [ArgoCD RBAC Policies](https://oneuptime.com/blog/post/2026-01-25-rbac-policies-argocd/view).
