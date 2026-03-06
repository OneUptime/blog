# How to Troubleshoot Flux CD by Checking Kubernetes Events

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Troubleshooting, Kubernetes events, Debugging, GitOps, Monitoring

Description: Learn how to use Kubernetes events to diagnose Flux CD issues by filtering, correlating, and analyzing event data from controllers and resources.

---

Kubernetes events provide a real-time stream of what is happening inside your cluster. Flux CD controllers emit events for every reconciliation, error, and state change. Learning to read and filter these events is a fast way to diagnose issues without digging through individual controller logs. This guide shows you how to use Kubernetes events effectively for Flux CD troubleshooting.

## Understanding Kubernetes Events

Events are Kubernetes objects that describe state changes and errors. Each event has:

- **Type** - `Normal` or `Warning`
- **Reason** - A short machine-readable string (e.g., `ReconciliationSucceeded`)
- **Message** - A human-readable description
- **Source** - The component that generated the event (e.g., `kustomize-controller`)
- **Involved Object** - The resource the event relates to
- **Count** - How many times this event has occurred
- **First/Last Timestamp** - When the event first and last occurred

## Viewing All Flux Events

```bash
# View all events in the flux-system namespace
kubectl get events -n flux-system

# View events sorted by last timestamp (most recent last)
kubectl get events -n flux-system --sort-by='.lastTimestamp'

# View events with wide output for more detail
kubectl get events -n flux-system -o wide

# Watch events in real time
kubectl get events -n flux-system --watch
```

## Filtering Events by Type

```bash
# Show only Warning events (these indicate problems)
kubectl get events -n flux-system --field-selector type=Warning

# Show only Normal events
kubectl get events -n flux-system --field-selector type=Normal

# Show Warning events across all namespaces (for HelmReleases in other namespaces)
kubectl get events -A --field-selector type=Warning | grep -i flux
```

## Filtering Events by Source Controller

Each Flux controller is identified as an event source:

```bash
# Events from the source-controller
kubectl get events -n flux-system \
  --field-selector source=source-controller

# Events from the kustomize-controller
kubectl get events -n flux-system \
  --field-selector source=kustomize-controller

# Events from the helm-controller
kubectl get events -n flux-system \
  --field-selector source=helm-controller

# Events from the notification-controller
kubectl get events -n flux-system \
  --field-selector source=notification-controller
```

## Filtering Events by Involved Object

```bash
# Events for a specific GitRepository
kubectl get events -n flux-system \
  --field-selector involvedObject.name=fleet-infra,involvedObject.kind=GitRepository

# Events for a specific Kustomization
kubectl get events -n flux-system \
  --field-selector involvedObject.name=my-app,involvedObject.kind=Kustomization

# Events for a specific HelmRelease
kubectl get events -n default \
  --field-selector involvedObject.name=nginx,involvedObject.kind=HelmRelease

# Events for Pod-level issues with controllers
kubectl get events -n flux-system \
  --field-selector involvedObject.kind=Pod
```

## Filtering Events by Reason

Common Flux event reasons and what they mean:

| Reason | Controller | Meaning |
|--------|-----------|---------|
| `ReconciliationSucceeded` | All | Resource reconciled successfully |
| `ReconciliationFailed` | All | Reconciliation failed |
| `ArtifactUpToDate` | source-controller | Source has not changed |
| `NewArtifact` | source-controller | New source artifact available |
| `GitOperationFailed` | source-controller | Git clone/fetch failed |
| `BuildFailed` | kustomize-controller | Kustomize build failed |
| `HealthCheckFailed` | kustomize-controller | Health check on applied resources failed |
| `InstallFailed` | helm-controller | Helm install failed |
| `UpgradeFailed` | helm-controller | Helm upgrade failed |
| `TestFailed` | helm-controller | Helm test failed |

```bash
# Find all failed reconciliation events
kubectl get events -n flux-system \
  --field-selector reason=ReconciliationFailed

# Find all Git operation failures
kubectl get events -n flux-system \
  --field-selector reason=GitOperationFailed

# Find all health check failures
kubectl get events -n flux-system \
  --field-selector reason=HealthCheckFailed
```

## Using JSON Output for Advanced Filtering

```bash
# Get all warning events with structured details
kubectl get events -n flux-system -o json | jq -r '
  .items[]
  | select(.type == "Warning")
  | "\(.lastTimestamp) [\(.source.component)] \(.involvedObject.kind)/\(.involvedObject.name): \(.message)"'

# Get events from the last 10 minutes
kubectl get events -n flux-system -o json | jq -r --arg cutoff "$(date -u -v-10M +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%SZ)" '
  .items[]
  | select(.lastTimestamp > $cutoff)
  | "\(.lastTimestamp) [\(.type)] \(.involvedObject.kind)/\(.involvedObject.name): \(.message)"'

# Count events by reason to find patterns
kubectl get events -n flux-system -o json | jq -r '
  [.items[] | .reason] | group_by(.) | map({reason: .[0], count: length}) | sort_by(.count) | reverse | .[] | "\(.count) \(.reason)"'

# Find resources with the most warning events
kubectl get events -n flux-system -o json | jq -r '
  [.items[] | select(.type == "Warning") | "\(.involvedObject.kind)/\(.involvedObject.name)"]
  | group_by(.) | map({resource: .[0], count: length})
  | sort_by(.count) | reverse | .[]
  | "\(.count) warnings: \(.resource)"'
```

