# Validation Summary: How to Deploy AI/ML Models at the Edge with K3s - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- K3s
- Kubernetes
- NVIDIA Jetson
- NVIDIA Container Runtime
- NVIDIA Device Plugin for Kubernetes
- TensorFlow Serving
- NVIDIA Triton Inference Server
- Edge AI / ML inference
- GPU scheduling in Kubernetes

## Sources Consulted
- K3s advanced runtime support: https://docs.k3s.io/advanced#nvidia-container-runtime-support
- K3s installation and `INSTALL_K3S_EXEC` behavior: https://docs.k3s.io/installation/configuration
- K3s server CLI options (`--default-runtime` and server/agent flag support): https://docs.k3s.io/cli/server
- K3s auto-deployed manifests directory: https://docs.k3s.io/installation/packaged-components
- Kubernetes Deployment requirements: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes `hostPath` volume types: https://kubernetes.io/docs/concepts/storage/volumes/#hostpath
- NVIDIA k8s-device-plugin README: https://github.com/NVIDIA/k8s-device-plugin
- NVIDIA Triton release notes 23.11: https://docs.nvidia.com/deeplearning/triton-inference-server/release-notes/rel-23-11.html
- NVIDIA Triton release notes 23.12: https://docs.nvidia.com/deeplearning/triton-inference-server/release-notes/rel-23-12.html
- TensorFlow Serving configuration docs: https://www.tensorflow.org/tfx/serving/serving_config
- TensorFlow Serving Docker docs: https://www.tensorflow.org/tfx/serving/docker
- TensorFlow Serving official image tags and architectures: https://hub.docker.com/r/tensorflow/serving/tags
- Jetson `tegrastats` utility docs: https://docs.nvidia.com/jetson/archives/r36.5/DeveloperGuide/AT/JetsonLinuxDevelopmentTools/TegrastatsUtility.html
- TensorFlow for Jetson release notes (`nvidia-smi` support note): https://docs.nvidia.com/deeplearning/frameworks/pdf/Install-TensorFlow-Jetson-Platform-Release-Notes.pdf
- NVIDIA Jetson AGX Orin specifications: https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-agx-orin/

## Issues Found
- The Jetson setup used `nvidia-smi`, which is not the correct monitoring path for Xavier-class Jetson devices. I replaced it with `tegrastats`, which is the documented Jetson monitoring utility.
- The K3s runtime setup used an incorrect containerd template path and an unnecessary manual template override. I replaced that flow with the current K3s-documented runtime auto-detection approach and added explicit `runtimeClassName: nvidia` where GPU workloads need it.
- The NVIDIA device plugin example pinned an older image tag. I updated it to `nvcr.io/nvidia/k8s-device-plugin:v0.17.1` and made the DaemonSet request the `nvidia` runtime so it matches the revised K3s runtime model.
- The TensorFlow section used `nvcr.io/nvidia/tensorflow` as though it were TensorFlow Serving on Jetson. I replaced it with the official `tensorflow/serving:2.19.1-gpu` image, added an `amd64` node selector, and clarified that Jetson users should use Triton instead because the official TensorFlow Serving GPU image is published for `linux/amd64`.
- The post referenced the `ai-edge` namespace without creating it. I added a `Namespace` manifest so the YAML is self-contained.
- The Triton deployment used a generic `23.10-py3` image, which predates Jetson container support in Triton’s published iGPU images. I updated the example to a Jetson-compatible `-igpu` tag and documented the JetPack version caveat from NVIDIA’s release notes.
- The Triton deployment referenced `triton-svc` later in the post, but no such Service was defined. I added the missing Service manifest.
- The `video-capture` Deployment was invalid under `apps/v1` because it had no `.spec.selector` and no matching pod template labels. I added the required selector and labels, and set the `/dev/video0` `hostPath` type to `CharDevice`.
- The monitoring section curled `localhost` ports that were never exposed. I updated those examples to use `k3s kubectl port-forward` before issuing the `curl` requests.
- The hardware table mixed Jetson AGX Orin 64GB performance specs with a 32GB RAM value. I corrected that row to the 64GB variant.

## Review Notes
- The TensorFlow Serving example is now intentionally scoped to `amd64` NVIDIA GPU nodes. That limitation comes from the official TensorFlow Serving GPU image publication model, not from K3s itself.
- The Triton example uses a JetPack 6.x-style `-igpu` image tag. JetPack 5.1.2 users need the Jetson-specific build path noted in the post.
- The post assumes model artifacts already exist under `/data/ml-models` and `/data/triton-models`; that is acceptable for a deployment guide, but it is not a full model export or packaging walkthrough.
