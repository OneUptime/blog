# How to Detect Stale External Metrics That Pin an HPA at `maxReplicas`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HPA, Autoscaling, Troubleshooting

Description: Trace external metric timestamps, adapter caching, and selector aggregation when an HPA remains at its replica ceiling after real demand falls.

---

An HPA at `maxReplicas` can be behaving correctly with incorrect input. If an external metrics adapter keeps returning an old high queue depth, the HPA may continue requesting capacity long after the queue drains.

A successful API response is not proof of fresh data. Diagnose the entire path from the source measurement through the adapter to the HPA.

## Confirm that the external metric drives the limit

Capture the HPA configuration, current metrics, and conditions:

```bash
kubectl get hpa invoice-workers -n production -o json |
  jq '{metrics: .spec.metrics, max: .spec.maxReplicas,
       current: .status.currentReplicas,
       desired: .status.desiredReplicas,
       observed: .status.currentMetrics,
       conditions: .status.conditions}'
```

If multiple metrics are configured, a different metric may be requesting the extra replicas. Also distinguish `TooManyReplicas` from a scale-rate limit or a recent recommendation retained by stabilization. Diagnose the metric evidence before raising the replica ceiling.

Suppose the HPA uses this fragment under `spec.metrics`:

```yaml
- type: External
  external:
    metric:
      name: queue_pending_jobs
      selector:
        matchLabels:
          queue: invoices
    target:
      type: AverageValue
      averageValue: "40"
```

A total of 1200 queued jobs implies a basic recommendation of 30 workers. With `maxReplicas: 20`, the ceiling explains the limited result. If the queue really contains 20 jobs but the adapter still reports 1200, the ceiling is only the visible symptom.

## Inspect the response HPA consumes

Query the external metrics API with the same namespace, metric, and selector:

```bash
kubectl get --raw \
  '/apis/external.metrics.k8s.io/v1beta1/namespaces/production/queue_pending_jobs?labelSelector=queue%3Dinvoices' \
  > external-metric.json
jq '.items[] | {metricName, metricLabels, value, timestamp, window}' \
  external-metric.json
```

Read `timestamp` and `window` (in seconds) together with the adapter's documented timestamp semantics. The timestamp may describe an adapter evaluation rather than the original upstream sample. A freshly stamped cached value can still be stale for scaling purposes.

The [external metrics API definition](https://github.com/kubernetes/metrics/blob/master/pkg/apis/external_metrics/v1beta1/types.go) describes these fields. Kubernetes' [external metrics client](https://github.com/kubernetes/kubernetes/blob/v1.35.0/pkg/controller/podautoscaler/metrics/client.go) reads returned values; do not assume a universal HPA freshness deadline protects every adapter response.

Repeat the query over several source collection intervals. Compare value changes, timestamps, adapter cache age, source publication time, and queue depth reported by the source service itself. Clock differences can confuse timestamp comparisons, so verify time synchronization when the evidence looks inconsistent.

## Check aggregation before blaming caching

An external metric selector can match several series, whose values are summed for scaling. Inspect every returned label set. A queue represented once per region, account, exporter replica, or old deployment can be counted more than once if the selector is too broad.

For example, two identical `600` values may describe separate partitions that should be added, or duplicate observations of one queue that should not. Determine which is true from the source metric definition. Do not average arbitrary duplicates simply to make the HPA scale down.

The [external metrics walkthrough](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/#autoscaling-on-metrics-not-related-to-kubernetes-objects) documents selector-based aggregation and the difference between `Value` and `AverageValue`.

## Repair the freshness contract

Make the adapter's behavior explicit when the source stops updating. Set a maximum acceptable source age based on the workload's reaction budget. An adapter should expose an unavailable measurement as unavailable when it cannot safely provide current data, rather than indefinitely serving the last successful high value.

Do not replace an unavailable metric with zero. Zero means no work, and can request unsafe scale-down. Unavailability has different HPA semantics: if another metric only recommends scale-down, a failed metric can prevent that downscale. Restoring trustworthy data is the goal, not merely obtaining fewer Pods.

Cache timeouts, query range windows, and source polling intervals vary across adapters. Change the specific layer holding stale data, then confirm fresh source values reach the API within the intended budget.

## Test the failure and recovery paths

In a test environment, stop source updates while leaving the adapter reachable. Verify the adapter's freshness limit, HPA warning behavior, and monitoring signal. Resume publication and check recovery without manual replica edits.

Alert on source age and adapter errors separately from replica saturation. If you expose a custom source timestamp metric, document its units and update semantics. A useful incident dashboard shows actual queue depth, source age, adapter value, HPA desired replicas, and ready workers on the same timeline. That makes a stale signal visible before it spends hours pinning the workload at its maximum.
