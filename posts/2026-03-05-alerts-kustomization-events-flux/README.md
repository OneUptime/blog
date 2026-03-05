# How to Create Alerts for Kustomization Events in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Notifications, Alerts, Kustomization

Description: Learn how to set up Flux alerts that notify you when Kustomization events occur, including successful reconciliations and failures.

---

Flux CD provides a powerful notification controller that lets you create alerts for various events in your cluster. Kustomization resources are central to how Flux deploys manifests, so monitoring their events is critical for maintaining visibility into your GitOps workflows. In this guide, you will learn how to create alerts specifically for Kustomization events using the Flux Alert custom resource.

## Prerequisites

Before you begin, make sure you have the following in place:

- A Kubernetes cluster with Flux CD installed (including the notification controller)
- A notification provider already configured (such as Slack, Microsoft Teams, or a generic webhook)
- At least one Kustomization resource deployed in your cluster

If you have not yet set up a notification provider, you will need one before alerts can be delivered. Refer to the Flux documentation on providers for setup instructions.

## Understanding the Alert Resource

The Flux Alert resource (apiVersion: `notification.toolkit.fluxcd.io/v1beta3`) connects event sources to notification providers. For Kustomization alerts, you specify the Kustomization kind in the `spec.eventSources` field. The alert will then forward matching events to your configured provider.

Key fields in the Alert spec include:

- `spec.providerRef` - References the notification Provider resource
- `spec.eventSeverity` - Filters events by severity (`info` or `error`)
- `spec.eventSources` - Lists the resources to watch for events
- `spec.exclusionList` - Optional list of regex patterns to exclude certain events
- `spec.suspend` - Boolean to temporarily disable the alert

## Step 1: Verify Your Notification Provider

First, confirm that you have a notification provider configured. Here is an example of a Slack provider that your alerts will reference.

```yaml
# Provider resource that sends notifications to Slack
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack-provider
  namespace: flux-system
spec:
  type: slack
  channel: flux-alerts
  secretRef:
    name: slack-webhook-url
```

## Step 2: Create an Alert for All Kustomization Events

The following alert watches all Kustomization resources in the `flux-system` namespace and sends both info and error events to the Slack provider.

```yaml
# Alert that monitors all Kustomization events in flux-system namespace
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: kustomization-alerts
  namespace: flux-system
spec:
  # Reference to the notification provider
  providerRef:
    name: slack-provider
  # Send both info and error severity events
  eventSeverity: info
  # Watch all Kustomization resources in this namespace
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: flux-system
```

Apply this manifest to your cluster.

```bash
# Apply the alert resource to the cluster
kubectl apply -f kustomization-alert.yaml
```

## Step 3: Create an Alert for a Specific Kustomization

If you want to monitor only a specific Kustomization resource, replace the wildcard with the resource name.

```yaml
# Alert targeting a single Kustomization resource named "app-deployment"
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: app-deployment-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  # Only capture error events for this critical deployment
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: app-deployment
      namespace: flux-system
```

## Step 4: Create an Alert for Kustomizations Across Multiple Namespaces

You can specify multiple event sources to watch Kustomization resources across different namespaces.

```yaml
# Alert that monitors Kustomizations across multiple namespaces
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: multi-namespace-kustomization-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    # Watch all Kustomizations in the flux-system namespace
    - kind: Kustomization
      name: "*"
      namespace: flux-system
    # Watch all Kustomizations in the production namespace
    - kind: Kustomization
      name: "*"
      namespace: production
    # Watch a specific Kustomization in staging
    - kind: Kustomization
      name: staging-apps
      namespace: staging
```

## Step 5: Filter Kustomization Alerts with Exclusion Rules

You can exclude noisy or unimportant events using regex patterns in the `spec.exclusionList` field.

```yaml
# Alert with exclusion rules to reduce noise
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: filtered-kustomization-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: flux-system
  # Exclude events matching these regex patterns
  exclusionList:
    - "^Reconciliation finished.*no changes$"
    - ".*waiting for.*"
```

## Step 6: Verify the Alert Is Working

After applying your alert, check its status to make sure it is ready.

```bash
# Check the status of the alert resource
kubectl get alerts -n flux-system

# Get detailed information about the alert
kubectl describe alert kustomization-alerts -n flux-system
```

You can also trigger a reconciliation manually to test the alert.

```bash
# Force a reconciliation of a Kustomization to generate an event
flux reconcile kustomization flux-system --with-source
```

## Common Kustomization Events

When monitoring Kustomization events, you will typically see the following types of notifications:

- **Reconciliation succeeded** - The Kustomization was applied successfully to the cluster
- **Reconciliation failed** - An error occurred while applying the Kustomization
- **Health check passed** - All health checks for the Kustomization resources passed
- **Health check failed** - One or more health checks failed
- **Source artifact updated** - A new artifact was detected from the source

## Troubleshooting

If you are not receiving alerts, verify the following:

1. The provider is correctly configured and the secret exists
2. The alert references the correct provider name
3. The event source kind is spelled exactly as `Kustomization` (case-sensitive)
4. The namespace in the event source matches where your Kustomization resources live
5. The alert is not suspended (`spec.suspend` should be `false` or omitted)

```bash
# Check for any issues with the notification controller
kubectl logs -n flux-system deploy/notification-controller

# Verify events are being generated
kubectl get events -n flux-system --field-selector reason=ReconciliationSucceeded
```

## Summary

Creating alerts for Kustomization events in Flux gives you real-time visibility into the state of your GitOps deployments. By configuring event sources, severity filters, and exclusion rules, you can fine-tune which notifications you receive and reduce alert fatigue. Start with broad alerts and narrow them down as you understand the event patterns in your cluster.
