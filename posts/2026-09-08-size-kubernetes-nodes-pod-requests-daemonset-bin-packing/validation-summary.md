# Validation Summary: How to Size Kubernetes Nodes for Requests, Overhead, and Bin Packing

## Status
validated

## Post Type
Technical capacity-planning guide with kubectl commands, resource calculations, and a YAML sizing record.

## Technologies Covered
- Kubernetes node capacity and allocatable resources
- Kubelet system reservations and node-pressure eviction
- Pod CPU and memory requests, init containers, sidecars, and Pod overhead
- Pod-level resources
- DaemonSets and per-node overhead
- Kubernetes scheduling, affinity, topology, and volume limits
- Cluster Autoscaler and multidimensional bin packing
- kubectl and YAML

## Sources Consulted
- [Reserve compute resources for system daemons](https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/)
- [Resource management for Pods and containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Pod overhead](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-overhead/)
- [DaemonSet](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)
- [Assigning Pods to nodes](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/)
- [Cluster Autoscaler FAQ](https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md)
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Node API reference](https://kubernetes.io/docs/reference/kubernetes-api/core/node-v1/)
- [Init container resource sharing](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/#resource-sharing-within-containers)
- [Sidecar container resource sharing](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/#resource-sharing-within-containers)
- [Node-specific volume limits](https://kubernetes.io/docs/concepts/storage/storage-limits/)
- [Topology Manager policies](https://kubernetes.io/docs/tasks/administer-cluster/topology-manager/)
- [Deployment rolling updates](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-update-deployment)
- [Node-pressure eviction](https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/)
- [Author profile](https://github.com/nawazdhandala)

## Issues Found
- The security-agent example described a “300-MiB security agent” as consuming that amount on every node without specifying a memory request or node eligibility. Changed it to an agent requesting 300 MiB on every eligible node and explicitly described the reduction in scheduling capacity. Requests determine scheduler accounting; observed usage may differ, and DaemonSets can target a subset of nodes.

## Review Notes
- Verified both kubectl commands against the official get reference and API fields. Quoted custom-column expressions, container-array wildcards, and the all-namespaces flag are appropriate. The Pod command lists all Pods and only regular-container requests; it is correctly presented as an inventory aid rather than an automated DaemonSet total. Automation must identify DaemonSet ownership and calculate effective requests.
- Confirmed that allocatable already accounts for configured system reservations and eviction headroom; mandatory Pod requests are deducted separately. Init-container rules, restartable sidecars, and RuntimeClass overhead must be included in effective Pod requests.
- Pod-level requests are conditional on cluster support and the PodLevelResources feature gate. The post correctly avoids assuming that all clusters expose this feature. Pod-level budgets must not be blindly added to container-level requests.
- Independently checked the arithmetic: 7.10 - 0.55 = 6.55 CPU; 27.0 - 1.8 = 25.2 GiB; CPU allows nine Pods and memory allows ten. Reserving 0.70 CPU leaves 5.85 CPU and permits eight Pods. This target is a planning policy, not an automatically enforced scheduler reservation.
- The YAML is a valid illustrative sizing record, not a Kubernetes resource manifest. Its field names and numeric units are internally consistent; no apiVersion or kind is required for this purpose.
- Affinity, topology spread, host ports, extended resources, volume limits, and Pod-count limits can constrain placement independently of aggregate CPU and memory. NUMA policies can also reject admission at the kubelet after scheduling; real placement testing remains necessary.
- Confirmed the Autoscaler FAQ describes template-node fit simulation as simplified. Node-group configuration and actual workload constraints must be represented accurately. Node-size efficiency and fragmentation depend on the workload distribution; the post appropriately calls for simulation and measured operating costs.
- Rolling updates require transient capacity; terminating Pods may also consume resources during their grace periods. Runtime CPU contention and memory-pressure/OOM risks require load testing beyond request-based fit calculations.
- All six documentation links in the post resolved to the intended resources. The author URL redirects to the expected GitHub profile. No deprecated command or API usage was identified.
- This was a documentation and static review. No live-cluster scheduling simulation, provider-specific reservation measurement, or load test was performed; the example node values are explicitly hypothetical.
