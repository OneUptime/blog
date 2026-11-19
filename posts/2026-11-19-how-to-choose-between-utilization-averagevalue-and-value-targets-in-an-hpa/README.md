# How to Choose Between Utilization, AverageValue, and Value Targets in an HPA

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HPA, Autoscaling, Troubleshooting

Description: Choose HPA metric target types by their units and scaling response, with examples for CPU usage, per-Pod concurrency, and shared queue depth.

---

`Utilization`, `AverageValue`, and `Value` describe what an HPA compares with a target. Choosing the wrong one can change the scaling equation even when the metric name stays the same.

Start with a sentence that describes the intended capacity: “each Pod should handle about 40 concurrent requests” or “each application container should use about 300 millicores.” Then choose the source and target that express that sentence.

## Match target types to metric sources

The [autoscaling/v2 API](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/horizontal-pod-autoscaler-v2/) defines which combinations are meaningful:

| Metric source | Supported target choices | Typical interpretation |
| --- | --- | --- |
| `Resource` | `Utilization`, `AverageValue` | Percentage of requests, or average absolute resource usage |
| `ContainerResource` | `Utilization`, `AverageValue` | The same choices for a named container |
| `Pods` | `AverageValue` | Average custom metric across selected Pods |
| `Object` | `Value`, `AverageValue` | An object's metric, optionally divided across replicas |
| `External` | `Value`, `AverageValue` | An external metric, optionally divided across replicas |

Metric names alone do not enforce units. Document what the adapter returns and whether it already aggregates or divides the measurement.

## Use Utilization when requests define the capacity baseline

This fragment belongs under `spec.metrics` in an `autoscaling/v2` HPA:

```yaml
- type: Resource
  resource:
    name: cpu
    target:
      type: Utilization
      averageUtilization: 60
```

With an effective `500m` CPU request per Pod, 60% corresponds to `300m` of CPU usage. If you change that request to `1000m`, the same target corresponds to `600m`. Changing requests therefore changes scaling behavior even when traffic and the HPA manifest remain constant.

Use this when requests intentionally describe the operating capacity you want to track. Verify the denominator for your resource model, including sidecars or Pod-level resource requests. For a named application container, `ContainerResource` avoids combining its usage with unrelated container work.

## Use AverageValue for an absolute per-Pod target

A raw CPU target avoids coupling the target to CPU requests:

```yaml
- type: ContainerResource
  containerResource:
    name: cpu
    container: application
    target:
      type: AverageValue
      averageValue: 300m
```

Requests still matter for scheduling and available CPU under contention. They simply no longer set this HPA's CPU threshold. Increasing CPU limits also does not automatically change the `300m` target.

For a custom gauge reported independently by each Pod:

```yaml
- type: Pods
  pods:
    metric:
      name: requests_in_flight
    target:
      type: AverageValue
      averageValue: "40"
```

Four Pods averaging 60 in-flight requests suggest `ceil(4 × 60 / 40) = 6` replicas before controller adjustments. The metric should decrease per Pod as capacity increases. Do not expose one service-wide total on every Pod and call it a per-Pod measurement.

## Divide a shared queue with External AverageValue

Suppose an external adapter exposes a total backlog of 240 jobs for one queue. You want approximately 40 queued jobs per worker:

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

The basic recommendation is `ceil(240 / 40) = 6`. The input is the total backlog; the HPA applies the per-replica interpretation. Dividing by replicas inside the adapter as well would divide twice.

Use a selector that identifies the intended queue. When an external selector returns multiple series, Kubernetes sums their values. Duplicate representations of the same queue can inflate the apparent backlog. The [external metrics walkthrough](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/#autoscaling-on-metrics-not-related-to-kubernetes-objects) explains this aggregation.

## Use Value only when its feedback equation fits

With `Value`, the target applies to the metric itself. In the simple case where all four replicas are Ready, a value of 240 against a target of 120 suggests `ceil(4 × 240 / 120) = 8` replicas.

That is different from asking for 120 jobs per worker. If the service-wide value remains 240 after scaling, the ratio remains two, so later evaluations can request more replicas again. `Value` can be appropriate when more replicas reliably reduce the measured quantity toward a fixed objective; verify that relationship rather than selecting it because the source is global.

## Verify units and response before rollout

Query the adapter API directly and compare returned values, selectors, and timestamps with the source system. Run a constant-load test, add capacity, and check whether the measured signal responds as expected. Then test load removal and metric failure.

Tolerance, missing metrics, readiness handling, stabilization, and rate limits still apply. Target type chooses the meaning of the calculation; it does not guarantee an instantaneous replica change or make an unsuitable metric a reliable capacity signal.
