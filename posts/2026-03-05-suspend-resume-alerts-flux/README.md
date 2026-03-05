# How to Suspend and Resume Alerts in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Notifications, Alerts, Maintenance

Description: Learn how to temporarily suspend and resume Flux alerts during maintenance windows or debugging sessions.

---

There are times when you need to temporarily stop receiving notifications from Flux, such as during planned maintenance, bulk updates, or debugging sessions. The `spec.suspend` field in the Flux Alert resource lets you pause and resume alert delivery without deleting the alert configuration. This guide covers how to suspend and resume alerts using both declarative YAML and imperative CLI commands.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- The notification controller running
- One or more Alert resources configured

## Understanding Alert Suspension

When an alert is suspended (`spec.suspend: true`), the notification controller stops forwarding matching events to the provider. Events generated during the suspension period are not queued or delivered later. Once the alert is resumed, only new events will trigger notifications.

## Step 1: Suspend an Alert Using kubectl

The quickest way to suspend an alert is by patching the resource directly.

```bash
# Suspend an alert by patching the suspend field
kubectl patch alert my-alert -n flux-system --type=merge -p '{"spec":{"suspend":true}}'

# Verify the alert is suspended
kubectl get alert my-alert -n flux-system -o jsonpath='{.spec.suspend}'
```

## Step 2: Resume an Alert Using kubectl

To resume a suspended alert, set the `spec.suspend` field back to `false`.

```bash
# Resume a suspended alert
kubectl patch alert my-alert -n flux-system --type=merge -p '{"spec":{"suspend":false}}'

# Verify the alert is active again
kubectl get alert my-alert -n flux-system -o jsonpath='{.spec.suspend}'
```

## Step 3: Suspend an Alert Declaratively

For GitOps workflows, update the alert manifest in your repository with the suspend field.

```yaml
# Alert resource with suspend set to true
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: production-alerts
  namespace: flux-system
spec:
  # Set to true to suspend, false or omit to activate
  suspend: true
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: flux-system
```

Commit and push this change, and Flux will reconcile the alert to a suspended state.

```bash
# Commit the change to suspend the alert
git add alerts/production-alerts.yaml
git commit -m "Suspend production alerts for maintenance window"
git push
```

## Step 4: Resume an Alert Declaratively

Update the manifest to set `suspend` to `false` or remove the field entirely.

```yaml
# Alert resource resumed (suspend set to false)
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: production-alerts
  namespace: flux-system
spec:
  # Set to false or remove this field to resume
  suspend: false
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: flux-system
```

## Step 5: Suspend All Alerts in a Namespace

During a major maintenance window, you may want to suspend all alerts at once.

```bash
# Suspend all alerts in the flux-system namespace
kubectl get alerts -n flux-system -o name | xargs -I {} kubectl patch {} -n flux-system --type=merge -p '{"spec":{"suspend":true}}'

# Verify all alerts are suspended
kubectl get alerts -n flux-system -o custom-columns=NAME:.metadata.name,SUSPENDED:.spec.suspend
```

## Step 6: Resume All Alerts in a Namespace

After the maintenance window ends, resume all alerts.

```bash
# Resume all alerts in the flux-system namespace
kubectl get alerts -n flux-system -o name | xargs -I {} kubectl patch {} -n flux-system --type=merge -p '{"spec":{"suspend":false}}'

# Verify all alerts are active
kubectl get alerts -n flux-system -o custom-columns=NAME:.metadata.name,SUSPENDED:.spec.suspend
```

## Step 7: Check Alert Suspension Status

Before making changes, check the current status of your alerts.

```bash
# List all alerts with their suspension status
kubectl get alerts -A -o custom-columns=NAMESPACE:.metadata.namespace,NAME:.metadata.name,SUSPENDED:.spec.suspend,PROVIDER:.spec.providerRef.name

# Get detailed information about a specific alert
kubectl describe alert production-alerts -n flux-system
```

## Maintenance Window Workflow

Here is a complete workflow for handling a planned maintenance window.

```bash
# 1. Before maintenance: suspend all alerts
echo "Suspending all alerts for maintenance..."
kubectl get alerts -n flux-system -o name | xargs -I {} kubectl patch {} -n flux-system --type=merge -p '{"spec":{"suspend":true}}'

# 2. Verify suspension
kubectl get alerts -n flux-system -o custom-columns=NAME:.metadata.name,SUSPENDED:.spec.suspend

# 3. Perform maintenance work
echo "Performing maintenance..."

# 4. After maintenance: resume all alerts
echo "Resuming all alerts..."
kubectl get alerts -n flux-system -o name | xargs -I {} kubectl patch {} -n flux-system --type=merge -p '{"spec":{"suspend":false}}'

# 5. Verify resumption
kubectl get alerts -n flux-system -o custom-columns=NAME:.metadata.name,SUSPENDED:.spec.suspend

# 6. Trigger a reconciliation to verify alerts are working
flux reconcile kustomization flux-system --with-source
```

## Selective Suspension

You may want to suspend only certain alerts while keeping critical ones active.

```bash
# Suspend only info-level alerts, keep error-level alerts active
for alert in $(kubectl get alerts -n flux-system -o json | jq -r '.items[] | select(.spec.eventSeverity == "info") | .metadata.name'); do
  kubectl patch alert "$alert" -n flux-system --type=merge -p '{"spec":{"suspend":true}}'
  echo "Suspended: $alert"
done
```

## Important Considerations

- Suspended alerts do not queue events. Any events generated during suspension are permanently lost.
- Suspending an alert does not affect the notification provider or other alerts using the same provider.
- The `spec.suspend` field defaults to `false` when omitted, meaning alerts are active by default.
- If you manage alerts through GitOps, imperative patches will be overwritten at the next reconciliation cycle. Use declarative changes in your Git repository for persistent suspension.

## Troubleshooting

If alerts appear to be sending notifications despite being suspended, or not sending after being resumed, check the following.

```bash
# Confirm the current suspend state
kubectl get alert my-alert -n flux-system -o yaml | grep suspend

# Restart the notification controller if needed
kubectl rollout restart deploy/notification-controller -n flux-system

# Check notification controller logs
kubectl logs -n flux-system deploy/notification-controller --tail=20
```

## Summary

Suspending and resuming Flux alerts is straightforward using either imperative kubectl commands or declarative GitOps manifests. Use suspension during maintenance windows, bulk operations, or debugging sessions to prevent notification noise. Remember that suspended alerts do not queue events, so you will not receive a flood of notifications when you resume. For GitOps-managed alerts, always make suspension changes in your Git repository to prevent reconciliation from overwriting your changes.
