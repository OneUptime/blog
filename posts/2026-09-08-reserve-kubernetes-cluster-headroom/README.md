# How to Reserve Kubernetes Headroom Without Permanently Idle Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Capacity Planning, Autoscaling, Cluster Autoscaler, Scalability

Description: Combine a small ready reserve, low-priority placeholder Pods, scheduled scaling, and measured provisioning latency to preserve burst capacity only when it is valuable.

---

Kubernetes has two different kinds of headroom: resources already available on Ready nodes and resources the infrastructure can provision later. Only the first can accept a Pod immediately. Keeping all possible burst capacity Ready is expensive; counting future nodes as current capacity is unsafe.

Use a time-based model to choose a small ready reserve and elastic mechanisms for the rest.

## Measure the entire supply delay

Measure from demand change to a useful serving Pod:

```text
HPA metric delay
+ HPA reconciliation
+ scheduler marks Pod unschedulable
+ Cluster Autoscaler detection and decision
+ cloud instance allocation and boot
+ kubelet registration and node readiness
+ image pull and Pod startup
+ application readiness and load-balancer propagation
```

Use p95 or p99 observed delay for the relevant node pool, including scale-from-zero. The Cluster Autoscaler FAQ explains that scale-up begins in response to Pods that cannot schedule and that cloud provisioning is usually the dominant part of HPA plus Cluster Autoscaler response.

Next measure how quickly demand can consume spare service capacity. If the platform can safely serve 8,000 RPS, current demand is 7,000 RPS, and an observed burst rises by 300 RPS each minute, the ready margin lasts only:

```text
time headroom = (8,000 - 7,000) / 300 = 3.33 minutes
```

If p99 supply delay is seven minutes, reactive node scaling alone will be late.

## Keep the minimum reserve tied to an event

Define ready headroom from the largest approved operational scenario. Candidate components include:

- capacity needed through the p99 supply delay for an unpredictable burst;
- capacity lost in the required immediate failure scenario;
- rollout surge that must schedule without waiting for new nodes.

If policy treats those events as mutually exclusive, take the maximum. If a burst must be served during a node failure or rollout, model that coincident scenario and combine its demand and capacity loss. Taking only the largest individual component would understate the reserve.

Reduce it when demand is flat and increase it for known high-risk windows. Express the reserve in Pod shapes and failure domains, not one cluster-wide CPU percentage. Ten free cores fragmented across memory-full nodes may not place a 4-core, 8-GiB Pod.

## Use low-priority placeholder Pods carefully

Cluster Autoscaler can support overprovisioning with low-priority placeholder Pods. These Pods request resources and keep nodes present. When important Pods arrive, Kubernetes preempts the placeholders; the displaced placeholders become unschedulable and prompt Cluster Autoscaler to restore the reserve.

A minimal pattern is:

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: capacity-placeholder
value: -10
globalDefault: false
description: Preemptible cluster headroom
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: capacity-placeholder
spec:
  replicas: 2
  selector:
    matchLabels: {app: capacity-placeholder}
  template:
    metadata:
      labels: {app: capacity-placeholder}
    spec:
      priorityClassName: capacity-placeholder
      terminationGracePeriodSeconds: 0
      containers:
        - name: pause
          image: registry.k8s.io/pause:3.10
          resources:
            requests: {cpu: "2", memory: 4Gi}
```

Pin an approved immutable image digest in production. Match placeholder shapes and topology to the workloads they protect. One generic CPU-heavy placeholder does not reserve memory or a GPU. Spread placeholders so the reserve survives expected zone and node events.

The placeholder priority must remain below real workloads but at or above Cluster Autoscaler's expendable-pod cutoff. The documented default cutoff is `-10`, and Pods below it do not trigger scale-up; verify the flag used by your deployment before copying the example.

These nodes are not free while Ready. The cost benefit comes from keeping a measured small reserve that can shrink, rather than permanently provisioning the worst conceivable peak. Confirm your Cluster Autoscaler and provider behavior in staging, including whether expendable Pods influence scale-down as expected.

## Schedule predictable headroom

For daily peaks, campaigns, and batch windows, raise the node-group minimum or placeholder replica count before the event and lower it afterward. Start by the measured p99 provisioning and warmup lead time. Retain reactive scaling for forecast error.

Where supported, use faster-starting node images, cached images, warm capacity, or provider-specific predictive scaling. Each option has a different cost and readiness guarantee. A service quota permits scale-out but does not reserve physical capacity.

Keep at least one viable node group for every protected Pod shape. Cluster Autoscaler cannot help if a Pod is unschedulable because no group template matches its selectors, affinity, resources, or volume topology.

## Prevent reserve churn

Autoscaler policies can fight the reserve. Protect against this by:

- using a dedicated placeholder PriorityClass that respects the configured autoscaler cutoff, never the default priority;
- giving real services higher priority and correct requests;
- setting scale-down delays long enough for burst recovery;
- avoiding restrictive PodDisruptionBudgets on placeholders;
- checking that placeholder preemption does not trigger application disruption;
- bounding maximum nodes, cost, and placeholder replicas;
- alerting when placeholders remain Pending beyond normal provisioning time.

Track ready headroom by schedulable shape, pending Pods by reason, node provisioning duration, preemption count, time to Ready, time to serving, and cost of reserve node-hours. Review whether each pre-scale window prevented latency or merely added idle time.

## Prove the design

In a representative cluster, begin at the normal minimum, apply the production burst, and observe this sequence:

```text
important Pods created
placeholder Pods preempted
important Pods become Ready within immediate budget
placeholder Pods remain Pending
Cluster Autoscaler adds matching nodes
placeholder reserve becomes Running again
surplus nodes eventually scale down
```

Repeat with one node unavailable and with a cold image. If service latency fails before important Pods are Ready, increase ready reserve, reduce supply delay, or shed load earlier.

## Conclusion

Avoid both extremes: a cluster permanently sized to its annual peak and a cluster that assumes new nodes are instantaneous. Measure end-to-end supply delay, retain a small schedulable reserve for the risks that must be immediate, and restore that reserve with low-priority placeholders and autoscaling. Schedule extra headroom only around predictable windows and continuously compare its reliability value with its node-hour cost.

## Official Documentation

- [Kubernetes Cluster Autoscaler FAQ: overprovisioning](https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md#how-can-i-configure-overprovisioning-with-cluster-autoscaler)
- [Kubernetes: Pod priority and preemption](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/)
- [Kubernetes: Node autoscaling](https://kubernetes.io/docs/concepts/cluster-administration/node-autoscaling/)
- [Kubernetes: Pod topology spread constraints](https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/)
- [Kubernetes: Resource management for Pods and containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
