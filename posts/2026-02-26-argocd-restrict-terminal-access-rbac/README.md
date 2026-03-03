# How to Restrict Terminal Access with RBAC in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, RBAC, Security

Description: Learn how to use ArgoCD RBAC policies to restrict web-based terminal access, ensuring only authorized users can exec into pods while maintaining security best practices.

---

The web-based terminal in ArgoCD gives users direct shell access to running containers. While this is invaluable for debugging, unrestricted terminal access is a significant security risk in production environments. RBAC (Role-Based Access Control) is the primary mechanism for controlling who gets to use this feature.

This guide covers how to build RBAC policies that restrict terminal access to the right people, at the right scope, with the right level of control.

## The exec Permission in ArgoCD RBAC

ArgoCD treats terminal access as a distinct permission type called `exec`. This is separate from application-level permissions like `get`, `sync`, or `delete`. A user might have full read access to every application but still be blocked from opening a terminal session.

The RBAC policy format for exec is:

```text
p, <subject>, exec, create, <project>/<namespace>/<application>, <allow|deny>
```

The key components:

| Field | Description | Example |
|-------|-------------|---------|
| subject | Role or user identity | `role:developer` |
| exec | Resource type | Always `exec` |
| create | Action | Always `create` |
| scope | Project/namespace/app | `my-project/*/my-app` |
| effect | Allow or deny | `allow` or `deny` |

## Default: Terminal Access is Denied

By default, no user has exec permissions - even the built-in admin role. You must explicitly grant it. This is a deliberate security design choice.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.csv: |
    # Built-in admin role does NOT automatically get exec access
    # You must explicitly grant it
    p, role:admin, exec, create, */*, allow
  policy.default: role:readonly
```

## Strategy 1: Environment-Based Restrictions

The most common pattern is to allow terminal access in development and staging environments but deny it in production:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.csv: |
    # --- Exec Policies ---
    # Developers can exec into dev and staging, not production
    p, role:developer, exec, create, dev-project/*, allow
    p, role:developer, exec, create, staging-project/*, allow
    p, role:developer, exec, create, production-project/*, deny

    # SRE can exec everywhere
    p, role:sre, exec, create, */*, allow

    # --- Application Policies ---
    # Developers can view and sync in dev/staging
    p, role:developer, applications, get, dev-project/*, allow
    p, role:developer, applications, sync, dev-project/*, allow
    p, role:developer, applications, get, staging-project/*, allow
    p, role:developer, applications, sync, staging-project/*, allow
    p, role:developer, applications, get, production-project/*, allow

    # Group mappings
    g, dev-team, role:developer
    g, sre-team, role:sre
  policy.default: role:readonly
```

With this setup, developers can see production applications but cannot open a terminal into production pods.

## Strategy 2: Break-Glass Emergency Access

Sometimes you need emergency terminal access to production that is normally locked down. You can implement a break-glass pattern using a separate role:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.csv: |
    # Normal developer role - no production exec
    p, role:developer, exec, create, dev-project/*, allow
    p, role:developer, exec, create, staging-project/*, allow

    # Emergency access role - grants production exec
    p, role:emergency-responder, exec, create, production-project/*, allow
    p, role:emergency-responder, applications, get, */*, allow

    # Group mappings
    g, dev-team, role:developer

    # Emergency role is assigned manually during incidents
    # Do NOT permanently assign groups to this role
```

During an incident, an admin can temporarily assign a user to the `emergency-responder` role. After the incident, the assignment is removed.

```bash
# Grant emergency access (done by admin during incident)
# This would typically be automated through your incident management tool
argocd account update-password --account emergency-user

# After the incident, revoke by removing the group mapping
```

## Strategy 3: Time-Limited Access with JWT Tokens

For CI/CD service accounts or temporary users, you can generate time-limited JWT tokens with exec permissions:

```bash
# Create a project role with exec permissions and a short TTL
argocd proj role create my-project debug-role \
  --description "Temporary debug access"

