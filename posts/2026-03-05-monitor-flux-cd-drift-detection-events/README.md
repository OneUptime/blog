# How to Monitor Flux CD Drift Detection Events

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Drift Detection, Monitoring, Observability

Description: Learn how to monitor and alert on drift detection events in Flux CD to identify when cluster state diverges from Git-defined state.

---

Drift detection is a core capability of Flux CD's Kustomize controller. When someone manually changes a resource that Flux manages, the controller detects the difference between the desired state in Git and the actual state in the cluster. Monitoring these drift events is essential for maintaining GitOps discipline and identifying unauthorized or accidental changes.

## How Flux Detects Drift

Flux's kustomize-controller periodically compares the state of managed resources in the cluster against the desired state defined in Git. When a difference is found, the controller:

1. Emits a Kubernetes event describing the drift
2. Updates the Kustomization status after reconciliation
3. Corrects the drift by reapplying the desired state with server-side apply

This happens on every reconciliation interval defined in your Kustomization resource.

## Enabling Drift Detection

Drift detection and correction are enabled by default for Flux v2 Kustomizations. The kustomize-controller runs a server-side apply dry-run to compare the desired manifests with the live state on each reconciliation. You can control replacement behavior for immutable field changes with the `spec.force` field:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/production/apps
  prune: true
  force: false
```

With `force: false` (the default), Flux uses server-side apply to correct drift. With `force: true`, Flux replaces resources when patching fails because of immutable field changes.

## Viewing Drift Events with kubectl

Kubernetes events provide immediate visibility into drift. Query events for a specific Kustomization:

```bash
kubectl get events -n flux-system \
  --field-selector involvedObject.kind=Kustomization,involvedObject.name=my-app \
  --sort-by='.lastTimestamp'
```

You can also describe the Kustomization to see recent events:

```bash
kubectl describe kustomization my-app -n flux-system
```

Look for events with reason `Progressing` or type `Warning` that mention drift or field changes.

## Setting Up Flux Notification Alerts

Flux's notification-controller can send alerts when drift is detected. Configure a Provider and Alert resource to forward events to your monitoring system.

### Slack Alerts

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  type: slack
  secretRef:
    name: slack-webhook
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: drift-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: '*'
      namespace: flux-system
  inclusionList:
    - ".*drift.*"
    - ".*changed.*"
```

Create the Slack webhook secret:

```bash
kubectl create secret generic slack-webhook \
  --namespace=flux-system \
  --from-literal=address=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Microsoft Teams Alerts

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: teams
  namespace: flux-system
spec:
  type: msteams
  secretRef:
    name: teams-webhook
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: drift-alert
  namespace: flux-system
spec:
  providerRef:
    name: teams
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: '*'
      namespace: flux-system
```

### Generic Webhook

For custom alerting systems, use the generic webhook provider:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: webhook
  namespace: flux-system
spec:
  type: generic
  address: https://alerting.example.com/webhook
  secretRef:
    name: webhook-token
```

## Monitoring with Prometheus

Flux monitoring setups expose Prometheus metrics that help monitor reconciliation activity. There is no dedicated drift counter, so use events and logs for drift details, and metrics such as `gotk_resource_info`, `gotk_reconcile_duration_seconds_*`, and `controller_runtime_reconcile_total` for reconciliation health and activity.

### Key Metrics for Drift Detection

```promql
# Count of reconciliation failures from Flux resource status (requires kube-state-metrics custom resource metrics)

sum(gotk_resource_info{ready="False"}) by (customresource_kind, name, exported_namespace)

# Reconciliation duration (spikes may indicate large drift corrections)
histogram_quantile(0.99, sum(rate(gotk_reconcile_duration_seconds_bucket[5m])) by (le, kind))

# Total reconciliation count (frequent reconciliations may indicate continuous drift)
sum(rate(gotk_reconcile_duration_seconds_count[5m])) by (kind, name, namespace)
```

### Grafana Dashboard

Use the dashboards from the official Flux monitoring example to visualize reconciliation metrics. The dashboards show:

- Reconciliation status across all Flux resources
- Error rates and durations
- Resource counts by type and status

## Detecting Specific Types of Drift

### Manual kubectl Changes

When someone runs `kubectl edit` or `kubectl apply` to modify a Flux-managed resource, the kustomize-controller detects the change on the next reconciliation and reverts it. The event will contain details about which fields were modified.

### Helm Value Overrides

If a HelmRelease-managed resource is modified directly and `.spec.driftDetection.mode` is set to `enabled`, the helm-controller detects and corrects the drift during its next reconciliation cycle. With `.spec.driftDetection.mode` set to `warn`, it detects drift and emits an event without correcting it.

### Scaling Changes

A common drift scenario is manual replica scaling. If someone runs `kubectl scale deployment myapp --replicas=5` but the Git manifest specifies 3 replicas, Flux will revert the change.

## Building a Drift Detection Dashboard

Combine events and metrics to build a comprehensive drift monitoring view:

```yaml
# Alert rule for Prometheus Alertmanager
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-drift-alerts
  namespace: monitoring
spec:
  groups:
    - name: flux.drift
      rules:
        - alert: FluxDriftDetected
          expr: |
            sum(increase(gotk_reconcile_duration_seconds_count[10m])) by (kind, name, namespace) > 3
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Frequent reconciliation detected for {{ $labels.kind }}/{{ $labels.name }}"
            description: "The resource {{ $labels.namespace }}/{{ $labels.name }} is being reconciled frequently, which may indicate continuous drift."
```

## Best Practices

1. **Set reconciliation intervals appropriately**: Shorter intervals detect drift faster but increase API server load. For production, 5 to 10 minutes is a good balance.

2. **Use event-driven reconciliation**: Configure webhooks from your Git provider to trigger immediate reconciliation on push, reducing the window for undetected drift.

3. **Alert on drift, do not just log it**: Every drift event should be investigated. Persistent drift may indicate a process issue, such as a team member bypassing GitOps.

4. **Review RBAC policies**: If drift occurs frequently, tighten RBAC to prevent direct cluster modifications by users who should be going through Git.

5. **Document exceptions**: Some resources may legitimately need out-of-band changes (such as autoscaler-managed replicas). For Kustomizations, use the `kustomize.toolkit.fluxcd.io/ssa: Merge` annotation when other tools need to add non-overlapping fields, or `kustomize.toolkit.fluxcd.io/ssa: Ignore` when Flux should skip applying an entire resource. For HelmReleases, use `.spec.driftDetection.ignore` rules to ignore specific paths such as `/spec/replicas`.

Monitoring drift detection events closes the feedback loop in your GitOps process. By alerting on unauthorized changes and tracking drift patterns, you ensure that Git remains the single source of truth for your cluster state.
