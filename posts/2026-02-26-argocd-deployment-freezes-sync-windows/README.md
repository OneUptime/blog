# How to Handle Deployment Freezes with ArgoCD Sync Windows

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Sync Windows, Deployment Freeze

Description: Learn how to configure ArgoCD sync windows to implement deployment freezes during holidays, peak traffic periods, and maintenance windows for safer production management.

---

Every production environment has periods when deployments should not happen - Black Friday, end-of-quarter processing, major sporting events, regulatory audit windows, or simply the middle of the night when nobody is awake to respond to issues. ArgoCD sync windows give you a declarative way to enforce deployment freezes and allow windows, eliminating the need for ad-hoc communication and manual enforcement.

This guide covers configuring sync windows for various deployment freeze scenarios.

## Understanding Sync Windows

ArgoCD sync windows define time ranges during which syncs are either allowed or denied. They are configured at the AppProject level and apply to applications based on matching criteria. There are two types:

- **Allow windows** - syncs can only happen during these windows
- **Deny windows** - syncs are blocked during these windows

When no sync windows are configured, syncs can happen at any time (the default behavior).

## Basic Sync Window Configuration

Sync windows are defined in AppProject resources:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: production
  namespace: argocd
spec:
  description: Production applications
  sourceRepos:
    - 'https://github.com/myorg/*'
  destinations:
    - namespace: '*'
      server: https://kubernetes.default.svc

  syncWindows:
    # Block deployments on weekends
    - kind: deny
      schedule: '0 0 * * 6'    # Saturday at midnight
      duration: 48h             # Until Monday midnight
      applications:
        - '*'
      manualSync: true          # Also block manual syncs

    # Block deployments during business hours freeze
    - kind: deny
      schedule: '0 9 * * 1-5'  # Weekdays 9 AM
      duration: 1h              # Until 10 AM (morning standup)
      applications:
        - '*'

    # Allow deployments only during business hours
    - kind: allow
      schedule: '0 10 * * 1-5' # Weekdays 10 AM
      duration: 8h              # Until 6 PM
      applications:
        - '*'
      manualSync: false         # Allow manual syncs outside the window
```

## Holiday Freeze Configuration

For major holidays and events, set up deny windows:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: production
  namespace: argocd
spec:
  syncWindows:
    # Black Friday to Cyber Monday freeze
    - kind: deny
      schedule: '0 0 22 11 *'   # November 22
      duration: 120h             # 5 days through Cyber Monday
      applications:
        - '*'
      clusters:
        - 'https://kubernetes.default.svc'
      namespaces:
        - 'production-*'
      manualSync: true

    # End of year code freeze
    - kind: deny
      schedule: '0 0 20 12 *'   # December 20
      duration: 288h             # 12 days through January 1
      applications:
        - '*'
      manualSync: true

    # End of quarter freeze (last 3 days of quarter)
    - kind: deny
      schedule: '0 0 28 3 *'    # March 28
      duration: 96h
      applications:
        - 'finance-*'
      manualSync: true

    - kind: deny
      schedule: '0 0 28 6 *'    # June 28
      duration: 72h
      applications:
        - 'finance-*'
      manualSync: true

    - kind: deny
      schedule: '0 0 28 9 *'    # September 28
      duration: 72h
      applications:
        - 'finance-*'
      manualSync: true

    - kind: deny
      schedule: '0 0 29 12 *'   # December 29
      duration: 72h
      applications:
        - 'finance-*'
      manualSync: true
```

## Per-Team Deployment Windows

Different teams may have different deployment schedules:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: platform-team
  namespace: argocd
spec:
  syncWindows:
    # Platform team deploys during maintenance windows
    - kind: allow
      schedule: '0 2 * * 2'     # Tuesday at 2 AM
      duration: 4h               # Until 6 AM
      applications:
        - 'infrastructure-*'
    - kind: allow
      schedule: '0 2 * * 4'     # Thursday at 2 AM
      duration: 4h
      applications:
        - 'infrastructure-*'
---
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: frontend-team
  namespace: argocd
spec:
  syncWindows:
    # Frontend team deploys during business hours
    - kind: allow
      schedule: '0 10 * * 1-4'  # Mon-Thu 10 AM
      duration: 7h               # Until 5 PM
      applications:
        - 'frontend-*'
    # No Friday deploys
