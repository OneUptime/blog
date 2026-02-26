# How to Restrict Users from Deleting Applications in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, RBAC, Security

Description: Learn how to use RBAC deny rules and policies in ArgoCD to prevent users from accidentally or intentionally deleting applications in production environments.

---

Application deletion is one of the most dangerous operations in ArgoCD. When you delete an application with cascade deletion enabled, ArgoCD removes all managed Kubernetes resources - deployments, services, configmaps, persistent volume claims, everything. A single misclick or mistyped command can take down a production service in seconds.

This guide shows you how to restrict application deletion to only authorized users using RBAC policies.

## Understanding Delete in ArgoCD

ArgoCD has two types of application deletion:

1. **Cascade delete** (default) - Deletes the ArgoCD application AND all Kubernetes resources it manages
2. **Non-cascade delete** - Deletes only the ArgoCD application, leaving Kubernetes resources running as orphans

Both are controlled by the `delete` action in RBAC. If a user cannot perform the `delete` action, they cannot delete the application using either method.

## Basic Delete Restriction

The simplest approach is to never grant the `delete` action to non-admin roles:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.csv: |
    # Deployer role - can do everything EXCEPT delete
    p, role:deployer, applications, get, */*, allow
    p, role:deployer, applications, create, */*, allow
    p, role:deployer, applications, update, */*, allow
    p, role:deployer, applications, sync, */*, allow
    p, role:deployer, applications, action, */*, allow
    p, role:deployer, applications, override, */*, allow
    p, role:deployer, logs, get, */*, allow

    # Note: delete is simply not listed, so it is denied by default

    g, developers, role:deployer
    g, platform-admins, role:admin

  policy.default: ""
```

Since the `delete` action is not included in the deployer role, any user with only the deployer role will be blocked from deleting applications.

## Using Explicit Deny Rules

If you have a role that uses wildcard actions, you need explicit deny rules to prevent deletion:

```yaml
policy.csv: |
  # This role has wildcard actions on applications
  p, role:app-manager, applications, *, myproject/*, allow

  # Explicitly deny delete even though wildcard allows it
  p, role:app-manager, applications, delete, myproject/*, deny

  g, team-leads, role:app-manager
```

Deny rules take precedence over allow rules, so the delete action is blocked even though the wildcard `*` would otherwise permit it.

## Production-Only Delete Restriction

Allow deletion in staging but restrict it in production:

```yaml
policy.csv: |
  # Full access to staging including delete
  p, role:developer, applications, *, staging/*, allow
  p, role:developer, logs, get, staging/*, allow

  # Production access WITHOUT delete
  p, role:developer, applications, get, production/*, allow
  p, role:developer, applications, sync, production/*, allow
  p, role:developer, applications, action, production/*, allow
  p, role:developer, logs, get, production/*, allow

  # Only production leads can delete production apps
  p, role:prod-admin, applications, delete, production/*, allow
  p, role:prod-admin, applications, *, production/*, allow

  g, all-developers, role:developer
  g, production-leads, role:prod-admin
```

This setup lets developers freely manage staging applications (including deletion) but prevents them from deleting anything in production.

## Application Finalizer Protection

In addition to RBAC, you can use Kubernetes finalizers to add another layer of delete protection:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: critical-payment-service
  namespace: argocd
  finalizers:
    # This finalizer ensures cascade delete happens
    # Remove it to make the app "undeleable" unless the finalizer is explicitly removed
    - resources-finalizer.argocd.argoproj.io
  annotations:
    # Add a warning annotation
    argocd.argoproj.io/sync-options: "Delete=false"
spec:
  project: production
  source:
    repoURL: https://github.com/myorg/payment-service
    targetRevision: main
    path: deploy
  destination:
    server: https://kubernetes.default.svc
    namespace: payments
```

Even if someone bypasses RBAC (for example, using kubectl directly), the finalizer prevents immediate resource deletion.

## Restricting Delete Through the UI

The ArgoCD UI shows or hides the delete button based on RBAC permissions. When a user without delete permission opens an application:

- The "Delete" button in the application toolbar is hidden
- The context menu in the application list does not show "Delete"
- The "Delete" option in the app details page is not available

This provides a good user experience - if you cannot do it, you do not see the button.

## Restricting Delete Through the CLI

The CLI also respects RBAC. Users without the delete permission will see:

```bash
$ argocd app delete my-app
FATA[0000] permission denied: applications, delete, default/my-app, sub: developer@company.com, iat: 2024-01-15T10:00:00Z
```

This error is clear and tells the user exactly what permission they are missing.

## Audit Trail for Delete Operations

Even with RBAC restrictions, you should monitor delete attempts. ArgoCD logs all API requests, including denied ones. Check the ArgoCD server logs:

```bash
# View recent delete attempts
kubectl logs -n argocd deployment/argocd-server | grep "delete" | grep "applications"
```

For more structured auditing, configure ArgoCD notifications to alert on delete events:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  trigger.on-delete: |
    - when: app.metadata.deletionTimestamp != nil
      send: [app-deleted]
  template.app-deleted: |
    message: |
      Application {{.app.metadata.name}} in project {{.app.spec.project}} has been deleted.
  service.slack: |
    token: $slack-token
```

## Testing Delete Restrictions

Always verify your delete restrictions work before relying on them:

```bash
# Verify deployer cannot delete
argocd admin settings rbac can role:deployer delete applications 'production/my-app' \
  --policy-file policy.csv
# Output: No

# Verify admin can delete
argocd admin settings rbac can role:admin delete applications 'production/my-app' \
  --policy-file policy.csv
# Output: Yes

# Verify prod-admin can delete production apps
argocd admin settings rbac can role:prod-admin delete applications 'production/my-app' \
  --policy-file policy.csv
# Output: Yes

# Verify prod-admin cannot delete staging apps (if that is your intent)
argocd admin settings rbac can role:prod-admin delete applications 'staging/my-app' \
  --policy-file policy.csv
# Output: No
```

## Emergency Delete Access

Sometimes you need to delete applications for legitimate reasons - cleaning up after a migration, removing abandoned apps, or responding to security incidents. Plan for this:

```yaml
policy.csv: |
  # Standard roles without delete
  p, role:deployer, applications, get, */*, allow
  p, role:deployer, applications, sync, */*, allow
  p, role:deployer, applications, action, */*, allow

  # Emergency role with time-limited tokens
  p, role:emergency-admin, applications, *, */*, allow
  p, role:emergency-admin, clusters, get, *, allow

  g, developers, role:deployer
  g, platform-admins, role:admin
```

For the emergency role, generate short-lived tokens:

```bash
# Generate a token that expires in 1 hour
argocd account generate-token --account emergency-admin --expires-in 1h
```

This ensures that delete access is temporary and must be explicitly requested.

## Complete Production Policy

Here is a full policy that implements delete restrictions across multiple teams:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.csv: |
    # Platform admins - full access including delete
    g, platform-engineering, role:admin

    # Team deployers - can manage apps but not delete
    p, role:team-deployer, applications, get, */*, allow
    p, role:team-deployer, applications, create, */*, allow
    p, role:team-deployer, applications, update, */*, allow
    p, role:team-deployer, applications, sync, */*, allow
    p, role:team-deployer, applications, action, */*, allow
    p, role:team-deployer, applications, override, */*, allow
    p, role:team-deployer, logs, get, */*, allow
    p, role:team-deployer, repositories, get, *, allow

    # Assign teams
    g, team-frontend, role:team-deployer
    g, team-backend, role:team-deployer
    g, team-data, role:team-deployer

  policy.default: role:readonly
```

## Summary

Restricting application deletion in ArgoCD is essential for production safety. The simplest approach is to never include the `delete` action in non-admin roles. Use explicit deny rules when wildcard permissions are in play, and layer RBAC with finalizer protection for critical applications. Always test your policies and maintain an emergency access path for legitimate delete operations.
