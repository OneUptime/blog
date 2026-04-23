# Validation Summary: How to Configure GPU Resource Limits in Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher
- Kubernetes
- Kubernetes ResourceQuota
- Kubernetes LimitRange
- NVIDIA Kubernetes device plugin
- NVIDIA GPU Feature Discovery
- NVIDIA DCGM Exporter
- AMD GPU device plugin
- HorizontalPodAutoscaler

## Sources Consulted
- Kubernetes Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes JSONPath Support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Rancher Project Resource Quotas: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas
- Rancher Resource Quota Type Reference: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/resource-quota-types
- Rancher Projects workflow: https://ranchermanager.docs.rancher.com/v2.11/api/workflows/projects
- Rancher API Reference: https://ranchermanager.docs.rancher.com/api/api-reference
- NVIDIA Kubernetes device plugin: https://github.com/NVIDIA/k8s-device-plugin
- NVIDIA GPU Feature Discovery labels: https://github.com/NVIDIA/k8s-device-plugin/blob/main/docs/gpu-feature-discovery/README.md
- NVIDIA DCGM Exporter: https://docs.nvidia.com/datacenter/dcgm/latest/gpu-telemetry/dcgm-exporter.html
- NVIDIA DCGM field identifiers: https://docs.nvidia.com/datacenter/dcgm/latest/dcgm-api/dcgm-api-field-ids.html
- AMD GPU Device Plugin for Kubernetes: https://instinct.docs.amd.com/projects/k8s-device-plugin/en/latest/index.html

## Issues Found
- The post listed `nvidia.com/gpu.memory` as a schedulable extended resource. Updated this to explain that it is a node label produced by NVIDIA GPU Feature Discovery, not a standard resource request key.
- The MIG example used the specific resource name `nvidia.com/mig-1g.5gb` as a general GPU type and tied it to A100/H100 broadly. Replaced it with the documented generic pattern `nvidia.com/mig-<slice_count>g.<memory_size>gb` and noted that these resources appear when the NVIDIA device plugin uses the `mixed` MIG strategy.
- The pod example said only that GPU requests and limits must be equal and then stated broadly that Kubernetes does not support GPU overcommit. Clarified this to the upstream Kubernetes rule: extended resource requests and limits must match if both are set, and Kubernetes itself does not overcommit extended resources.
- The `ResourceQuota` example incorrectly included `limits.nvidia.com/gpu`. Removed it because Kubernetes only allows `requests.<extended-resource>` quota keys for extended resources such as GPUs.
- The `LimitRange` section was labeled as setting GPU defaults even though the manifest only set CPU and memory defaults, and its comment incorrectly described a per-pod GPU cap. Updated the heading/comments to reflect what the manifest actually does: set CPU/memory defaults and cap GPU requests per container.
- The Rancher project example used undocumented/invalid `Project` quota fields such as `requestsNvidiaGPU` and an incorrect project manifest pattern for GPU quotas. Replaced it with the current Rancher-supported approach: configure a `Custom` project quota entry using the upstream quota identifier `requests.nvidia.com/gpu`.
- The monitoring examples used brittle field selectors for quota and node output. Updated them to documented `jsonpath` and `custom-columns` forms that handle resource keys containing dots and slashes, and simplified the DCGM exporter pod lookup.

## Review Notes
The HorizontalPodAutoscaler example is syntactically valid for `autoscaling/v2`, but it only works if GPU utilization is exposed through an external/custom metrics adapter. In practice, scaling GPU workloads also depends on free GPU capacity in the cluster or a compatible cluster autoscaler workflow.
