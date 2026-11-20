# Read HPA AbleToScale, ScalingActive, and ScalingLimited Conditions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HPA, Autoscaling, Troubleshooting

Description: Read HPA conditions alongside their reasons, metric errors, and target state to identify the failing stage of an autoscaling incident.

---

A service is overloaded, the HPA still shows six replicas, and its conditions contain several `True` values. That is not enough to decide whether scaling works. Each condition answers a different question, and its reason and message carry the operational detail.

Start by saving one complete snapshot before changing thresholds. Replace `production` and `checkout` in the HPA commands with your namespace and HPA name. The Deployment commands assume the target is a Deployment also named `checkout`; use the kind and name from `spec.scaleTargetRef` for your actual target.

```bash
kubectl get hpa checkout -n production -o json > hpa-incident.json
jq '{spec, status}' hpa-incident.json
jq -r '.status.conditions[] |
  [.type, .status, .reason, .message, .lastTransitionTime] | @tsv' \
  hpa-incident.json
kubectl describe hpa checkout -n production
```

Keep the capture time with the file. `lastTransitionTime` records a condition status transition; it is not a timestamp for every metrics fetch or every changed message.

## Read each condition as a separate stage

The [HPA walkthrough](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/#appendix-horizontal-pod-autoscaler-status-conditions) describes the three conditions. Use this operational interpretation:

| Condition | What to investigate |
| --- | --- |
| `AbleToScale` | Can the controller read or update the target's scale, and is stabilization affecting its decision? |
| `ScalingActive` | Can the controller calculate a replica recommendation from the configured metrics? |
| `ScalingLimited` | Was a recommendation constrained by replica bounds or scaling rate rules? |

These are observations from reconciliation, not independent health checks continuously refreshed at the same instant. If reconciliation exits early, another condition can retain an earlier value. Read the associated events and the complete message before interpreting a combination.

## Follow AbleToScale failures to the scale target

`FailedGetScale` points toward the workload reference, API discovery, or access to its scale subresource. Inspect the named Deployment rather than editing the CPU target:

```bash
kubectl get deployment checkout -n production -o json |
  jq '{name: .metadata.name, replicas: .spec.replicas, status: .status}'
kubectl get --raw \
  '/apis/apps/v1/namespaces/production/deployments/checkout/scale'
```

A successful command proves that *your* credentials can read the resource. It does not prove that the controller's credentials can update it. Check controller logs and authorization errors when the target exists but scaling still fails.

`AbleToScale=True` also does not promise an immediate replica change. A reason such as `ScaleDownStabilized` explains that recent recommendations are retaining capacity. The [upstream controller](https://github.com/kubernetes/kubernetes/blob/v1.35.0/pkg/controller/podautoscaler/horizontal.go) sets conditions at specific points in reconciliation, so reasons matter more than a green icon.

## Follow ScalingActive failures to the actual metric API

For a resource metric, inspect Metrics Server and relevant CPU or memory requests. For a Pods or Object metric, inspect the custom metrics adapter. External metrics use a separate API path.

```bash
kubectl get hpa checkout -n production -o json |
  jq '.spec.metrics, .status.currentMetrics'
kubectl get --raw '/apis/metrics.k8s.io/v1beta1/namespaces/production/pods'
kubectl get apiservices
```

Do not route every failure to Metrics Server. `FailedGetExternalMetric` requires investigation of the external adapter and its upstream data source. `AmbiguousSelector` requires checking overlapping HPA targets. For a CPU utilization target, a missing CPU request in a relevant container is a configuration failure, even when CPU samples are available; an `AverageValue` target does not require CPU requests.

For multiple metrics, inspect all metrics and warnings. A successful metric can support scale-up while another fails. Consequently, `ScalingActive=True` is not proof that every configured metric is healthy.

## Explain ScalingLimited using the recommendation

At ten replicas with `maxReplicas: 10`, an above-target metric and `TooManyReplicas` support a capacity-bound diagnosis. A scale-up rate policy can also produce `ScalingLimited=True` below the maximum. Raising `maxReplicas` would not fix that rate limit.

Conversely, being at the maximum does not necessarily produce a limited condition: the recommendation might already equal that maximum. Compare current metrics, target values, bounds, and `spec.behavior` together.

```bash
kubectl get hpa checkout -n production -o json |
  jq '{current: .status.currentReplicas,
       desired: .status.desiredReplicas,
       min: .spec.minReplicas, max: .spec.maxReplicas,
       behavior: .spec.behavior}'
```

## Verify the outcome users need

After correcting the failing stage, watch the HPA, Deployment, and Pods together. An accepted scale update does not mean the new Pods are scheduled, Ready, or receiving traffic. Confirm that the relevant condition reason clears, requested replicas converge to ready capacity, and request latency or backlog improves.

Keep the original snapshot, the change, and the recovery timeline. That evidence distinguishes a repaired metrics pipeline from a temporary traffic drop and makes the next incident much faster to diagnose.
