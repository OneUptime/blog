# Validation Summary: How to Enable GPU Support for Containers in Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose / Compose Deploy Specification
- NVIDIA Container Toolkit
- NVIDIA GPUs
- CUDA environment variables
- `nvidia-smi`

## Sources Consulted
- NVIDIA Container Toolkit install guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html
- NVIDIA Container Toolkit sample workload guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/1.17.8/sample-workload.html
- NVIDIA CUDA Programming Guide (`CUDA_VISIBLE_DEVICES`): https://docs.nvidia.com/cuda/cuda-programming-guide/05-appendices/environment-variables.html
- NVIDIA Container Toolkit Docker specialized configuration (`NVIDIA_DRIVER_CAPABILITIES`): https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/1.17.8/docker-specialized.html
- Docker `docker run` reference: https://docs.docker.com/reference/cli/docker/container/run/
- Docker Compose GPU support guide: https://docs.docker.com/compose/how-tos/gpu-support/
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Compose version/name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer advanced container settings: https://docs.portainer.io/user/docker/containers/advanced
- Portainer Docker Standalone host setup: https://docs.portainer.io/user/docker/host/setup?fallback=true
- Portainer Docker Swarm setup: https://docs.portainer.io/sts/user/docker/swarm/setup

## Issues Found
- The NVIDIA Container Toolkit installation commands used the older `nvidia-docker` repository layout and `apt-key`, which is deprecated in current Debian/Ubuntu guidance. Updated both the Debian/Ubuntu and RHEL/CentOS/Fedora install snippets to match the current NVIDIA repository setup and package installation flow.
- The verification command used a fixed CUDA image tag. Updated it to `docker run --rm --gpus all ubuntu nvidia-smi`, which matches NVIDIA's current sample workload guidance and avoids tying the test to a specific CUDA image version.
- The stack example included a top-level `version: "3.8"` field. Removed it because current Docker Compose documentation marks the top-level `version` field as obsolete.
- The inference service reserved all GPUs but also set `CUDA_VISIBLE_DEVICES=0`, which restricted visibility back down to a single device. Removed that environment variable so the example matches its own "all GPUs" reservation.
- The individual-container example used `CUDA_VISIBLE_DEVICES=all`, which is not a valid CUDA setting. Updated the example to rely on `--gpus all`, and corrected the troubleshooting guidance to describe valid `CUDA_VISIBLE_DEVICES` usage.
- The Compose examples used `capabilities: [gpu, compute, utility]` and `capabilities: [gpu, video]`. Updated those reservations to `capabilities: [gpu]` and moved the NVENC-specific driver feature selection to `NVIDIA_DRIVER_CAPABILITIES=video,utility`. This is an inference from Docker's Compose device reservation docs, which reserve GPU devices with `capabilities: [gpu]`, and NVIDIA's driver-capability docs, which separately document `compute`, `utility`, and `video` as driver features exposed through `NVIDIA_DRIVER_CAPABILITIES`.
- The Portainer instructions did not make the Docker Standalone limitation explicit. Updated the stack and container UI sections to clarify that Portainer GPU UI support is for Docker Standalone environments, and added the required Portainer setup note to enable **Show GPU in the UI** and add the host GPU under **Environment details > Setup**.
- The troubleshooting command that reconfigures Docker omitted `sudo`. Added `sudo` to both commands because this is a host-level Docker runtime configuration change.

## Review Notes
- The post remains valid as a practical guide after the corrections above.
- The community workload images (`ollama/ollama`, `ghcr.io/automatic1111/stable-diffusion-webui`, and `jrottenberg/ffmpeg`) were treated as illustrative examples. The technical validation focused on the Docker, Portainer, NVIDIA Container Toolkit, and GPU configuration semantics that determine whether the examples are configured correctly.
- Rootless Docker requires extra NVIDIA Container Toolkit configuration beyond the standard `nvidia-ctk runtime configure --runtime=docker` flow. NVIDIA documents that separately, so the post should still be read as a standard Docker daemon setup guide rather than a rootless Docker guide.
