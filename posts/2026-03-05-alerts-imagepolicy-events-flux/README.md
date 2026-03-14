# How to Create Alerts for ImagePolicy Events in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Notifications, Alerts, Image Automation

Description: Learn how to set up Flux alerts for ImagePolicy events to track container image updates and policy evaluation results.

---

Flux CD includes image automation controllers that can scan container registries and update your Git repositories when new images are found. The ImagePolicy resource defines rules for selecting the latest image based on semver, alphabetical, or numerical ordering. Monitoring ImagePolicy events is essential for tracking which images are being selected and detecting policy evaluation failures. This guide shows how to create alerts for ImagePolicy events.

## Prerequisites

- A Kubernetes cluster with Flux CD installed, including the image-reflector-controller and image-automation-controller
- The notification-controller installed and a Provider resource configured
- At least one ImagePolicy resource configured in your cluster

## Understanding ImagePolicy Events

ImagePolicy resources generate events when they successfully evaluate a policy and select a new image tag, or when they fail to evaluate due to missing image repositories or invalid policy configurations. These events carry either `info` or `error` severity.

## Step 1: Create an Alert for All ImagePolicy Events

This alert watches all ImagePolicy resources in the `flux-system` namespace.

```yaml
# Alert monitoring all ImagePolicy events
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: imagepolicy-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  # Capture both informational and error events
  eventSeverity: info
  eventSources:
    - kind: ImagePolicy
      name: "*"
      namespace: flux-system
```

Apply the alert.

```bash
# Apply the ImagePolicy alert configuration
kubectl apply -f imagepolicy-alert.yaml
```

## Step 2: Alert on ImagePolicy Errors Only

For environments with many image policies, you may prefer to receive notifications only when policy evaluation fails.

```yaml
# Alert that only captures ImagePolicy errors
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: imagepolicy-error-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  # Only error events such as evaluation failures
  eventSeverity: error
  eventSources:
    - kind: ImagePolicy
      name: "*"
      namespace: flux-system
```

## Step 3: Monitor a Specific ImagePolicy

Track a specific application's image policy by name.

```yaml
# Alert for a specific ImagePolicy resource
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: webapp-imagepolicy-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    - kind: ImagePolicy
      name: webapp
      namespace: flux-system
```

## Step 4: Combine ImagePolicy with ImageRepository Alerts

For full image automation visibility, monitor both ImagePolicy and ImageRepository events together.

```yaml
# Combined alert for image automation components
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: image-automation-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    # Watch ImagePolicy evaluation events
    - kind: ImagePolicy
      name: "*"
      namespace: flux-system
    # Watch ImageRepository scan events
    - kind: ImageRepository
      name: "*"
      namespace: flux-system
```

## Step 5: Full Image Update Pipeline Alert

Monitor the entire image update pipeline from scanning to Git commit by including ImageUpdateAutomation events.

```yaml
# Full image automation pipeline alert
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: image-pipeline-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    # Image scanning
    - kind: ImageRepository
      name: "*"
      namespace: flux-system
    # Image selection policy
    - kind: ImagePolicy
      name: "*"
      namespace: flux-system
    # Automated Git commits
    - kind: ImageUpdateAutomation
      name: "*"
      namespace: flux-system
```

## Step 6: Filter ImagePolicy Events

Reduce noise by excluding routine events.

```yaml
# Alert with exclusion rules for ImagePolicy events
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: filtered-imagepolicy-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    - kind: ImagePolicy
      name: "*"
      namespace: flux-system
  # Exclude events where the latest image has not changed
  exclusionList:
    - "^Latest image tag.*unchanged$"
    - ".*no new tags found.*"
```

## Step 7: Verify and Test

After applying your alert, confirm it is active and test it.

```bash
# Check the alert status
kubectl get alerts -n flux-system

# Describe the alert for details
kubectl describe alert imagepolicy-alerts -n flux-system

# Trigger an image scan to generate events
flux reconcile image repository my-app

# Check ImagePolicy events
kubectl get events -n flux-system --field-selector involvedObject.kind=ImagePolicy
```

## Common ImagePolicy Events

Typical events you will see from ImagePolicy resources include:

- **Latest image tag resolved** - A new image tag was selected based on the policy
- **Policy evaluation failed** - The policy could not be evaluated, often due to missing ImageRepository data
- **No tags match the policy** - The filter or policy criteria did not match any available tags
- **Selected image tag unchanged** - The evaluation completed but the selected tag has not changed

## Troubleshooting

If you are not receiving ImagePolicy alerts, verify the following.

```bash
# Confirm the image-reflector-controller is running
kubectl get pods -n flux-system | grep image-reflector

# Check for ImagePolicy resources
kubectl get imagepolicies -n flux-system

# View notification controller logs
kubectl logs -n flux-system deploy/notification-controller

# Verify the alert is active
kubectl get alert imagepolicy-alerts -n flux-system -o jsonpath='{.spec.suspend}'
```

Make sure the ImagePolicy resources exist and are being reconciled. If no events are generated by the image controllers, no alerts will be triggered.

## Summary

Monitoring ImagePolicy events through Flux alerts keeps you informed about container image updates in your GitOps workflow. By combining ImagePolicy alerts with ImageRepository and ImageUpdateAutomation alerts, you get complete visibility into the image automation pipeline. Use severity filters and exclusion lists to ensure you only receive actionable notifications.
