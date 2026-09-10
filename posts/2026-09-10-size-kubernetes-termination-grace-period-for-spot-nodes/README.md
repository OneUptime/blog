# How to Size Kubernetes Termination Grace Periods for Spot Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Spot, Graceful Shutdown, Karpenter, AWS

Description: Build a measured shutdown budget for Spot interruption instead of assuming every Pod receives the full two-minute notice window.

---

Setting `terminationGracePeriodSeconds: 120` does not give a Pod two minutes after a Spot interruption notice. The clock at EC2 and the clock at the kubelet start at different times. Event delivery, controller processing, and eviction can consume a substantial portion of the remaining instance lifetime.

The useful question is: how much measured shutdown work can finish after this particular Pod starts terminating and before its node disappears?

## Separate the deadlines

For EC2 stop or terminate interruptions, AWS documents a two-minute notice and best-effort delivery. It recommends polling instance metadata at five-second intervals when using that detection path. The notice is a recovery opportunity, not an availability guarantee. [Spot interruption notices](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html)

Hibernation needs special care: current AWS pages disagree. The interruption-notice page says hibernation starts immediately, while the hibernation overview describes a two-minute lead time. Design for no guaranteed grace until you have confirmed the behavior for your supported configuration. [EC2 hibernation overview](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-hibernate-overview.html)

For Kubernetes, a Pod's termination grace is the local cleanup budget after termination begins. `preStop` consumes that same budget; it is not extra time before the countdown. Native sidecar shutdown also needs time before the overall Pod deadline. [Kubernetes termination flow](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination-flow)

A third deadline may exist in the node controller, such as Karpenter's `spec.template.spec.terminationGracePeriod`. This controls maximum node draining time. None of these settings extends EC2's deadline.

## Measure the path before choosing a value

Record these timestamps for several staging interruptions:

| Timestamp | Evidence |
| --- | --- |
| Notice created | AWS event time or metadata action payload |
| Notice observed | Interruption handler log |
| Node cordoned or tainted | Controller log and node state |
| Pod deletion started | Pod deletion timestamp |
| Application signal received | Application log |
| Last durable write completed | Application or storage log |
| Process exited | Container termination status |
| Instance stopped or terminated | EC2 state/event evidence |

Synchronize clocks and carry node, Pod, and workload identifiers in the records. A Pod log alone cannot show whether the controller waited on an eviction before the application received its signal.

For every run, compute the time from notice creation to Pod deletion. Use a high percentile and an explicit safety allowance; do not size the deadline from one successful observation.

## Turn measurements into a budget

Suppose a representative test produces these planning values:

```text
Nominal stop/terminate notice window:         120 seconds
Delivery and detection allowance:              8 seconds
Controller and eviction allowance:            17 seconds
Safety allowance before instance loss:        20 seconds
Available Pod shutdown budget:                75 seconds
```

These are example measurements, not AWS or Kubernetes guarantees. A workable Pod allocation might be:

```text
preStop routing overlap:                      10 seconds
Active request or current work-unit finish:   40 seconds
Durable state/log flush:                      10 seconds
In-Pod scheduling and shutdown allowance:     10 seconds
Configured Pod grace:                        70 seconds
```

The application should enforce its own work and flush deadlines below 70 seconds. Otherwise one stalled storage request can consume the whole budget. A Pod grace period is a final kill boundary, not a mechanism that makes a blocking operation finish.

Merge the resulting value into the workload template:

```yaml
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 70
      containers:
        - name: worker
          lifecycle:
            preStop:
              exec:
                command: [/bin/sh, -c, "sleep 10"]
```

Use the hook only if this workload actually needs a routing overlap. A batch worker that can immediately stop claiming new work may benefit from no hook at all. Ensure the image has the specified executable, and verify how its entrypoint forwards the stop signal.

## Account for contention and blocked evictions

Pods on a node do not necessarily receive their shutdown opportunities at the same instant. Multiple checkpoint uploads share network bandwidth, CPU, disk, and object-store request capacity. Ten individually fast flushes can become slow when started together.

PodDisruptionBudgets can also delay API eviction. They express availability during voluntary disruption; they cannot keep an interrupted Spot instance alive. Test with the real replica count and currently unavailable replicas, including a rolling deployment in progress. [Kubernetes disruptions](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/)

For Karpenter, inspect the NodeClaim as well as the NodePool. Changes to a NodePool termination grace setting affect replacement NodeClaims rather than rewriting existing ones, and may trigger drift. The node termination deadline can force remaining Pods to be removed. [Karpenter termination grace period](https://karpenter.sh/docs/concepts/disruption/#terminationgraceperiod)

If eviction regularly consumes most of the notice, reduce the number of protected workloads sharing a node, provide more ready replicas, or fix the disruption budget. Increasing Pod grace cannot recover time spent before Pod termination begins.

## Test the failure case that exceeds the budget

First validate an ordinary graceful Pod deletion. Then use a scoped AWS FIS interruption experiment to exercise the complete path. AWS documents the specific [Spot interruption action](https://docs.aws.amazon.com/fis/latest/userguide/fis-tutorial-spot-interruptions.html).

Include a test where a checkpoint upload exceeds its timeout and another where the machine is lost without cleanup. The expected outcome should be defined: replay one chunk, retry an idempotent request, or recover from the last committed log position.

Also test the busiest node shape, with all workers flushing simultaneously. Measure bytes transferred per second during recovery rather than using the instance's advertised network maximum as the assumed throughput.

If the measured shutdown requirement cannot fit, reduce the work unit or checkpoint periodically. Move nonrecoverable work to a different capacity strategy. A ten-minute request cannot be made safe under a two-minute reclaim window by declaring a ten-minute Pod timeout.

## Conclusion

Subtract detection, controller delay, and safety allowance before assigning the Pod's grace period. Bound application cleanup inside that result, test contention, and retain a recovery path for interruptions that provide no usable shutdown time.

## Official Documentation

- [EC2 Spot interruption notices](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html)
- [EC2 hibernation behavior](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-hibernate-overview.html)
- [Kubernetes Pod termination](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination-flow)
- [Kubernetes disruptions](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/)
- [Karpenter disruption controls](https://karpenter.sh/docs/concepts/disruption/)
- [AWS FIS interruption tutorial](https://docs.aws.amazon.com/fis/latest/userguide/fis-tutorial-spot-interruptions.html)
