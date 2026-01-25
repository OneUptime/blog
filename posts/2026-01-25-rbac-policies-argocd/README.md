# How to Configure RBAC Policies in ArgoCD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ArgoCD, RBAC, Security, Kubernetes, Access Control, GitOps

Description: A complete guide to configuring role-based access control in ArgoCD, including built-in roles, custom policies, project-level permissions, and integration with SSO groups.

---

Who can deploy to production? Who can view logs but not sync? ArgoCD RBAC answers these questions. It controls what users and groups can do within ArgoCD, from viewing applications to managing clusters. This guide covers everything from basic setup to enterprise-grade policies.

## RBAC Fundamentals

ArgoCD RBAC is built on Casbin and uses a simple policy language:

```
p, <subject>, <resource>, <action>, <object>, <effect>
g, <user/group>, <role>
```

Where:
- `p` defines a permission
- `g` assigns a user or group to a role
- `subject` is who (user, group, or role)
- `resource` is what (applications, clusters, repositories)
- `action` is the operation (get, create, update, delete, sync)
- `object` is the specific resource (project/app pattern)
- `effect` is allow or deny

## Built-in Roles

ArgoCD comes with two built-in roles:

### role:readonly

Can view everything but change nothing:

```
p, role:readonly, applications, get, */*, allow
p, role:readonly, certificates, get, *, allow
p, role:readonly, clusters, get, *, allow
p, role:readonly, repositories, get, *, allow
p, role:readonly, projects, get, *, allow
p, role:readonly, accounts, get, *, allow
p, role:readonly, gpgkeys, get, *, allow
p, role:readonly, logs, get, */*, allow
```

### role:admin

Full access to everything:

```
p, role:admin, applications, *, */*, allow
p, role:admin, clusters, *, *, allow
p, role:admin, repositories, *, *, allow
p, role:admin, projects, *, *, allow
p, role:admin, accounts, *, *, allow
p, role:admin, gpgkeys, *, *, allow
p, role:admin, certificates, *, *, allow
p, role:admin, logs, get, */*, allow
p, role:admin, exec, create, */*, allow
```

## Configuring RBAC

RBAC is configured in the `argocd-rbac-cm` ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  # Default policy for authenticated users
  policy.default: role:readonly

  # Custom policies
  policy.csv: |
    # Grant admin to specific user
    g, admin@example.com, role:admin

    # Grant readonly to all authenticated users (default)
    g, *, role:readonly

  # Scopes to use from OIDC tokens
  scopes: '[groups, email]'
```

## Creating Custom Roles

Define roles that match your organization structure:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.csv: |
    # Define a developer role
    p, role:developer, applications, get, */*, allow
    p, role:developer, applications, sync, */*, allow
    p, role:developer, logs, get, */*, allow

    # Define an operator role
    p, role:operator, applications, *, */*, allow
    p, role:operator, clusters, get, *, allow
    p, role:operator, repositories, get, *, allow
    p, role:operator, projects, get, *, allow

    # Define a viewer role (less than readonly)
    p, role:viewer, applications, get, */*, allow
    p, role:viewer, projects, get, *, allow

    # Assign roles to groups from SSO
    g, developers@example.com, role:developer
    g, devops@example.com, role:operator
    g, guests@example.com, role:viewer
```

## Project-Level RBAC

Restrict users to specific projects:

```yaml
data:
  policy.csv: |
    # Team A can manage their project
    p, role:team-a, applications, *, team-a/*, allow
    p, role:team-a, repositories, get, *, allow
    p, role:team-a, clusters, get, *, allow
    p, role:team-a, projects, get, team-a, allow
    g, team-a-devs@example.com, role:team-a

    # Team B can manage their project
    p, role:team-b, applications, *, team-b/*, allow
    p, role:team-b, repositories, get, *, allow
    p, role:team-b, clusters, get, *, allow
    p, role:team-b, projects, get, team-b, allow
    g, team-b-devs@example.com, role:team-b

    # Platform team can manage infrastructure project
    p, role:platform, applications, *, infrastructure/*, allow
    p, role:platform, clusters, *, *, allow
    p, role:platform, repositories, *, *, allow
    p, role:platform, projects, *, *, allow
    g, platform-team@example.com, role:platform
```

Create corresponding AppProjects:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: team-a
  namespace: argocd
spec:
  description: Team A applications
  sourceRepos:
    - 'https://github.com/myorg/team-a-*'
  destinations:
    - namespace: 'team-a-*'
      server: https://kubernetes.default.svc
  clusterResourceWhitelist:
    - group: ''
      kind: Namespace

---
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: team-b
  namespace: argocd
spec:
  description: Team B applications
  sourceRepos:
    - 'https://github.com/myorg/team-b-*'
  destinations:
    - namespace: 'team-b-*'
      server: https://kubernetes.default.svc
