# Validation Summary: How to Map Devices to Containers in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine CLI
- Linux devices and capabilities
- Linux sysctls and shared memory
- NVIDIA Container Toolkit
- TensorFlow Docker images

## Sources Consulted
- Portainer Documentation: Add a new container — https://docs.portainer.io/sts/user/docker/containers/add
- Portainer Documentation: Advanced container settings — https://docs.portainer.io/sts/user/docker/containers/advanced
- Docker Docs: `docker container run` reference — https://docs.docker.com/reference/cli/docker/container/run
- Docker Docs: Running containers — https://docs.docker.com/engine/containers/run/
- Docker Docs: Security — https://docs.docker.com/engine/security/
- NVIDIA Documentation: Installing the NVIDIA Container Toolkit — https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/1.17.6/install-guide.html
- TensorFlow Documentation: Docker — https://www.tensorflow.org/install/docker

## Issues Found
- The introduction said Portainer exposes Docker's full feature set through the UI. I changed this to a broad range of Docker runtime options because Portainer documents a defined set of advanced container settings rather than every Docker CLI flag.
- The Portainer UI paths used `Advanced settings` and `GPUs`. I updated them to `Advanced container settings` and `GPU` to match current Portainer documentation.
- The GPU section did not mention Portainer's documented limitation to Docker Standalone environments and NVIDIA GPUs. I added that caveat.
- The GPU example used `python train.py`, which depended on an unspecified script inside the container. I replaced it with TensorFlow's documented GPU verification command.
- The Linux capabilities example used `nginx:latest` after dropping all capabilities except `NET_BIND_SERVICE` and `CHOWN`, which is not a reliable minimal example. I replaced it with a simple `python -m http.server 80` example that directly demonstrates `NET_BIND_SERVICE`.
- The shared memory and privileged-mode examples used placeholder or non-guaranteed runnable images in detached mode. I replaced them with runnable `ubuntu:24.04 sleep infinity` examples.
- The DNS example included `--dns-search`, but Portainer's documented container UI exposes primary and secondary DNS server fields, not a DNS search-domain field. I removed `--dns-search`, switched to a runnable image, and added the correct Portainer UI location.
- The device mapping example used shorthand `--device /dev/snd` and a placeholder image. I changed it to explicit host-to-container device mapping and a runnable container example.
- The sysctl example used `net.ipv4.tcp_tw_reuse=1`. I replaced it with Docker's documented `net.ipv4.ip_forward=1` example to avoid ambiguity and keep the command aligned with official documentation.

## Review Notes
- Docker command syntax and Portainer UI mappings were validated against current official documentation as of 2026-04-29.
- The Docker commands were reviewed for correctness against documentation, but they were not executed in this workspace.
- GPU access in Portainer is documented as Docker Standalone only and NVIDIA only, so readers using other runtimes or accelerator types will need different setup steps.
