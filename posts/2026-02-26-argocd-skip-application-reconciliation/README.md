# How to Skip Application Reconciliation Temporarily in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Operations, Maintenance

Description: Learn how to temporarily pause or skip ArgoCD application reconciliation during maintenance windows, incident response, or when you need to prevent automatic syncs.

---

There are times when you need ArgoCD to stop reconciling an application. Maybe you are performing emergency maintenance on a cluster. Maybe an upstream team pushed a broken change and you need to freeze deployments while they fix it. Maybe you are debugging an issue and do not want ArgoCD to overwrite your manual changes. Whatever the reason, ArgoCD provides several ways to pause reconciliation at different levels. This guide covers all of them.

## Why Skip Reconciliation

Common scenarios where pausing reconciliation is necessary:

- **Incident response** - You made manual changes to fix a production issue and need ArgoCD not to revert them
- **Maintenance windows** - You are upgrading cluster components and do not want deployments during the upgrade
- **Debugging** - You need to observe cluster state without ArgoCD modifying it
- **Broken Git source** - A bad commit was pushed and you need time to revert without ArgoCD syncing the broken state
- **Performance issues** - The cluster or ArgoCD is under heavy load and you need to reduce reconciliation pressure

## Method 1: Disable Auto-Sync on the Application

The simplest approach is to remove auto-sync from the application. This stops automatic syncs but still allows manual syncs:

```bash
# Disable auto-sync using the CLI
argocd app set my-app --sync-policy none
```

Or patch the application directly:

```bash
# Remove the automated sync policy
kubectl patch application my-app -n argocd --type json \
  -p '[{"op": "remove", "path": "/spec/syncPolicy/automated"}]'
```

The application will still reconcile (check for differences) but will not automatically sync changes. It will show as OutOfSync if there are differences.

To re-enable auto-sync:

```bash
# Re-enable auto-sync with self-heal and prune
argocd app set my-app --sync-policy automated --self-heal --auto-prune
```

## Method 2: Use the Refresh Annotation to Pause Reconciliation

You can set a special annotation to prevent ArgoCD from refreshing the application entirely:

```bash
# Pause reconciliation by setting the refresh annotation to a high value
kubectl annotate application my-app -n argocd \
  argocd.argoproj.io/refresh="-1" --overwrite
```

Note: This approach is not officially documented and behavior may vary between ArgoCD versions. A more reliable approach is to use the operation lock described below.

## Method 3: Use the Ignore Annotation

Mark the application so ArgoCD skips it during reconciliation:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
  annotations:
    # This tells ArgoCD controllers to skip this application
    argocd.argoproj.io/skip-reconcile: "true"
spec:
  # ... rest of spec
```

Note: This annotation is supported in ArgoCD v2.8+. For older versions, use the sync window approach.

## Method 4: Create a Deny Sync Window

Sync windows are the most robust way to prevent all syncs for a set of applications:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: production
  namespace: argocd
spec:
  syncWindows:
    # Deny all syncs - this is a "maintenance mode" window
    - kind: deny
      schedule: "* * * * *"  # Every minute (always active)
      duration: 24h
      applications:
        - "*"                 # All applications in this project
      manualSync: false       # Also deny manual syncs
```

This blocks all automatic and manual syncs for applications in the `production` project. To lift the restriction, remove or modify the sync window:

```bash
# Remove the deny sync window
kubectl edit appproject production -n argocd
# Delete the syncWindows entry
```

For a time-limited maintenance window:

```yaml
syncWindows:
  # Deny syncs for a 2-hour maintenance window
  - kind: deny
    schedule: "0 2 * * *"    # Starts at 2 AM
    duration: 2h             # Lasts 2 hours
    applications:
      - "*"
    manualSync: true         # Still allow manual syncs for emergencies
```

## Method 5: Scale Down the Application Controller

For a cluster-wide reconciliation pause, scale down the ArgoCD application controller:

```bash
# Scale down the controller
kubectl scale deployment argocd-application-controller -n argocd --replicas=0

# No applications will be reconciled until you scale back up
```

This is a heavy-handed approach that affects all applications. Use it only for emergency situations or major maintenance:

