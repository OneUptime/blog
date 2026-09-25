# How to Diagnose Every Scheduling Failure in Kubernetes Node Availability Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Scheduling, Troubleshooting

Description: Decode aggregated FailedScheduling messages, separate placement failures from preemption, and trace each reported constraint to the evidence needed to fix it.

---

A message beginning `0/8 nodes are available` means that the scheduler found no feasible node for that scheduling attempt. It does not mean eight machines are offline, and the first reason in the message is not necessarily the only problem.

The useful question is: what must change for at least one node to satisfy every hard requirement of this pod? Start by preserving the entire message and the actual admitted pod specification.

## Capture the right pod and event

Replace the example namespace and pod name with the pending pod:

```bash
ns=production
pod=checkout-7ddcb6d688-abcde
kubectl get pod "$pod" -n "$ns" -o yaml
kubectl describe pod "$pod" -n "$ns"
kubectl events -n "$ns" --for "pod/$pod" --types=Warning
```

The [kubectl events reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/) documents resource filtering and watch mode. For repeated pod names, select the UID to avoid mixing events from an earlier object:

```bash
pod_uid=$(kubectl get pod "$pod" -n "$ns" -o jsonpath='{.metadata.uid}')
kubectl get events -n "$ns" \
  --field-selector "involvedObject.uid=$pod_uid,reason=FailedScheduling" \
  -o json | jq '.items[] | {
    firstTimestamp, lastTimestamp, eventTime, count, message
  }'
```

Check `.spec.nodeName` and the `PodScheduled` condition. A pod already assigned to a node with an image-pull failure needs a different investigation. Kubernetes' [pod debugging guide](https://kubernetes.io/docs/tasks/debug/debug-application/debug-pods/) distinguishes unscheduled pods from subsequent container startup problems.

## Read counts as aggregated reasons

Consider this illustrative message:

```text
0/5 nodes are available:
2 Insufficient cpu,
2 Insufficient memory,
3 node(s) didn't match Pod's node affinity/selector.
```

Do not conclude that seven distinct nodes failed. A resource filter can report both CPU and memory shortages for one node. Conversely, a node rejected by an earlier filter can have additional problems that the message never lists.

The upstream scheduler's [FitError implementation](https://github.com/kubernetes/kubernetes/blob/v1.34.0/pkg/scheduler/framework/types.go) aggregates recorded reasons into counts. Its [filter execution implementation](https://github.com/kubernetes/kubernetes/blob/v1.34.0/pkg/scheduler/framework/runtime/framework.go) can stop evaluating a node after a rejecting filter. Event wording also varies by Kubernetes version and enabled plugins.

Treat the event as an index into an investigation. It is neither a complete per-node constraint matrix nor a promise that fixing one reason will make the pod run.

## Map each reported reason to evidence

| Reported reason | Inspect next | Typical corrective action |
| --- | --- | --- |
| Insufficient CPU or memory | Effective pod requests and each eligible node's allocatable and allocated requests | Add suitable capacity or correct measured request sizing |
| Untolerated taint | Node taints and admitted pod tolerations | Correct intended placement or add a narrowly scoped toleration |
| Node affinity or selector mismatch | Node labels, `nodeSelector`, required node affinity | Fix labels or the workload's hard requirement |
| Pod affinity or anti-affinity mismatch | Matching pods, namespaces, and topology domains | Restore required peers or revise an impossible separation rule |
| Topology spread constraint failure | Selector matches, domain counts, and domain eligibility | Provide capacity in the deficient domain or revise the policy |
| Volume node affinity conflict | Bound PV topology and pod placement constraints | Make compute and storage topology compatible |
| Too many pods or insufficient extended resource | Pod slots, device resources, and node allocatable | Add a node with the required resource shape |

For example, collect the inputs together:

```bash
kubectl get nodes -o wide
kubectl get nodes -L topology.kubernetes.io/zone
kubectl get pod "$pod" -n "$ns" -o json | jq '.spec | {
  schedulerName, nodeSelector, affinity, tolerations,
  topologySpreadConstraints, resources, containers, initContainers, overhead, volumes
}'
kubectl describe node worker-a
```

Resource fit uses requests, not the CPU utilization displayed by `kubectl top`. Include init containers, sidecars, pod overhead, and any pod-level resources supported and used by your cluster. The [resource management documentation](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/) explains the scheduling role of requests.

## Separate the preemption suffix

A suffix such as `Preemption is not helpful for scheduling` describes a subsequent attempt to find room by removing lower-priority pods. It does not replace the original failure reasons. Eviction cannot make a node acquire a missing label or move a zonal volume.

Investigate preemption after identifying a node that satisfies constraints eviction cannot fix, such as required node labels and volume topology. Removing lower-priority pods on that node can also resolve some pod anti-affinity conflicts; preemption is not limited to resource shortages. The [priority and preemption documentation](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/) describes limitations including lower-priority victims and cross-node constraints.

## Verify a complete scheduling path

Record a short hypothesis: “The two nodes in the required zone lack 700m CPU after existing requests; other zones fail required affinity.” That is more actionable than “cluster full.”

Change the owning Deployment, StatefulSet, or other controller template when the workload specification is wrong. Then inspect the newly created pod and its new events. A different failure after the first fix often means the scheduler reached the next constraint.

Finish when a fresh pod has a node assignment and the intended placement is confirmed. Readiness remains a separate check: resolving scheduling makes container startup possible, but does not establish application health.
