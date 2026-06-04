# Validation Summary: How to Configure CPU Manager Static Policy for Guaranteed CPU Pinning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes kubelet
- Kubernetes CPU Manager
- Kubernetes Topology Manager
- Kubernetes Memory Manager
- Kubernetes Pod QoS classes
- Linux cgroups and cpuset
- Prometheus / node_exporter

## Sources Consulted
- Kubernetes documentation: Control CPU Management Policies on the Node - https://kubernetes.io/docs/tasks/administer-cluster/cpu-management-policies/
- Kubernetes documentation: Resource Managers - https://kubernetes.io/docs/concepts/workloads/resource-managers/
- Kubernetes documentation: Pod Quality of Service Classes - https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes documentation: Control Topology Management Policies on a Node - https://kubernetes.io/docs/tasks/administer-cluster/topology-manager/
- Kubernetes documentation: About cgroup v2 - https://kubernetes.io/docs/concepts/architecture/cgroups/
- Kubernetes KubeletConfiguration v1beta1 API reference - https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/

## Issues Found
- The post claimed CPU Manager static policy eliminates CPU throttling and context switching. Kubernetes documentation states exclusive containers are bounded by cpuset instead of CFS quota, but context switching and system process interference are not eliminated. Updated wording to "reduced" and "helps".
- The initial kubelet static policy examples omitted the required nonzero CPU reservation. Added `kubeReserved.cpu: "1"` to the configuration example and `--kube-reserved=cpu=1` to the flag example.
- The CPU Manager state-file instructions did not drain the node before changing policy. Updated the command sequence to drain, stop kubelet, remove `/var/lib/kubelet/cpu_manager_state`, start kubelet, and uncordon.
- The post described Guaranteed pods as the allocation unit. Kubernetes CPU Manager assigns exclusive CPUs to eligible containers in Guaranteed pods. Updated the relevant wording.
- The verification command used a cgroup v1-specific cpuset path that is not reliable on cgroup v2 or systemd cgroup-driver nodes. Replaced it with a process-level `Cpus_allowed_list` check using the container PID.
- The shared-pool section implied CPU exclusivity was absolute. Kubernetes documents that kubelet and container runtime processes can still run on exclusive CPUs by default. Added a note about `reservedSystemCPUs` and `strict-cpu-reservation`.
- The NUMA section claimed CPU Manager and Topology Manager align CPU, memory, and devices together. Memory alignment requires Memory Manager participation. Updated the wording to distinguish CPU/device alignment from memory alignment.
- The HPC section claimed MPI ranks run with no context switching. Updated it to reduced interference from other pods.
- The Prometheus query was invalid PromQL. Replaced it with `sum by (cpu) (rate(node_cpu_seconds_total{mode!="idle"}[5m]))`.
- The `full-pcpus-only` explanation incorrectly said pods must request multiples of the physical CPU count. Updated it to state that the policy allocates complete physical cores and admits pods only when whole physical cores can satisfy the CPU request.

## Review Notes
The post is technically relevant and the examples use current Kubernetes kubelet configuration fields. Future improvements could add version-specific caveats for newer pod-level resource manager behavior and include a dedicated Memory Manager example when discussing NUMA-aligned memory.
