# Validation Summary: How to Fix GPU Enabling Errors in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose
- NVIDIA GPU drivers
- NVIDIA Container Toolkit
- Ubuntu Linux

## Sources Consulted
- NVIDIA Container Toolkit install guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html
- NVIDIA Container Toolkit sample workload guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/sample-workload.html
- NVIDIA Container Toolkit platform support: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/supported-platforms.html
- NVIDIA Container Toolkit troubleshooting: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/troubleshooting.html
- Docker Compose GPU support: https://docs.docker.com/compose/how-tos/gpu-support/
- Docker `docker container run` reference: https://docs.docker.com/reference/cli/docker/container/run
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Compose file reference: https://docs.docker.com/compose/compose-file/
- Portainer add container docs: https://docs.portainer.io/sts/user/docker/containers/add
- Portainer advanced container settings: https://docs.portainer.io/user/docker/containers/advanced
- Portainer host setup docs: https://docs.portainer.io/user/docker/host/setup
- Local CLI help for `ubuntu-drivers`: `ubuntu-drivers --help`

## Issues Found
- The post used `ubuntu-drivers autoinstall`, but current Ubuntu CLI help marks `autoinstall` as deprecated and recommends `ubuntu-drivers install`. I updated the driver-install command accordingly.
- The NVIDIA Container Toolkit installation steps skipped the required repository setup dependencies (`ca-certificates`, `curl`, and `gnupg2`). I added the prerequisite install commands from NVIDIA’s current install guide.
- The Docker daemon section overwrote `/etc/docker/daemon.json` manually. NVIDIA’s current guidance is to use `nvidia-ctk runtime configure --runtime=docker --set-as-default` so existing Docker configuration is not replaced. I changed the step to use the official command.
- The CLI validation example used an older pinned CUDA image tag. I replaced it with the current documented `docker run --rm --gpus all ubuntu nvidia-smi` sample flow.
- The Portainer container UI instructions said to leave GPU selection empty for all GPUs. Current Portainer docs describe selecting specific GPUs or using `Use All GPUs`. I corrected that wording.
- The OCI error section incorrectly stated that the error indicates a driver/toolkit version mismatch and recommended reinstalling packages to match versions. NVIDIA’s troubleshooting guidance does not make that one-to-one claim. I changed the section to the documented runtime-hook/debugging workflow instead.
- The Docker Compose section used legacy `version: "3.8"` guidance and claimed GPU reservations require Compose v3.8+. Current Docker docs use the Compose Specification without a required `version` key. I removed the legacy version key, updated the image example, and corrected the note to reflect the current requirements (`capabilities` required, `count` and `device_ids` mutually exclusive).
- The Portainer Business Edition “GPU feature gate” section was inaccurate. Current Portainer docs show GPU visibility is managed under `Host -> Setup` with `Show GPU in the UI` and `Add GPU`. I replaced that section with the current documented path.
- The conclusion said Portainer’s GPU toggle works without additional configuration once the toolkit is installed. That is incomplete because current Portainer environments may also need GPU visibility enabled in `Host -> Setup`. I corrected the conclusion.

## Review Notes
- Portainer’s GPU UI support is currently documented for Docker Standalone environments and NVIDIA GPUs.
- NVIDIA Container Toolkit currently lists Ubuntu 20.04, 22.04, and 24.04 as supported platforms, so the post’s Ubuntu prerequisite remains acceptable for this topic.
- Current Docker documentation treats the Compose `version` field as legacy/optional; future Compose examples should prefer the Compose Specification format without pinning a schema version unless a specific compatibility reason exists.
