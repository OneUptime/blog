# How to Configure Per-Direction HPA Tolerance in Kubernetes 1.35 to Filter Metric Noise

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HPA, Autoscaling, Troubleshooting

Description: Configure separate scale-up and scale-down tolerance in Kubernetes 1.35 and verify its interaction with rounding, stabilization, and scaling policies.

---

A noisy metric can make an HPA repeatedly consider tiny changes around its target. Kubernetes 1.35 supports different tolerance values for scale-up and scale-down, letting you ignore small variations while retaining a faster response in the direction that matters most.

The feature is `HPAConfigurableTolerance`. The [Kubernetes 1.35 feature-gate reference](https://v1-35.docs.kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/) lists it as beta and enabled by default. Check your actual API server and controller configuration because distributions can override defaults. Use versioned documentation when evaluating a 1.35 cluster.

## Treat tolerance as a ratio around the target

Tolerance is a relative difference from the target, not a percentage-point change in a utilization target. With a CPU utilization target of 60% and scale-up tolerance of 0.05, the upper threshold is:

```text
60% × (1 + 0.05) = 63%
```

A value exactly at the threshold remains inside the tolerance band in the Kubernetes 1.35 replica calculator. Scaling is considered only beyond it. Integer utilization reporting and replica rounding mean boundary experiments should use measurements clearly inside or outside the band.

With a scale-down tolerance of 0.20, the lower threshold is:

```text
60% × (1 - 0.20) = 48%
```

That creates a wider quiet region on the downward side. It favors retaining capacity when the signal moves slightly below target.

## Configure the two directions explicitly

This example uses CPU `AverageValue` so the target is easy to reason about in millicores. It assumes a Deployment named `checkout` already exists and resource metrics are available:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: checkout
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: checkout
  minReplicas: 4
  maxReplicas: 30
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: AverageValue
          averageValue: 300m
  behavior:
    scaleUp:
      tolerance: "0.05"
      stabilizationWindowSeconds: 0
    scaleDown:
      tolerance: "0.20"
      stabilizationWindowSeconds: 300
      policies:
        - type: Pods
          value: 1
          periodSeconds: 60
```

The tolerance values are Kubernetes quantities; quoted decimal strings make the intended values explicit. An omitted direction uses the controller's configured default tolerance, normally 0.1. Setting one direction does not implicitly copy it to the other.

Validate the manifest against the cluster before applying it:

```bash
kubectl explain hpa.spec.behavior.scaleUp.tolerance --api-version=autoscaling/v2
kubectl apply --dry-run=server -f hpa.yaml
kubectl apply -f hpa.yaml
kubectl get hpa checkout -n production -o json |
  jq '.spec.behavior'
```

Inspect the stored fields and actual controller behavior. API acceptance alone does not demonstrate that every control-plane component is running the expected version or feature configuration.

## Distinguish tolerance from other controls

Tolerance filters the metric ratio. Stabilization considers recommendations over time. Scaling policies constrain how quickly replicas can change. These controls solve different problems and can all affect the same decision.

For the `300m` target above, the tolerance band is `240m` through `315m`. An average of `310m` stays inside. An average of `330m` passes the scale-up tolerance check, but a remaining replica bound can still prevent growth. An average of `210m` passes the scale-down check, but a recent higher recommendation can retain replicas during the stabilization window.

At four replicas, `ceil(4 × 330 / 300)` is five. At ten replicas and `250m`, the ratio is inside the downward tolerance, so the controller keeps ten replicas even though the unfiltered calculation `ceil(10 × 250 / 300)` gives nine.

The [versioned HPA guide](https://v1-35.docs.kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/#tolerance) describes the field, and the [1.35 replica calculator](https://github.com/kubernetes/kubernetes/blob/v1.35.0/pkg/controller/podautoscaler/replica_calculator.go) defines the inclusive comparison.

## Tune from observed noise and available headroom

Measure ordinary metric variation under constant load before choosing values. A very small scale-up tolerance can expose scrape noise or startup artifacts; an overly wide one can delay necessary capacity. Downward tolerance trades resource savings against retaining reserve.

Replay quiet periods, sustained growth, sudden bursts, and load removal. Record the observed metric, expected raw recommendation, resulting desired count, and time to ready capacity. Include a test near `maxReplicas` so the team does not mistake a replica cap for tolerance filtering.

Roll back by removing the custom tolerance fields or restoring their prior values, then verify the effective controller default. Keep the other behavior settings fixed during the experiment so you can attribute the outcome to the tolerance change.
