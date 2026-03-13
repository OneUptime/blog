# How to Configure Flux Alert Summary Field for Custom Messages

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Alerts, Notifications, Custom Messages

Description: Learn how to use the Flux Alert summary field to add custom contextual messages to your notifications for faster incident response.

---

## Introduction

When a Flux alert fires, the default notification contains the event message, resource kind, name, and severity. While informative, these defaults lack organizational context. The `summary` field in a Flux Alert resource lets you prepend a custom message to every notification, providing immediate context about what the alert means, who owns it, and what action to take.

This guide shows you how to use the summary field effectively, from simple labels to structured messages that accelerate incident response.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster (v1.25 or later)
- Flux v2 installed and bootstrapped
- The notification controller deployed
- A Provider resource configured for your notification channel
- kubectl access to the flux-system namespace

## Understanding the Summary Field

The `summary` field is a string that gets included in every notification sent by the Alert resource. It appears alongside the event details in the notification payload. The exact rendering depends on your provider type. Slack displays it as part of the message body, while webhook providers include it in the JSON payload.

The summary is static text defined at configuration time. It does not support templates or variable substitution, but it provides a consistent label for all events processed by a given Alert resource.

## Basic Summary Configuration

Add a simple descriptive summary to an alert:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: production-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  summary: "Production cluster event detected"
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
```

Every notification from this alert will include the text "Production cluster event detected", making it immediately clear which cluster and environment the event came from.

## Environment-Specific Summaries

In multi-environment setups, summaries help distinguish alerts from different clusters:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: staging-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  summary: "[STAGING] Non-critical event - review during business hours"
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: production-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: error
  summary: "[PRODUCTION] Critical event - immediate response required"
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
```

The summary prefixes make it instantly clear whether an alert requires immediate attention or can wait for normal working hours.

## Team Ownership in Summaries

Include team ownership information so alerts route to the right people:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: platform-team-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  summary: "Owner: Platform Team | Runbook: https://wiki.internal/flux-runbook | Escalation: #platform-oncall"
  eventSources:
    - kind: Kustomization
      name: infrastructure
    - kind: Kustomization
      name: cluster-config
    - kind: HelmRelease
      name: ingress-nginx
    - kind: HelmRelease
      name: cert-manager
```

This summary tells the recipient who owns the resources, where to find the runbook, and which channel to escalate to.

## Severity-Based Summaries

Create separate alerts with different summaries based on severity:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: info-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  summary: "Informational: Flux reconciliation update. No action needed unless repeated."
  exclusionList:
    - ".*Progressing.*"
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: error-alerts
  namespace: flux-system
spec:
  providerRef:
    name: pagerduty-provider
  eventSeverity: error
  summary: "ACTION REQUIRED: Flux reconciliation failure detected. Check resource status and logs immediately."
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
```

Error events go to PagerDuty with an urgent summary, while informational events go to Slack with a low-priority summary.

## Including Cluster Identification

When managing multiple clusters, include the cluster name in the summary:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: cluster-alerts
  namespace: flux-system
spec:
  providerRef:
    name: central-webhook
  eventSeverity: info
  summary: "Cluster: us-east-1-prod | Region: us-east-1 | Environment: production"
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
    - kind: GitRepository
      name: "*"
```

When this alert fires, the summary immediately identifies which cluster generated the event, eliminating the need to cross-reference cluster names.

## Combining Summary with Filters

The summary works alongside inclusion and exclusion filters:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: deployment-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  summary: "Deployment update: A resource has been successfully reconciled or failed. Review the event details below."
  inclusionList:
    - ".*ReconciliationSucceeded.*"
    - ".*ReconciliationFailed.*"
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
```

The summary explains the context of the filtered events, so recipients understand why they are receiving this particular notification.

## Structured Summaries for Webhook Providers

When using a generic webhook provider, structure your summary for machine parsing:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: webhook-alerts
  namespace: flux-system
spec:
  providerRef:
    name: generic-webhook
  eventSeverity: info
  summary: "cluster=prod-us-east-1 env=production team=platform priority=high"
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
```

Downstream systems receiving the webhook can parse the key-value pairs from the summary to route, tag, or prioritize the alert automatically.

## Runbook Links in Summaries

Include direct links to runbooks for faster incident response:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: database-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: error
  summary: "Database stack alert. Runbook: https://wiki.internal/runbooks/database-flux-alerts | Contact: @dba-team"
  eventSources:
    - kind: HelmRelease
      name: postgresql
    - kind: HelmRelease
      name: redis
    - kind: Kustomization
      name: database-config
```

On-call engineers can click the runbook link directly from the notification, reducing mean time to resolution.

## Verifying Summary Configuration

Apply and check the alert:

```bash
kubectl apply -f summary-alert.yaml
kubectl describe alert production-alerts -n flux-system
```

Trigger a test event:

```bash
flux reconcile kustomization flux-system --with-source
```

Check your notification channel to confirm the summary appears as expected in the notification message.

## Conclusion

The summary field in Flux Alert resources is a simple but effective way to add organizational context to your notifications. By including environment labels, team ownership, runbook links, and action guidance, you transform raw event notifications into actionable alerts that your team can respond to quickly. Use different summaries for different alert resources to create a layered notification system where each message carries the context needed for the recipient to understand its importance and take appropriate action.
