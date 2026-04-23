# Validation Summary: How to Set Up Rancher for Media and Entertainment

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- NVIDIA GPU Operator
- FFmpeg with CUDA/NVENC
- Shaka Packager
- MinIO
- KEDA
- RabbitMQ
- NGINX
- RTMP
- HLS

## Sources Consulted
- Kubernetes Jobs: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Services: https://kubernetes.io/docs/concepts/services-networking/service/
- NVIDIA GPU Operator install docs: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/getting-started.html
- NVIDIA FFmpeg with GPU acceleration: https://docs.nvidia.com/video-technologies/video-codec-sdk/13.0/ffmpeg-with-nvidia-gpu/index.html
- Shaka Packager documentation: https://shaka-project.github.io/shaka-packager/html/documentation.html
- Shaka Packager HLS tutorial: https://shaka-project.github.io/shaka-packager/html/tutorials/hls.html
- Shaka Packager live tutorial: https://shaka-project.github.io/shaka-packager/html/tutorials/live.html
- Official Shaka Packager Docker image tags: https://hub.docker.com/r/google/shaka-packager/tags
- MinIO Helm chart reference repository: https://github.com/harshavardhana/charts
- MinIO `mc ilm rule add`: https://docs.min.io/enterprise/aistor-object-store/reference/cli/mc-ilm-rule/mc-ilm-rule-add/
- MinIO `mc ilm tier add`: https://docs.min.io/enterprise/aistor-object-store/reference/cli/mc-ilm-tier/mc-ilm-tier-add/
- KEDA RabbitMQ scaler docs: https://keda.sh/docs/2.19/scalers/rabbitmq-queue/
- `tiangolo/nginx-rtmp` README: https://github.com/tiangolo/nginx-rtmp-docker

## Issues Found
- The Kubernetes `Job` example omitted the required pod `restartPolicy`. I added `restartPolicy: Never` because Jobs only allow `Never` or `OnFailure`.
- The transcoding `Job` used `parallelism: 4` while all pods would process the same input file and write the same output path. I changed it to `parallelism: 1` so the example matches a single-asset transcode instead of an invalid parallel pattern.
- The FFmpeg GPU example used a generic `scale` filter while claiming GPU acceleration. I updated it to use `-hwaccel_output_format cuda` and `scale_cuda`, aligning it with NVIDIA’s documented CUDA/NVENC flow.
- The HLS `Deployment` was missing the required `spec.selector` and matching pod labels. I added both so the manifest is valid for `apps/v1`.
- The Shaka Packager example used an unsupported direct RTMP input. Shaka Packager’s live docs state that UDP is the only live protocol supported directly, so I changed the example to UDP inputs.
- The Shaka Packager container image reference was outdated and non-authoritative. I updated it to the current official Docker image/tag shown on Docker Hub at validation time.
- The HLS example was missing durable output storage. I added a PVC mount for `/out` so generated playlists and segments are not written only to the container filesystem.
- The MinIO install snippet omitted the Helm repository setup and namespace creation. I added `helm repo add`, `helm repo update`, and `--create-namespace`.
- The MinIO lifecycle command used `--storage-class` on `mc ilm rule add`, which is not the documented interface. I replaced it with the documented two-step flow: create a remote tier with `mc ilm tier add`, then reference that tier with `--transition-tier`.
- The MinIO lifecycle example attempted to transition directly to `GLACIER`. I replaced it with a supported remote tier example using S3 tier configuration and `STANDARD-IA`, which matches MinIO’s documented tiering model.
- The KEDA RabbitMQ scaler used deprecated `queueLength` metadata. I replaced it with `mode: QueueLength` and `value: "5"`, which is the current documented form.
- The RTMP ingest `Deployment` was missing the required `spec.selector` and matching pod labels. I added them.
- The RTMP example claimed automatic HLS output on port `8080`, but the default `tiangolo/nginx-rtmp` image only provides a simple RTMP configuration by default. I corrected the description and removed the unsupported HLS port from the manifest.
- The RTMP `Service` was missing its namespace and selector. I added both so it would correctly target the deployment pods in the `streaming` namespace.

## Review Notes
- The NGINX CDN origin snippet is technically plausible, but it assumes the mounted config is included from an existing NGINX `http {}` context; the post does not show the accompanying Deployment or mount wiring.
- The post is operationally Kubernetes-centric rather than Rancher-specific. That is acceptable, but most of the implementation detail applies equally to any Rancher-managed downstream cluster.
- The Shaka Packager image is pinned to the current official tag as of 2026-04-23. That tag may need refreshing in future validations.
