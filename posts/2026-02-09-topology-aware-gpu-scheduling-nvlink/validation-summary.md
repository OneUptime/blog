# Validation Summary: How to Configure Kubernetes Topology-Aware GPU Scheduling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes scheduling, Jobs, node affinity, custom schedulers, device plugins, and Topology Manager
- NVIDIA GPU Operator, NVIDIA Kubernetes device plugin, and GPU Feature Discovery
- NVIDIA NVLink, NVSwitch, and nvidia-smi topology commands
- NCCL topology environment variables
- DCGM Exporter and Prometheus metrics
- Python Kubernetes client

## Sources Consulted
- Kubernetes device plugins and Topology Manager: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins/
- Kubernetes Topology Manager policy configuration: https://kubernetes.io/docs/tasks/administer-cluster/topology-manager/
- Kubernetes multiple schedulers and `spec.schedulerName`: https://kubernetes.io/docs/tasks/extend-kubernetes/configure-multiple-schedulers/
- NVIDIA Kubernetes device plugin configuration: https://github.com/NVIDIA/k8s-device-plugin
- NVIDIA GPU Feature Discovery generated labels and deployment notes: https://github.com/NVIDIA/k8s-device-plugin/blob/main/docs/gpu-feature-discovery/README.md
- NVIDIA GPU Operator Helm values for device plugin config: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/getting-started.html
- NVIDIA nvidia-smi topology and NVLink commands: https://docs.nvidia.com/deploy/nvidia-smi/index.html
- NVIDIA NCCL environment variables, including `NCCL_TOPO_FILE` and `NCCL_TOPO_DUMP_FILE`: https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/env.html
- NVIDIA DCGM Exporter metrics: https://docs.nvidia.com/datacenter/dcgm/latest/gpu-telemetry/dcgm-exporter.html
- NVIDIA DCGM field identifiers: https://docs.nvidia.com/datacenter/dcgm/latest/dcgm-api/dcgm-api-field-ids.html
- NVIDIA NVLink bandwidth specifications: https://www.nvidia.com/object/nvlink.html

## Issues Found
- GPU Feature Discovery was described as discovering topology labels and showed `nvidia.com/gpu.nvlink` labels that are not listed in the current official generated-label set. Changed the wording and example labels to GPU inventory labels such as count, product, family, and memory.
- The GFD image referenced the old standalone `gpu-feature-discovery:v0.8.2` image. Updated it to the maintained `nvcr.io/nvidia/k8s-device-plugin:v0.17.1` image with the `gpu-feature-discovery` command.
- The standalone GFD DaemonSet selected `nvidia.com/gpu.present`, which can be circular before NVIDIA labels exist. Changed it to the NFD PCI vendor label `feature.node.kubernetes.io/pci-10de.present`, and changed later examples to select nodes with the generated `nvidia.com/gpu.count` label.
- The device-plugin configuration invented unsupported `topology.strategy: nvlink-preferred` and `fallback` fields. Replaced that section with Kubernetes kubelet Topology Manager settings and clarified that the NVIDIA device plugin does not provide an NVLink-specific scheduler strategy field.
- The Job manifest omitted `restartPolicy`, which is required for `batch/v1` Jobs and must be `OnFailure` or `Never`. Added `restartPolicy: OnFailure`.
- The node-affinity comment said "Prefer" even though the manifest used required affinity. Changed the comment to "Require".
- The NCCL section showed a hand-written topology XML as if it were the normal way to generate topology files. Replaced it with `NCCL_TOPO_DUMP_FILE` usage, then reusing the dumped file through `NCCL_TOPO_FILE`.
- The Python scheduler overwrote GPU limits instead of summing them, compared raw Kubernetes quantity values directly to integers, ignored already allocated GPUs on candidate nodes, and called `create_namespaced_pod_binding` with the wrong argument order. Updated the example to sum GPU limits, parse them as integers, subtract existing scheduled GPU allocations, and call `create_namespaced_pod_binding(pod_name, namespace, binding)`.

## Review Notes
The custom scheduler remains a simplified example. A production scheduler should also account for taints and tolerations, pod affinity, node conditions, priorities, preemption, concurrent binding races, and scheduler framework plugins or Dynamic Resource Allocation where appropriate.