```

## Emergency Deployment Override

Sometimes you need to deploy during a freeze. Configure a separate project for emergency deployments:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: production-emergency
  namespace: argocd
spec:
  description: Emergency deployments - no sync windows
  sourceRepos:
    - 'https://github.com/myorg/*'
  destinations:
    - namespace: '*'
      server: https://kubernetes.default.svc
  # No syncWindows - deployments always allowed
  # Restrict who can use this project with RBAC
  roles:
    - name: emergency-deployer
      description: Can deploy during freezes
      policies:
        - p, proj:production-emergency:emergency-deployer, applications, sync, production-emergency/*, allow
      groups:
        - oncall-engineers
```

To use it, temporarily move the application to the emergency project:

```bash
# Move application to emergency project for the hotfix
argocd app set api-server --project production-emergency

# Deploy the fix
argocd app sync api-server

# Move back to the regular project
argocd app set api-server --project production
```

## Selective Freeze by Application Type

Freeze application deployments but allow infrastructure changes:

```yaml
syncWindows:
  # Freeze all application deployments
  - kind: deny
    schedule: '0 0 20 12 *'
    duration: 288h
    applications:
      - 'app-*'
      - 'service-*'
      - 'frontend-*'
    manualSync: true

  # But allow monitoring and observability changes
  - kind: allow
    schedule: '* * * * *'      # Always allow
    duration: 24h
    applications:
      - 'monitoring-*'
      - 'alerting-*'
    manualSync: true
```

## Sync Window with Namespace Targeting

Target specific namespaces instead of application names:

```yaml
syncWindows:
  # Freeze production namespace
  - kind: deny
    schedule: '0 18 * * 5'     # Friday 6 PM
    duration: 60h               # Until Monday 6 AM
    namespaces:
      - 'production'
      - 'production-*'
    manualSync: true

  # Allow staging deployments anytime
  - kind: allow
    schedule: '* * * * *'
    duration: 24h
    namespaces:
      - 'staging'
      - 'staging-*'
```

## Monitoring Sync Window Status

Check which sync windows are currently active:

```bash
# List all sync windows for a project
argocd proj windows list production

# Check if an app can currently sync
argocd app get my-app --show-operation

# View sync window details
kubectl get appproject production -n argocd -o jsonpath='{.spec.syncWindows}' | jq
```

## Automating Freeze Announcements

Use ArgoCD notifications to announce when freezes start and end:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  trigger.sync-window-active: |
    - when: app.status.operationState.phase == 'Failed' and app.status.operationState.message contains 'sync window'
      send: [sync-blocked-notification]

  template.sync-blocked-notification: |
    message: |
      Sync blocked by deployment freeze for {{.app.metadata.name}}
    slack:
      attachments: |
        [{
          "color": "#FFA500",
          "title": "Deployment Freeze Active",
          "text": "Sync attempt for {{.app.metadata.name}} was blocked by an active deployment freeze window."
        }]
```

## Handling GitOps Drift During Freezes

During a deployment freeze, your Git repository might get ahead of what is deployed. Changes accumulate in Git but are not synced. Here is how to handle this:

1. **Accept drift during the freeze** - ArgoCD will show applications as "OutOfSync" which is expected.

2. **Review accumulated changes before unfreezing** - When the freeze ends, review all pending changes before allowing the sync.

3. **Use manual sync after long freezes** - After extended freezes, disable auto-sync temporarily and sync applications one by one to verify each change.

```bash
# After a long freeze, sync applications in order
argocd app sync infrastructure-core
argocd app sync database-migrations
argocd app sync api-server
argocd app sync frontend
```

## Best Practices

1. **Always set `manualSync: true` for critical freezes** - Without this, someone can bypass the freeze by manually clicking sync in the UI.

2. **Use allow windows for strict environments** - Instead of deny windows (which block specific times), use allow windows to only permit deployments during approved times.

3. **Create an emergency override path** - Have a documented, RBAC-restricted process for emergency deployments during freezes.

4. **Announce freezes automatically** - Use notifications to inform teams when freezes start and end.

5. **Plan for accumulated drift** - After long freezes, sync applications carefully in dependency order.

6. **Test sync windows in staging first** - Verify your cron expressions work as expected before applying to production.

Sync windows in ArgoCD give you a powerful, declarative way to manage deployment freezes. Instead of relying on Slack messages and manual enforcement, the freeze is encoded in your configuration and enforced automatically.
