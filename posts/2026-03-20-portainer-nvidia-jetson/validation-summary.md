# Validation Summary: How to Install Portainer on NVIDIA Jetson for AI Edge Deployments

## Status
validated

## Post Type
Guide

## Technologies Covered
- NVIDIA Jetson
- NVIDIA JetPack
- Docker
- NVIDIA Container Runtime / NVIDIA Container Toolkit
- Portainer CE
- Portainer Edge Agent
- Docker Compose / Portainer Stacks
- PyTorch containers on Jetson
- tegrastats

## Sources Consulted
- Portainer CE install on Docker/Linux: https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer Edge Agent install guidance: https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer requirements and supported architectures: https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer ARM architecture support FAQ: https://docs.portainer.io/faqs/installing/which-arm-architectures-does-portainer-support
- Portainer container stats documentation: https://docs.portainer.io/sts/user/docker/containers/stats
- Docker Compose GPU support: https://docs.docker.com/compose/how-tos/gpu-support/
- Docker Compose deploy device reservations reference: https://docs.docker.com/reference/compose-file/deploy/
- NVIDIA Container Toolkit install/configure guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html
- NVIDIA Jetson Docker setup guide: https://docs.nvidia.com/jetson/agx-thor-devkit/user-guide/latest/setup_docker.html
- NVIDIA PyTorch for Jetson release notes / compatibility table: https://docs.nvidia.com/deeplearning/frameworks/install-pytorch-jetson-platform-release-notes/pytorch-jetson-rel.html
- NVIDIA TensorFlow for Jetson release notes (`nvidia-smi` unsupported on Jetson): https://docs.nvidia.com/deeplearning/frameworks/install-tf-jetson-platform-release-notes/tf-jetson-rel.html
- NVIDIA tegrastats utility documentation: https://docs.nvidia.com/jetson/archives/r36.5/DeveloperGuide/AT/JetsonLinuxDevelopmentTools/TegrastatsUtility.html

## Issues Found
- The original Docker GPU test used `nvidia-smi`, which NVIDIA documents as unsupported on Jetson. I replaced it with a Jetson-compatible PyTorch container check using `torch.cuda.is_available()`.
- The original post claimed JetPack 5.x/6.x "includes Docker". Current NVIDIA guidance is more nuanced: Docker and the NVIDIA runtime may need to be installed or configured separately depending on how Jetson was flashed. I corrected the prerequisite to require Docker and the NVIDIA runtime to be configured.
- The original Portainer install used `portainer/portainer-ce:latest`. Current Portainer install docs use release-stream tags such as `:sts`; I updated the example accordingly.
- The original Edge Agent example used `portainer/agent:latest` and omitted `EDGE_INSECURE_POLL=1`, even though the same post installs Portainer with the default self-signed TLS certificate on `9443`. I changed the image tag to match the server stream and added the insecure poll flag for the default self-signed setup.
- The original "AI inference container" stack used a JetPack-6-specific image tag despite claiming to support JetPack 5.x and 6.x, and it exposed port `8080` without actually running an inference service. I changed the example to a Jetson-compatible AI workload container that stays running and clearly requires a tag matching the device's JetPack version.
- The original monitoring section said to deploy "Prometheus + NVIDIA Jetson Stats Exporter" but only provided a single unverified exporter container snippet. I replaced it with NVIDIA's official `tegrastats` utility for Jetson metrics.
- The original Portainer capability bullet implied native GPU metrics monitoring in Portainer. Portainer's documented built-in stats are CPU, memory, network, I/O, and processes. I reworded the claim to avoid overstating Portainer's built-in GPU monitoring.
- The original framework note overclaimed Jetson-specific NGC builds for "most AI frameworks" including ONNX. I narrowed this to verified NVIDIA-provided Jetson-compatible containers and wheels for PyTorch and TensorFlow.
- The original power-mode recommendation implied `sudo nvpmodel -m 0` is universally the max-performance setting. Power profiles vary by module, so I changed this to a module-specific recommendation with `-m 0` as an example used on many Jetson devices.

## Review Notes
- The stack example now uses a compatibility placeholder for the PyTorch image tag because NVIDIA's Jetson container compatibility depends on the exact JetPack/L4T release.
- The post still uses a Compose `version: "3.8"` header. Docker now treats the top-level `version` field as obsolete but still accepts it for backward compatibility, so it was left in place.
