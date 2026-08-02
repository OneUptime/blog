# Scaling Canary Pods Independently from Traffic Weight with `setCanaryScale`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Rollouts, Kubernetes, Canary Deployment, Traffic Management, setCanaryScale, Progressive Delivery

Description: Use Argo Rollouts setCanaryScale steps to warm, pin, and resize canary capacity independently of routed traffic without overloading the new revision.

---

With a traffic router, “20% canary traffic” and “20% canary pods” are separate decisions. Argo Rollouts normally keeps them aligned, but `setCanaryScale` lets a rollout size the canary ReplicaSet independently from the traffic weight.

That enables useful patterns:

- start canary pods before sending user traffic;
- keep an expensive canary at a fixed small size during verification;
- give a low traffic percentage enough replicas for resilience;
- scale canary capacity ahead of a large traffic increase.

It also creates a new failure mode: one pinned canary pod can be told to receive half of production traffic. Use the feature as capacity control, not merely cost control.

## Traffic Routing Is Required

`setCanaryScale` is supported with `trafficRouting`. Without a traffic manager, Kubernetes Services distribute across ready endpoints and Argo Rollouts approximates weight using the stable/canary pod ratio. Independent pod and traffic control is not available in that model.

A routed canary has distinct Services and a provider:

```yaml
strategy:
  canary:
    stableService: payments-stable
    canaryService: payments-canary
    trafficRouting:
      istio:
        virtualService:
          name: payments
        destinationRule:
          name: payments
          canarySubsetName: canary
          stableSubsetName: stable
```

Use the provider's official integration manifest; Service and route details vary between Istio, NGINX, ALB, Gateway API plugins, and other routers.

## Choose One of Three Scale Forms

The Rollout specification documents three `setCanaryScale` forms.

### Pin an Absolute Replica Count

```yaml
- setCanaryScale:
    replicas: 2
```

This keeps two canary pods regardless of the current traffic weight or total desired replicas. It is useful for warm-up and deterministic smoke testing.

### Scale by a Percentage of Desired Replicas

```yaml
- setCanaryScale:
    weight: 25
```

This sets canary capacity from the Rollout's desired replicas and the specified scale weight. It does **not** change routed traffic. The scale calculation uses the provider's maximum traffic weight, which defaults to 100 when not otherwise defined.

### Return to Traffic-Matched Scaling

```yaml
- setCanaryScale:
    matchTrafficWeight: true
```

This removes the independent scale instruction and makes canary capacity follow the current traffic weight again.

## Warm the Canary Before Exposure

A practical sequence creates capacity, verifies it, and only then sends traffic:

```yaml
strategy:
  canary:
    stableService: payments-stable
    canaryService: payments-canary
    trafficRouting:
      istio:
        virtualService:
          name: payments
        destinationRule:
          name: payments
          canarySubsetName: canary
          stableSubsetName: stable
    steps:
      - setCanaryScale:
          replicas: 2
      - pause:
          duration: 2m
      - analysis:
          templates:
            - templateName: payments-preview-smoke
      - setWeight: 5
      - pause:
          duration: 10m
      - setCanaryScale:
          replicas: 4
      - setWeight: 25
      - pause:
          duration: 10m
      - setCanaryScale:
          matchTrafficWeight: true
      - setWeight: 50
```

The first two pods can receive direct smoke-test traffic through the canary Service while the managed production route remains at its preceding weight. Before the 25% step, capacity rises to four pods so the weight change does not suddenly overload the original two.

Test the exact initial route behavior for your provider and keep the route definition under review. A `setCanaryScale` step changes replicas only; it is not itself a traffic switch.

## Calculate Load per Canary Pod

Suppose the Rollout normally serves 2,000 requests per second with 20 pods. At `setWeight: 20`, the canary receives about 400 requests per second.

- With `replicas: 1`, that pod sees about 400 requests per second.
- With four canary pods, each sees about 100 requests per second before unevenness and connection behavior.

The one-pod canary is cheap but may be testing overload rather than application correctness. It also has no redundancy: a restart temporarily removes the entire canary endpoint set.

Choose replica count from expected routed load, per-pod safe capacity, startup latency, availability requirements, and test design. Monitor traffic and saturation by `rollouts-pod-template-hash`, not only service-wide averages.

## Combine Carefully with HPA

An HPA targets the Rollout and changes its total desired replicas. An absolute `setCanaryScale.replicas` keeps canary fixed while the remaining autoscaled capacity is allocated to stable, as described in the Argo Rollouts HPA guide.

That can isolate canary cost, but the HPA may still calculate resource metrics across stable and canary pods. A hot canary can drive total scale-up while staying pinned itself, causing stable capacity to grow. This is expected from one autoscaling target.

A percentage `setCanaryScale.weight` changes canary capacity as total desired replicas change. Decide whether fixed or proportional capacity better matches the release risk.

## Distinguish `dynamicStableScale`

`dynamicStableScale` controls whether stable capacity decreases as routed traffic shifts toward canary. It is a strategy-level option, not a replacement for `setCanaryScale`.

Keeping stable fully scaled provides fast abort capacity but can temporarily approach double resource usage. Dynamically reducing stable saves resources but requires stable to scale back up as abort shifts traffic. The canary scale step independently controls new-revision capacity.

Size cluster and namespace quota for the combination of stable, canary, surge, and any analysis Jobs.

## Diagnose a Scale/Weight Mismatch

```bash
kubectl argo rollouts get rollout payments
kubectl get rollout payments -o yaml
kubectl get rs -l app=payments \
  -L rollouts-pod-template-hash
```

Compare:

- current step and `setWeight`;
- actual router weight;
- canary and stable desired/available replicas;
- an active `setCanaryScale` instruction;
- total desired replicas from HPA;
- provider route configuration and Service selectors.

Do not manually scale the ReplicaSet to correct the mismatch. Argo Rollouts owns it and will reconcile toward the declared step.

End independent scaling with `matchTrafficWeight: true` when that is the intended progression. Otherwise later traffic weights can continue using a forgotten fixed canary count.

## Official Documentation

- [Argo Rollouts: Canary Strategy and Dynamic Canary Scale](https://argo-rollouts.readthedocs.io/en/stable/features/canary/)
- [Argo Rollouts: Rollout Specification](https://argo-rollouts.readthedocs.io/en/stable/features/specification/)
- [Argo Rollouts: Traffic Management](https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/)
- [Argo Rollouts: Horizontal Pod Autoscaling](https://argo-rollouts.readthedocs.io/en/stable/features/hpa-support/)

