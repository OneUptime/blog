# Validation Summary: How to use DaemonSets for GPU device plugins on accelerated nodes

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Kubernetes DaemonSets
- Kubernetes device plugin framework
- NVIDIA Kubernetes device plugin
- AMD ROCm Kubernetes device plugin
- Intel GPU device plugin for Kubernetes
- NVIDIA GPU Operator
- NVIDIA GPU Feature Discovery
- NVIDIA MIG
- kubectl
- Helm

## Sources Consulted
- Kubernetes Device Plugins documentation: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins/
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- NVIDIA k8s-device-plugin documentation and manifests: https://github.com/NVIDIA/k8s-device-plugin
- NVIDIA GPU Operator installation documentation: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/getting-started.html
- NVIDIA GPU Feature Discovery documentation: https://github.com/NVIDIA/k8s-device-plugin/blob/main/docs/gpu-feature-discovery/README.md
- AMD ROCm k8s-device-plugin documentation and manifests: https://github.com/ROCm/k8s-device-plugin
- Intel GPU device plugin documentation: https://intel.github.io/intel-device-plugins-for-kubernetes/cmd/gpu_plugin/README.html
- Intel device plugin releases and supported Kubernetes versions: https://github.com/intel/intel-device-plugins-for-kubernetes/releases

## Issues Found
- The NVIDIA device plugin examples used the older `v0.14.3` image. Updated them to `v0.17.1`, matching the current NVIDIA k8s-device-plugin documentation consulted during review.
- The NVIDIA examples included `NVIDIA_MIG_MONITOR_DEVICES`, which is not a documented NVIDIA device plugin option. Removed it and kept the documented `--mig-strategy` configuration for MIG.
- The AMD example used a specific `rocm/k8s-device-plugin:1.25.2.7` tag and mounted `/dev/dri`, while the official AMD DaemonSet uses the `rocm/k8s-device-plugin` image with kubelet device-plugin and `/sys` mounts. Updated the image and mounts to match the official manifest pattern.
- The Intel example used the outdated `0.27.1` image, an init container pattern that has since been removed, and the incorrect node selector `gpu.intel.com/gpu`. Updated the image to `0.34.0`, removed the init container, added the CDI host path, and changed the node selector to `intel.feature.node.kubernetes.io/gpu`.
- The Intel explanation implied a generic `gpu.intel.com/gpu` resource. Updated it to reference documented resources such as `gpu.intel.com/i915` and `gpu.intel.com/xe`.
- The NVIDIA GPU Operator section showed a hand-written DaemonSet that combined driver installation, device plugin, and metrics exporter containers. Replaced it with the documented Helm installation approach and clarified that the operator manages those components separately.
- The GPU Feature Discovery example used the archived standalone `nvcr.io/nvidia/gpu-feature-discovery:v0.8.2` image and a selector that could prevent the DaemonSet from running before labels are generated. Updated it to use the current `nvcr.io/nvidia/k8s-device-plugin:v0.17.1` image, the `gpu-feature-discovery` command, documented `MIG_STRATEGY` configuration, and node affinity based on NFD/NVIDIA labels.

## Review Notes
The corrected snippets are syntactically valid YAML. Several examples still assume that nodes are labeled or tainted consistently with the snippets, so readers should adapt selectors and tolerations to their cluster's labeling and tainting conventions.