# Add exec policy to the role
argocd proj role add-policy my-project debug-role \
  -a create -p allow -o exec

# Generate a token that expires in 1 hour
argocd proj role create-token my-project debug-role \
  --expires-in 1h
```

The generated token provides terminal access only within the specified project and expires automatically.

## Combining Exec with Other Permissions

A well-designed RBAC policy balances exec access with other permissions. Here is a complete example for a mid-size organization:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.csv: |
    # === Role Definitions ===

    # Viewers - can only see applications
    p, role:viewer, applications, get, */*, allow
    p, role:viewer, logs, get, */*, allow

    # Developers - can view, sync, and debug in non-prod
    p, role:developer, applications, get, */*, allow
    p, role:developer, applications, sync, dev-*/*, allow
    p, role:developer, applications, sync, staging-*/*, allow
    p, role:developer, logs, get, */*, allow
    p, role:developer, exec, create, dev-*/*, allow
    p, role:developer, exec, create, staging-*/*, allow

    # Tech Leads - developers plus production sync
    p, role:tech-lead, applications, get, */*, allow
    p, role:tech-lead, applications, sync, */*, allow
    p, role:tech-lead, logs, get, */*, allow
    p, role:tech-lead, exec, create, dev-*/*, allow
    p, role:tech-lead, exec, create, staging-*/*, allow

    # SRE - full access including production exec
    p, role:sre, applications, *, */*, allow
    p, role:sre, logs, get, */*, allow
    p, role:sre, exec, create, */*, allow

    # === Group Mappings ===
    g, oidc:viewers, role:viewer
    g, oidc:developers, role:developer
    g, oidc:tech-leads, role:tech-lead
    g, oidc:sre-team, role:sre

  policy.default: role:viewer
```

Notice that tech leads can sync to production but cannot exec into production pods. Only SRE can do both.

## Validating RBAC Policies

Always validate your policies before deploying:

```bash
# Check if a role has exec access to a specific scope
argocd admin settings rbac can role:developer exec create 'dev-project/*' \
  --policy-file policy.csv
# Output: Yes

argocd admin settings rbac can role:developer exec create 'production-project/*' \
  --policy-file policy.csv
# Output: No

# Validate the entire policy file for syntax errors
argocd admin settings rbac validate --policy-file policy.csv
```

## Auditing Terminal Access

Once RBAC is configured, set up auditing to ensure policies are working as expected:

```bash
# Check API server logs for exec attempts
kubectl logs deployment/argocd-server -n argocd | grep -i "exec"

# Look for denied attempts
kubectl logs deployment/argocd-server -n argocd | grep -i "permission denied.*exec"
```

For longer-term auditing, export ArgoCD logs to a centralized logging system. You can use [ArgoCD deep links to logging systems](https://oneuptime.com/blog/post/2026-02-26-argocd-deep-links-logging-systems/view) for quick access to relevant log data.

## Common Mistakes

**Mistake 1: Forgetting the exec.enabled flag**

RBAC policies alone do not enable the terminal. You must also set `exec.enabled: "true"` in `argocd-cm`.

**Mistake 2: Using overly broad wildcards**

```yaml
# Too broad - gives exec to every project
p, role:developer, exec, create, */*, allow

# Better - scope to specific projects
p, role:developer, exec, create, dev-project/*, allow
```

**Mistake 3: Not testing deny rules**

Deny rules take precedence over allow rules. If you have conflicting policies, the deny wins:

```yaml
# This user gets denied because deny takes priority
p, role:developer, exec, create, */*, allow
p, role:developer, exec, create, production-project/*, deny
```

A developer with both rules applied will be allowed everywhere except `production-project`.

## Conclusion

RBAC is the cornerstone of securing terminal access in ArgoCD. By designing policies around your organizational structure - environments, teams, and incident response procedures - you can provide useful debugging capabilities while maintaining strict security controls. Start restrictive and grant additional access based on demonstrated need, rather than starting open and trying to lock things down later.
