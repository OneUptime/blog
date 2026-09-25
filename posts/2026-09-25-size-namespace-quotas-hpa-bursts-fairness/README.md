# How to Size Namespace Quotas for HPA Bursts and Multi-Tenant Fairness

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, ResourceQuota, HPA, Capacity Planning

Description: Budget namespace quota for autoscaling, rollout overlap, and shared workloads while keeping tenant entitlements within an explicit capacity policy.

---

An HPA can request twenty replicas while a namespace quota admits only twelve. Adding nodes will not fix that admission failure. Conversely, raising every tenant's quota to the cluster's full capacity can leave all tenants competing for resources that were never reserved for them.

Size the namespace budget from workload scenarios, then check the combined budgets against the cluster's capacity policy. This example assumes ordinary container CPU and memory requests and a Deployment managed by an HPA.

## Inventory the demand that quota actually counts

Collect the policy and the workloads before choosing a number:

```bash
namespace=payments
kubectl -n "$namespace" get resourcequota,limitrange -o yaml
kubectl -n "$namespace" get hpa,deploy,statefulset,job
kubectl -n "$namespace" get pods -o json > pods.json
```

Use declared requests after defaults and admission mutation. CPU usage from `kubectl top` is not the CPU request charged to quota. Include injected sidecars, relevant init-container accounting, and Pod overhead. For more complex Pods, use accounting compatible with the cluster version rather than blindly summing every container. The [resource-management documentation](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/) describes these distinctions.

List all applicable quotas separately. A Pod might consume both a namespace-wide budget and a PriorityClass-scoped budget. Passing one does not exempt it from another. Keep CPU requests, memory requests, limits, Pod count, and storage as distinct dimensions.

## Model the autoscaling and rollout peak

The HPA's maximum replica count describes the scale target, not a quota reservation. Its [control loop](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/) adjusts the desired scale using configured metrics and behavior. Controllers still need to create the resulting Pods.

Consider an illustrative service with these inputs:

| Input | Value |
| --- | ---: |
| HPA maximum | 20 replicas |
| Per-Pod CPU request, including sidecar | 600m |
| Per-Pod memory request | 768Mi |
| Deployment maximum surge | 25%, or 5 Pods at this scale |
| Additional terminating overlap to budget | 3 Pods |
| Other namespace workloads | 2 CPU, 2Gi, 4 Pods |

The screening calculation is 28 service Pods during the modeled overlap. That requires 18.8 CPU, 23Gi memory, and 32 Pods including the other workloads. These are worked-example inputs, not Kubernetes defaults or a universal recommendation.

The [Deployment documentation](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) explains percentage rounding and why terminating Pods can temporarily take total resource consumption beyond replicas plus surge. Measure termination duration and concurrent rollout behavior. Three extra Pods is a chosen scenario, not a hard upper bound.

Repeat the calculation for limits if quota constrains `limits.cpu` or `limits.memory`. A budget derived from requests cannot prove a limits quota will pass. Include Jobs and maintenance tasks that may coincide with the burst.

## Turn the scenario into an explicit entitlement

A policy slightly above that example's modeled peak could be:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: payments-budget
  namespace: payments
spec:
  hard:
    requests.cpu: "20"
    requests.memory: 25Gi
    pods: "36"
```

The remaining margin is small and deliberate. Record why it is sufficient, who can change it, and which maintenance operations it covers. Protect modification and deletion of the quota through RBAC or admission policy; a tenant that can remove its own enforced ceiling is not bounded by that ceiling.

Avoid routinely increasing HPA `maxReplicas` without updating this model. If the twenty-replica scenario is unaffordable, lower the agreed maximum, reduce tested requests, or change the service's scaling strategy. Do not set an unattainable maximum and rely on repeated admission failures as normal operation.

## Check fairness at cluster level

[ResourceQuota](https://kubernetes.io/docs/concepts/policy/resource-quotas/) limits admission within a namespace; it does not reserve nodes. If aggregate quotas exceed capacity, tenants can encounter contention. Kubernetes [multi-tenancy guidance](https://kubernetes.io/docs/concepts/security/multi-tenancy/) treats quotas as one part of a wider isolation design.

Choose whether tenants receive guaranteed simultaneous entitlements or share an explicitly oversubscribed pool. For guarantees, budget node allocatable resources after system workloads and the required node or zone failure. Then check placement constraints: a GPU workload or zone-bound volume cannot use arbitrary free CPU elsewhere.

For a shared pool, document burst access, priority, and overload behavior. A high PriorityClass can preempt other tenants and needs its own governance; it is not a substitute for capacity planning.

## Exercise the agreed peak

In a controlled environment, drive the HPA upward while performing the expected rollout and background work. Observe desired versus available replicas, ReplicaSet `FailedCreate` events, quota usage, scheduling failures, and latency. An admitted but Pending Pod indicates a different gate from a quota-rejected creation.

Revisit the model after changes to sidecars, requests, termination grace periods, HPA maxima, or tenant population. A useful quota is a maintained workload budget whose burst assumptions and fairness promises can both be demonstrated.
