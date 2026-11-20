# Handle Missing Metrics from New, Unready, and Terminating Pods in HPA Decisions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HPA, Autoscaling, Troubleshooting

Description: Explain how HPA classifies missing, initializing, and terminating Pods, including the conservative CPU utilization fallback that changes replica recommendations.

---

During a rollout or scale-out, the HPA rarely sees a perfectly complete set of measurements. New Pods may not have a sample yet, initializing Pods may be unready, and terminating Pods may still appear in monitoring. These cases do not all mean zero usage, and they do not all receive the same treatment.

To explain a decision, reconstruct the selected Pod population before applying the familiar ratio formula.

## Capture Pod state and metrics together

```bash
kubectl get pods -n production -l app=checkout -o json > pods.json
kubectl get --raw \
  '/apis/metrics.k8s.io/v1beta1/namespaces/production/pods?labelSelector=app%3Dcheckout' \
  > metrics.json
jq '.items[] | {name: .metadata.name,
    deleting: .metadata.deletionTimestamp,
    phase: .status.phase, start: .status.startTime,
    ready: [.status.conditions[]? | select(.type == "Ready")]}' pods.json
jq '.items[] | {name: .metadata.name, timestamp, window, containers}' metrics.json
```

Use the actual scale target selector. Compare sample timestamps and windows with Ready transitions; a sample present in the API can still be unsuitable for a startup CPU calculation.

## Classify CPU resource inputs carefully

For CPU resource calculations, the [Kubernetes 1.35 replica calculator](https://github.com/kubernetes/kubernetes/blob/v1.35.0/pkg/controller/podautoscaler/replica_calculator.go) distinguishes these cases:

| Pod state | Relevant treatment |
| --- | --- |
| Deletion timestamp or failed phase | Excluded from the resource calculation |
| Pending | Classified as not ready |
| No metric sample | Set aside as missing |
| CPU startup/readiness sample fails eligibility checks | Set aside as not ready |
| Eligible sample with required requests | Participates in the observed calculation |

The CPU initialization logic uses the Pod's start time, Ready condition, and sample window. Within the initialization period, a Ready Pod can contribute when its sample window lies after the relevant Ready transition. This is not a universal rule that every new Pod is ignored for five minutes.

Memory and custom metrics do not inherit all CPU-specific readiness filtering. Object and external metrics follow different calculation paths; do not apply this table as an exact algorithm for every metric source.

## Understand conservative missing-sample assumptions

For scale-up, missing samples are conservatively treated as zero in the recalculation. CPU Pods classified as not yet ready can also dampen an upward recommendation. This avoids assuming that newly requested capacity is already busy when it has not produced usable measurements.

For scale-down, the synthetic value depends on the metric calculation. Raw average-value calculations use the target for a missing Pod. For CPU or memory **utilization**, Kubernetes 1.35 uses the greater of 100% of the request and the configured utilization target.

That implementation detail matters when the target is below 100%. Suppose four Ready Pods each request `500m`, the CPU target is 50%, and three samples each show `100m`. One Pod has no sample:

```text
Observed utilization = 300m / 1500m = 20%
Missing Pod fallback = 100% × 500m = 500m
Adjusted utilization = (300m + 500m) / 2000m = 40%
Adjusted recommendation = ceil(4 × 40 / 50) = 4
```

Simply pretending the missing Pod used zero would suggest too much scale-down. The implementation's conservative recalculation retains all four in this example.

The [algorithm overview](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/#algorithm-details) explains the broader safety behavior. Use source for your Kubernetes release when reproducing exact utilization fallback arithmetic.

## Explain why status can look inconsistent

`status.currentMetrics` reports the original observed value rather than every synthetic adjustment. Seeing 20% against a 50% target alongside four desired replicas can therefore be consistent with the example above.

The controller also avoids changes when the adjusted ratio falls inside tolerance or reverses the initial scaling direction. Bounds, stabilization, rate policies, and another metric's recommendation can constrain the final decision after these calculations.

A whole metric failure is different from one missing Pod sample. With several configured metrics, an unavailable metric can block scale-down when the available metrics only recommend fewer replicas. Another healthy metric can still support scale-up.

## Repair the missing data rather than filling it with guesses

For new Pods, measure how long discovery and collection take. For persistent gaps, inspect node collection failures, adapter selectors, container name changes, authorization, and metric freshness. Verify required resource requests separately; a missing request is not a sample that the controller can safely invent.

Emit genuine zero values for healthy idle custom-metric producers, but report unavailable measurements as unavailable. Treating exporter failure as zero can turn a monitoring outage into an unsafe capacity reduction.

## Verify recovery during lifecycle changes

Test Pod creation, readiness flapping, metric loss, and graceful termination under steady demand. Compare the selected Pods, eligible samples, observed utilization, adjusted estimate, and final desired count. Then restore the missing source and confirm normal scaling resumes.

Keep application latency and ready capacity on the same timeline. The conservative rules protect against uncertain measurements; they do not replace enough initial capacity or a reliable metrics pipeline.
