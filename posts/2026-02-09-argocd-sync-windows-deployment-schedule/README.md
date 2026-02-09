# How to Configure ArgoCD Sync Windows to Restrict Deployments During Business Hours

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Deployment Strategy, Change Management, Kubernetes

Description: Learn how to use ArgoCD sync windows to control when automated deployments can occur, preventing changes during critical business hours or maintenance windows.

---

Automated GitOps deployments are powerful, but sometimes you need control over when changes happen. Production deployments during peak traffic hours? Bad idea. Code releases during Black Friday? Even worse. ArgoCD sync windows give you temporal control over automated deployments without sacrificing GitOps principles.

This guide shows you how to implement deployment schedules using ArgoCD sync windows.

## Understanding Sync Windows

Sync windows define time periods when Applications can or cannot sync. Each window specifies:

- **Schedule**: When the window applies (cron format)
- **Duration**: How long the window lasts
- **Action**: Allow or deny syncs
- **Applications**: Which apps are affected

Think of sync windows as business hours for your deployments.

## Basic Sync Window Configuration

Sync windows are defined in the ArgoCD AppProject. Create a project with restricted deployment hours:

```yaml
# appproject-production.yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: production
  namespace: argocd
spec:
  description: Production applications with deployment restrictions
  sourceRepos:
    - '*'
  destinations:
    - namespace: '*'
      server: '*'
  clusterResourceWhitelist:
    - group: '*'
      kind: '*'
  syncWindows:
    - kind: allow
      schedule: '0 22 * * *'  # 10 PM daily
      duration: 4h
      applications:
        - '*'
      manualSync: true  # Allow manual syncs anytime
```

This allows automated syncs only between 10 PM and 2 AM. Manual syncs work anytime.

## Blocking Business Hours

More commonly, you want to block deployments during business hours:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: production
  namespace: argocd
spec:
  description: Production project
  syncWindows:
    # Block automated syncs during business hours (9 AM to 5 PM)
    - kind: deny
      schedule: '0 9 * * *'
      duration: 8h
      applications:
        - '*'
      manualSync: false  # Also block manual syncs during this window
```

Syncs attempted during this window will fail with a message about the active sync window.

## Multiple Sync Windows

Combine multiple windows for complex schedules:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: production
  namespace: argocd
spec:
  syncWindows:
    # Deny Monday through Friday business hours
    - kind: deny
      schedule: '0 9 * * 1-5'
      duration: 8h
      applications:
        - '*'

    # Deny all day Saturday (maintenance day)
    - kind: deny
      schedule: '0 0 * * 6'
      duration: 24h
      applications:
        - '*'

    # Allow deployments: Weekday nights and Sundays
```

Windows are evaluated in order. First matching window applies.

## Cron Schedule Syntax

Sync windows use cron expressions:

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

Examples:

```yaml
# Every day at 2 AM
schedule: '0 2 * * *'

# Weekdays at 10 PM
schedule: '0 22 * * 1-5'

# First day of every month at midnight
schedule: '0 0 1 * *'

# Every 6 hours
schedule: '0 */6 * * *'

# Monday and Wednesday at 3 PM
schedule: '0 15 * * 1,3'
```

## Application-Specific Windows

Target specific applications:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: production
  namespace: argocd
spec:
  syncWindows:
    # Critical apps only deploy during maintenance window
    - kind: deny
      schedule: '0 0 * * *'
      duration: 24h
      applications:
        - payment-processor
        - order-system
        - inventory-management
      manualSync: false

    # Non-critical apps can deploy during off-hours
    - kind: allow
      schedule: '0 20 * * *'
      duration: 10h
      applications:
        - blog
        - marketing-site
        - analytics-dashboard
```

## Namespace-Based Windows

Control deployments by namespace:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: production
  namespace: argocd
spec:
  syncWindows:
    # Production namespace locked during business hours
    - kind: deny
      schedule: '0 8 * * 1-5'
      duration: 12h
      namespaces:
        - production
      applications:
        - '*'

    # Staging can deploy anytime
    - kind: allow
      schedule: '0 0 * * *'
      duration: 24h
      namespaces:
        - staging
      applications:
        - '*'
```

## Manual Sync Behavior

Control whether manual syncs override windows:

```yaml
syncWindows:
  # Block automated syncs, allow manual override
  - kind: deny
    schedule: '0 9 * * *'
    duration: 8h
    manualSync: true  # Manual syncs allowed

  # Block everything including manual syncs
  - kind: deny
    schedule: '0 0 25 12 *'  # Christmas Day
    duration: 24h
    manualSync: false  # Manual syncs also blocked
```