```bash
# Scale back up
kubectl scale deployment argocd-application-controller -n argocd --replicas=1
```

## Method 6: Per-Application Reconciliation Frequency

Instead of completely stopping reconciliation, you can dramatically slow it down:

```bash
# Set reconciliation to once per day (86400 seconds)
kubectl annotate application my-app -n argocd \
  argocd.argoproj.io/refresh="86400" --overwrite
```

This way the application still reconciles, but so infrequently that it is effectively paused for most purposes.

## Automating Maintenance Mode

Create a script that toggles maintenance mode for a set of applications:

```bash
#!/bin/bash
# maintenance-mode.sh

ACTION=$1  # "enable" or "disable"
PROJECT=$2 # ArgoCD project name

if [ "$ACTION" == "enable" ]; then
  echo "Enabling maintenance mode for project: $PROJECT"

  # Disable auto-sync for all applications in the project
  for app in $(argocd app list -p "$PROJECT" -o name); do
    echo "Disabling auto-sync for: $app"
    argocd app set "$app" --sync-policy none
  done

  echo "Maintenance mode enabled. Manual syncs still allowed."

elif [ "$ACTION" == "disable" ]; then
  echo "Disabling maintenance mode for project: $PROJECT"

  # Re-enable auto-sync for all applications
  for app in $(argocd app list -p "$PROJECT" -o name); do
    echo "Re-enabling auto-sync for: $app"
    argocd app set "$app" --sync-policy automated --self-heal --auto-prune
  done

  echo "Maintenance mode disabled. Auto-sync restored."

else
  echo "Usage: $0 <enable|disable> <project-name>"
  exit 1
fi
```

Usage:

```bash
# Enter maintenance mode
./maintenance-mode.sh enable production

# Exit maintenance mode
./maintenance-mode.sh disable production
```

## Handling Emergency Syncs During Pause

Even during maintenance, you might need to deploy a critical fix. If you used sync windows with `manualSync: true`, you can still sync manually:

```bash
# Force a manual sync even during a deny window
argocd app sync my-app --force
```

If you used `manualSync: false` in the sync window, you need to temporarily modify the window:

```bash
# Edit the project to allow manual syncs
kubectl patch appproject production -n argocd --type json \
  -p '[{"op": "replace", "path": "/spec/syncWindows/0/manualSync", "value": true}]'

# Sync the critical fix
argocd app sync my-critical-app

# Revert manual sync permission
kubectl patch appproject production -n argocd --type json \
  -p '[{"op": "replace", "path": "/spec/syncWindows/0/manualSync", "value": false}]'
```

## Monitoring Paused Applications

When reconciliation is paused, it is important to know which applications are affected:

```bash
# List all applications with auto-sync disabled
argocd app list -o json | jq '.[] | select(.spec.syncPolicy.automated == null) | .metadata.name'

# Check for active deny sync windows
kubectl get appprojects -n argocd -o json | \
  jq '.items[] | select(.spec.syncWindows != null) | {name: .metadata.name, windows: .spec.syncWindows}'
```

Set up alerts for applications that have been paused too long:

```yaml
groups:
  - name: argocd-maintenance
    rules:
      - alert: ArgocdAppReconciliationPaused
        expr: |
          argocd_app_info{sync_status="OutOfSync"} == 1
        for: 2h
        labels:
          severity: warning
        annotations:
          summary: "Application {{ $labels.name }} has been OutOfSync for over 2 hours"
          description: "Check if reconciliation is intentionally paused or if there is an issue."
```

For tracking maintenance windows and ensuring applications return to normal operation, [OneUptime](https://oneuptime.com) provides alerting that helps you avoid forgetting to re-enable reconciliation.

## Key Takeaways

- Use `argocd app set --sync-policy none` for per-application pause (quick and reversible)
- Use deny sync windows for project-wide or scheduled maintenance
- Scale down the controller only for cluster-wide emergencies
- Always keep manual sync available for emergency deployments
- Automate maintenance mode transitions with scripts
- Monitor paused applications to avoid forgetting to re-enable reconciliation
- Document your maintenance procedures so team members know how to lift restrictions
