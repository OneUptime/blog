# How to Recalculate an HPA Replica Decision by Hand from Current Metrics and Resource Requests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HPA, Autoscaling, Troubleshooting

Description: Reconstruct an HPA CPU recommendation from matching Pod metrics and requests, then account for tolerance, missing samples, and scaling policies.

---

An HPA recommendation becomes easier to explain when you can reproduce its arithmetic. The useful result is a staged calculation: first derive a recommendation from the measurements, then explain why the controller accepted or constrained it.

This example uses four healthy, Ready Pods, each with one application container, complete CPU samples, and a `500m` CPU request. There are no Pod-level resource requests or sidecars. That deliberately simple setup makes the first calculation unambiguous.

## Capture the inputs together

Read the HPA and its target selector. Query Pod requests and the metrics API as close together as possible:

```bash
kubectl get hpa checkout -n production -o json > hpa.json
kubectl get deployment checkout -n production -o json |
  jq '.spec.selector, .spec.replicas'
kubectl get pods -n production -l app=checkout -o json > pods.json
kubectl get --raw \
  '/apis/metrics.k8s.io/v1beta1/namespaces/production/pods?labelSelector=app%3Dcheckout' \
  > metrics.json
jq '.items[] | {pod: .metadata.name, timestamp, window, containers}' metrics.json
```

Confirm the label selector matches the target, including any `matchExpressions`. Do not infer membership from a Pod name prefix. Record measurement timestamps and windows: independently refreshed dashboard and API values need not describe the same instant.

The [resource metrics pipeline documentation](https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/) explains that CPU is an average rate over the reported window. A dashboard using a five-minute rate can legitimately disagree with a shorter metrics sample.

## Calculate utilization and the raw recommendation

Suppose the four CPU measurements are `300m`, `400m`, `450m`, and `450m`. Total usage is `1600m`; total requests are `2000m`. With a 60% utilization target:

```text
current utilization = 100 × 1600 / 2000 = 80%
usage ratio         = 80 / 60 = 1.3333...
raw desired replicas = ceil(4 × 80 / 60) = 6
```

For this example, a Python calculation is sufficient:

```python
from math import ceil

usage_m = [300, 400, 450, 450]
request_m = [500, 500, 500, 500]
target_percent = 60
utilization = (sum(usage_m) * 100) // sum(request_m)
raw_replicas = ceil(len(usage_m) * utilization / target_percent)
assert utilization == 80
assert raw_replicas == 6
print(utilization, raw_replicas)
```

The integer division reflects the utilization percentage used by the [upstream utilization calculation](https://github.com/kubernetes/kubernetes/blob/v1.35.0/pkg/controller/podautoscaler/metrics/utilization.go). When requests differ across Pods, calculate total usage divided by total matching requests; averaging each Pod's percentage equally can give a different answer.

CPU quantities need proper unit conversion. A resource metrics response may use nanocores (`n`), while requests commonly use millicores (`m`). One core equals `1000m` or `1000000000n`. Never add the numeric portions of unlike quantities.

## Check which requests actually apply

A `Resource` metric measures Pod resources. In configurations without Pod-level requests, relevant container requests contribute to the denominator. In Kubernetes versions supporting Pod-level resources, an applicable Pod-level request can supply that denominator. A `ContainerResource` metric instead uses the named container's request and usage.

The [replica calculator implementation](https://github.com/kubernetes/kubernetes/blob/v1.35.0/pkg/controller/podautoscaler/replica_calculator.go) is useful when a Pod contains sidecars or newer resource features. Missing requests and missing samples are different cases; supplying an imaginary request to finish your spreadsheet does not reproduce controller behavior.

## Apply the decision gates

Check the effective tolerance. At the usual 10% tolerance, a ratio of 1.05 does not trigger scale-up even if rounding could suggest another Pod. Our 1.333 ratio is outside that band.

Next account for Pod eligibility. Terminating and failed Pods, missing samples, and CPU initialization handling can change the population or conservatively adjust the recommendation. If those cases exist, mark the simple six-replica result as an estimate until you reproduce those adjustments.

If another metric recommends eight replicas, the HPA chooses the larger recommendation. An unavailable metric can block scale-down when available metrics only recommend fewer Pods. Finally inspect `minReplicas`, `maxReplicas`, stabilization, and rate policies. A policy permitting only one additional Pod in the current interval can turn a raw recommendation of six into an allowed size of five.

## Compare the right outputs

`status.currentMetrics` reports observed metrics, not every synthetic value used for conservative adjustments. `status.desiredReplicas` reflects the controller's resulting desired scale, not a permanent history of unconstrained recommendations.

Write down the measured inputs, raw answer, and limiting rule separately. Then repeat the capture after a stable interval. Agreement across repeated samples is a stronger verification than forcing one rounded dashboard number to match one HPA status update.
