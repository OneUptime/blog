# Validation Summary: How to Use Topology Manager to Align CPU, Memory, and Device Allocations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes kubelet
- Kubernetes Topology Manager
- Kubernetes CPU Manager
- Kubernetes Memory Manager
- Kubernetes Device Manager and device plugins
- NUMA, cpuset, huge pages, GPUs, and SR-IOV devices

## Sources Consulted
- Kubernetes documentation: Control Topology Management Policies on a node: https://kubernetes.io/docs/tasks/administer-cluster/topology-manager/
- Kubernetes documentation: Control CPU Management Policies on the Node: https://kubernetes.io/docs/tasks/administer-cluster/cpu-management-policies/
- Kubernetes documentation: Control Memory Management Policies on a Node: https://kubernetes.io/docs/tasks/administer-cluster/memory-manager/
- Kubernetes documentation: Resource managers: https://kubernetes.io/docs/concepts/policy/node-resource-managers/
- Kubernetes documentation: Device Plugins: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins/
- Kubernetes documentation: Kubelet Configuration v1beta1: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes documentation: About cgroup v2: https://kubernetes.io/docs/concepts/architecture/cgroups/

## Issues Found
- The post described Topology Manager as guaranteeing that all pod resources come from one NUMA node. Updated the wording to explain that it coordinates topology hints from participating managers and plugins, and that strict policies apply to resources with usable topology hints.
- The initial `memoryManagerPolicy: Static` example omitted required `reservedMemory`, and `cpuManagerPolicy: static` omitted an explicit CPU reservation. Added `reservedMemory` and `reservedSystemCPUs` so the kubelet configuration reflects current Memory Manager and CPU Manager requirements.
- The restart procedure deleted manager state files without draining the node or explaining when deletion is appropriate. Updated the sequence to drain and uncordon the node, and clarified that checkpoint deletion is for policy changes or recovery, not routine restarts.
- The `restricted` and `single-numa-node` policy descriptions were too broad. Updated them to match Kubernetes admission behavior: `restricted` rejects non-preferred hints, while `single-numa-node` requires a single NUMA affinity where topology hints are available.
- The pod-alignment section incorrectly implied only Guaranteed pods with whole CPU requests get any topology consideration. Updated it to distinguish CPU Manager exclusive CPU allocation from Memory Manager `Static` topology hints.
- The verification commands treated `cpuset.cpus` as a NUMA node value and used cgroup v1 paths that are not reliable on cgroup v2 systems. Replaced them with `/proc/<pid>/status` checks for allowed CPU and memory node lists plus `lscpu` mapping.
- The GPU and DPDK sections implied device alignment always works. Updated them to require device plugins that report NUMA topology through Kubernetes device plugin topology information.
- The reserved-memory example did not account for Kubernetes memory eviction thresholds and described CPU reservation as per-NUMA. Updated the example and wording to focus on per-NUMA memory reservation.
- The monitoring section claimed a basic `kubectl get pods` command counted pods by NUMA node. Updated the text to clarify that pod lists do not expose NUMA placement and that kubelet metrics or the pod-resources API are needed for topology-level monitoring.
- The node-affinity example implied `numa.node.count` is automatic. Clarified that it only works when nodes are accurately labeled.
- The troubleshooting command queried non-existent `configz` keys. Updated it to use `cpuManagerPolicy`, `memoryManagerPolicy`, `topologyManagerPolicy`, and `topologyManagerScope`.
- The conclusion described Topology Manager as scheduler-level NUMA-aware scheduling. Updated it to describe kubelet admission and allocation.

## Review Notes
- The YAML snippets were checked for syntax after editing.
- The post remains version-general; readers should still check Kubernetes version-specific docs for feature gates and newer Topology Manager policy options.