Use `manualSync: true` when you want to prevent accidents but allow emergency fixes.

## Timezone Configuration

Sync windows use the ArgoCD server's timezone. Configure it via environment variable:

```yaml
# argocd-server deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
      - name: argocd-server
        env:
        - name: TZ
          value: America/New_York
```

Or configure timezone in the AppProject:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: production
  namespace: argocd
spec:
  syncWindows:
    - kind: deny
      schedule: '0 9 * * *'
      duration: 8h
      timeZone: America/New_York
      applications:
        - '*'
```

## Checking Active Sync Windows

View sync window status in the ArgoCD CLI:

```bash
# List projects with sync windows
argocd proj list

# Get detailed project info including active windows
argocd proj get production

# Check specific application sync status
argocd app get my-app
```

The UI also shows sync window status on the Application details page.

## Emergency Override

When you need to deploy during a blocked window:

```bash
# Option 1: Temporarily modify the project
kubectl edit appproject production -n argocd
# Remove or modify the blocking sync window

# Option 2: Move app to different project without restrictions
argocd app set my-app --project emergency-project

# Option 3: Delete and recreate (loses history)
kubectl delete application my-app -n argocd
kubectl apply -f my-app.yaml
```

For true emergencies, consider having a separate emergency project without sync windows.

## Practical Example: E-commerce Platform

A complete configuration for an e-commerce platform:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: ecommerce-production
  namespace: argocd
spec:
  description: E-commerce production applications
  sourceRepos:
    - 'https://github.com/company/ecommerce-*'
  destinations:
    - namespace: production
      server: https://kubernetes.default.svc

  syncWindows:
    # Block during peak shopping hours (10 AM - 8 PM)
    - kind: deny
      schedule: '0 10 * * *'
      duration: 10h
      timeZone: America/New_York
      applications:
        - storefront
        - checkout
        - payment-gateway
      manualSync: false

    # Allow maintenance window: 2 AM - 6 AM
    - kind: allow
      schedule: '0 2 * * *'
      duration: 4h
      applications:
        - '*'
      manualSync: true

    # Total lockdown during Black Friday (late November)
    - kind: deny
      schedule: '0 0 23 11 *'
      duration: 72h
      applications:
        - '*'
      manualSync: false

    # Allow analytics and reporting anytime (non-customer facing)
    - kind: allow
      schedule: '0 0 * * *'
      duration: 24h
      applications:
        - analytics-pipeline
        - reporting-dashboard
        - data-warehouse-sync
```

## Notifications for Blocked Syncs

Configure ArgoCD notifications to alert when syncs are blocked:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  trigger.on-sync-window-denied: |
    - when: app.status.operationState.phase in ['Error', 'Failed'] and app.status.operationState.message contains 'sync window'
      send: [sync-window-blocked]

  template.sync-window-blocked: |
    message: |
      Application {{.app.metadata.name}} sync was blocked by sync window.
      Current time: {{.app.status.operationState.finishedAt}}
      Next allowed sync window: Check AppProject {{.app.spec.project}}
    slack:
      attachments: |
        [{
          "title": "Sync Window Blocked",
          "color": "warning",
          "fields": [
            {
              "title": "Application",
              "value": "{{.app.metadata.name}}",
              "short": true
            },
            {
              "title": "Project",
              "value": "{{.app.spec.project}}",
              "short": true
            }
          ]
        }]
```

## Testing Sync Windows

Test your configuration before production:

```yaml
# Create test project
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: test-sync-windows
  namespace: argocd
spec:
  syncWindows:
    # Deny syncs for next 5 minutes
    - kind: deny
      schedule: '*/5 * * * *'  # Every 5 minutes
      duration: 3m
      applications:
        - test-app
```

Try syncing the test app:

```bash
argocd app sync test-app
```

Should fail with sync window error.

## Best Practices

1. **Start permissive**: Begin with allow windows, add deny windows as needed
2. **Document windows**: Comment why each window exists in the YAML
3. **Align with business**: Match windows to actual business risk periods
4. **Emergency project**: Maintain bypass project for true emergencies
5. **Monitor blocked syncs**: Alert on repeated failed syncs due to windows
6. **Test in staging**: Verify window configurations work as expected
7. **Timezone awareness**: Clearly document timezone assumptions
8. **Manual sync policy**: Decide if manual overrides are allowed

## Conclusion

ArgoCD sync windows add time-based governance to your GitOps pipelines without sacrificing automation. Block deployments during critical business periods while allowing automated rollouts during safe maintenance windows. Configure windows at the project level to enforce deployment policies across all applications. Combined with proper testing and emergency procedures, sync windows give you the control needed for production GitOps at scale.
