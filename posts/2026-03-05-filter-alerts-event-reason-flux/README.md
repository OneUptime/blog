# How to Filter Alerts by Event Reason in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Notifications, Alerts, Filtering

Description: Learn how to filter Flux alerts by event reason using exclusion lists to receive only the notifications that matter.

---

Flux CD generates a variety of events as it reconciles resources, and not all of them require your attention. The Alert resource provides filtering capabilities through the `spec.exclusionList` field, which accepts regex patterns to exclude events by their message content. This guide demonstrates how to filter alerts by event reason so you receive only actionable notifications.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- The notification controller running
- A notification provider configured
- Familiarity with basic regex patterns

## Understanding Event Reasons in Flux

Flux events include a reason field that describes why the event was generated. Common reasons include:

- `ReconciliationSucceeded` - A successful reconciliation
- `ReconciliationFailed` - A reconciliation error
- `ProgressingWithRetry` - Retrying after a failure
- `ArtifactUpToDate` - No changes detected in the source
- `HealthCheckFailed` - A post-deployment health check failed

The `spec.exclusionList` field in the Alert resource lets you exclude events based on regex matches against the event message, which typically contains the reason.

## Step 1: Identify Events You Want to Filter

First, look at the events being generated in your cluster to understand the patterns.

```bash
# List recent events from Flux resources
kubectl get events -n flux-system --sort-by='.lastTimestamp'

# View events for a specific resource type
kubectl get events -n flux-system --field-selector involvedObject.kind=Kustomization

# Check notification controller logs to see what events are being processed
kubectl logs -n flux-system deploy/notification-controller --tail=50
```

## Step 2: Create an Alert with Basic Exclusion Rules

Exclude routine reconciliation events that indicate no changes were made.

```yaml
# Alert that filters out no-change reconciliation events
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: filtered-alerts
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
    # Filter out events where reconciliation found no changes
    - "^Reconciliation finished.*no changes$"
```

## Step 3: Filter Multiple Event Reasons

Add multiple patterns to the exclusion list to filter out several types of events.

```yaml
# Alert with multiple exclusion patterns
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: targeted-alerts
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
    - kind: GitRepository
      name: "*"
      namespace: flux-system
  # Exclude various routine events
  exclusionList:
    # Exclude no-change reconciliation messages
    - "^Reconciliation finished.*no changes$"
    # Exclude artifact up-to-date messages
    - "^stored artifact.*same revision$"
    # Exclude waiting/progressing messages
    - ".*waiting for.*"
    - ".*is not ready$"
    # Exclude dependency-related progress messages
    - ".*dependency.*not ready.*"
```

Apply the configuration.

```bash
# Apply the filtered alert
kubectl apply -f filtered-alerts.yaml
```

## Step 4: Use Regex to Target Specific Patterns

You can use more sophisticated regex patterns for precise filtering.

```yaml
# Alert using advanced regex patterns for filtering
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: regex-filtered-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    - kind: HelmRelease
      name: "*"
      namespace: flux-system
  exclusionList:
    # Exclude any event mentioning a specific Helm chart name
    - ".*chart/nginx-ingress.*"
    # Exclude events containing specific status phrases
    - ".*Helm test.*succeeded.*"
    # Exclude events about specific namespaces
    - ".*namespace/monitoring.*"
    # Exclude events about specific resource types
    - ".*ConfigMap.*unchanged.*"
```

## Step 5: Keep Only Error-Like Events from Info Severity

Sometimes you want info severity to catch certain informational events but filter out most of the noise. This approach is more granular than switching to error severity.

```yaml
# Info-level alert that filters most routine events
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: meaningful-events-only
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  # Use info to capture successful deployments and errors
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: flux-system
    - kind: HelmRelease
      name: "*"
      namespace: flux-system
  # Aggressively filter routine events
  exclusionList:
    - "^Reconciliation finished.*no changes$"
    - "^no updates made$"
    - ".*is not ready$"
    - ".*waiting for.*"
    - ".*dependency.*"
    - "^stored artifact.*same revision$"
    - "^artifact up-to-date.*"
```

## Step 6: Test Your Exclusion Rules

After applying filters, verify that the right events are being captured and excluded.

```bash
# Trigger a reconciliation to generate events
flux reconcile kustomization flux-system --with-source

# Watch the notification controller logs to see which events are sent
kubectl logs -n flux-system deploy/notification-controller -f

# Verify the alert configuration
kubectl get alert filtered-alerts -n flux-system -o yaml
```

## Common Exclusion Patterns

Here is a reference table of useful exclusion patterns.

| Pattern | What It Filters |
|---|---|
| `^Reconciliation finished.*no changes$` | No-change reconciliations |
| `^stored artifact.*same revision$` | Unchanged source artifacts |
| `.*is not ready$` | Resources still progressing |
| `.*waiting for.*` | Dependency wait messages |
| `.*dependency.*not ready.*` | Unresolved dependencies |
| `^no updates made$` | No updates applied |
| `^artifact up-to-date.*` | Source already current |

## Important Notes on Exclusion Behavior

- Exclusion patterns are matched against the event message, not the event reason field directly
- Patterns are Go regex syntax (similar to POSIX extended regex)
- Each pattern in the list is evaluated independently; if any pattern matches, the event is excluded
- Patterns are case-sensitive by default
- An empty exclusion list means no events are excluded

## Troubleshooting

If events are being unexpectedly excluded or included, debug with these steps.

```bash
# View raw events to understand message formats
kubectl get events -n flux-system -o json | jq '.items[] | {message: .message, reason: .reason, kind: .involvedObject.kind}'

# Check if your regex patterns are valid
# Test a pattern against a known event message
echo "Reconciliation finished, no changes" | grep -E "^Reconciliation finished.*no changes$"
```

## Summary

Filtering alerts by event reason in Flux is accomplished through the `spec.exclusionList` field, which accepts regex patterns matched against event messages. By carefully crafting exclusion rules, you can eliminate noise from routine operations while preserving notifications for meaningful events. Start by observing the events in your cluster, then iteratively add exclusion patterns until you achieve the right balance between visibility and noise reduction.
