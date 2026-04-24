# Validation Summary: How to Optimize Portainer Performance on ARM Devices - Optimization

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Community Edition
- Docker Engine and Docker CLI
- containerd
- Linux swap configuration
- Raspberry Pi and ARM single-board computers
- Python Docker images

## Sources Consulted
- Portainer install docs for Docker on Linux (LTS): https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Portainer requirements and prerequisites: https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer ARM architecture FAQ: https://docs.portainer.io/faqs/installing/which-arm-architectures-does-portainer-support
- Portainer Edge Agent docs: https://docs.portainer.io/advanced/edge-agent
- Portainer general settings docs: https://docs.portainer.io/sts/admin/settings/general
- Docker `docker run` resource constraints docs: https://docs.docker.com/engine/containers/run/
- Docker daemon configuration docs: https://docs.docker.com/engine/daemon/
- Docker `dockerd` reference: https://docs.docker.com/reference/cli/dockerd/
- Docker `docker image inspect` reference: https://docs.docker.com/reference/cli/docker/image/inspect/
- Docker `docker buildx imagetools inspect` reference: https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/
- Docker OverlayFS storage driver docs: https://docs.docker.com/engine/storage/drivers/overlayfs-driver/
- Docker JSON-file logging driver docs: https://docs.docker.com/engine/logging/drivers/json-file/
- Python `compileall` docs: https://docs.python.org/3/library/compileall.html
- Raspberry Pi 4 specs: https://www.raspberrypi.com/products/raspberry-pi-4-model-b/specifications/
- Raspberry Pi 5 product page: https://www.raspberrypi.com/products/raspberry-pi-5/
- Raspberry Pi OS 64-bit announcement: https://www.raspberrypi.com/news/raspberry-pi-os-64-bit/
- NVIDIA Jetson Nano page: https://developer.nvidia.com/embedded/jetson-nano
- Orange Pi 5 official hardware pages: https://www.orangepi.org/html/hardWare/computerAndMicrocontrollers/details/Orange-Pi-5.html and https://www.orangepi.org/html/hardWare/computerAndMicrocontrollers/details/Orange-Pi-5-32GB.html

## Issues Found
- The Portainer install command exposed only port `9000`, but current Portainer CE documentation uses `9443` for the UI by default and treats `9000` as legacy HTTP. I updated the example to use the current ports and the documented `portainer/portainer-ce:lts` image tag.
- The `docker run` example used inline comments after line continuations, which breaks the shell command. I removed the inline comments so the command is executable.
- The ARM device table had outdated Raspberry Pi details. I corrected the Raspberry Pi 3 architecture note and updated Raspberry Pi 4 and Raspberry Pi 5 memory ranges to match current official hardware pages.
- The SSD migration section implied that changing Docker's `data-root` alone was sufficient. Current Docker docs note that fresh Docker Engine 29+ installs may also store image data in `/var/lib/containerd`. I added the containerd storage caveat and corrected the config examples accordingly.
- The Step 3 snippet mixed shell commands and raw JSON in one `bash` block, which was not a valid executable example. I split it into separate bash, JSON, and TOML snippets.
- The Docker daemon snippet included `storage-driver: overlay2` as an optimization. Current Docker docs describe `overlay2` as a legacy storage driver on Docker Engine 29+, so I removed that recommendation and kept the valid daemon settings.
- The Step 4 JSON example contained a comment line inside a `json` block, which makes the file invalid. I removed the invalid JSON comment and clarified that the settings must be merged into the existing file.
- The image architecture check used `docker inspect nginx:alpine` without pulling the image first and relied on `docker manifest inspect`. I replaced it with a documented `docker image inspect` workflow and `docker buildx imagetools inspect`.
- The polling advice referred to `Settings → Edge Compute` and a `15s` default heartbeat. Current Portainer docs place the setting under `Settings → General`, and Edge Agents poll every `5` seconds by default. I corrected both the menu path and the default interval.
- The section title referenced Python and Go, but the content only covered Python. I renamed it to Python-only.
- The Python Dockerfile example ran `python -m compileall /app` before any application files were copied into `/app`. I added `WORKDIR` and `COPY` so the example works as described.
- The `vmstat` example printed header rows as well as data rows. I adjusted the `awk` filter to skip the headers and print the `si` and `so` values directly.
- The conclusion claimed Raspberry Pi 4 performance was comparable to a low-spec x86 server. That was broader than the reviewed sources supported, so I softened it to a more defensible performance statement.

## Review Notes
- Portainer's documentation now emphasizes ARM64 as the primary ARM target, while ARMv7 support remains available. Authors should avoid implying that current Portainer releases target ARM32 and ARM64 equally.
- Docker Engine 29 introduced the containerd image store as the default on fresh installs. Any future edits to Docker storage guidance in ARM articles should account for both `/var/lib/docker` and `/var/lib/containerd`.
