# Validation Summary: How to Set Up Rancher for Media and Entertainment - Setup

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RKE2
- Kubernetes Jobs, Deployments, HorizontalPodAutoscaler, StorageClass, ConfigMap, and node labeling
- NVIDIA GPU Operator
- Longhorn
- Prometheus Operator / Rancher Monitoring
- FFmpeg with NVIDIA NVENC
- Blender command-line rendering

## Sources Consulted
- NVIDIA GPU Operator getting started: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/getting-started.html
- Kubernetes `kubectl label` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label
- Kubernetes environment variables in commands and args: https://kubernetes.io/docs/tasks/inject-data-application/define-environment-variable-container/
- Kubernetes Jobs: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes Indexed Jobs: https://kubernetes.io/docs/tasks/job/indexed-parallel-processing-static/
- Kubernetes Horizontal Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HPA walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Longhorn storage class parameters: https://longhorn.io/docs/1.11.1/references/storage-class-parameters/
- Longhorn storage tags: https://longhorn.io/docs/1.10.1/nodes-and-volumes/nodes/storage-tags/
- RKE2 GPU operator docs: https://documentation.suse.com/cloudnative/rke2/latest/en/add-ons/gpu_operators.html
- Rancher monitoring enablement docs: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-alerting-guides/enable-monitoring
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Blender command line arguments: https://docs.blender.org/manual/en/latest/advanced/command_line/arguments.html
- FFmpeg codecs documentation: https://ffmpeg.org/ffmpeg-codecs.html
- Local authoritative CLI check: `ffmpeg -hide_banner -h encoder=h264_nvenc`

## Issues Found
- The original GPU node labeling example used a `Node` manifest, which is not the right way to label an already registered node for scheduling. I replaced it with `kubectl label nodes ... --overwrite`, and added `helm repo update` plus `--wait` to make the GPU Operator installation flow current and reliable.
- The transcoding Job used `parallelism` and `completions` without any partitioning mechanism, so multiple Pods would have processed the same source asset and written overlapping output. I changed it to a single Job so the example matches the manifest semantics.
- The FFmpeg example used `-crf` with `h264_nvenc`, which is not a valid NVENC quality-control option. I replaced it with a valid NVENC configuration (`-rc vbr -cq 18`) and made the output an explicit HLS job with a playlist and segment filename pattern.
- The transcoding example referenced S3-style input and output paths without showing any supported transfer mechanism or mounted storage. I changed the example to PVC-backed filesystem paths so the manifest is self-contained and executable as Kubernetes configuration.
- The Longhorn comments described `diskSelector` and `nodeSelector` as labels, but Longhorn uses tags for those fields. I corrected the comments to match the official Longhorn behavior.
- The rendering Job would have rendered the entire frame range in every Pod and did not include an explicit Blender render command. I converted it to an Indexed Job and used `JOB_COMPLETION_INDEX` so each Pod renders exactly one frame via Blender's documented CLI.
- The `apps/v1` Deployment was missing `.spec.selector` and the corresponding pod-template labels, which are required by the Kubernetes API. I added the selector and matching labels.

## Review Notes
- The HPA manifest is syntactically correct for `autoscaling/v2`, but the `active_streams` pod metric requires a working custom metrics API / adapter to exist in the cluster.
- The `PrometheusRule` manifest is valid assuming Rancher Monitoring is installed in the `cattle-monitoring-system` namespace, which matches current Rancher documentation.
- The examples still depend on private images from `registry.studio.internal`; the manifest structure and CLI usage are now correct, but the contents of those private images cannot be independently validated from this repository.
- The conclusion's cluster autoscaler statement is directionally correct, but real scale-out behavior still depends on the underlying node provisioning environment and whether cluster autoscaling is configured for that infrastructure.
