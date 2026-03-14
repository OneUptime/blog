# How to Configure Alert Rate Limiting in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Notifications, Alerts, Rate Limiting

Description: Learn how to reduce notification noise in Flux by using exclusion rules, suspension, and alert design patterns that effectively limit alert volume.

---

In busy Kubernetes clusters, Flux can generate a high volume of events, leading to notification fatigue if every event triggers an alert. While Flux does not have a dedicated rate limiting field on the Alert resource, there are several effective strategies to control notification volume. This guide covers practical approaches to limit the rate and volume of Flux alerts.

## Prerequisites

- A Kubernetes cluster with Flux CD installed, including the notification controller
- Alerts that are generating too many notifications
- Access to modify Alert resources

## Understanding Alert Volume in Flux

Flux events are generated during every reconciliation cycle. If you have many resources reconciling frequently, the number of events can be substantial. The notification controller processes these events and forwards them to providers based on your Alert configuration. To control volume, you can adjust what events are captured, how many resources are watched, and how aggressively you filter events.

## Step 1: Reduce Volume with Exclusion Rules

The most effective way to limit alert volume is to use `spec.exclusionList` to filter out routine events.

```yaml
# Alert with aggressive exclusion rules to reduce volume
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: rate-limited-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: flux-system
    - kind: HelmRelease
      name: "*"
      namespace: flux-system
  # Aggressive exclusions to significantly reduce notification volume
  exclusionList:
    # Exclude all no-change reconciliations
    - "^Reconciliation finished.*no changes$"
    # Exclude unchanged artifacts
    - "^stored artifact.*same revision$"
    - "^artifact up-to-date.*"
    # Exclude progress messages
    - ".*is not ready$"
    - ".*waiting for.*"
    - ".*dependency.*not ready.*"
    # Exclude no-update messages
    - "^no updates made$"
    # Exclude retry messages
    - "(?i).*retry.*"
    # Exclude health check progress
    - ".*health check.*progress.*"
```

Apply the alert.

```bash
# Apply the filtered alert
kubectl apply -f rate-limited-alert.yaml
```

## Step 2: Use Error Severity for Low-Volume Alerts

Switching to error severity dramatically reduces notification volume by only sending alerts when something fails.

```yaml
# Error-only alert for minimal notification volume
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: errors-only-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  # Error severity captures far fewer events than info
  eventSeverity: error
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

## Step 3: Narrow Event Sources

Reduce volume by watching only specific resources instead of using wildcards.

```yaml
# Alert watching only critical resources instead of all
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: targeted-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    # Only watch specific critical resources
    - kind: Kustomization
      name: production-apps
      namespace: flux-system
    - kind: HelmRelease
      name: payment-service
      namespace: production
    - kind: HelmRelease
      name: auth-service
      namespace: production
  exclusionList:
    - "^Reconciliation finished.*no changes$"
```

## Step 4: Use Temporary Suspension for Burst Control

During periods of high activity (such as large-scale updates), temporarily suspend alerts to prevent notification storms.

```bash
# Suspend alerts during a bulk update
kubectl patch alert info-severity-alert -n flux-system --type=merge -p '{"spec":{"suspend":true}}'

# Perform bulk operations...

# Resume alerts after operations complete
kubectl patch alert info-severity-alert -n flux-system --type=merge -p '{"spec":{"suspend":false}}'
```

## Step 5: Split Alerts by Volume Tier

Create a tiered alert system where high-volume events go to low-priority destinations and low-volume events go to high-priority destinations.

```yaml
# High-volume, low-priority: all info events to a webhook/log
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: high-volume-log
  namespace: flux-system
spec:
  providerRef:
    name: webhook-logger
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: flux-system
    - kind: HelmRelease
      name: "*"
      namespace: flux-system
---
# Low-volume, high-priority: errors only to Slack
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: low-volume-critical
  namespace: flux-system
spec:
  providerRef:
    name: slack-critical
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: flux-system
    - kind: HelmRelease
      name: "*"
      namespace: flux-system
---
# Medium-volume: filtered info events to general Slack
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: medium-volume-info
  namespace: flux-system
spec:
  providerRef:
    name: slack-general
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: flux-system
    - kind: HelmRelease
      name: "*"
      namespace: flux-system
  exclusionList:
    - "^Reconciliation finished.*no changes$"
    - "^stored artifact.*same revision$"
    - "^artifact up-to-date.*"
    - ".*is not ready$"
    - ".*waiting for.*"
    - ".*dependency.*"
    - "^no updates made$"
```

## Step 6: Use a Custom Webhook for Server-Side Rate Limiting

For true rate limiting, use a generic provider that points to a custom webhook service with rate limiting built in.

```yaml
# Provider pointing to a rate-limiting proxy
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: rate-limited-webhook
  namespace: flux-system
spec:
  type: generic
  secretRef:
    name: rate-limiter-secret
---
# Alert using the rate-limited proxy
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: rate-limited-via-proxy
  namespace: flux-system
spec:
  providerRef:
    name: rate-limited-webhook
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: flux-system
    - kind: HelmRelease
      name: "*"
      namespace: flux-system
```

The proxy service can implement features like deduplication, batching, and time-based rate limiting before forwarding notifications to the final destination.

## Step 7: Monitor Alert Volume

Track how many notifications are being generated to assess if your rate limiting is effective.

```bash
# Count events in the last hour
kubectl get events -n flux-system --sort-by='.lastTimestamp' | wc -l

# Count events by type
kubectl get events -n flux-system -o json | jq -r '.items[].reason' | sort | uniq -c | sort -rn

# Check notification controller logs for delivery count
kubectl logs -n flux-system deploy/notification-controller | grep -c "dispatch"

# View event generation rate
kubectl get events -n flux-system --sort-by='.lastTimestamp' | tail -20
```

## Volume Reduction Strategies Summary

| Strategy | Volume Reduction | Trade-off |
|---|---|---|
| Error severity only | Very high | Misses success notifications |
| Exclusion rules | Medium to high | May miss some relevant events |
| Specific resource names | High | Requires maintenance when adding resources |
| Temporary suspension | Complete during window | Misses all events during suspension |
| Custom rate-limiting proxy | Configurable | Additional infrastructure to maintain |
| Tiered alerts | Distributes volume | More complex configuration |

## Best Practices

1. **Start with broad alerts and narrow down** as you understand event patterns
2. **Use error severity for Slack and paging** to keep interactive channels low-volume
3. **Use info severity for logging** where volume does not matter
4. **Review exclusion rules periodically** to ensure important events are not being suppressed
5. **Monitor alert volume** and adjust as your cluster grows
6. **Suspend info-level alerts during bulk operations** to prevent notification storms

## Summary

While Flux does not have a built-in rate limiting field on Alert resources, you can effectively control notification volume through several strategies: aggressive exclusion rules, error-only severity, targeted event sources, temporary suspension, tiered alert architectures, and custom rate-limiting proxies. The most practical approach for most teams is combining error severity for critical channels with well-filtered info severity for general channels, ensuring important notifications are never missed while routine events are handled quietly.
