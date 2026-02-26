# Understanding ArgoCD argocd-rbac-cm ConfigMap: Every Key Explained

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, RBAC, Security

Description: A complete reference to every key in the ArgoCD argocd-rbac-cm ConfigMap, covering policy definitions, default roles, group mappings, and scoped access control patterns.

---

The `argocd-rbac-cm` ConfigMap is where you define who can do what in ArgoCD. It uses a Casbin-based policy model to control access to applications, projects, repositories, clusters, and other resources. Getting RBAC right is critical for multi-tenant ArgoCD deployments where different teams need different levels of access. This guide explains every key in this ConfigMap.

## Location and Structure

```bash
kubectl get configmap argocd-rbac-cm -n argocd -o yaml
```

The ConfigMap has three main keys:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.default: ""
  policy.csv: ""
  scopes: ""
  policy.matchMode: ""
```

## policy.default

Sets the default role for authenticated users who do not match any specific policy. This is the fallback permission level.

```yaml
data:
  # No access by default (most secure)
  policy.default: ""

  # Read-only access by default
  policy.default: "role:readonly"

  # Admin access by default (not recommended for production)
  policy.default: "role:admin"
```

Common built-in roles:

- `role:readonly` - read-only access to all resources
- `role:admin` - full access to all resources
- Empty string or omitted - no access at all

For production environments, always set this to empty or `role:readonly`.

## policy.csv

The main RBAC policy definition. This is where all permission rules and group mappings live. It uses Casbin CSV format.

### Policy Rules (p lines)

Permission rules follow this format:

```
p, <subject>, <resource>, <action>, <object>, <allow|deny>
```

Where:
- **subject** - user, role, or group
- **resource** - the ArgoCD resource type
- **action** - the operation being performed
- **object** - the target (usually project/application pattern)
- **effect** - `allow` or `deny`

Available resources and their actions:

```yaml
data:
  policy.csv: |
    # Applications - the most common resource
    p, role:app-viewer, applications, get, */*, allow
    p, role:app-viewer, applications, list, */*, allow

    p, role:app-syncer, applications, get, */*, allow
    p, role:app-syncer, applications, sync, */*, allow

    p, role:app-admin, applications, *, */*, allow

    # Available application actions:
    # get, create, update, delete, sync, override, action, list

    # Logs
    p, role:log-viewer, logs, get, */*, allow

    # Exec (terminal access)
    p, role:exec-user, exec, create, */*, allow

    # Repositories
    p, role:repo-admin, repositories, get, *, allow
    p, role:repo-admin, repositories, create, *, allow
    p, role:repo-admin, repositories, update, *, allow
    p, role:repo-admin, repositories, delete, *, allow

    # Clusters
    p, role:cluster-admin, clusters, get, *, allow
    p, role:cluster-admin, clusters, create, *, allow
    p, role:cluster-admin, clusters, update, *, allow
    p, role:cluster-admin, clusters, delete, *, allow

    # Projects
    p, role:project-admin, projects, get, *, allow
    p, role:project-admin, projects, create, *, allow
    p, role:project-admin, projects, update, *, allow
    p, role:project-admin, projects, delete, *, allow

    # Certificates
    p, role:cert-admin, certificates, get, *, allow
    p, role:cert-admin, certificates, create, *, allow

    # GPG keys
    p, role:gpgkey-admin, gpgkeys, get, *, allow
    p, role:gpgkey-admin, gpgkeys, create, *, allow

    # Extensions
    p, role:ext-user, extensions, invoke, *, allow
```

### Group Mappings (g lines)

Map users or SSO groups to roles:

```yaml
data:
  policy.csv: |
    # Map an SSO group to a built-in role
    g, my-org:platform-team, role:admin

    # Map an SSO group to a custom role
    g, my-org:frontend-devs, role:frontend-developer

    # Map a local user to a role
    g, alice, role:admin

    # Map a group to a project-scoped role
    g, my-org:backend-team, proj:backend:developer
```

### Scoped Policies

Restrict permissions to specific projects:

```yaml
data:
  policy.csv: |
    # Frontend team can only manage apps in the frontend project
    p, role:frontend-dev, applications, get, frontend/*, allow
    p, role:frontend-dev, applications, sync, frontend/*, allow
    p, role:frontend-dev, applications, create, frontend/*, allow
    p, role:frontend-dev, logs, get, frontend/*, allow
    g, my-org:frontend-team, role:frontend-dev

    # Backend team limited to backend project
    p, role:backend-dev, applications, *, backend/*, allow
    p, role:backend-dev, logs, get, backend/*, allow
    g, my-org:backend-team, role:backend-dev

    # Platform team has global access
    p, role:platform-admin, applications, *, */*, allow
    p, role:platform-admin, repositories, *, *, allow
    p, role:platform-admin, clusters, *, *, allow
    p, role:platform-admin, projects, *, *, allow
    g, my-org:platform-team, role:platform-admin
