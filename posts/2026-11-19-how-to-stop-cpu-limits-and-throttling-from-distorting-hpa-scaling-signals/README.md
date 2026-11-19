# How to Stop CPU Limits and Throttling from Distorting HPA Scaling Signals

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HPA, Autoscaling, Troubleshooting

Description: Diagnose how CPU limits cap observed usage, correlate throttling with request pressure, and choose HPA targets that reflect usable application capacity.

---

CPU utilization tells the HPA how much CPU a workload used. It does not directly tell the HPA how much CPU the workload wanted but could not obtain. A tight CPU limit can therefore flatten the signal while requests queue and latency rises.

The fix is to measure requests, limits, observed usage, throttling, and application pressure together. Changing the HPA target without understanding those relationships can move the symptom rather than solve it.

## Separate the request from the limit

Kubernetes uses CPU requests for scheduling and CPU allocation under contention. On Linux, a CPU limit is enforced through throttling. The [resource management documentation](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#requests-and-limits) describes these different roles.

Inspect the actual Pod after admission, because defaults or policies can alter the submitted resources:

```bash
kubectl get pods -n production -l app=checkout -o json |
  jq '.items[] | {pod: .metadata.name,
      resources: [.spec.containers[] | {name, resources}]}'
kubectl get hpa checkout -n production -o json |
  jq '.spec.metrics, .status.currentMetrics'
```

For a single container requesting `500m`, a 60% utilization target corresponds to `300m`. A `500m` limit permits average usage above that target, so the HPA can still scale. The presence of a limit alone does not make CPU scaling ineffective.

However, short bursts can hit that limit while a longer measurement window reports a modest average. Tail latency can worsen before the averaged CPU signal clearly crosses its target.

## Check whether the target is reachable

Consider an absolute CPU target of `800m` for a container limited to `500m`:

```yaml
- type: ContainerResource
  containerResource:
    name: cpu
    container: application
    target:
      type: AverageValue
      averageValue: 800m
```

That target asks the controller to react around a level the container cannot sustainably reach under its CPU ceiling. The equivalent problem can occur with utilization targets above the limit-to-request ratio.

Calculate the approximate ceiling for utilization:

```text
maximum sustained utilization ≈ 100 × CPU limit / CPU request
```

With request and limit both `500m`, that ceiling is about 100%. A 150% target cannot represent a reachable steady operating point. Choose requests, limits, and targets as a coherent capacity model; do not simply raise targets to reduce replica cost.

## Correlate throttling with user-visible pressure

Where your runtime exports them, cAdvisor provides throttled and total CPU enforcement-period counters. The [upstream metric reference](https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md) defines these metrics.

```promql
sum by (namespace, pod, container) (
  rate(container_cpu_cfs_throttled_periods_total{
    namespace="production",container="application"
  }[5m])
)
/
sum by (namespace, pod, container) (
  rate(container_cpu_cfs_periods_total{
    namespace="production",container="application"
  }[5m])
)
```

Scope and deduplicate scrapes for your monitoring setup. Verify these metrics are actually available on your nodes; runtime and collection configuration matter.

The ratio is the fraction of enforcement periods with throttling. It is not the percentage of request latency caused by throttling, and it does not directly measure unmet CPU demand. Compare it with per-Pod CPU usage, queue time, runnable work, request latency, and throughput under controlled load.

A little throttling may be harmless. Sustained throttling accompanied by growing queues and degraded latency is stronger evidence that the limit constrains useful work.

## Test a coherent resource change

One candidate experiment could retain a `500m` request, raise the CPU limit to `1000m`, and keep a utilization target of 60%. That permits bursts while preserving the same request-based target. Whether it is safe depends on node headroom, other workloads, and policy.

Test at the expected request rate and burst shape. If increasing the limit improves latency without destabilizing nodes, you have evidence for that change. Removing limits entirely is a separate capacity and isolation decision, not an automatic HPA fix.

If CPU remains a poor demand signal, add a suitable queue or per-Pod concurrency metric. Confirm it falls as ready capacity increases. Multiple metrics use the largest recommendation, so they provide additional reasons to scale up rather than a way to average away pressure.

## Avoid sidecar dilution and hidden resource changes

Pod-wide CPU can combine a busy application with sidecars that have different requests and usage. A `ContainerResource` metric can isolate the application when that better represents capacity. Keep the container name stable across rollouts and verify its request for utilization targets.

Finally, repeat the load test after changes to requests, limits, concurrency settings, or application efficiency. Check time to ready replicas and user outcomes, not just whether the CPU graph looks smoother. A successful adjustment allows the autoscaler to observe useful pressure while each Pod has enough CPU to serve requests within its latency budget.
