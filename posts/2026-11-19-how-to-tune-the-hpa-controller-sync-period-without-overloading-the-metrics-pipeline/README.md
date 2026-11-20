# Tune the HPA Controller Sync Period Without Overloading the Metrics Pipeline

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HPA, Autoscaling, Troubleshooting

Description: Estimate HPA metrics-query pressure and tune the controller sync interval only after measuring source freshness, reconciliation delay, and time to ready capacity.

---

Reducing the HPA sync period looks like an easy way to improve response time. It helps only when waiting for the next HPA evaluation is a meaningful part of the delay. If the metric updates once a minute, querying it every second mostly repeats the same observation.

Treat the sync period as one stage in the demand-to-capacity path, then measure whether changing it improves that path enough to justify additional control-plane traffic.

## Find the effective interval and data cadence

The [Kubernetes 1.35 controller-manager reference](https://v1-35.docs.kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/) documents a default `--horizontal-pod-autoscaler-sync-period` of 15 seconds. This is a cluster-wide controller setting, not a per-HPA field.

Where your control plane exposes its Pod specification, inspect the command and arguments:

```bash
kubectl get pods -n kube-system -l component=kube-controller-manager -o json |
  jq '.items[] | {name: .metadata.name,
      containers: [.spec.containers[] | {command, args}]}'
```

The label and access vary by distribution. Managed control planes may expose neither the Pod nor this configuration option. Use the provider's documented controls instead of assuming that editing an HPA manifest can change the interval.

Next measure source publication, scrape interval, adapter query window, cache refresh, and returned metric timestamps. These are distinct clocks. The [resource metrics pipeline](https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/) also reports a window for CPU measurements; reducing HPA polling does not shorten that window.

## Estimate the extra work

A first-order planning model is:

```text
metric evaluations per second ≈ HPA count × metrics per HPA / sync interval
```

For 500 HPAs averaging two metrics each:

```text
15-second interval: 500 × 2 / 15 ≈ 67 evaluations/second
 5-second interval: 500 × 2 /  5 = 200 evaluations/second
```

This is not an exact count of backend queries. Resource requests can retrieve multiple Pod samples, adapters can cache results, and errors, retries, and work queues affect timing. Use the estimate to identify a likely threefold increase, then measure actual request rates.

Check API server latency, metrics adapter CPU and memory, upstream query cost, rate limits, errors, and reconciliation duration. If an adapter queries a remote monitoring service for every evaluation, a small interval can push that service into throttling and make autoscaling less reliable.

## Measure the delay you can actually remove

Record timestamps for demand increase, source measurement, adapter availability, HPA desired-count change, Pod scheduling, and Pod readiness. Repeat several bursts and measure end-to-end latency directly rather than adding unrelated percentile values.

If source publication takes 60 seconds and startup takes 90 seconds, changing a 15-second HPA interval to five seconds cannot remove most of the reaction time. Faster metric publication, reduced startup work, or additional ready reserve may provide a larger improvement.

Likewise, scaling policies can intentionally limit growth after a recommendation is computed. A shorter loop does not make a policy's lookback interval disappear.

## Change one control at a time

If measurements justify a change, prepare it through the supported control-plane configuration path. The relevant argument looks like:

```text
--horizontal-pod-autoscaler-sync-period=10s
```

This is an argument example, not a complete controller deployment. Use your distribution's rollout procedure and retain the original configuration for rollback.

Keep metrics cadence, adapter caching, scaling policies, and controller concurrency fixed for the first experiment. Increasing `--concurrent-horizontal-pod-autoscaler-syncs` at the same time makes it harder to distinguish queue throughput from polling frequency. More concurrency can also multiply pressure on a slow metrics backend.

## Watch controller health during the experiment

If your controller-manager metrics endpoint is accessible, the [upstream HPA monitoring source](https://github.com/kubernetes/kubernetes/blob/v1.35.0/pkg/controller/podautoscaler/monitor/metrics.go) defines reconciliation and metric-computation counters and duration histograms. Availability and stability depend on Kubernetes version and scraping configuration.

For an exposed reconciliation histogram, inspect aggregate latency:

```promql
histogram_quantile(0.99,
  sum by (le) (
    rate(horizontal_pod_autoscaler_controller_reconciliation_duration_seconds_bucket[5m])
  )
)
```

Scope the query to the intended cluster and controller targets. This measures reconciliation processing time, not the entire waiting time until useful capacity exists.

## Keep the change only if the service improves

Compare end-to-end scale-out time, source freshness, adapter errors, API latency, and request outcomes at similar load before and after. Include a metrics-backend slowdown test so the new interval does not become harmful precisely during an incident.

Rollback if query pressure rises without a useful reduction in ready-capacity delay. The best interval is the one your metrics pipeline can sustain while meeting the workload's response budget, not the smallest value the flag accepts.
