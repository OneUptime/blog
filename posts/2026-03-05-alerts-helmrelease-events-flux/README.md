# How to Create Alerts for HelmRelease Events in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Notifications, Alerts, Helm

Description: Learn how to configure Flux alerts that notify you when HelmRelease events occur, such as upgrades, rollbacks, and failures.

---

HelmRelease resources are one of the most commonly used Flux components for deploying applications via Helm charts. Monitoring HelmRelease events is essential for tracking deployments, catching failures early, and maintaining operational awareness. This guide walks you through creating Flux alerts specifically for HelmRelease events using the notification controller.

## Prerequisites

- A Kubernetes cluster with Flux CD installed, including the notification controller and helm-controller
- A notification provider configured (such as Slack, Teams, or a webhook endpoint)
- At least one HelmRelease resource deployed in your cluster

## Understanding HelmRelease Events

HelmRelease resources generate events during various lifecycle stages, including:

- Helm chart download and verification
- Helm install, upgrade, and rollback operations
- Test execution results
- Health check status changes
- Reconciliation success and failure

These events carry severity levels of either `info` for normal operations or `error` for failures, which you can use to filter your alerts.

## Step 1: Create an Alert for All HelmRelease Events

The following alert monitors all HelmRelease resources in the `flux-system` namespace and sends notifications to a configured provider.

```yaml
# Alert that watches all HelmRelease events in the flux-system namespace
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: helmrelease-alerts
  namespace: flux-system
spec:
  # Reference to your notification provider
  providerRef:
    name: slack-provider
  # Capture both informational and error events
  eventSeverity: info
  # Monitor all HelmRelease resources
  eventSources:
    - kind: HelmRelease
      name: "*"
      namespace: flux-system
```

Apply it to your cluster.

```bash
# Apply the HelmRelease alert configuration
kubectl apply -f helmrelease-alert.yaml
```

## Step 2: Create an Alert for Error-Only HelmRelease Events

For production environments, you may want to receive notifications only when something goes wrong.

```yaml
# Alert that only captures HelmRelease errors
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: helmrelease-error-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  # Only send notifications for error events
  eventSeverity: error
  eventSources:
    - kind: HelmRelease
      name: "*"
      namespace: flux-system
```

## Step 3: Monitor Specific HelmRelease Resources

When you need to track a critical application closely, target a specific HelmRelease by name.

```yaml
# Alert for a specific HelmRelease named "nginx-ingress"
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: nginx-ingress-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    - kind: HelmRelease
      name: nginx-ingress
      namespace: flux-system
```

## Step 4: Monitor HelmRelease Events Across Namespaces

In a multi-tenant or multi-namespace setup, you can aggregate HelmRelease alerts from different namespaces into a single alert.

```yaml
# Alert monitoring HelmRelease events across multiple namespaces
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: all-helmrelease-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    # Monitor all HelmReleases in flux-system
    - kind: HelmRelease
      name: "*"
      namespace: flux-system
    # Monitor all HelmReleases in the production namespace
    - kind: HelmRelease
      name: "*"
      namespace: production
    # Monitor all HelmReleases in the staging namespace
    - kind: HelmRelease
      name: "*"
      namespace: staging
```

## Step 5: Filter Out Noisy HelmRelease Events

HelmRelease resources can generate many events during normal operation. Use exclusion rules to suppress repetitive or low-value notifications.

```yaml
# Alert with exclusion rules to reduce HelmRelease event noise
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: filtered-helmrelease-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    - kind: HelmRelease
      name: "*"
      namespace: flux-system
  # Exclude events that match these patterns
  exclusionList:
    - "^Reconciliation finished.*no changes$"
    - ".*is not ready$"
    - ".*dependency.*not ready.*"
```

## Step 6: Combine HelmRelease and HelmRepository Alerts

For complete Helm workflow visibility, you can monitor both HelmRelease and HelmRepository events in a single alert.

```yaml
# Combined alert for both HelmRelease and HelmRepository events
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: helm-workflow-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    # Watch all HelmRelease events
    - kind: HelmRelease
      name: "*"
      namespace: flux-system
    # Watch all HelmRepository events for chart fetch issues
    - kind: HelmRepository
      name: "*"
      namespace: flux-system
```

## Step 7: Verify Your Alert Configuration

After creating your alert, verify it is operating correctly.

```bash
# List all alerts in the flux-system namespace
kubectl get alerts -n flux-system

# Check the details of your HelmRelease alert
kubectl describe alert helmrelease-alerts -n flux-system

# Trigger a reconciliation to test the alert
flux reconcile helmrelease my-app --with-source
```

## Common HelmRelease Event Messages

Here are typical event messages you can expect from HelmRelease resources:

- **Helm install succeeded** - Initial installation completed
- **Helm upgrade succeeded** - An upgrade was applied successfully
- **Helm upgrade failed** - The upgrade encountered an error
- **Helm rollback succeeded** - A failed release was rolled back
- **Helm test succeeded** - Helm tests passed after install or upgrade
- **Health check failed** - Post-deployment health checks did not pass

## Troubleshooting

If alerts are not being delivered for HelmRelease events, check the following.

```bash
# Verify the notification controller is running
kubectl get pods -n flux-system | grep notification

# Check notification controller logs for delivery errors
kubectl logs -n flux-system deploy/notification-controller

# Confirm the alert resource is not suspended
kubectl get alert helmrelease-alerts -n flux-system -o jsonpath='{.spec.suspend}'

# List recent HelmRelease events
kubectl get events -n flux-system --field-selector involvedObject.kind=HelmRelease
```

Make sure the provider referenced in your alert exists and has a valid configuration. Also verify that the secret referenced by the provider contains the correct webhook URL or token.

## Summary

Monitoring HelmRelease events through Flux alerts gives you immediate feedback on your Helm-based deployments. Whether you track all events or focus only on errors, the Alert resource provides flexible configuration options. Combine event source targeting, severity filtering, and exclusion lists to create a notification setup that keeps you informed without overwhelming you with noise.
