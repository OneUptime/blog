# Validation Summary: How to Diagnose Calico Node Pod Evicted

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- Calico
- Kubernetes node-pressure eviction
- Kubernetes DaemonSets
- kubectl
- kubelet eviction configuration

## Sources Consulted
- Kubernetes documentation: Node-pressure Eviction, https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes documentation: Pod Priority and Preemption, https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes documentation: Pod Quality of Service Classes, https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes kubectl reference: top node, https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#top-node
- Kubernetes documentation: Set Kubelet Parameters Via A Configuration File, https://kubernetes.io/docs/tasks/administer-cluster/kubelet-config-file/
- Calico documentation: Configuring calico/node, https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico documentation: Install calico/node, https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Calico documentation: Single-host Kubernetes cluster install note, https://docs.tigera.io/calico/latest/getting-started/kubernetes/k8s-single-node

## Issues Found
- The post said kubelet may evict calico-node due to CPU pressure. Kubernetes node-pressure eviction maps to MemoryPressure, DiskPressure, and PIDPressure, not a CPUPressure condition, so this was changed to disk, memory, or PID pressure.
- The post described CNI and BGP loss as unconditional. Calico's calico/node includes BIRD for BGP, but BGP impact depends on whether BGP is enabled, so the wording now says BGP daemon and sessions are affected when BGP is enabled.
- The symptom "Node transitions to NotReady" was too absolute. The wording now says the node may become NotReady or show network-related readiness issues.
- The root-cause wording overemphasized "calico-node logs filling disk" as the most common cause. It was changed to the more general and verifiable issue of insufficient disk space or inodes, sometimes from excessive container logs.
- The eviction-order wording was simplified in a way that missed Kubernetes' resource request and priority behavior. It now mentions lower-priority or over-request pods, and the prevention section now recommends appropriate requests as well as limits.
- The calico-node pod lookup used only `kube-system`. Calico manifest-based installs commonly use `kube-system`, but operator installs may use `calico-system`; the command now searches all namespaces.
- The DaemonSet resource commands hard-coded `kube-system`. They now use `<calico-namespace>` so the command applies to both common Calico install layouts.
- The event command only searched `kube-system` events. It now searches events across namespaces for the target node with a field selector before filtering for eviction, OOM, or pressure terms.
- The mermaid diagram only covered disk and memory pressure. It now includes PIDPressure.

## Review Notes
The command examples are syntactically valid. `kubectl top node` requires Metrics Server or another metrics API implementation to be available, which is expected Kubernetes behavior but not called out in the post.
