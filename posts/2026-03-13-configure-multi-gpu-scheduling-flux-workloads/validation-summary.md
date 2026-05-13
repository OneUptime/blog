# Validation Summary: How to Configure Multi-GPU Scheduling with Flux Managed Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Kustomization
- Kubernetes Deployments and Jobs
- Kubernetes node affinity and pod anti-affinity
- Kubernetes topology spread constraints
- Kubernetes GPU extended resources
- NVIDIA GPU Operator, GPU Feature Discovery, and device plugin
- kubectl
- jq

## Sources Consulted
- Kubernetes documentation: Schedule GPUs - https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/
- Kubernetes documentation: Assigning Pods to Nodes - https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes documentation: Pod Topology Spread Constraints - https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes documentation: Indexed Job for Parallel Processing with Static Work Assignment - https://kubernetes.io/docs/tasks/job/indexed-parallel-processing-static/
- Kubernetes documentation: Well-Known Labels, Annotations and Taints - https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes documentation: kubectl label - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Flux documentation: Kustomization - https://fluxcd.io/flux/components/kustomize/kustomizations/
- NVIDIA GPU Operator documentation: Installing the NVIDIA GPU Operator - https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/25.10/getting-started.html
- NVIDIA k8s-device-plugin documentation: GPU Feature Discovery - https://github.com/NVIDIA/k8s-device-plugin/blob/main/docs/gpu-feature-discovery/README.md

## Issues Found
- The post said the GPU Operator's Node Feature Discovery component adds `nvidia.com/gpu.*` labels automatically. NVIDIA documents those labels as GPU Feature Discovery labels, while NFD is the underlying node-feature dependency. Changed the wording to GPU Feature Discovery.
- The single-node Deployment comment said "at least 4 A100 GPUs", but the affinity used `operator: In` with only `"4"` and `"8"`, which would not match larger valid GPU counts. Changed the `nvidia.com/gpu.count` selector to `operator: Gt` with value `"3"`.
- The Flux-managed Job did not include a Flux force annotation. Since Kubernetes Job pod templates are effectively immutable for common updates, Flux documents `kustomize.toolkit.fluxcd.io/force: Enabled` as the apply behavior used to recreate Jobs. Added that annotation to the Job metadata.
- The Job pod anti-affinity selector used the deprecated `job-name` label. Kubernetes documents the current label as `batch.kubernetes.io/job-name`. Updated the selector accordingly.
- The Best Practices section used the incomplete field name `requiredDuringScheduling`. Updated it to the valid Kubernetes field name `requiredDuringSchedulingIgnoredDuringExecution`.

## Review Notes
- The GPU resource examples specify `nvidia.com/gpu` in both `requests` and `limits` with equal values, which is accepted by Kubernetes. Kubernetes also allows specifying only the GPU limit, because it copies the limit to the request.
- The topology spread examples are syntactically valid, but they depend on all eligible nodes having consistent `kubernetes.io/hostname` and `topology.kubernetes.io/zone` labels.
- The Indexed Job example manually exposes `batch.kubernetes.io/job-completion-index` through the Downward API. Kubernetes also automatically exposes `JOB_COMPLETION_INDEX` for Indexed Jobs in current versions, so the explicit environment variable is redundant but still correct.
