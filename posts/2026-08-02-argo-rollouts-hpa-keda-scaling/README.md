# Argo Rollouts with HPA or KEDA: Preventing Unexpected Replica Scale-Ups and Scale-Downs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Rollouts, Kubernetes, HPA, KEDA, Autoscaling, Canary Deployment, Progressive Delivery

Description: Combine Argo Rollouts with HPA or KEDA by scaling the Rollout resource, understanding ReplicaSet allocation, and stabilizing capacity during progressive delivery.

---

An autoscaler and Argo Rollouts can cooperate cleanly when they own different decisions:

- HPA or KEDA decides the **total desired replica count** for the application.
- Argo Rollouts decides how that total is allocated across stable and canary ReplicaSets during an update.

Problems begin when the autoscaler targets an underlying ReplicaSet, two autoscalers target the same Rollout, Git continuously forces `.spec.replicas`, or canary metrics unexpectedly drive scaling for the whole application.

## Target the Rollout, Not Its ReplicaSets

Argo Rollouts exposes the Kubernetes `/scale` subresource. A standard HPA should reference the `Rollout` object:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: payments
spec:
  scaleTargetRef:
    apiVersion: argoproj.io/v1alpha1
    kind: Rollout
    name: payments
  minReplicas: 4
  maxReplicas: 40
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 65
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 20
          periodSeconds: 60
      selectPolicy: Min
```

The HPA reads Rollout scale status and writes the Rollout's desired replica count. Argo Rollouts then scales its owned ReplicaSets according to the current strategy and step. Never target the stable or canary ReplicaSet directly; those resources are transient and fully controller-managed.

For CPU or memory utilization, set realistic container resource requests. HPA cannot calculate utilization reliably for containers lacking the relevant request.

## KEDA Uses the Same Boundary

KEDA can scale a custom resource that implements `/scale`; its official documentation names Argo Rollout as an example. Point the `ScaledObject` to the Rollout explicitly:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: payments-queue
spec:
  scaleTargetRef:
    apiVersion: argoproj.io/v1alpha1
    kind: Rollout
    name: payments
  pollingInterval: 30
  cooldownPeriod: 300
  minReplicaCount: 4
  maxReplicaCount: 40
  advanced:
    horizontalPodAutoscalerConfig:
      behavior:
        scaleDown:
          stabilizationWindowSeconds: 300
          policies:
            - type: Percent
              value: 20
              periodSeconds: 60
  triggers:
    - type: prometheus
      metadata:
        serverAddress: http://prometheus.monitoring.svc:9090
        metricName: payments_queue_depth
        query: sum(payments_queue_depth)
        threshold: "100"
```

KEDA creates and manages an HPA for the target. Do not also create a separate HPA for the same Rollout unless a documented design coordinates ownership; competing controllers can keep overwriting the desired replica count.

KEDA scale-to-zero is useful for event workers, but a production HTTP Rollout often needs a nonzero floor. Test activation, readiness, traffic routing, and an in-progress or paused release before setting `minReplicaCount: 0`.

## Understand Which Pods Feed the Metric

During a canary, stable and canary pods share the Rollout selector. A single HPA using average pod CPU or memory normally observes both ReplicaSets as one population.

That creates an important feedback path: if the canary has a CPU regression, the average can rise and HPA increases the **total** Rollout replica count. Argo Rollouts then allocates that larger total across revisions. The stable version may scale up because the canary is inefficient.

This is not HPA confusing two Deployments. It is the expected result of autoscaling one application target. Monitor per-revision metrics using the `rollouts-pod-template-hash` label so the canary problem is visible even though the scaling signal is aggregated.

For event metrics, make sure the quantity is compatible with per-replica scaling. A queue-depth trigger for the whole service is often safer than a metric whose canary and stable instances report incompatible semantics.

## Traffic Weight and Replica Count Are Different with a Router

Without a traffic router, Argo Rollouts approximates canary weight by pod ratio. When HPA changes the total, the controller recalculates stable and canary replica counts, subject to integer rounding.

With Istio, NGINX, ALB, Gateway API, or another supported router, traffic weight is independent of pod ratio. A single canary pod can receive 20% of traffic while many stable pods receive 80%. That flexibility can overload the canary unless capacity is planned deliberately.

Use `setCanaryScale` to pin or size canary capacity independently when traffic routing is enabled:

```yaml
steps:
  - setCanaryScale:
      replicas: 2
  - setWeight: 10
  - pause:
      duration: 10m
  - setCanaryScale:
      matchTrafficWeight: true
  - setWeight: 50
```

The HPA still changes the Rollout total. Argo Rollouts' HPA documentation explains how pinned canary replicas leave the remaining autoscaled capacity for stable. Load-test the chosen canary pod count against its routed request share.

For blue-green, both active and preview ReplicaSets can scale with the Rollout total. `previewReplicaCount` pins preview capacity when a full duplicate is unnecessary, reducing cost while keeping stable capacity responsive to HPA.

## Keep Git from Fighting the Autoscaler

An autoscaler continuously changes `.spec.replicas`. If Argo CD or another GitOps controller repeatedly applies a fixed value, the workload can oscillate between the manifest count and the calculated count.

Configure the GitOps application to ignore autoscaler-owned replica drift, and make the sync operation respect that exclusion. Keep `minReplicas` and `maxReplicas` in Git as the durable capacity boundaries.

Also avoid manual `kubectl scale rollout` changes during diagnosis: the autoscaler will normally replace them on its next reconciliation. To hold capacity, change or pause the autoscaling policy through a documented operational path.

## Prevent Destructive Scale-Down During a Release

The Kubernetes HPA supports separate scale-up and scale-down behavior. For production rollouts:

- use a downscale stabilization window;
- limit the percentage or number of pods removed per interval;
- choose a minimum that preserves stable capacity and availability;
- align PodDisruptionBudgets, resource quotas, and cluster autoscaling;
- consider temporarily disabling scale-down—not scale-up—during a high-risk migration when policy allows it;
- keep readiness and startup probes accurate so new capacity is not counted too early.

The Rollout's `maxSurge`, `maxUnavailable`, traffic-routing scale behavior, and autoscaler maximum can briefly produce more pods than the steady-state desired count. Size namespace quota and nodes for rollout surge as well as the HPA maximum.

## Diagnose Unexpected Scaling

```bash
kubectl describe hpa payments
kubectl get hpa payments -o yaml
kubectl argo rollouts get rollout payments
kubectl get rs,pods -l app=payments \
  -L rollouts-pod-template-hash
```

Check HPA conditions and events for metric errors, current versus desired replicas, the metric value selected across multiple metrics, KEDA ScaledObject conditions, and the current Rollout step. Then identify every writer of `.spec.replicas` through managed fields.

A stable design has one autoscaling owner, one Rollout owner for ReplicaSets, and an explicit capacity policy for both the steady state and the transition.

## Official Documentation

- [Argo Rollouts: Horizontal Pod Autoscaling](https://argo-rollouts.readthedocs.io/en/stable/features/hpa-support/)
- [Argo Rollouts: Canary Strategy](https://argo-rollouts.readthedocs.io/en/stable/features/canary/)
- [Argo Rollouts: Rollout Specification](https://argo-rollouts.readthedocs.io/en/stable/features/specification/)
- [Kubernetes: Horizontal Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/)
- [Kubernetes: HPA v2 API](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/horizontal-pod-autoscaler-v2/)
- [KEDA: Scaling Custom Resources](https://keda.sh/docs/latest/concepts/scaling-deployments/)
- [KEDA: ScaledObject Specification](https://keda.sh/docs/latest/reference/scaledobject-spec/)

