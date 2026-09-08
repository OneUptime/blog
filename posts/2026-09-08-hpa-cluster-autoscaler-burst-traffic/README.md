# How to Keep HPA and Cluster Autoscaler from Reacting Too Late to Burst Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Horizontal Pod Autoscaler, Cluster Autoscaler, Autoscaling, Capacity Planning

Description: Measure every delay from traffic arrival to serving Pods, tune HPA behavior and metrics, and maintain enough schedulable node capacity to bridge burst traffic.

---

Horizontal Pod Autoscaler and Cluster Autoscaler form a serial control loop. HPA first asks for more Pods. If those Pods cannot fit, Cluster Autoscaler asks the infrastructure for nodes. A burst can exhaust the current replicas before either layer completes.

Fixing this requires a timing budget, not a single lower CPU threshold.

## Draw the complete reaction timeline

Capture timestamps for:

```text
t0  demand begins rising
t1  application metric reflects the change
t2  metrics pipeline exposes it to HPA
t3  HPA updates desired replicas
t4  new Pods are created
t5  scheduler marks some Pods unschedulable
t6  Cluster Autoscaler requests nodes
t7  nodes register and become Ready
t8  images start and application readiness passes
t9  serving endpoints receive traffic
```

The reaction time is `t9 - t0`. Break it down using HPA status and events, Pod conditions, scheduler events, Cluster Autoscaler logs and metrics, node conditions, container start timestamps, readiness probes, and load-balancer telemetry.

Compare p99 reaction time with time-to-exhaustion:

```text
time to exhaustion = usable ready headroom / net rate of demand growth
```

If ready headroom covers three minutes and the p99 chain takes seven, tuning a ten-second autoscaler scan cannot close the four-minute gap by itself.

## Make HPA observe a leading workload signal

CPU is often late: queues and in-flight requests rise before averaged CPU crosses a threshold. Prefer a metric causally related to work, such as concurrency per Pod, requests per second per ready Pod, or queue backlog divided by a drain-time target. Keep CPU or memory as a guardrail.

For resource utilization, HPA calculates a ratio against resource requests. An incorrect CPU request changes the denominator. If a targeted Pod has containers without the relevant request, Kubernetes documents that its CPU utilization is undefined and HPA takes no action for that metric. The documented core relationship is:

```text
desired replicas = ceil(current replicas * current metric / desired metric)
```

HPA also adjusts behavior for missing metrics and not-yet-ready Pods. Set startup and readiness probes so traffic, metrics, and true serving readiness agree. For CPU-heavy initialization, configure the controller's CPU initialization period and initial readiness delay where you operate the control plane, or account for provider defaults.

Use `autoscaling/v2` behavior to make scale-up intentional:

```yaml
behavior:
  scaleUp:
    stabilizationWindowSeconds: 0
    selectPolicy: Max
    policies:
      - type: Percent
        value: 100
        periodSeconds: 30
      - type: Pods
        value: 8
        periodSeconds: 30
  scaleDown:
    stabilizationWindowSeconds: 300
```

This example permits aggressive scale-up and slower scale-down; it is not a universal setting. Load test the policy. Set `minReplicas` high enough for immediate failures and the fastest unforecast burst, and `maxReplicas` high enough for the planned peak and quotas.

## Ensure new replicas have somewhere to run

Cluster Autoscaler scales up for Pods that are unschedulable and would fit a node-group template. It does not create nodes merely because running Pods have high CPU. Correct Pod requests are therefore essential.

Check pending reasons. Autoscaling will not fix an impossible selector, missing GPU node group, exhausted volume topology, host-port conflict, or Pod larger than every candidate node. Ensure node groups have matching labels, taints, resources, and zone support.

Maintain a measured ready reserve for demand that arrives faster than nodes. Low-priority placeholder Pods can occupy that reserve, yield immediately through preemption, and then become unschedulable so Cluster Autoscaler replenishes the nodes. Alternatively raise node-group minimums around scheduled events.

Reduce cold-path time by pre-pulling large images, shrinking images, avoiding slow serial initialization, and making readiness test the ability to serve. Never mark a Pod Ready merely to improve scaling metrics.

## Avoid positive feedback

When latency rises, client retries can add more load. Bound retries with exponential backoff, jitter, deadlines, and retry budgets. Reject work cheaply before an unbounded application queue consumes memory. Google SRE guidance recommends load shedding and warns that retries can amplify overload.

Autoscaling signals should not reward failure. For example, scaling on completed RPS per Pod can request fewer replicas when overload reduces completions. Prefer arrivals, concurrency, or backlog where they measure offered work. Keep cardinality and metric freshness controlled so the signal itself remains reliable during an incident.

## Test the control loop as a system

Run at least four scenarios:

1. a step burst that fits current nodes but needs more Pods;
2. a burst that needs both Pods and nodes;
3. a predictable peak with scheduled pre-scaling;
4. a burst during one-node loss or a rollout.

Assert maximum pending duration, time to serving capacity, delivered throughput, queue bound, p99 latency, error budget impact, node provisioning success, and stable scale-down. A green HPA event is not success if users timed out before endpoints became Ready.

Use a timeline in every review:

```yaml
metric_to_hpa_p99: 35s
hpa_to_unschedulable_p99: 12s
unschedulable_to_node_ready_p99: 260s
node_ready_to_endpoint_p99: 55s
total_p99: 362s
burst_time_to_exhaustion: 210s
gap: 152s
```

Close the gap with more ready headroom, earlier metrics, scheduled scaling, faster startup, or admission control. Recheck after image, CNI, node, metric-pipeline, or application changes.

## Conclusion

Treat HPA plus Cluster Autoscaler as one delayed control system. Measure every transition through a serving endpoint, use a workload metric that leads saturation, configure aggressive but bounded scale-up, and ensure requested Pods fit real node templates. Bridge bursts that are faster than provisioning with ready or scheduled headroom and protect the service with bounded queues and load shedding.

## Official Documentation

- [Kubernetes: Horizontal Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/)
- [Kubernetes: Configurable HPA scaling behavior](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/#configurable-scaling-behavior)
- [Kubernetes: Node autoscaling](https://kubernetes.io/docs/concepts/cluster-administration/node-autoscaling/)
- [Kubernetes Cluster Autoscaler FAQ](https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md)
- [Kubernetes: Pod priority and preemption](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/)
- [Google SRE Book: Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/)
