# How to Configure Flux Alerts for Drift Detection Notifications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Notifications, Alerts, Drift Detection

Description: Learn how to configure Flux alerts that notify you when configuration drift is detected and corrected in your Kubernetes cluster.

---

Configuration drift occurs when the live state of your Kubernetes cluster diverges from the desired state defined in Git. Flux CD continuously reconciles resources, automatically correcting drift. However, knowing when drift happens is important for security and operational awareness. This guide shows how to configure alerts that notify you when Flux detects and corrects drift.

## Prerequisites

- A Kubernetes cluster with Flux CD installed, including the notification controller
- A notification provider configured
- Kustomization resources with `spec.force` or `spec.prune` enabled for drift correction

## Understanding Drift Detection in Flux

Flux detects drift during its regular reconciliation cycle. When the kustomize-controller applies resources and finds differences between the desired state (Git) and the live state (cluster), it corrects the drift and emits an event. These drift correction events are informational (`info` severity) when successful and error-level when the correction fails.

Drift detection events typically contain messages about resources being updated, created, or deleted to match the desired state.

## Step 1: Create a Drift Detection Alert

Create an alert that captures Kustomization events where drift was detected and corrected.

```yaml
# Alert for drift detection on Kustomization resources
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: drift-detection-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-security
  # Use info severity to capture drift correction events
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: flux-system
  # Exclude no-change events to focus on actual drift corrections
  exclusionList:
    - "^Reconciliation finished.*no changes$"
    - "^artifact up-to-date.*"
    - "^stored artifact.*same revision$"
    - ".*is not ready$"
    - ".*waiting for.*"
```

Apply the alert.

```bash
# Apply the drift detection alert
kubectl apply -f drift-alert.yaml
```

## Step 2: Monitor Drift Across All Environments

Track drift detection across multiple namespaces and environments.

```yaml
# Drift detection alert across all environments
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: cluster-drift-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-security
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: flux-system
    - kind: Kustomization
      name: "*"
      namespace: production
    - kind: Kustomization
      name: "*"
      namespace: staging
  exclusionList:
    # Only exclude truly routine events
    - "^Reconciliation finished.*no changes$"
    - "^artifact up-to-date.*"
    - ".*waiting for.*"
```

## Step 3: Separate Drift Alerts from Deployment Alerts

Create a dedicated drift alert that goes to a security or compliance channel, separate from deployment notifications.

```yaml
# Drift alert sent to a security-focused channel
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: security-drift-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-security-channel
  eventSeverity: info
  eventSources:
    # Infrastructure Kustomizations where drift is most concerning
    - kind: Kustomization
      name: infra-controllers
      namespace: flux-system
    - kind: Kustomization
      name: rbac-policies
      namespace: flux-system
    - kind: Kustomization
      name: network-policies
      namespace: flux-system
  exclusionList:
    - "^Reconciliation finished.*no changes$"
    - ".*is not ready$"
```

## Step 4: Monitor HelmRelease Drift

HelmRelease resources can also experience drift when someone manually modifies Helm-managed resources.

```yaml
# Drift alert for HelmRelease-managed resources
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: helm-drift-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-security
  eventSeverity: info
  eventSources:
    - kind: HelmRelease
      name: "*"
      namespace: flux-system
    - kind: HelmRelease
      name: "*"
      namespace: production
  exclusionList:
    - "^Reconciliation finished.*no changes$"
    - ".*is not ready$"
    - ".*waiting for.*"
```

## Step 5: Comprehensive Drift and Error Alert

Combine drift detection with error alerts for complete visibility.

```yaml
# Combined drift and error alert
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: drift-and-errors-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-ops
  # Info captures both drift corrections and errors
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: flux-system
    - kind: HelmRelease
      name: "*"
      namespace: flux-system
  # Only exclude genuinely routine events
  exclusionList:
    - "^Reconciliation finished.*no changes$"
    - "^stored artifact.*same revision$"
    - "^artifact up-to-date.*"
```

## Step 6: Enable Drift Detection with Force Reconciliation

To ensure Flux corrects drift on every reconciliation, enable the `force` option on your Kustomization.

```yaml
# Kustomization with force enabled for strict drift correction
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infra-controllers
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/controllers
  prune: true
  # Force re-applies resources on every reconciliation
  force: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

With `force: true`, Flux will re-apply all resources during each reconciliation, ensuring any manual changes are overwritten. This generates events whenever resources are updated.

## Step 7: Verify Drift Detection Alerts

Test that drift alerts work by manually modifying a Flux-managed resource.

```bash
# Manually modify a Flux-managed resource to simulate drift
kubectl scale deployment my-app --replicas=5 -n production

# Wait for the next reconciliation or trigger it manually
flux reconcile kustomization apps --with-source

# Watch for the drift correction event
kubectl get events -n flux-system --watch

# Check notification controller logs
kubectl logs -n flux-system deploy/notification-controller --tail=20
```

## Why Drift Matters

Drift can indicate several issues:
- **Unauthorized changes** - Someone manually modified cluster resources
- **Misconfigured automation** - Another tool is modifying Flux-managed resources
- **Security concerns** - Drift in RBAC, network policies, or security settings could indicate a breach
- **Process violations** - Team members bypassing the GitOps workflow

## Best Practices

1. **Route drift alerts to security and compliance channels** for audit purposes
2. **Enable `force` and `prune`** on Kustomizations to ensure drift is always corrected
3. **Track drift on infrastructure and security resources** separately from application deployments
4. **Investigate frequent drift** as it may indicate a deeper issue in your workflow
5. **Combine with error alerts** to know when drift correction itself fails

## Summary

Configuring Flux alerts for drift detection gives you visibility into when the live state of your cluster diverges from the desired state in Git. By using info-level severity with exclusion rules to filter out no-change events, you receive notifications specifically when Flux detects and corrects drift. Route these alerts to security or compliance channels, monitor both Kustomization and HelmRelease resources, and investigate recurring drift patterns to improve your GitOps workflow.
