# How to Create a Custom Notification Template in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Notifications, Alerts, Templates

Description: Learn how to customize Flux notification messages using the summary field, provider configurations, and event metadata for more informative alerts.

---

By default, Flux notifications contain standard event information including the resource kind, name, namespace, and event message. While this covers most use cases, you may want to customize the notification content to include additional context such as environment names, cluster identifiers, or team ownership. This guide covers the customization options available in Flux notifications.

## Prerequisites

- A Kubernetes cluster with Flux CD installed, including the notification controller
- A notification provider configured
- Existing alerts generating notifications

## Customization Options in Flux Notifications

Flux provides several ways to customize notification content:

- The `spec.summary` field on Alert resources adds a prefix to notifications
- Provider-level channel configuration controls where messages go
- The generic provider type gives you full control over the JSON payload sent to webhooks
- Event metadata from the source resources is automatically included

## Step 1: Add Context with the Summary Field

The `spec.summary` field on the Alert resource prepends a custom message to every notification.

```yaml
# Alert with a summary field for environment context
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: production-alert
  namespace: flux-system
spec:
  # Custom summary prepended to every notification
  summary: "Production Cluster (us-east-1)"
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: production
    - kind: HelmRelease
      name: "*"
      namespace: production
  exclusionList:
    - "^Reconciliation finished.*no changes$"
```

## Step 2: Use Different Summaries for Different Alerts

Create multiple alerts with distinct summaries to differentiate notifications.

```yaml
# Staging alert with environment context
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: staging-context-alert
  namespace: flux-system
spec:
  summary: "Staging Environment"
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: staging
  exclusionList:
    - "^Reconciliation finished.*no changes$"
---
# Production alert with cluster and region context
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: production-context-alert
  namespace: flux-system
spec:
  summary: "PRODUCTION - US East Cluster"
  providerRef:
    name: slack-critical
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: production
```

Apply them.

```bash
# Apply the context-rich alerts
kubectl apply -f context-alerts.yaml
```

## Step 3: Use the Generic Provider for Custom Payloads

The generic webhook provider sends a JSON payload containing all event metadata. You can process this payload with a custom webhook handler to format notifications however you want.

```yaml
# Generic provider that sends raw event data to a custom endpoint
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: custom-webhook
  namespace: flux-system
spec:
  type: generic
  secretRef:
    name: custom-webhook-secret
```

The generic provider sends a JSON payload with the following structure to your endpoint:

```json
{
  "involvedObject": {
    "kind": "Kustomization",
    "namespace": "flux-system",
    "name": "apps",
    "apiVersion": "kustomize.toolkit.fluxcd.io/v1"
  },
  "severity": "info",
  "timestamp": "2026-03-05T10:00:00Z",
  "message": "Reconciliation finished in 5s",
  "reason": "ReconciliationSucceeded",
  "metadata": {
    "revision": "main@sha1:abc123"
  }
}
```

## Step 4: Build a Custom Webhook Handler

Create a simple webhook handler that formats notifications with custom templates. Here is an example that transforms Flux events into a custom Slack message format.

```yaml
# Alert routing events to the custom webhook handler
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: custom-formatted-alert
  namespace: flux-system
spec:
  summary: "GitOps Pipeline"
  providerRef:
    name: custom-webhook
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: flux-system
    - kind: HelmRelease
      name: "*"
      namespace: flux-system
    - kind: GitRepository
      name: "*"
      namespace: flux-system
```

## Step 5: Channel-Based Customization

Use different Slack channels for different types of notifications by creating separate providers.

```yaml
# Provider for deployment notifications
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: slack-deployments
  namespace: flux-system
spec:
  type: slack
  channel: deployments
  secretRef:
    name: slack-webhook
---
# Provider for security notifications
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: slack-security
  namespace: flux-system
spec:
  type: slack
  channel: security-alerts
  secretRef:
    name: slack-webhook
---
# Provider for infrastructure notifications
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: slack-infra
  namespace: flux-system
spec:
  type: slack
  channel: infrastructure
  secretRef:
    name: slack-webhook
```

## Step 6: Team-Specific Notification Templates

Create alerts with summaries that include team ownership information.

```yaml
# Alert for the platform team
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: platform-team-alert
  namespace: flux-system
spec:
  summary: "[Platform Team] Infrastructure Updates"
  providerRef:
    name: slack-infra
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: infra-controllers
      namespace: flux-system
    - kind: Kustomization
      name: cluster-config
      namespace: flux-system
  exclusionList:
    - "^Reconciliation finished.*no changes$"
---
# Alert for the application team
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: app-team-alert
  namespace: flux-system
spec:
  summary: "[App Team] Application Deployments"
  providerRef:
    name: slack-deployments
  eventSeverity: info
  eventSources:
    - kind: HelmRelease
      name: "*"
      namespace: production
  exclusionList:
    - "^Reconciliation finished.*no changes$"
```

## Step 7: Verify Custom Notifications

Test your customized alerts and verify the output.

```bash
# Trigger a reconciliation
flux reconcile kustomization flux-system --with-source

# Check notification controller logs
kubectl logs -n flux-system deploy/notification-controller --tail=20

# Verify alert summaries
kubectl get alerts -n flux-system -o custom-columns=NAME:.metadata.name,SUMMARY:.spec.summary,PROVIDER:.spec.providerRef.name
```

## What Event Metadata Is Available

Flux notifications automatically include this information:

- **Resource kind** - The type of resource (Kustomization, HelmRelease, etc.)
- **Resource name** - The name of the Flux resource
- **Resource namespace** - The namespace of the resource
- **Event message** - The human-readable description of what happened
- **Event severity** - info or error
- **Event reason** - The machine-readable reason code
- **Revision** - The Git commit SHA or artifact revision (when applicable)
- **Timestamp** - When the event occurred

## Summary

Customizing Flux notification content is achieved through the summary field on Alert resources, provider channel configuration, and the generic webhook provider for fully custom payloads. While Flux does not support Go template-based message formatting directly in the Alert resource, the combination of descriptive summaries, targeted provider routing, and custom webhook handlers gives you flexibility in how notifications are presented. Use summaries to add environment context, create separate providers for different channels, and leverage the generic provider when you need complete control over the notification format.
