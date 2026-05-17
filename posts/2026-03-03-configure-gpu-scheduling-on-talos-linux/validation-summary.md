# Validation Summary: How to Configure GPU Scheduling on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, talosctl)
- Kubernetes (PriorityClass, ResourceQuota, node affinity, kubelet topology manager)
- NVIDIA Kubernetes device plugin (time-slicing, per-node configs)
- NVIDIA GPU Operator and MIG Manager (mig-parted ConfigMap)
- NVIDIA MIG (Multi-Instance GPU) on A100/A30/H100
- Helm

## Sources Consulted
- NVIDIA k8s-device-plugin documentation and chart values (github.com/NVIDIA/k8s-device-plugin) — time-slicing schema (`sharing.timeSlicing.renameByDefault`, `failRequestsGreaterThanOne`, `resources[].name`, `replicas`), `MIG_STRATEGY` resource naming, per-node `nvidia.com/device-plugin.config` label
- NVIDIA GPU Operator / MIG Manager docs (docs.nvidia.com/datacenter/cloud-native/gpu-operator) — `default-mig-parted-config` ConfigMap in `gpu-operator` namespace, `nvidia.com/mig.config` label, MIG profiles for A100 40GB (1g.5gb, 2g.10gb, 3g.20gb, 7g.40gb)
- Kubernetes documentation — PriorityClass / `preemptionPolicy`, ResourceQuota for extended resources (`requests.nvidia.com/gpu`), node affinity, kubelet Topology Manager policies (`none`, `best-effort`, `restricted`, `single-numa-node`) and scopes (`container`, `pod`)
- Talos Linux documentation (talos.dev) — machine config schema for `machine.kubelet.extraArgs`, `talosctl apply-config --patch` syntax, immutability constraints (no host shell, no host `nvidia-smi`)
- NVIDIA GPU Feature Discovery — `nvidia.com/gpu.product` label exposure

## Issues Found
1. **Bogus `talosctl -- nvidia-smi` command** (MIG enable section): The original post showed `talosctl -n <gpu-node-ip> -- nvidia-smi -i 0 --multi-instance-gpu 1` to enable MIG. This is invalid — `talosctl` has no `-- <command>` passthrough, and Talos Linux is an immutable OS with no shell and no `nvidia-smi` binary on the host. Removed the bogus command and clarified that MIG enablement on Talos is handled by the GPU Operator's MIG Manager, which is precisely what the rest of that section describes via the mig-parted ConfigMap and `nvidia.com/mig.config` label.
2. **Missing `##` markdown heading** on "Resource Quotas for GPU" — fixed by adding the heading prefix so the section renders correctly and matches the rest of the document structure.

## Review Notes
- The MIG profile name `mixed` used in `kubectl label node <gpu-node> nvidia.com/mig.config=mixed --overwrite` is correct here because the post's own `default-mig-parted-config` ConfigMap defines a profile literally named `mixed`. (Note for readers: `mixed` is unrelated to the `MIG_STRATEGY=mixed` device-plugin strategy — they are distinct concepts that happen to share a word.)
- The `nvidia.com/mig-1g.5gb` resource name in the pod spec assumes `MIG_STRATEGY=mixed` on the device plugin. This is the natural choice given the heterogeneous `mixed` profile defined above, but the post does not explicitly call out that the strategy must be set accordingly — readers using `MIG_STRATEGY=single` would need to request `nvidia.com/gpu` instead.
- The kubelet topology manager policy is best applied cluster-wide (or to GPU node pools) and may need to be paired with the CPU Manager's `static` policy and `reserved-cpus` for full topology awareness; the post correctly limits its scope to topology manager.
- For an even cleaner Talos workflow, readers may prefer `talosctl patch machineconfig --patch @file.yaml --nodes <ip>` over `apply-config --patch`, though both are valid.
- The post mentions "GAS (GPU-Aware Scheduling)" but does not link to or further describe it; the kubelet topology manager covered immediately after is functionally what's configured.
