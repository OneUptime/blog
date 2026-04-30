# Validation Summary: How to Set Up GPU Containers for ML Workloads in Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose / Compose specification
- NVIDIA GPUs
- NVIDIA Container Toolkit
- Docker volumes

## Sources Consulted
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add
- Portainer advanced container settings, including GPU support: https://docs.portainer.io/user/docker/containers/advanced
- Portainer container statistics docs: https://docs.portainer.io/user/docker/containers/stats
- Portainer Configs docs: https://docs.portainer.io/user/docker/configs
- Docker Compose GPU support: https://docs.docker.com/compose/gpu-support/
- Docker Compose file reference: services: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker volumes reference: https://docs.docker.com/engine/storage/volumes/
- Docker Compose volumes reference: https://docs.docker.com/reference/compose-file/volumes/
- Docker Swarm configs reference: https://docs.docker.com/engine/swarm/configs/
- NVIDIA Container Toolkit install guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html
- NVIDIA Container Toolkit sample workload: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/sample-workload.html
- NVIDIA specialized Docker configuration for GPUs: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/docker-specialized.html

## Issues Found
- The original prerequisites omitted the actual GPU requirements. I replaced the generic Docker/Compose checklist with the host requirements Portainer and NVIDIA GPU containers actually need: Docker Standalone, NVIDIA GPU driver, NVIDIA Container Toolkit, and host-level access.
- The original environment check used generic resource commands and a CUDA image test, but it never configured Docker for the NVIDIA runtime. I replaced that with the documented `nvidia-ctk runtime configure --runtime=docker` flow and the official NVIDIA sample workload verification command.
- The original stack example used `relevant-image:latest`, commented-out GPU reservations, and an HTTP healthcheck for an undefined application. I replaced it with a real GPU-capable container image, active GPU device reservations, and NVIDIA environment variables that match NVIDIA's documented container runtime behavior.
- The original post told readers to use Portainer's Configs section for application configuration in a Docker setup. That is incorrect for Docker Standalone because Docker configs are a Swarm feature. I corrected the guidance to use environment variables in the stack file or Portainer's environment variable form.
- The original verification section assumed an HTTP service on port `8080` with a `/health` endpoint, but the post never defined such a service. I replaced those checks with container startup and `nvidia-smi` verification commands that directly validate GPU access.
- The original persistence section implied extra volume configuration was required for persistence. I corrected this to explain that named volumes already persist, and I provided a bind-mount example only for users who need host-path access.
- The original monitoring section claimed Portainer's built-in monitoring plus Prometheus scraping with an incomplete snippet and an assumed `/metrics` endpoint. I corrected this to Portainer container stats plus `nvidia-smi`, and clarified that Prometheus scraping depends on the application exposing its own metrics endpoint.
- The original backup example referenced `app-data` directly, which may not match the real volume name created by a Portainer stack. I fixed the stack to use explicit volume names and updated the backup script to target the correct named volume.

## Review Notes
- The updated stack uses the current Compose-style schema without a top-level `version`, because Docker now treats that field as obsolete.
- The post is now scoped to Docker Standalone behavior in Portainer. Portainer's direct GPU controls in the UI are documented for Docker Standalone and NVIDIA GPUs.
- The sample container demonstrates verified GPU access, not a full training or inference application. Readers still need to substitute their actual ML image and workload command for production use.
