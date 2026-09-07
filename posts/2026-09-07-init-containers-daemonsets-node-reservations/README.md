# Init Containers, DaemonSets, and Node Reservations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Rightsizing, Capacity Planning, Autoscaling

Description: Calculate usable node capacity with Kubernetes init semantics, per-node DaemonSets, pod overhead, and kubelet system reservations.

---

Node capacity is not the same as workload capacity. The scheduler uses node allocatable resources and pod requests, while init containers and DaemonSets introduce costs that simple application-request sums often miss.

Model the same quantities Kubernetes uses before changing node shapes.

## Begin with allocatable, not hardware capacity

A node reports both `capacity` and `allocatable`. Allocatable is the amount available to pods after configured reservations and eviction allowances. Kubernetes documents two important kubelet reservations:

- `kubeReserved` for Kubernetes daemons such as kubelet and the container runtime;
- `systemReserved` for operating-system daemons and kernel memory.

Inspect real nodes:

```bash
kubectl get nodes -o custom-columns=NAME:.metadata.name,CPU:.status.capacity.cpu,ALLOC_CPU:.status.allocatable.cpu,MEM:.status.capacity.memory,ALLOC_MEM:.status.allocatable.memory
kubectl describe node worker-1
```

Do not copy one provider's reservation percentage to another node family. Reservation formulas can depend on memory size, pod density, image filesystem, and managed-service configuration.

## Apply init-container scheduling semantics

Without Pod-level requests or restartable sidecars, regular init containers run sequentially, so Kubernetes does not sum all of them. For each resource, the effective pod request is the higher of:

```text
sum of requests for containers that run together
largest regular init request
```

Pod overhead is then included when a RuntimeClass defines it. Kubernetes uses the effective value for scheduling and quota.

Example:

```text
app containers:       700m CPU, 900Mi memory total
init-a:                1200m CPU, 256Mi memory
init-b:                300m CPU, 2Gi memory
effective pod request: 1200m CPU, 2Gi memory
```

CPU and memory maxima can come from different init containers. Summing all init requests would overstate resource demand, while ignoring them would make the pod appear to fit when it does not.

Kubernetes-native sidecars use restartable entries in `initContainers` and continue alongside application containers. They make the calculation order-sensitive. For each resource, calculate:

```text
steady request = sum(app containers) + sum(all restartable sidecars)
init stage i = request(init i) + sum(restartable sidecars before i)
effective request = max(steady request, every init stage) + pod overhead
```

A restartable sidecar is included in the steady sum and in every later init stage because it remains running. A regular init container that appears before the first sidecar does not overlap that sidecar.

For example, assume a 200m CPU, 128Mi restartable sidecar appears before both regular init containers:

```text
app containers:           700m CPU, 900Mi memory total
steady plus sidecar:      900m CPU, 1028Mi memory
init-a plus sidecar:     1400m CPU, 384Mi memory
init-b plus sidecar:      500m CPU, 2176Mi memory
effective before overhead: 1400m CPU, 2176Mi memory
```

CPU and memory maxima are calculated independently. Preserve the declared `initContainers` order in the model, and confirm the result against the Kubernetes version in use.

When a workload uses beta Pod-level resources, an explicit Pod-level request replaces the derived container and init value for each supported resource in scheduler accounting. Pod overhead is still added separately. Do not add or take the maximum of the init requests again after applying that override. Instead, set the Pod-level budget high enough for both initialization and steady execution, retain any needed per-container controls, and test the manifest on the deployed Kubernetes version.

## Subtract every matching DaemonSet

A DaemonSet runs a pod on all or a selected subset of nodes. Networking, storage, security, monitoring, and log agents commonly consume resources on each worker.

Inventory their requests and placement:

```bash
kubectl get daemonsets -A -o wide
kubectl get pods -A --field-selector spec.nodeName=worker-1 -o wide
kubectl get pods -A --field-selector spec.nodeName=worker-1 -o yaml
```

Node labels, selectors, affinity, taints, and tolerations determine which DaemonSets land on a candidate pool. A GPU node may receive extra device and telemetry daemons that general-purpose nodes do not.

Use the actual DaemonSet pod request for each node class, including sidecars, init behavior, and overhead. Node autoscalers also need to predict this per-node cost when deciding whether a pending pod fits.

## Build a node budget

For each node class and resource:

```text
workload budget = node allocatable
                - matching DaemonSet effective requests
                - static pod requests not already reflected
                - deliberate operational reserve
```

Do not subtract `kubeReserved` and `systemReserved` again if you started from allocatable. Avoid double-counting eviction thresholds for the same reason.

Example budget:

```text
node capacity:             8 CPU, 32Gi
node allocatable:          7.2 CPU, 28Gi
DaemonSet requests:        0.7 CPU, 1.8Gi
operational reserve:       0.3 CPU, 1Gi
application pod budget:    6.2 CPU, 25.2Gi
```

Now test whether the actual mix of pod requests fits both dimensions. Ten CPU-light pods might exhaust memory; several CPU-heavy pods may strand memory.

## Include scheduling constraints

Arithmetic is necessary but not sufficient. Model:

- maximum pods per node and IP availability;
- required zones and topology spread;
- node affinity, selectors, taints, and tolerations;
- persistent-volume zone and attachment limits;
- huge pages and extended resources;
- integer CPU and NUMA topology requirements;
- maximum single-pod request.

A pool with enough aggregate CPU can still fail if no individual node can fit the largest effective init request.

## Validate with a scheduling simulation

Create a representative candidate pool or use a provider-supported simulator. Deploy DaemonSets first, then application replicas, a rollout surge, and an HPA scale event. Verify pending pod reasons and inspect `kubectl describe pod` events.

Run a drain and a node failure test. A shape that only fits steady state may fail when pods concentrate during maintenance. Retain enough headroom for the disruption policy and required topology.

When changing DaemonSet requests, update the node model immediately. Saving 100Mi in an agent across 1,000 nodes is material, but under-requesting a critical network daemon can destabilize the entire fleet.

## Conclusion

Start from node allocatable, use Kubernetes max-versus-sum semantics for init containers, subtract every matching DaemonSet, and include pod overhead and scheduling constraints. Validate the candidate with rollout, scale, and disruption scenarios before replacing node shapes.

## Official Documentation

- [Kubernetes init containers](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/)
- [Kubernetes sidecar containers](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
- [Kubernetes sidecar containers enhancement proposal](https://github.com/kubernetes/enhancements/blob/master/keps/sig-node/753-sidecar-containers/README.md)
- [Kubernetes Pod-level resources](https://kubernetes.io/docs/tasks/configure-pod-container/assign-pod-level-resources/)
- [Kubernetes DaemonSets](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)
- [Reserve compute resources for system daemons](https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/)
- [Kubernetes pod overhead](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-overhead/)
