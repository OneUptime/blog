# How to Grant Read-Only Access to Specific Projects in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, RBAC, Access Control

Description: Learn how to configure read-only access scoped to specific ArgoCD projects so teams can only view applications they are responsible for.

---

In a multi-team ArgoCD setup, you often need to restrict visibility so that teams can only see their own applications. The built-in `role:readonly` grants view access to everything, which is not always what you want. A developer on the payments team probably should not be browsing the infrastructure team's applications.

This guide shows you how to create project-scoped read-only roles that limit visibility to specific ArgoCD projects.

## The Problem with Global Readonly

When you assign `role:readonly` to a user, they can see every application across every project:

```yaml
# This gives visibility into EVERYTHING
g, dev-user@company.com, role:readonly
```

That means a frontend developer can see backend deployments, database configurations, infrastructure secrets, and anything else managed by ArgoCD. In regulated environments, this violates the principle of least privilege.

## Creating Project-Scoped Readonly Roles

Instead of using the global readonly role, create custom roles that scope read access to specific projects:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.csv: |
    # Project-scoped readonly roles
    p, role:frontend-viewer, applications, get, frontend/*, allow
    p, role:frontend-viewer, logs, get, frontend/*, allow

    p, role:backend-viewer, applications, get, backend/*, allow
    p, role:backend-viewer, logs, get, backend/*, allow

    p, role:infra-viewer, applications, get, infrastructure/*, allow
    p, role:infra-viewer, logs, get, infrastructure/*, allow

    # Assign teams
    g, team-frontend, role:frontend-viewer
    g, team-backend, role:backend-viewer
    g, team-infra, role:infra-viewer

  # No default role - users only see what they are explicitly granted
  policy.default: ""
```

With this configuration:
- Frontend team members only see applications in the `frontend` project
- Backend team members only see applications in the `backend` project
- Infrastructure team members only see applications in the `infrastructure` project
- Users without explicit role assignments see nothing

## Understanding the Object Format

The object field in RBAC policies uses the format `<project>/<application>`. Here are the patterns you can use:

```yaml
policy.csv: |
  # All apps in a specific project
  p, role:viewer, applications, get, myproject/*, allow

  # A specific app in a specific project
  p, role:viewer, applications, get, myproject/web-app, allow

  # All apps in all projects (same as global readonly)
  p, role:viewer, applications, get, */*, allow

  # All apps whose name starts with "staging-"
  p, role:viewer, applications, get, myproject/staging-*, allow
```

The wildcard `*` works as a glob pattern, making it flexible for matching groups of applications.

## Multi-Project Viewer Role

Sometimes a team needs visibility across multiple projects. Create a role that spans several projects:

```yaml
policy.csv: |
  # Team that needs to see both frontend and backend
  p, role:fullstack-viewer, applications, get, frontend/*, allow
  p, role:fullstack-viewer, applications, get, backend/*, allow
  p, role:fullstack-viewer, logs, get, frontend/*, allow
  p, role:fullstack-viewer, logs, get, backend/*, allow

  g, team-fullstack, role:fullstack-viewer
```

## Adding Repository and Cluster Visibility

Read-only access to applications might not be enough. Users might also need to see which repositories and clusters are configured. These resources are not project-scoped, so you need to decide whether to grant global visibility:

```yaml
policy.csv: |
  # Project-scoped app visibility
  p, role:frontend-viewer, applications, get, frontend/*, allow
  p, role:frontend-viewer, logs, get, frontend/*, allow

  # Optional: let them see repo and cluster configs
  p, role:frontend-viewer, repositories, get, *, allow
  p, role:frontend-viewer, clusters, get, *, allow
```

If you omit the repository and cluster lines, users will still be able to see and interact with applications - they just will not be able to browse the ArgoCD repository or cluster management pages.

## Combining Project Viewers with SSO Groups

In practice, you will map identity provider groups to project viewer roles. Here is a complete example with Okta groups:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.csv: |
    # Define project-scoped viewer roles
    p, role:payments-viewer, applications, get, payments/*, allow
    p, role:payments-viewer, logs, get, payments/*, allow
    p, role:payments-viewer, repositories, get, *, allow

    p, role:platform-viewer, applications, get, platform/*, allow
    p, role:platform-viewer, logs, get, platform/*, allow
    p, role:platform-viewer, repositories, get, *, allow

    p, role:data-viewer, applications, get, data-pipeline/*, allow
    p, role:data-viewer, logs, get, data-pipeline/*, allow
    p, role:data-viewer, repositories, get, *, allow

    # Map Okta groups to roles
    g, okta-payments-team, role:payments-viewer
    g, okta-platform-team, role:platform-viewer
    g, okta-data-team, role:data-viewer

    # Platform admins get full access
    g, okta-platform-admins, role:admin

  policy.default: ""
```

Make sure your OIDC configuration includes the groups scope so ArgoCD receives group claims from Okta:

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

## Testing Project-Scoped Access

Before deploying your policy, verify it works as expected:

```bash
# Can the frontend viewer see frontend apps?
argocd admin settings rbac can role:frontend-viewer get applications 'frontend/web-app' \
  --policy-file policy.csv
# Output: Yes

# Can the frontend viewer see backend apps?
argocd admin settings rbac can role:frontend-viewer get applications 'backend/api-service' \
  --policy-file policy.csv
# Output: No

# Can the frontend viewer sync anything?
argocd admin settings rbac can role:frontend-viewer sync applications 'frontend/web-app' \
  --policy-file policy.csv
# Output: No
```

## Common Pitfalls

**Forgetting to set policy.default** - If you leave `policy.default: role:readonly`, all users will still see everything regardless of your project-scoped roles. Set it to an empty string or omit it entirely.

**Not including log access** - Users will see application status but get "permission denied" when clicking on pod logs if you forget the `logs` resource.

**Overlapping role assignments** - If a user is in multiple groups that map to different roles, they get the union of all permissions. ArgoCD evaluates all matching policies and allows the action if any policy permits it.

**Project names must match** - The project name in your RBAC policy must exactly match the ArgoCD AppProject name. A typo means the policy silently does nothing.

## Verifying in the UI

Once you apply the policy, log in as a user with a project-scoped viewer role. You should see:

1. Only applications belonging to the assigned project on the dashboard
2. Application details, sync status, and health status are visible
3. No sync, delete, or edit buttons appear (since the role is read-only)
4. Pod logs are accessible if you included the `logs` resource

If the user sees more applications than expected, check your `policy.default` setting and verify that the user's group membership in your identity provider matches the group names in your RBAC policy.

## Summary

Project-scoped read-only access in ArgoCD requires creating custom roles instead of using the global `role:readonly`. Define policies with the `<project>/*` pattern to restrict visibility, set `policy.default` to empty to prevent fallback access, and map your SSO groups to the appropriate project viewer roles. Test everything with `argocd admin settings rbac can` before deploying to production.
