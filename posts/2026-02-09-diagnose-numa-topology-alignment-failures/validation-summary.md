# Validation Summary: How to Diagnose NUMA Topology Alignment Failures in Kubernetes Pods

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes Topology Manager
- Kubernetes CPU Manager
- Kubernetes Memory Manager
- kubelet configuration
- Linux NUMA and cgroups
- NVIDIA GPU topology tooling
- kubectl, jq, journalctl, numactl, strace

## Sources Consulted
- Kubernetes: Control Topology Management Policies on a node: https://kubernetes.io/docs/tasks/administer-cluster/topology-manager/
- Kubernetes: Troubleshooting Topology Management: https://kubernetes.io/docs/tasks/debug/debug-cluster/topology/
- Kubernetes: Resource managers: https://kubernetes.io/docs/concepts/policy/node-resource-managers/
- Kubernetes: Control Memory Management Policies on a Node: https://kubernetes.io/docs/tasks/administer-cluster/memory-manager/
- Kubernetes: Reserve Compute Resources for System Daemons: https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/
- Kubernetes: Kubelet Configuration (v1beta1): https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes: Local Files And Paths Used By The Kubelet: https://kubernetes.io/docs/reference/node/kubelet-files/
- Kubernetes: About cgroup v2: https://kubernetes.io/docs/concepts/architecture/cgroups/
- Linux kernel cgroup v2 documentation: https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html
- NVIDIA System Management Interface documentation: https://docs.nvidia.com/deploy/nvidia-smi/index.html

## Issues Found
- Corrected the failure symptom and event examples. Topology Manager failures are kubelet admission failures shown as `TopologyAffinityError`, not scheduler `FailedScheduling` events that leave pods Pending.
- Corrected the explanation of scheduling versus kubelet admission. The Kubernetes scheduler is not topology-aware, so a pod can be bound to a node and then rejected by the kubelet.
- Replaced non-authoritative sample kubelet log messages with messages matching Kubernetes troubleshooting documentation.
- Corrected per-NUMA reservation guidance. `systemReserved` and `kubeReserved` are node-level reservations; Memory Manager's `reservedMemory` is the relevant per-NUMA reservation field.
- Corrected CPU exhaustion guidance. Whole-CPU Guaranteed pods under CPU Manager `static` policy can receive exclusive CPUs, but `kubectl describe node` does not show per-NUMA CPU distribution. The post now points to `cpu_manager_state` for exact assignments.
- Corrected memory exhaustion guidance by pointing to `memory_manager_state` for per-NUMA Memory Manager assignments.
- Replaced the suggestion to disable Topology Manager for a single pod. Topology Manager policy is configured on kubelet nodes, not per pod.
- Updated the `best-effort` policy wording from scheduling to admission.
- Replaced the cgroup validation example with a command that accounts for cgroup v1 and cgroup v2 cpuset files and systemd-style pod UID path encoding.
- Corrected the monitoring command to check `.status.reason=="TopologyAffinityError"` instead of Pending pod conditions.
- Corrected the real-world example so per-NUMA allocations come from kubelet manager state files, not `kubectl describe node`.

## Review Notes
The post is technically valid after the corrections. Some operational commands, such as `strace` against kubelet and direct reads from `/var/lib/kubelet`, require node-level access and elevated privileges. `kubectl` was not installed in the local workspace, so command syntax was verified against official Kubernetes documentation rather than local CLI help.
