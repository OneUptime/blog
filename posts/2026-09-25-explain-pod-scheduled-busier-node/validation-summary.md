# Validation Summary: How to Explain Why Kubernetes Scheduled a Pod on an Apparently Busier Node

## Status

validated

## Post Type

Technical troubleshooting guide with Kubernetes CLI examples.

## Technologies Covered

- Kubernetes pods, nodes, resource requests, allocatable resources, and pod overhead
- kube-scheduler filtering, scoring plugins, profiles, and cache
- Node affinity, pod affinity, taints, tolerations, topology spread, and persistent volumes
- kubectl and resource metrics
- Bash and jq
- Kubernetes scheduler simulator

## Sources Consulted

- [Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/) — request-based fit, CPU units, and pod-level resources.
- [Assigning Pods to Nodes](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/) — required constraints, preferred affinity, and scheduling profiles.
- [Scheduler Configuration](https://kubernetes.io/docs/reference/scheduling/config/) — plugin extension points and resource scoring strategies.
- [Resource Bin Packing](https://kubernetes.io/docs/concepts/scheduling-eviction/resource-bin-packing/) — MostAllocated and resource weights.
- [Scheduler Performance Tuning](https://kubernetes.io/docs/concepts/scheduling-eviction/scheduler-perf-tuning/) — feasible-node search thresholds and scoring a subset of nodes.
- [Sidecar Containers](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/) — effective resource accounting for initialization and sidecars.
- [Pod Overhead](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-overhead/) — inclusion of overhead in scheduling requirements.
- [Persistent Volumes: Node Affinity](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#node-affinity) — volume constraints on eligible nodes.
- [Taints and Tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/) — hard exclusions and soft preferences.
- [kubectl top node](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_node/) — node usage reporting and allocatable-based percentages.
- [kubectl get](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/) — JSON output, namespaces, and label columns.
- [kubectl describe](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/) — resource inspection syntax.
- [jq Manual](https://jqlang.org/manual/) — field access, pipes, and object construction.
- [Kubernetes scheduler source, v1.34.0](https://github.com/kubernetes/kubernetes/blob/v1.34.0/pkg/scheduler/schedule_one.go) — assumed pods in the scheduler cache and the Scheduled event message.
- [Kubernetes scheduler simulator](https://github.com/kubernetes-sigs/kube-scheduler-simulator) — plugin evaluation annotations and simulated scheduling.
- [Author profile](https://github.com/nawazdhandala) — checked the linked author URL and its redirect.

## Issues Found

- The statement “Eligible nodes receive scores from enabled plugins” implied that all eligible nodes are scored. Kubernetes can stop the feasibility search after finding enough nodes and score only that subset. Replaced this sentence with a qualification that scoring applies to the feasible nodes found and that not every eligible node is necessarily scored. The scheduler performance documentation supports this correction. No sections or commands were changed.

## Review Notes

- The CPU example is correct: worker-a has 5 CPUs of request headroom, while worker-b has 0.5 CPU (500m); a request for 1 CPU fits only worker-a before considering other constraints.
- Confirmed the distinction between observed utilization and declared requests, the use of allocatable resources, and the need to account for effective init, sidecar, overhead, and applicable pod-level requests.
- Confirmed the hard-constraint examples, the distinction between tolerations and placement preferences, and the combined contribution of enabled scoring plugins. MostAllocated is a configurable strategy; the article correctly does not claim it is the default.
- Both Bash blocks passed bash -n. All three jq expressions executed successfully against representative fixture JSON, including absent optional fields. CLI syntax and flags were checked against official references. No commands were run against a live cluster, and no production scheduling decision was reproduced.
- The commands require access to the named cluster objects and permission to read them; jq must be installed, and kubectl top needs a functioning resource metrics API. Example node, pod, and namespace names must match the reader's cluster.
- The post does not pin a Kubernetes version. Pod-level resource support and effective accounting must be checked against the actual cluster version and feature configuration; absent optional fields appear as null in these jq projections.
- Scheduled events identify the selected node without recording the full plugin score table. Scheduler cache assumptions and changes between scheduling time and inspection justify the article's caution about historical conclusions.
- Simulator annotations support the suggested investigation. A volume-related reproduction also needs relevant storage objects, and other plugin dependencies may require additional cluster state. Matching inputs does not recover a historical production trace.
- All original external links resolved to the intended documentation, simulator repository, or author profile. No deprecated command flags or API configuration snippets were found.
