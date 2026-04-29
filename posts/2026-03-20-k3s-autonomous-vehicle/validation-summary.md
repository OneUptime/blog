# Validation Summary: How to Configure K3s for Autonomous Vehicle Edge Computing

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- NVIDIA DRIVE AGX Orin
- NVIDIA Jetson AGX Orin
- NVIDIA Kubernetes device plugin
- Rancher system-upgrade-controller
- GPU scheduling and `RuntimeClass`
- Kubelet CPU and node allocatable tuning

## Sources Consulted
- K3s Advanced Options / Configuration: https://docs.k3s.io/advanced
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Automated Upgrades: https://docs.k3s.io/upgrades/automated
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes DaemonSet: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes Reserve Compute Resources for System Daemons: https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/
- Kubernetes Kubelet Configuration API: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes CPU Management Policies: https://kubernetes.io/docs/tasks/administer-cluster/cpu-management-policies/
- NVIDIA k8s-device-plugin: https://github.com/NVIDIA/k8s-device-plugin
- NVIDIA DRIVE AGX Orin developer platform overview: https://developer.nvidia.com/drive/drive-agx
- NVIDIA DRIVE autonomous driving safety report: https://docs.nvidia.com/self-driving-cars/autonomous-driving-safety-report/introduction/index.html
- NVIDIA Jetson `tegrastats` utility: https://docs.nvidia.com/jetson/archives/r36.5/DeveloperGuide/AT/JetsonLinuxDevelopmentTools/TegrastatsUtility.html

## Issues Found
- The DRIVE AGX Orin hardware block included incorrect specs and used `nvidia-smi`, which is not the right validation tool for Tegra-based embedded systems. I corrected the hardware notes, replaced `nvidia-smi` with `tegrastats`, and updated the package check to match DRIVE OS / JetPack package naming.
- The GPU verification step implied that `nvidia.com/gpu` would appear after installing K3s alone. K3s and NVIDIA documentation show that GPU resources are exposed after deploying the NVIDIA device plugin, so I added the official device-plugin installation and enabled CPUManager compatibility because the post uses `cpu-manager-policy=static`.
- The comment for `enforce-node-allocatable=pods` was inaccurate. That setting enforces pod usage against node allocatable; it does not strictly enforce container memory limits. I corrected the explanation.
- The `object-detection` and `path-planner` `Deployment` examples were invalid because `apps/v1` Deployments require `.spec.selector` and matching `.spec.template.metadata.labels`. I added the missing fields.
- The OTA section used `upgrade.cattle.io/v1` `Plan` resources without first installing the system-upgrade-controller CRD and controller. I added the official installation command and clarified the channel URL semantics.
- The telemetry `DaemonSet` was missing `template.metadata.labels`, which must match the selector. I added the missing labels.
- The workload manifests targeted the `av-stack` namespace without creating it first. I added the namespace creation command before the deployment steps.
- The sample OTA and fleet endpoints used arbitrary example domains. I switched them to reserved `example.com` placeholders to keep the examples safely illustrative.

## Review Notes
- The NVIDIA device-plugin install path in the article now uses Helm because NVIDIA’s official chart exposes the CPUManager compatibility setting needed by this post’s static CPU manager configuration.
- These kubelet settings improve isolation and latency predictability, but they should be understood as tuning for near-real-time workloads rather than as hard real-time guarantees.
