# Validation Summary: How to Keep HPA and Cluster Autoscaler from Reacting Too Late to Burst Traffic

## Status
validated

## Post Type
Technical guide with HPA configuration and capacity-planning examples.

## Technologies Covered
- Kubernetes scheduling, Pod readiness, resource requests, and container startup
- Horizontal Pod Autoscaler (HPA), autoscaling/v2, and workload metrics
- Cluster Autoscaler, node groups, and capacity reservations
- Pod priority and preemption
- Overload protection, retry budgets, and latency percentiles

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes configurable scaling behavior (the original task URL redirects to the concepts page): https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/#configurable-scaling-behavior
- Kubernetes Node Autoscaling: https://kubernetes.io/docs/concepts/cluster-administration/node-autoscaling/
- Cluster Autoscaler FAQ: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md
- Cluster Autoscaler FAQ raw source, including overprovisioning and priority cutoff details: https://raw.githubusercontent.com/kubernetes/autoscaler/master/cluster-autoscaler/FAQ.md
- Kubernetes Pod Priority and Preemption: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes Overprovision Node Capacity: https://kubernetes.io/docs/tasks/administer-cluster/node-overprovisioning/
- Kubernetes Pod Lifecycle and probes: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#container-probes
- Kubernetes Images and pre-pulled images: https://kubernetes.io/docs/concepts/containers/images/#pre-pulled-images
- Google SRE, Addressing Cascading Failures: https://sre.google/sre-book/addressing-cascading-failures/
- Prometheus Histograms and Summaries, quantile aggregation limitations: https://prometheus.io/docs/practices/histograms/
- Author profile link: https://github.com/nawazdhandala

## Issues Found
1. **Overbroad scheduling claim.** The post said autoscaling cannot fix a host-port conflict. An additional compatible node can provide the free port. Corrected this and clarified that volume topology blocks scaling only when no candidate node can satisfy it.
2. **Placeholder preemption and replenishment.** Preempted Pods terminate rather than becoming pending again, and termination can delay scheduling. Specified Deployment-managed replacements, a short or zero grace period, and priority at or above the configured expendable-Pod cutoff. Below that cutoff, pending placeholders do not trigger scale-up. Clarified that reserved node resources still leave application startup and readiness delay.
3. **End-to-end percentile accounting.** The example presented the sum of stage p99 values as total p99 and omitted demand-to-metric delay. Percentiles are not additive in general. Added that stage, explicitly required measuring complete reaction durations, and updated the illustrative total and gap to 380 seconds and 170 seconds.
4. **Time-to-exhaustion assumptions.** Clarified that the headroom divided by demand-growth formula assumes approximately constant positive growth and fixed serving capacity; it is not a general prediction for arbitrary bursts.
5. **Configuration placement.** Clarified that the behavior fragment belongs under the HPA spec, so it is not mistaken for a standalone resource manifest.

## Review Notes
- Verified the HPA ratio, resource-request denominator, missing-metric handling, startup CPU considerations, and use of multiple metrics against the HPA documentation.
- The behavior fields and values are supported by autoscaling/v2. Max selects the more permissive policy; periodSeconds is a rolling lookback, not the controller polling interval. The 300-second downscale window stabilizes recommendations and is not a guarantee of gradual removal afterward. The example is not necessarily faster than default scale-up for every replica count.
- Verified that Cluster Autoscaler uses scheduling feasibility and resource requests, subject to node-group limits and provider capacity. Running Pod CPU alone does not trigger its provisioning path.
- Retry limits, randomized backoff, bounded queues, and load shedding agree with Google SRE guidance. Leading metrics must be calibrated to workload capacity; backlog divided by drain time has throughput units, so its target must use compatible units.
- The timeline is the path requiring additional nodes; existing capacity skips node provisioning. Timing values are illustrative, not measured benchmark results.
- All supplied reference URLs and the author URL resolve to the intended resources; the older HPA task URL redirects successfully. No deprecated API is used in the snippet. Provider settings and the upstream Cluster Autoscaler master documentation should be checked against the deployed release.
- Reviewed both YAML fragments and the arithmetic. No cluster deployment or load test was performed; the snippets provide a configuration fragment and illustrative telemetry, not a complete runnable application.
