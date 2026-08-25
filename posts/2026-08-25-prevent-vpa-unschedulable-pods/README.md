# How to Prevent VPA Recommendations from Making Pods Unschedulable on Available Node Sizes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Vertical Pod Autoscaler, Scheduling, Capacity Planning, Cluster Autoscaler

Description: Bound VPA recommendations against real node allocatable capacity, DaemonSet overhead, multi-container totals, quotas, and scheduling constraints so replacement Pods can still run.

---

The upstream VPA recommender does not automatically limit a recommendation to a node type that exists in your cluster. A recommendation can therefore be statistically reasonable and operationally impossible: after VPA evicts a Pod, its replacement requests more CPU or memory than any eligible node can provide and remains `Pending`.

## Calculate the Envelope from Allocatable, Not Instance Marketing Sizes

Inspect node allocatable resources and the workload's scheduling constraints:

```bash
kubectl get nodes -o json | jq -r \
  '.items[] | [.metadata.name, .status.allocatable.cpu, .status.allocatable.memory] | @tsv'

kubectl -n analytics get deploy reports -o yaml
kubectl get nodes --show-labels
kubectl get nodes -o custom-columns='NAME:.metadata.name,TAINTS:.spec.taints'
```

Use `.status.allocatable`, not VM vCPU and RAM, because Kubernetes reserves some capacity. Then restrict the candidate set using the Pod's `nodeSelector`, required node affinity, taints and tolerations, architecture, topology, storage attachment rules, and any extended resources. The largest node in the cluster is irrelevant if the Pod cannot select it.

For every eligible node shape, reserve:

- requests of DaemonSet Pods that will run on that node;
- kube-system or fixed workload headroom appropriate to the node pool;
- requests of all non-VPA or excluded concurrently running containers; and
- a safety margin for rollout overlap and capacity drift.

For a Pod with several VPA-managed containers, add their maxima to that concurrent-container total. Then calculate the effective Pod request for each resource, using Kubernetes's init-container accounting and adding any RuntimeClass Pod overhead, before comparing it with the remaining node capacity. VPA's global maximum flags and `maxAllowed` are container-level controls; two individually valid 8 GiB recommendations can still make a 16 GiB Pod that does not fit a 14 GiB allocatable node.

## Apply Per-Container Bounds

Start with VPA in observation mode and impose an envelope derived from eligible nodes:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: reports
  namespace: analytics
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: reports
  updatePolicy:
    updateMode: "Off"
  resourcePolicy:
    containerPolicies:
      - containerName: app
        minAllowed:
          cpu: 250m
          memory: 512Mi
        maxAllowed:
          cpu: "6"
          memory: 20Gi
      - containerName: telemetry
        mode: "Off"
```

`target` observes these resource-policy bounds. `uncappedTarget` shows the usage-based target before `minAllowed` or `maxAllowed` is applied. Alert when `uncappedTarget` remains above a cap: clipping keeps that recommendation within the cap, but it also signals that the workload may need a larger node class, horizontal scaling, or application work.

Use separate bounds for every material sidecar. A wildcard policy is convenient but can hide the sum-of-containers problem.

## Consider Global Guardrails Carefully

The recommender also supports:

```yaml
args:
  - --container-recommendation-max-allowed-cpu=6
  - --container-recommendation-max-allowed-memory=20Gi
```

The official VPA example recommends deriving these from the largest node's allocatable capacity minus DaemonSet requests and a safety margin. Per-VPA `maxAllowed` takes precedence for the resource it specifies; a global maximum fills a resource not bounded by the VPA policy.

Global caps are a last line of defense, not a workload-specific capacity model. They remain per-container, apply across node pools, and cannot account for affinity or the other containers in a Pod.

If the alpha CPU Startup Boost feature is enabled, include the boosted CPU request in the envelope: recommendation `maxAllowed` does not cap the boost, which can be capped separately with the admission controller's `--max-allowed-cpu-boost` flag.

## Include Admission Policies and Namespace Capacity

Scheduling is only one gate. A replacement Pod can be rejected before scheduling because:

- a `LimitRange` maximum or request-to-limit ratio is violated;
- a `ResourceQuota` has insufficient `requests.cpu`, `requests.memory`, `limits.cpu`, or `limits.memory` headroom; or
- a Pod-level `spec.resources` envelope conflicts with VPA's container-level mutation. Current upstream VPA explicitly documents Pod-level resources as unsupported.

```bash
kubectl -n analytics get limitrange,resourcequota -o yaml
kubectl -n analytics describe resourcequota
kubectl -n analytics events | tail -n 50
```

When applying a recommendation, VPA tries to keep the resulting requests and limits within LimitRange bounds, but an explicit VPA resource policy wins if the two conflict. The API server can then reject the Pod. Align the policies rather than depending on admission order.

## Test the Largest Mutated Pod Before Enabling Updates

Before changing `updateMode`, construct a Pod manifest using the maximum requests and resulting limits VPA can apply and submit it through server-side dry-run in the target namespace:

```bash
kubectl create --dry-run=server -n analytics -f reports-max-pod.yaml -o yaml
```

Then use canary Pods constrained in turn to each required zone and node pool, or use one controlled recreation to prove the specific placement path it receives. Watch for `FailedScheduling` events and confirm the node autoscaler's simulated node templates can fit the full Pod.

Cluster Autoscaler can add a node only from configured node groups. It cannot help when the Pod exceeds the largest template, when the group has reached maximum size, when cloud capacity is unavailable, or when scheduling constraints exclude every expandable group.

## Respond Safely to a Pending Replacement

```bash
kubectl -n analytics describe pod reports-xxxxx
kubectl -n analytics get events --field-selector reason=FailedScheduling
kubectl -n kube-system logs deploy/cluster-autoscaler --since=20m
```

Read the scheduler message first. If the Pod is too large, reduce `maxAllowed` and restore feasible template requests through your deployment process. Do not repeatedly delete the Pending Pod; its controller and the admission webhook will reproduce the same request until policy or recommendation changes.

## Official Documentation

- [VPA known limitations](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/known-limitations.md)
- [VPA global maximum example](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/examples.md#specifying-global-maximum-allowed-resources-to-prevent-pods-from-being-unschedulable)
- [VPA API resource policies](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/api.md)
- [Kubernetes node autoscaling](https://kubernetes.io/docs/concepts/cluster-administration/node-autoscaling/)
- [Kubernetes resource requests and Pod totals](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Assigning Pods to nodes](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/)

## Conclusion

Make schedulability an explicit VPA policy input. Derive caps from allocatable resources on nodes the Pod can actually select, subtract node and Pod overhead, validate the sum across containers, and align LimitRange and quota rules. Cluster Autoscaler provides capacity only when an eligible configured node shape can fit the resulting Pod.
