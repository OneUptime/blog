# Validation Summary: How to Enable GPU Support for Containers in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- NVIDIA GPUs
- NVIDIA Container Toolkit
- Linux container runtime settings

## Sources Consulted
- Portainer Documentation: Advanced container settings - https://docs.portainer.io/user/docker/containers/advanced
- Docker Docs: `docker container run` reference - https://docs.docker.com/reference/cli/docker/container/run
- Docker Docs: Running containers - https://docs.docker.com/engine/containers/run/
- Docker Docs: Networking - https://docs.docker.com/engine/network/
- NVIDIA Container Toolkit: Docker runtime guide - https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/1.13.5/runtime/docker.html

## Issues Found
- The introduction said Portainer exposes Docker's "full feature set" through the UI. I changed this to "many of Docker's container runtime settings" because the Portainer docs document a substantial subset of runtime options, not the entirety of Docker functionality.
- The Portainer UI paths used `Advanced settings` and `GPUs`, which do not match the current Portainer documentation. I corrected them to `Advanced container settings > Runtime & Resources > Runtime > Devices`, `Advanced container settings > Runtime & Resources > Runtime > Sysctls`, and `Advanced container settings > Runtime & Resources > GPU`.
- The GPU section did not mention Portainer's documented limitation that GPU support is currently available only for Docker Standalone environments and only for NVIDIA GPUs. I added that constraint and kept the host prerequisite for NVIDIA Container Toolkit.
- The GPU example used `tensorflow/tensorflow:latest-gpu` with `python train.py`, which depends on a training script being present in the container and is not the documented Docker/NVIDIA validation path. I replaced it with the documented `docker run --rm --gpus all nvidia/cuda nvidia-smi` example.
- Several example commands used placeholder or brittle images (`myimage:latest`, `pytorch/pytorch:latest`, `myapp:latest`, `systool:latest`) that were not guaranteed to exist or keep the container running. I replaced them with self-contained `busybox:latest sleep 3600` examples so the commands are runnable as written.
- The sysctl example used `net.ipv4.tcp_tw_reuse=1`, which is not a Docker-documented example for container sysctls. I replaced the snippet with the documented `net.ipv4.ip_forward=1` example.
- The privileged mode note said privileged containers have "full host access". I corrected this to the more accurate Docker wording that privileged containers receive extended privileges and host device access.

## Review Notes
- The local environment does not have the Docker CLI installed, so command validation was performed against official Portainer, Docker, and NVIDIA documentation rather than live execution.
- The external links in the post resolve successfully as of 2026-05-01.
