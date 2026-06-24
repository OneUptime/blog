# How to Filter Alerts by Event Reason in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Notification, Alert, Filtering

Description: Learn how to filter Flux alerts by event reason using exclusion lists to receive only the notifications that matter.

---

Flux CD generates a variety of events as it reconciles resources, and not all of them require your attention. The Alert resource provides filtering capabilities through the `spec.exclusionList` field, which accepts regex patterns to exclude events by their message content. This guide demonstrates how to filter alerts by message patterns associated with event reasons so you receive only actionable notifications.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- The notification controller running
- A notification provider configured
- Familiarity with basic regex patterns

## Understanding Event Reasons in Flux

Flux events include a reason field that describes why the event was generated. Common reasons include:

- `ReconciliationSucceeded` - A successful reconciliation
- `ArtifactFailed` - A source artifact error
- `ProgressingWithRetry` - Retrying after a failure
- `ArtifactUpToDate` - No changes detected in the source
- `HealthCheckFailed` - A post-deployment health check failed

The `spec.exclusionList` field in the Alert resource does not match the reason field directly. It lets you exclude events based on regex matches against the event message, so you should inspect both the reason and message and then filter the message text associated with the reasons you want to suppress.

## Step 1: Identify Events You Want to Filter

First, look at the events being generated in your cluster to understand the patterns.

```bash
# List recent events from Flux resources

kubectl events -n flux-system

# View events for a specific resource type
kubectl events -n flux-system --for Kustomization/flux-system

# Check notification controller logs to see what events are being processed
kubectl logs -n flux-system deploy/notification-controller --tail=50
```

## Step 2: Create an Alert with Basic Exclusion Rules

Exclude routine successful reconciliation events.

```yaml
# Alert that filters out successful reconciliation events
apiVersion: notification.toolkit.fluxcd.io/v1beta3
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
    # Filter out successful reconciliation messages
    - "^Reconciliation finished.*next run in.*$"
```

## Step 3: Filter Multiple Event Reasons

Add multiple patterns to the exclusion list to filter out several types of events.

```yaml
# Alert with multiple exclusion patterns
apiVersion: notification.toolkit.fluxcd.io/v1beta3
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
    - kind: HelmChart
      name: "*"
      namespace: flux-system
  # Exclude various routine events
  exclusionList:
    # Exclude successful reconciliation messages
    - "^Reconciliation finished.*next run in.*$"
    # Exclude artifact up-to-date messages
    - "^artifact up-to-date with remote revision:.*$"
    # Exclude source checks where the revision did not change
    - "^no changes since last reconcilation: observed revision.*$"
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
apiVersion: notification.toolkit.fluxcd.io/v1beta3
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
apiVersion: notification.toolkit.fluxcd.io/v1beta3
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
    - kind: GitRepository
      name: "*"
      namespace: flux-system
    - kind: HelmChart
      name: "*"
      namespace: flux-system
  # Aggressively filter routine events
  exclusionList:
    - "^Reconciliation finished.*next run in.*$"
    - "^no updates made$"
    - ".*is not ready$"
    - ".*waiting for.*"
    - ".*dependency.*"
    - "^no changes since last reconcilation: observed revision.*$"
    - "^artifact up-to-date with remote revision:.*$"
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
| `^Reconciliation finished.*next run in.*$` | Successful Kustomization reconciliations |
| `^no changes since last reconcilation: observed revision.*$` | Source checks with no new Git revision |
| `^artifact up-to-date with remote revision:.*$` | Unchanged chart artifacts |
| `.*is not ready$` | Resources still progressing |
| `.*waiting for.*` | Dependency wait messages |
| `.*dependency.*not ready.*` | Unresolved dependencies |
| `^no updates made$` | No updates applied |

## Important Notes on Exclusion Behavior

- Exclusion patterns are matched against the event message, not the event reason field directly
- Patterns use Go regular expression syntax, which is based on RE2
- Each pattern in the list is evaluated independently; if any pattern matches, the event is excluded
- Patterns are case-sensitive by default
- An empty exclusion list means no events are excluded

## Troubleshooting

If events are being unexpectedly excluded or included, debug with these steps.

```bash
# View raw events to understand message formats
kubectl get events -n flux-system -o json | jq '.items[] | {message: .message, reason: .reason, kind: .involvedObject.kind}'

# Check if your regex patterns are valid
# Test a simple pattern against a known event message
echo "Reconciliation finished in 448.00332ms, next run in 10m0s" | grep -E "^Reconciliation finished.*next run in.*$"
```

## Summary

Filtering alerts by message patterns associated with event reasons in Flux is accomplished through the `spec.exclusionList` field, which accepts regex patterns matched against event messages. By carefully crafting exclusion rules, you can eliminate noise from routine operations while preserving notifications for meaningful events. Start by observing the events in your cluster, then iteratively add exclusion patterns until you achieve the right balance between visibility and noise reduction.
