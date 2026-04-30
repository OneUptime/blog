# Validation Summary: How to Install Portainer on NVIDIA Jetson

## Status
validated

## Post Type
Guide

## Technologies Covered
- NVIDIA Jetson
- NVIDIA JetPack
- Docker
- Portainer CE
- NVIDIA Container Toolkit
- ARM64 / `aarch64`

## Sources Consulted
- Portainer install guide for Docker on Linux: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer upgrade guide for Docker standalone: https://docs.portainer.io/start/upgrade/docker
- Portainer requirements and prerequisites: https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer advanced container settings: https://docs.portainer.io/user/docker/containers/advanced
- Docker Linux post-installation steps: https://docs.docker.com/engine/install/linux-postinstall/
- NVIDIA JetPack SDK introduction (current): https://docs.nvidia.com/jetson/jetpack/introduction/index.html
- NVIDIA JetPack 5.1.5 release notes: https://docs.nvidia.com/jetson/jetpack/5.1.5/release-notes/index.html
- NVIDIA JetPack 5.1 install guide: https://docs.nvidia.com/jetson/jetpack/5.1/install-jetpack/index.html
- NVIDIA Container Toolkit install guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html

## Issues Found
- The opening device list mentioned `Jetson Nano` while the post also required `JetPack 5.x or later`. NVIDIA's JetPack 5.x support matrix does not include Jetson Nano, so I updated the example device list to Jetson Xavier NX and Orin-family devices to keep the hardware examples consistent with the stated JetPack requirement.
- The prerequisite text claimed JetPack includes Docker by default. NVIDIA's JetPack docs list NVIDIA container runtime components, but do not document Docker Engine as universally preinstalled, so I changed the wording to require Docker to be installed and running and adjusted Step 1 to verify that directly.
- The Portainer deployment and update commands used `portainer/portainer-ce:latest`. Current Portainer install and upgrade docs use the `:lts` tag for CE on Docker, so I changed both commands to `portainer/portainer-ce:lts`.
- The troubleshooting advice suggested `sudo chmod 666 /var/run/docker.sock`. Docker's official post-install guidance uses the `docker` group instead; the original command weakens socket permissions and is not the documented fix. I replaced it with starting Docker and adding the user to the `docker` group.

## Review Notes
- Portainer's current documentation still exposes ports `9443` and `8000` in the standard Docker install command. Port `8000` is optional and mainly used for Edge Agent communication, but leaving it in place matches the official install guide.
- Portainer CE currently supports ARM64, so the post's ARM64/Jetson positioning is valid after the image tag and device-support fixes.