```

## Environment-Based Access

Different access levels for different environments:

```yaml
data:
  policy.csv: |
    # Developers can sync to dev, view staging/prod
    p, role:developer, applications, *, */dev-*, allow
    p, role:developer, applications, get, */staging-*, allow
    p, role:developer, applications, get, */prod-*, allow
    p, role:developer, logs, get, */*, allow

    # Release managers can sync to staging
    p, role:release-manager, applications, *, */dev-*, allow
    p, role:release-manager, applications, *, */staging-*, allow
    p, role:release-manager, applications, get, */prod-*, allow

    # SRE can sync to production
    p, role:sre, applications, *, */*, allow
    p, role:sre, clusters, *, *, allow

    g, developers@example.com, role:developer
    g, release-managers@example.com, role:release-manager
    g, sre-team@example.com, role:sre
```

## Action-Specific Permissions

Fine-grained control over what actions users can take:

```yaml
data:
  policy.csv: |
    # Can sync but not delete
    p, role:deployer, applications, get, */*, allow
    p, role:deployer, applications, sync, */*, allow
    p, role:deployer, applications, action/*, */*, allow

    # Can view and get logs, but nothing else
    p, role:support, applications, get, */*, allow
    p, role:support, logs, get, */*, allow
    p, role:support, exec, create, */*, deny

    # Can override sync but not modify app
    p, role:emergency, applications, get, */*, allow
    p, role:emergency, applications, sync, */*, allow
    p, role:emergency, applications, override, */*, allow
```

Available actions for applications:
- `get` - View application
- `create` - Create application
- `update` - Modify application
- `delete` - Delete application
- `sync` - Sync application
- `override` - Override sync
- `action/*` - Execute resource actions

## RBAC with SSO Groups

Map SSO groups to ArgoCD roles:

```yaml
data:
  # Enable group scope from OIDC
  scopes: '[groups]'

  policy.csv: |
    # Okta groups
    g, ArgoCD-Admins, role:admin
    g, ArgoCD-Developers, role:developer
    g, ArgoCD-Viewers, role:readonly

    # Azure AD groups (may use Object IDs)
    g, 12345678-1234-1234-1234-123456789abc, role:admin

    # Nested group inheritance
    g, role:developer, role:readonly
```

## Denying Access

Explicitly deny access with the deny effect:

```yaml
data:
  policy.csv: |
    # Everyone can view
    p, role:authenticated, applications, get, */*, allow

    # But nobody can delete production apps except admins
    p, *, applications, delete, */prod-*, deny
    p, role:admin, applications, delete, */prod-*, allow

    # Deny exec for everyone except SRE
    p, *, exec, create, */*, deny
    p, role:sre, exec, create, */*, allow
```

## Glob Patterns

Use wildcards to match resources:

```yaml
data:
  policy.csv: |
    # All apps in default project
    p, role:default-admin, applications, *, default/*, allow

    # Apps starting with "api-"
    p, role:api-team, applications, *, */api-*, allow

    # All clusters
    p, role:cluster-viewer, clusters, get, *, allow

    # Specific cluster
    p, role:prod-operator, clusters, *, https://prod.example.com, allow
```

## Testing RBAC Policies

### Using argocd CLI

```bash
# Check if user can perform action
argocd admin settings rbac can user@example.com get applications 'default/myapp'

# Check role permissions
argocd admin settings rbac can role:developer sync applications 'team-a/frontend'

# Validate policy syntax
argocd admin settings rbac validate --policy-file policy.csv
```

### Manual Testing

```bash
# Login as specific user
argocd login argocd.example.com --sso

# Try operations
argocd app get myapp  # Should work
argocd app sync myapp  # Depends on policy
argocd app delete myapp  # Depends on policy
```

## Debugging RBAC Issues

### Check User Info

```bash
# See user's groups and roles
argocd account get-user-info
```

### View Effective Permissions

```bash
# Get all policies
kubectl get configmap argocd-rbac-cm -n argocd -o yaml

# Check if groups are being received
kubectl logs -n argocd deployment/argocd-server | grep -i "groups"
```

### Common Issues

**User has no access:**
- Verify SSO groups are included in tokens
- Check `scopes` in argocd-rbac-cm
- Ensure group names match exactly (case-sensitive)

**Policy not applying:**
- Restart argocd-server after ConfigMap changes
- Check for syntax errors in policy.csv
- Verify the user is in the expected group

```bash
kubectl rollout restart deployment argocd-server -n argocd
```

## Best Practices

### Principle of Least Privilege

```yaml
data:
  # Start with readonly as default
  policy.default: role:readonly

  policy.csv: |
    # Only grant additional permissions as needed
    p, role:developer, applications, sync, team-*/*, allow
```

### Use Groups, Not Users

```yaml
data:
  policy.csv: |
    # Good: assign roles to groups
    g, backend-team@example.com, role:backend

    # Avoid: individual user assignments
    # g, john@example.com, role:admin
```

### Document Your Policies

```yaml
data:
  policy.csv: |
    # ==========================================
    # ArgoCD RBAC Policy
    # Last updated: 2026-01-25
    # ==========================================

    # Role Definitions
    # ----------------

    # Developer role: Can sync to dev, view all
    p, role:developer, applications, get, */*, allow
    p, role:developer, applications, sync, */dev-*, allow

    # Group Assignments
    # -----------------

    # Backend developers
    g, backend-devs@example.com, role:developer
```

### Regular Audits

Periodically review who has access:

```bash
# List all users with admin role
kubectl get configmap argocd-rbac-cm -n argocd -o yaml | grep "role:admin"
```

---

ArgoCD RBAC protects your deployments from unauthorized changes. Start with restrictive defaults and grant access based on actual needs. Map SSO groups to roles for scalable user management. Test policies before rolling out to ensure they work as intended.
