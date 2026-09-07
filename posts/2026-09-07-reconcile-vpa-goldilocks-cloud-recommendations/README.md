# Reconciling VPA, Goldilocks, and Cloud Rightsizing Advice

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Rightsizing, Vertical Pod Autoscaler, Capacity Planning

Description: Normalize recommendation scope, history, metrics, and safety constraints before deciding among VPA, Goldilocks, and cloud-provider sizing advice.

---

Rightsizing tools can disagree without any of them being broken. A VerticalPodAutoscaler may recommend container requests, Goldilocks may display those VPA recommendations, and a cloud tool may optimize a node or VM from a different lookback period. They are answering different questions.

Do not average the numbers. Normalize their scope and assumptions first.

## Identify what generated each number

Kubernetes VPA has a recommender that analyzes current and historical CPU and memory consumption. Its status can expose a target, lower bound, and upper bound per container. Update policy and resource policy determine whether and how recommendations are applied. With `updatePolicy.updateMode: Off`, the recommender continues to publish status but VPA does not apply the values to Pods.

Goldilocks is not an independent statistical oracle. Its documented design creates VPAs in recommendation mode for workloads and presents their output in a dashboard. Differences between a Goldilocks view and another VPA object can come from target selection, policy, namespace configuration, collection time, or recommender setup.

Cloud recommendations may operate at another layer. A managed Kubernetes service might suggest pod requests, while Compute Optimizer or an infrastructure advisor may recommend VM or node shapes. A low-utilization node can still be the correct host for pods with high requests, affinity constraints, or an availability reserve.

## Build a comparison record

Capture enough provenance to reproduce every candidate:

```yaml
workload: payments/ledger-api
container: application
current_request:
  cpu: 750m
  memory: 1Gi
recommendations:
  - source: vpa
    observed_at: 2026-09-07T09:00:00Z
    target_cpu: 420m
    target_memory: 780Mi
    lower_cpu: 200m
    upper_cpu: 1100m
  - source: cloud-pod-advisor
    observed_at: 2026-09-07T10:00:00Z
    target_cpu: 500m
    target_memory: 896Mi
constraints:
  hpa_metric: cpu-utilization
  min_replicas: 4
  memory_limit: 1536Mi
```

Also record lookback, sampling interval, deployment versions, included OOM events, replica aggregation, update mode, and min/max bounds. If a tool does not reveal an assumption, mark it unknown rather than inventing one.

## Normalize the unit and target

Compare container request to container request, not pod sum to main-container demand. Keep CPU in cores or millicores and memory in bytes. Distinguish a requested resource from a hard limit and from a node's provisioned capacity.

Reconstruct the full pod:

```text
pod request = application containers + running sidecars
effective scheduling request also accounts for init behavior and pod overhead
```

Then model desired HPA replicas. A smaller CPU request raises utilization for the same CPU usage and can produce more replicas. A VPA target that is sensible in isolation can alter the horizontal control loop.

The upstream VPA project currently warns against using VPA and HPA on the same CPU or memory metric. If HPA scales on CPU utilization while VPA changes the CPU request denominator, the two controllers can chase each other. Keep VPA in `Off` mode for analysis, or make HPA use a different custom or external demand metric before enabling automatic VPA updates.

Also check the resource model before comparing output. Kubernetes Pod-level resources are beta, but upstream VPA support for recommending and applying Pod-level budgets is still under development. The VPA admission controller can produce container requests that exceed a Pod-level request or limit and prevent a Pod from being created. Treat container-level VPA output as advisory for such workloads until the installed VPA version explicitly supports the Pod-level fields and the combination has been tested.

## Explain disagreements with a fixed checklist

### Different history

One source may have seen a release, monthly job, or failover that another missed. Align dates and configuration epochs. Give recent stable production data more weight, while retaining known seasonal requirements.

### Different aggregation

One hot shard disappears in an average across replicas. Compare per-container distributions and identify whether the recommendation protects the hottest legitimate replica.

### Different objectives

VPA targets pod resources. A node advisor optimizes infrastructure. One may favor safety while another maximizes savings. Compare predicted performance risk and bounds, not just the smallest number.

### Different constraints

VPA resource policies can define `minAllowed`, `maxAllowed`, controlled resources, and whether it changes requests only or requests and limits. LimitRanges and quotas can further constrain the applied value. Cloud tools may restrict candidates by region, architecture, storage, or machine family.

### Missing signals

CPU and memory do not describe queue depth, latency, network bandwidth, storage IOPS, connection limits, or GPU memory. A recommendation that omits the actual bottleneck is incomplete.

## Select a candidate through testing

Use recommendations to narrow the search, then test at least three points: current, conservative, and aggressive. A simple rule is to start near the highest well-supported target when memory risk is high, or near the median target when the workload is stateless and rapidly scalable.

Validate:

- application latency, errors, and throughput;
- CPU throttling and saturation;
- working set, OOMs, and garbage collection;
- HPA replica and node behavior;
- scheduling failures and evictions;
- cost per successful request or job.

Set VPA to `updateMode: Off` first when eviction or in-place change has not been proven safe for that workload. Use resource policy bounds to prevent a recommendation from crossing known operational limits.

## Keep the decision independent of the dashboard

Store the chosen value, rejected alternatives, evidence, owner, and expiry in version control or a change system. Tool outputs refresh and may disappear. A durable decision record explains why 500m was selected even if tomorrow's dashboard says 430m.

## Conclusion

VPA, Goldilocks, and cloud tools often differ because their inputs, layers, and objectives differ. Preserve provenance, normalize units and scope, model HPA and scheduling effects, and test several candidates against service outcomes. Choose the best-supported safe value, not the numerical average.

## Official Documentation

- [Kubernetes Vertical Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/)
- [Upstream VPA documentation and Pod-level resource warning](https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler)
- [Upstream VPA known limitations](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/known-limitations.md)
- [Kubernetes autoscaling overview](https://kubernetes.io/docs/concepts/workloads/autoscaling/)
- [Fairwinds Goldilocks project](https://github.com/FairwindsOps/goldilocks)
- [GKE Vertical Pod Autoscaling](https://cloud.google.com/kubernetes-engine/docs/concepts/verticalpodautoscaler)