## Correlating Events Across Resources

Flux resources form a dependency chain. When something fails, events often cascade. Here is how to trace the chain:

```bash
# Step 1: Check GitRepository events (source level)
echo "=== GitRepository Events ==="
kubectl get events -n flux-system \
  --field-selector involvedObject.kind=GitRepository \
  --sort-by='.lastTimestamp' | tail -10

# Step 2: Check Kustomization events (build/apply level)
echo "=== Kustomization Events ==="
kubectl get events -n flux-system \
  --field-selector involvedObject.kind=Kustomization \
  --sort-by='.lastTimestamp' | tail -10

# Step 3: Check HelmRelease events (helm level)
echo "=== HelmRelease Events ==="
kubectl get events -A \
  --field-selector involvedObject.kind=HelmRelease \
  --sort-by='.lastTimestamp' | tail -10

# Step 4: Check HelmChart events (chart fetch level)
echo "=== HelmChart Events ==="
kubectl get events -n flux-system \
  --field-selector involvedObject.kind=HelmChart \
  --sort-by='.lastTimestamp' | tail -10
```

## Event Retention and Limitations

By default, Kubernetes retains events for only 1 hour. For longer retention:

```yaml
# Adjust the kube-apiserver event TTL (if you control the control plane)
# Add this to the kube-apiserver manifest:
# --event-ttl=24h

# Alternatively, use a tool like kubewatch or event-exporter
# to forward events to an external system
```

### Using Flux Notification Controller for Persistent Event Tracking

Set up alerts to forward Flux events to external systems:

```yaml
# alert.yaml - Send all Flux warnings to Slack
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  type: slack
  channel: flux-alerts
  secretRef:
    name: slack-webhook-url
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: flux-warnings
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: error
  eventSources:
    # Monitor all Flux resource types
    - kind: GitRepository
      name: '*'
    - kind: Kustomization
      name: '*'
    - kind: HelmRelease
      name: '*'
    - kind: HelmRepository
      name: '*'
    - kind: HelmChart
      name: '*'
```

```bash
# Create the Slack webhook secret
kubectl create secret generic slack-webhook-url \
  -n flux-system \
  --from-literal=address=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

## Comprehensive Event Diagnostic Script

```bash
#!/bin/bash
# flux-events-diagnostic.sh - Complete Flux event analysis

NAMESPACE="flux-system"

echo "========================================"
echo "Flux CD Event Diagnostic Report"
echo "Generated: $(date -u)"
echo "========================================"
echo ""

echo "=== Warning Events (Last Hour) ==="
kubectl get events -n "$NAMESPACE" \
  --field-selector type=Warning \
  --sort-by='.lastTimestamp'
echo ""

echo "=== Warning Events Across All Namespaces ==="
kubectl get events -A \
  --field-selector type=Warning \
  --sort-by='.lastTimestamp' 2>/dev/null | grep -E "flux|gitrepository|kustomization|helmrelease"
echo ""

echo "=== Event Summary by Reason ==="
kubectl get events -n "$NAMESPACE" -o json | jq -r '
  [.items[] | {reason: .reason, type: .type}]
  | group_by(.reason)
  | map({reason: .[0].reason, type: .[0].type, count: length})
  | sort_by(.count) | reverse | .[]
  | "\(.count)x \(.type)/\(.reason)"'
echo ""

echo "=== Most Recent Events (Last 20) ==="
kubectl get events -n "$NAMESPACE" \
  --sort-by='.lastTimestamp' | tail -20
echo ""

echo "=== Pod Events ==="
kubectl get events -n "$NAMESPACE" \
  --field-selector involvedObject.kind=Pod \
  --sort-by='.lastTimestamp' | tail -10
echo ""

echo "=== Controller Pod Status ==="
kubectl get pods -n "$NAMESPACE" \
  -o custom-columns=NAME:.metadata.name,STATUS:.status.phase,RESTARTS:.status.containerStatuses[0].restartCount
```

## Summary

Kubernetes events are an underutilized troubleshooting tool for Flux CD. They provide a timeline of everything happening in your cluster, from source fetching to deployment health checks. Use field selectors to filter by type, source, and involved object. Correlate events across the Flux resource chain to trace failures from source to deployment. For long-term event retention, configure the Flux notification controller to forward alerts to external monitoring systems.