```

### Deny Rules

Explicitly deny specific permissions (deny takes precedence over allow):

```yaml
data:
  policy.csv: |
    # Allow everything for developers
    p, role:developer, applications, *, my-project/*, allow

    # But deny deletion in production
    p, role:developer, applications, delete, my-project/*-production, deny

    # Deny exec for all developers
    p, role:developer, exec, create, */*, deny
```

### Wildcard Patterns

The object field supports wildcards:

```yaml
data:
  policy.csv: |
    # All applications in all projects
    p, role:viewer, applications, get, */*, allow

    # All applications in a specific project
    p, role:team-viewer, applications, get, my-project/*, allow

    # Specific application in a specific project
    p, role:app-admin, applications, *, my-project/my-app, allow

    # Applications matching a pattern
    p, role:prod-viewer, applications, get, */*-production, allow
```

## scopes

Defines which OIDC claims ArgoCD uses for group membership. This determines which field in the SSO token contains group information:

```yaml
data:
  # Default - use the 'groups' claim
  scopes: "[groups]"

  # Use email as the identifier
  scopes: "[email]"

  # Use multiple claims
  scopes: "[groups, email]"

  # Use a custom claim
  scopes: "[cognito:groups]"
```

This is critical for SSO integration. If your identity provider puts group membership in a non-standard claim, you must configure this.

## policy.matchMode

Controls how policy matching works:

```yaml
data:
  # Default - uses glob matching
  policy.matchMode: "glob"

  # Use regex matching (more powerful but slower)
  policy.matchMode: "regex"
```

With glob mode (default), patterns use `*` for wildcards. With regex mode, patterns use full regular expressions.

## Practical Examples

### Read-Only Access for Everyone, Admin for Platform Team

```yaml
data:
  policy.default: "role:readonly"
  policy.csv: |
    g, platform-admins, role:admin
```

### Per-Team Isolation

```yaml
data:
  policy.default: ""
  scopes: "[groups]"
  policy.csv: |
    # Team A
    p, role:team-a, applications, *, team-a/*, allow
    p, role:team-a, logs, get, team-a/*, allow
    g, org:team-a-devs, role:team-a

    # Team B
    p, role:team-b, applications, *, team-b/*, allow
    p, role:team-b, logs, get, team-b/*, allow
    g, org:team-b-devs, role:team-b

    # Shared read access across teams
    p, role:org-viewer, applications, get, */*, allow
    g, org:all-engineers, role:org-viewer

    # Platform team
    g, org:platform-team, role:admin
```

### CI/CD Bot with Limited Access

```yaml
data:
  policy.csv: |
    # CI bot can only sync apps, nothing else
    p, role:ci-bot, applications, get, */*, allow
    p, role:ci-bot, applications, sync, */*, allow
    g, ci-pipeline, role:ci-bot
```

### Environment-Based Access Control

```yaml
data:
  policy.csv: |
    # Developers have full access to dev
    p, role:developer, applications, *, */dev-*, allow
    p, role:developer, applications, get, */staging-*, allow
    p, role:developer, applications, get, */prod-*, allow

    # Only leads can sync to staging
    p, role:lead, applications, *, */dev-*, allow
    p, role:lead, applications, *, */staging-*, allow
    p, role:lead, applications, get, */prod-*, allow

    # Only platform team can sync to production
    p, role:platform, applications, *, */*, allow

    g, org:developers, role:developer
    g, org:team-leads, role:lead
    g, org:platform, role:platform
```

## Debugging RBAC

Test your policies using the ArgoCD CLI:

```bash
# Check if a user can perform an action
argocd admin settings rbac can alice get applications 'default/my-app' \
  --policy-file policy.csv

# Validate the entire policy file
argocd admin settings rbac validate --policy-file policy.csv
```

## Summary

The `argocd-rbac-cm` ConfigMap is the backbone of ArgoCD access control. The combination of policy rules (p lines), group mappings (g lines), and the default policy gives you flexible, fine-grained control over who can access what. Always start with a restrictive default policy and add permissions explicitly. Test your policies with the ArgoCD CLI before applying them, and review the RBAC configuration regularly as teams and projects evolve. For the related server configuration, see the [argocd-cm](https://oneuptime.com/blog/post/2026-02-26-understanding-argocd-cm-configmap-every-key-explained/view) reference.
