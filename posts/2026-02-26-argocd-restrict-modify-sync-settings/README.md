# How to Restrict Users from Modifying Sync Settings in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, RBAC, Security

Description: Learn how to use ArgoCD RBAC policies to prevent unauthorized users from changing sync settings like auto-sync, self-healing, and pruning on production applications.

---

Sync settings in ArgoCD control how and when applications get deployed. Auto-sync, self-healing, pruning, sync windows - these settings determine the fundamental deployment behavior of your applications. When someone accidentally enables auto-sync with pruning on a production app, resources can be deleted without warning. When someone disables self-healing, manual drift goes undetected.

This guide shows how to lock down sync settings using RBAC so only authorized users can modify deployment behavior.

## What Sync Settings Can Be Modified

ArgoCD application sync settings include:

- **Automated sync** - Whether ArgoCD auto-syncs when Git changes
- **Self-healing** - Whether ArgoCD reverts manual changes to cluster resources
- **Prune** - Whether ArgoCD deletes resources that are no longer in Git
- **Sync options** - Settings like Replace, ServerSideApply, CreateNamespace
- **Retry policy** - Automatic retry configuration for failed syncs
- **Sync windows** - Time-based restrictions on when syncs can happen

All of these are part of the application spec, so modifying them requires the `update` action on the `applications` resource.

## The Update Action Controls Sync Settings

Sync settings are stored in the ArgoCD Application resource. Changing any sync setting requires updating the application, which means the `update` permission:

```yaml
# This permission allows modifying sync settings
p, role:deployer, applications, update, myproject/*, allow

# This permission does NOT allow modifying sync settings
p, role:syncer, applications, sync, myproject/*, allow
```

The `sync` action only triggers a sync operation - it does not let users change how syncs are configured. The `update` action lets users modify the application spec, including all sync settings.

## Separating Sync from Update

Create a role that can trigger syncs but cannot change sync configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.csv: |
    # Can trigger syncs and view apps, but cannot change settings
    p, role:syncer, applications, get, */*, allow
    p, role:syncer, applications, sync, */*, allow
    p, role:syncer, applications, action, */*, allow
    p, role:syncer, logs, get, */*, allow

    # Can change settings (including sync configuration)
    p, role:app-configurator, applications, get, */*, allow
    p, role:app-configurator, applications, update, */*, allow

    # Assign roles
    g, developers, role:syncer
    g, team-leads, role:syncer
    g, team-leads, role:app-configurator

  policy.default: ""
```

With this setup:
- Developers can trigger syncs and view applications
- Team leads can trigger syncs AND modify sync settings
- Neither can create or delete applications

## Protecting Critical Sync Settings

Here is a practical scenario. Your platform team has carefully configured auto-sync with self-healing on production applications. You want developers to be able to deploy but not change this configuration.

The application looks like this:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payment-service
  namespace: argocd
spec:
  project: production
  source:
    repoURL: https://github.com/myorg/payment-service
    targetRevision: main
    path: deploy/production
  destination:
    server: https://kubernetes.default.svc
    namespace: payments
  syncPolicy:
    automated:
      selfHeal: true
      prune: true
    syncOptions:
      - CreateNamespace=false
      - PruneLast=true
    retry:
      limit: 3
      backoff:
        duration: 5s
        maxDuration: 3m0s
        factor: 2
```

To protect these settings, deny the `update` action for non-admin users on production apps:

```yaml
policy.csv: |
  # Developers can view and manually sync production apps
  p, role:prod-deployer, applications, get, production/*, allow
  p, role:prod-deployer, applications, sync, production/*, allow
  p, role:prod-deployer, applications, action, production/*, allow
  p, role:prod-deployer, logs, get, production/*, allow

  # Only platform team can update production app settings
  p, role:prod-configurator, applications, update, production/*, allow
  p, role:prod-configurator, applications, get, production/*, allow

  g, developers, role:prod-deployer
  g, platform-team, role:admin
```

## What Happens in the UI

When a user without `update` permission opens an application in the ArgoCD UI:

- They can see all sync settings (automated sync, prune, self-heal)
- The "Sync Policy" section is read-only
- The "Edit" button in app details is hidden or disabled
- Manual sync button works (if they have `sync` permission)
- They cannot toggle auto-sync, self-heal, or prune through the UI

This provides a good user experience - the settings are visible but not editable.

## What Happens in the CLI

When a user without `update` permission tries to change settings via CLI:

```bash
# Trying to enable auto-sync
$ argocd app set payment-service --sync-policy automated
FATA[0000] permission denied: applications, update, production/payment-service

# Trying to disable pruning
$ argocd app set payment-service --auto-prune
FATA[0000] permission denied: applications, update, production/payment-service

# Trying to add a sync option
$ argocd app set payment-service --sync-option Replace=true
FATA[0000] permission denied: applications, update, production/payment-service
```

All of these operations require the `update` action and will fail with a clear permission denied error.

## GitOps-Based Sync Settings Protection

The strongest way to protect sync settings is to manage ArgoCD applications themselves through GitOps. Store your Application YAML in a Git repository and deploy it with ArgoCD (the app-of-apps pattern):

```yaml
# In your apps repository: applications/payment-service.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payment-service
  namespace: argocd
spec:
  project: production
  syncPolicy:
    automated:
      selfHeal: true
      prune: true
```

With self-healing enabled on the parent application, any manual changes to sync settings get reverted automatically:

1. Developer uses CLI to disable auto-sync
2. ArgoCD detects the application spec has drifted from Git
3. Self-healing kicks in and reverts the change
4. Sync settings are restored to the Git-defined values

This combines RBAC protection with Git-based enforcement.

## Environment-Specific Restrictions

Apply different restriction levels based on environment:

```yaml
policy.csv: |
  # Staging: developers can change everything
  p, role:staging-manager, applications, *, staging/*, allow
  p, role:staging-manager, logs, get, staging/*, allow

  # Production: developers can only sync, not update
  p, role:prod-syncer, applications, get, production/*, allow
  p, role:prod-syncer, applications, sync, production/*, allow
  p, role:prod-syncer, logs, get, production/*, allow

  # All devs get both roles
  g, developers, role:staging-manager
  g, developers, role:prod-syncer
```

This lets developers freely experiment with sync settings in staging while keeping production configuration locked down.

## Testing Sync Setting Restrictions

```bash
# Can developers update production apps?
argocd admin settings rbac can role:prod-syncer update applications 'production/payment-service' \
  --policy-file policy.csv
# Output: No

# Can developers sync production apps?
argocd admin settings rbac can role:prod-syncer sync applications 'production/payment-service' \
  --policy-file policy.csv
# Output: Yes

# Can developers update staging apps?
argocd admin settings rbac can role:staging-manager update applications 'staging/payment-service' \
  --policy-file policy.csv
# Output: Yes
```

## Monitoring Unauthorized Update Attempts

Track who is trying to modify sync settings by monitoring ArgoCD server logs:

```bash
# Look for denied update attempts
kubectl logs -n argocd deployment/argocd-server | grep "permission denied" | grep "update"
```

Set up alerts if you see repeated denied access attempts, as this might indicate someone trying to work around your security controls.

## Summary

Restricting sync setting modifications in ArgoCD comes down to controlling the `update` action on applications. Create roles that have `sync` permission but not `update` permission, and users can deploy without changing how deployments are configured. For maximum protection, combine RBAC restrictions with GitOps-based application management and self-healing, so even authorized changes through the UI get reverted if they do not match the desired state in Git.
