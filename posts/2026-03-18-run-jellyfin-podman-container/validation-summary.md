# Validation Summary: How to Run Jellyfin in a Podman Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Jellyfin
- Podman
- Linux containers
- Jellyfin container image
- VA-API hardware transcoding
- NVIDIA NVENC hardware transcoding
- NVIDIA Container Toolkit CDI
- Jellyfin networking and discovery ports
- systemd / Podman Quadlet

## Sources Consulted
- Jellyfin official container installation documentation: https://jellyfin.org/docs/general/installation/container/
- Jellyfin official networking documentation: https://jellyfin.org/docs/general/post-install/networking/
- Jellyfin official DLNA networking documentation: https://jellyfin.org/docs/general/post-install/networking/dlna/
- Jellyfin official hardware acceleration overview: https://jellyfin.org/docs/general/post-install/transcoding/hardware-acceleration/
- Jellyfin official Intel hardware acceleration documentation: https://jellyfin.org/docs/general/post-install/transcoding/hardware-acceleration/intel/
- Jellyfin official NVIDIA hardware acceleration documentation: https://jellyfin.org/docs/general/post-install/transcoding/hardware-acceleration/nvidia/
- NVIDIA Container Toolkit CDI documentation: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/1.13.1/cdi-support.html
- Podman restart policy documentation: https://docs.podman.io/en/v4.6.1/markdown/options/restart.html
- Podman Quadlet / systemd unit documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman generate systemd documentation: https://docs.podman.io/en/v5.2.5/markdown/podman-generate-systemd.1.html

## Issues Found
- The Intel hardware transcoding heading called VA-API "Intel Quick Sync." Jellyfin's current documentation distinguishes QSV from VA-API on Linux, with QSV preferred for many mainstream Intel GPUs and VA-API used as a separate acceleration method. Changed the heading to "Intel GPU (VA-API)" to match the actual configuration shown.
- The NVIDIA Podman example used the CDI device name without mentioning the required CDI specification generation. Added the `nvidia-ctk cdi generate --output=/etc/cdi/nvidia.yaml` prerequisite from NVIDIA and Jellyfin documentation.
- The NVIDIA Podman example set `NVIDIA_VISIBLE_DEVICES` and `NVIDIA_DRIVER_CAPABILITIES` while also using CDI. NVIDIA's CDI documentation warns that CDI can conflict with the legacy NVIDIA runtime hook and environment-variable based selection, and Jellyfin notes the official image already sets the required NVIDIA variables. Removed those environment variables from the Podman CDI example.
- The discovery section treated `1900/udp` as a general Jellyfin discovery port. Jellyfin's networking docs list `7359/udp` for Jellyfin client discovery, while `1900/udp` is DLNA/SSDP and DLNA support is plugin-based in current Jellyfin. Removed `1900/udp` from the non-host-networking discovery example and clarified that DLNA requires the DLNA plugin and host networking for containerized discovery.
- The systemd section used `podman generate systemd`. Current Podman documentation marks this command deprecated and recommends Quadlet files for running containers under systemd. Replaced the generated-unit workflow with a user-level `jellyfin.container` Quadlet example and corresponding `systemctl --user` commands.

## Review Notes
- Podman was not installed in the local review environment, so CLI validation was performed against official Podman documentation rather than local `podman --help` output.
- The post uses the `latest` Jellyfin container tag, which is valid and officially documented, but pinning a major, minor, or exact Jellyfin version can be preferable for controlled upgrades.
