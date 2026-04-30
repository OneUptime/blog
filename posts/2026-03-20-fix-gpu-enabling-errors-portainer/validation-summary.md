# Validation Summary: How to Fix GPU Enabling Errors in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose
- NVIDIA Container Toolkit
- NVIDIA GPUs
- AMD ROCm

## Sources Consulted
- Portainer advanced container settings: https://docs.portainer.io/user/docker/containers/advanced
- Docker CLI `docker container run` reference: https://docs.docker.com/reference/cli/docker/container/run
- Docker Compose GPU support: https://docs.docker.com/compose/how-tos/gpu-support/
- Docker Compose `version` top-level element reference: https://docs.docker.com/reference/compose-file/version-and-name/
- NVIDIA Container Toolkit install and Docker runtime configuration guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/1.17.8/install-guide.html
- ROCm Docker container guidance: https://rocm.docs.amd.com/projects/install-on-linux/en/latest/how-to/docker.html

## Issues Found
- The post implied Portainer's GPU UI applied to both NVIDIA and AMD GPUs. Portainer's current Docker container GPU support is limited to Docker Standalone environments and NVIDIA GPUs, so I corrected the introduction, the Portainer section, and the AMD section to distinguish NVIDIA UI support from AMD manual device mapping.
- The `daemon.json` example incorrectly made `"default-runtime": "nvidia"` look mandatory. Current NVIDIA documentation treats setting the NVIDIA runtime as default as optional, so I changed the example to show only the required runtime registration and pointed readers back to `nvidia-ctk runtime configure --runtime=docker`.
- The `daemon.json` content was embedded inside a Bash code block, which made that example syntactically incorrect as shell. I split the shell commands and JSON configuration into separate fenced blocks.
- The Compose example used the obsolete top-level `version` field. Current Docker Compose documentation marks that field as obsolete, so I removed it and kept the supported GPU reservation syntax under `deploy.resources.reservations.devices`.
- The Docker validation command and CUDA image example were updated to current official examples to reduce version drift and avoid implying a stale CUDA tag is required for a basic runtime check.

## Review Notes
- ROCm documentation recommends `--security-opt seccomp=unconfined` for some HPC-oriented containers, but it is optional and not required for the basic AMD device-mapping example kept in this post.
- Docker was not available in the review workspace, so commands and configuration were verified against official vendor documentation rather than executed locally.
