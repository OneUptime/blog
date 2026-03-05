# How to View Flux CD Events with kubectl

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Monitoring, kubectl, Events, Debugging

Description: Learn how to use kubectl to view and filter Flux CD events for debugging reconciliation issues, tracking deployments, and understanding what is happening in your GitOps pipeline.

---

Kubernetes events are a built-in mechanism for reporting state changes and errors. Flux CD controllers emit events for every significant action they take -- fetching sources, applying manifests, upgrading Helm releases, and encountering errors. Using kubectl to query these events is one of the fastest ways to understand what is happening with your Flux resources without installing additional tooling.

## Understanding Flux CD Events

Flux CD controllers create standard Kubernetes events with the following characteristics:

- **Type**: `Normal` for successful operations, `Warning` for failures.
- **Reason**: Describes the action (e.g., `ReconciliationSucceeded`, `ReconciliationFailed`, `ArtifactUpToDate`).
- **Source**: The controller that generated the event (e.g., `source-controller`, `kustomize-controller`).
- **Object**: The Flux resource the event relates to.

## View All Events in the Flux System Namespace

The simplest way to see Flux events is to query the flux-system namespace:

```bash
kubectl get events -n flux-system --sort-by='.lastTimestamp'
```

This shows all events including pod scheduling, container starts, and Flux-specific reconciliation events. To reduce noise, filter by event type:

```bash
kubectl get events -n flux-system --field-selector type=Warning --sort-by='.lastTimestamp'
```

Show only normal events for successful operations:

```bash
kubectl get events -n flux-system --field-selector type=Normal --sort-by='.lastTimestamp'
```

## Filter Events for Specific Flux Resources

You can filter events by the object they relate to using field selectors:

```bash
kubectl get events -n flux-system \
  --field-selector involvedObject.kind=GitRepository,involvedObject.name=flux-system \
  --sort-by='.lastTimestamp'
```

View events for a specific Kustomization:

```bash
kubectl get events -n flux-system \
  --field-selector involvedObject.kind=Kustomization,involvedObject.name=infrastructure \
  --sort-by='.lastTimestamp'
```

View events for a specific HelmRelease:

```bash
kubectl get events -n my-namespace \
  --field-selector involvedObject.kind=HelmRelease,involvedObject.name=my-app \
  --sort-by='.lastTimestamp'
```

## Get Detailed Event Output

For more detail, use wide output or JSON format:

```bash
kubectl get events -n flux-system -o wide --sort-by='.lastTimestamp'
```

JSON output is useful for scripting and parsing:

```bash
kubectl get events -n flux-system \
  --field-selector involvedObject.kind=GitRepository \
  -o json | jq '.items[] | {name: .involvedObject.name, reason: .reason, message: .message, time: .lastTimestamp}'
```

## Watch Events in Real Time

When debugging an active issue, watch events as they are created:

```bash
kubectl get events -n flux-system --watch
```

Watch events across all namespaces for Flux resources:

```bash
kubectl get events --all-namespaces --watch 2>&1 | grep -i "reconcil"
```

Watch for specific error patterns:

```bash
kubectl get events -n flux-system --watch 2>&1 | grep -E "(failed|error|timeout)"
```

## View Events Using kubectl describe

The `kubectl describe` command shows events associated with a specific resource at the bottom of its output:

```bash
kubectl describe gitrepository flux-system -n flux-system
```

Describe a Kustomization to see its events:

```bash
kubectl describe kustomization infrastructure -n flux-system
```

Describe a HelmRelease to see its events:

```bash
kubectl describe helmrelease my-app -n my-namespace
```

The events section at the bottom of the describe output shows the most recent events for that specific resource, which is often the quickest way to understand its current state.

## Query Events Across All Namespaces

Flux resources may be deployed across multiple namespaces. To get a cluster-wide view:

```bash
kubectl get events --all-namespaces --sort-by='.lastTimestamp' \
  --field-selector reason!=Pulled,reason!=Scheduled,reason!=Created,reason!=Started
```

Count events by reason to identify the most common issues:

```bash
kubectl get events --all-namespaces -o json | \
  jq '[.items[] | select(.source.component | test("source-controller|kustomize-controller|helm-controller|notification-controller"))] | group_by(.reason) | map({reason: .[0].reason, count: length}) | sort_by(.count) | reverse'
```

## Export Events for Analysis

For historical analysis, export events before they age out. Kubernetes events have a default TTL of 1 hour:

```bash
kubectl get events -n flux-system -o json > flux-events-$(date +%Y%m%d-%H%M%S).json
```

Export events in a custom column format for quick analysis:

```bash
kubectl get events -n flux-system \
  --sort-by='.lastTimestamp' \
  -o custom-columns='TIME:.lastTimestamp,TYPE:.type,REASON:.reason,OBJECT:.involvedObject.name,MESSAGE:.message'
```

## Limitations of kubectl Events

While kubectl events are valuable, they have important limitations:

1. **Short retention** -- Events are garbage collected after 1 hour by default. For longer retention, use the Flux notification controller or a log aggregation system.
2. **No aggregation** -- Events are per-resource and per-namespace. Getting a cluster-wide view requires querying all namespaces.
3. **Limited filtering** -- Field selectors support only a subset of fields. Complex queries require post-processing with jq or similar tools.

For persistent event storage, consider forwarding Flux events to a log aggregation system or using the Flux notification controller to send events to external systems like Slack or webhooks.

## Summary

Viewing Flux CD events with kubectl provides immediate, zero-dependency visibility into your GitOps pipeline. Use field selectors to filter by resource kind and name, `--watch` for real-time debugging, and `kubectl describe` for per-resource event history. For production environments, complement kubectl events with the `flux events` CLI command, which provides Flux-specific filtering, and a monitoring platform that can persist events and correlate them with metrics for long-term observability of your Flux CD deployments.
