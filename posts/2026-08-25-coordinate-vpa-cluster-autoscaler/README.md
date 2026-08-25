# Coordinate VPA with Cluster Autoscaler for Larger Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Vertical Pod Autoscaler, Cluster Autoscaler, Node Autoscaling, Scheduling

Description: Coordinate VPA request growth with node-group capacity, scheduler constraints, Cluster Autoscaler signals, and safe fallbacks so right-sized Pods can obtain a node.

---

VPA and Cluster Autoscaler solve adjacent problems. VPA changes Pod requests from usage history. Cluster Autoscaler adds nodes from configured node groups when Pods are unschedulable. They cooperate only when the final Pod fits at least one expandable node template and exposes a scheduling signal that the node autoscaler can act on.

## Design Node Groups for the Full Pod

Cluster Autoscaler does not invent arbitrary instance types; it expands preconfigured node groups. For every VPA-managed workload, verify that at least one eligible node template can fit:

```text
the workload Pod's effective scheduling request
  (including app, sidecar, init-container, Pod-level, and Pod-overhead rules)
+ applicable DaemonSet and static Pod requests on the new node
+ safety margin
<= node allocatable
```

Then apply node selection, required affinity, taints/tolerations, zones, architecture, volume topology, host-port conflicts, and extended resources. A large node in an excluded pool cannot help.

```bash
kubectl get nodes -o json | jq -r \
  '.items[] | [.metadata.name,.status.allocatable.cpu,.status.allocatable.memory] | @tsv'
kubectl -n inference get deploy model-server -o yaml
kubectl get daemonset -A -o wide
```

Upstream VPA explicitly warns that a recommendation can exceed node capacity. Cluster Autoscaler cannot help when the resulting Pod exceeds every eligible expandable node template. Set per-container `maxAllowed` and, if appropriate, global recommender maximums derived from the largest eligible node template's allocatable capacity minus overhead.

```yaml
resourcePolicy:
  containerPolicies:
    - containerName: model
      maxAllowed:
        cpu: "12"
        memory: 48Gi
```

Remember that bounds are per container. Validate their sum with sidecars.

## Understand How Each Update Mode Produces Capacity Demand

With `Recreate`, VPA evicts a Pod and its controller creates a replacement with larger requests. If the scheduler marks that replacement unschedulable, Cluster Autoscaler can evaluate it and add a suitable node. This is a clear capacity signal but creates a service-risk interval while the Pod is Pending.

Both in-place modes require Kubernetes 1.33+ with `InPlacePodVerticalScaling` enabled. With `InPlaceOrRecreate`, a running Pod can report `PodResizePending` as `Deferred` or `Infeasible` because its current node lacks capacity. Current VPA may fall back to eviction once infeasibility is observed, after more than 5 minutes deferred, or after more than 1 hour in progress. The replacement can then become an unschedulable Pod that triggers node provisioning.

With alpha `InPlace`, VPA never evicts; VPA 1.7 additionally requires `--feature-gates=InPlace=true` on both the admission controller and updater. VPA records an infeasible attempt and normally retries only after a recommendation lowers at least one resource; the record is in memory, so an updater restart permits one retry. Kubernetes node autoscaling is documented as reacting to unschedulable Pods, while this Pod is already running; therefore, inferring from those mechanics, a deferred in-place resize should not be assumed to trigger Cluster Autoscaler. Provision headroom separately or choose a fallback-capable strategy.

## Protect Availability During Scale-Up Latency

Node provisioning, boot, registration, image pull, volume attach, and readiness can take minutes. Before enabling `Recreate`:

- run enough replicas to tolerate one Pending replacement;
- use a PDB that allows only the intended voluntary disruption;
- retain spare capacity or overprovisioning for latency-sensitive workloads;
- ensure the node group has remaining maximum size and cloud quota; and
- pre-pull large images or optimize startup where appropriate.

VPA cannot guarantee that an evicted Pod is successfully recreated. A permitted first eviction necessarily precedes replacement readiness. The PDB tracks that disruption and can block subsequent evictions, but it cannot make the replacement schedulable or Ready.

## Diagnose the End-to-End Signal

```bash
kubectl -n inference describe pod model-server-xxxxx
kubectl -n inference events | tail -n 60
kubectl -n kube-system logs deploy/cluster-autoscaler --since=30m
kubectl -n kube-system logs deploy/vpa-updater --since=30m
```

Classify the failure:

- `Insufficient cpu` or `Insufficient memory`: inspect candidate node allocatable and group maximums.
- node affinity or selector mismatch: add an eligible expandable group or fix the constraint.
- untolerated taint: align tolerations and node templates.
- volume/node affinity conflict: add capacity in a compatible zone and storage topology.
- `NotTriggerScaleUp`: inspect the Cluster Autoscaler reason for each group.
- admission rejection with no Pod object: inspect LimitRange, ResourceQuota, Pod-level resources, and VPA webhook; Cluster Autoscaler never sees a rejected Pod.

Watch the VPA `uncappedTarget` against `target`. If `uncappedTarget` persistently exceeds `target`, an upper policy bound is clipping workload demand; if it is lower, `minAllowed` may be raising `target`.

## Avoid an Unreliable DaemonSet Feedback Loop

Kubernetes node-autoscaling documentation cautions against vertical workload autoscaling for DaemonSet Pods. Node autoscalers predict DaemonSet overhead on new nodes; changing those requests vertically can make capacity simulation unreliable. Size critical DaemonSets explicitly and include that stable overhead in VPA caps for ordinary workloads.

## Test Scale-Up Before Depending on It

In a staging node group with production-equivalent labels, taints, limits, and quotas:

1. create a canary Pod at the largest VPA-permitted request;
2. exhaust existing fitting capacity safely;
3. confirm `FailedScheduling` appears;
4. confirm Cluster Autoscaler selects the intended node group;
5. measure time until Ready; and
6. verify groups with insufficient capacity or incompatible topology are rejected.

Repeat after changing node images, DaemonSets, affinity, or maximum VPA bounds.

## Official Documentation

- [Kubernetes node autoscaling](https://kubernetes.io/docs/concepts/cluster-administration/node-autoscaling/)
- [Cluster Autoscaler FAQ and scale-up behavior](https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md#how-does-scale-up-work)
- [VPA known limitations with node capacity](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/known-limitations.md)
- [VPA global maximum example](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/examples.md#specifying-global-maximum-allowed-resources-to-prevent-pods-from-being-unschedulable)
- [Kubernetes assigning Pods to nodes](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/)
- [VPA in-place fallback behavior](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/features.md#in-place-updates-inplaceorrecreate)
- [VPA admission validation for the InPlace gate](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/admission-controller/resource/vpa/validation.go)

## Conclusion

Coordinate VPA and Cluster Autoscaler through a node template that can fit the entire constrained Pod. Bound recommendations, include DaemonSet and sidecar overhead, validate scheduling constraints, and budget for provisioning delay. Recreated Pending Pods can trigger node growth; a running Pod with deferred eviction-free resize is not a capacity signal to rely on.
