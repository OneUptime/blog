# Validation Summary: How to Run a Container with Device Access in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux device nodes
- Container device access
- NVIDIA Container Toolkit / CDI
- USB, serial, sound, video, FUSE, and KVM devices

## Sources Consulted
- Podman `podman-run` documentation: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Podman `podman-container-inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- NVIDIA Container Toolkit CDI support documentation: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/1.18.0/cdi-support.html

## Issues Found
- The NVIDIA GPU example referenced only `nvidia-container-toolkit` and used a CUDA image tag without showing the CDI/SELinux form documented for current Podman usage. Updated the comment to require a generated CDI spec and changed the example to the official `--security-opt=label=disable --device nvidia.com/gpu=all ubuntu nvidia-smi -L` form.
- The Intel GPU example mapped `/dev/dri/renderD128` but then checked `/dev/dri/`. Updated the command to check `/dev/dri/renderD128` directly.
- The KVM section described `/dev/kvm` as enabling nested virtualization. `/dev/kvm` provides KVM hardware virtualization access to the container; nested virtualization is only one possible scenario depending on the host environment. Updated the heading and echo text accordingly.

## Review Notes
- Podman's official documentation notes rootless and SELinux caveats for device access: SELinux systems may require `container_use_devices`, and rootless containers may need `--group-add keep-groups` when host device access depends on supplementary group membership. The post remains correct, but those caveats would be useful future additions.
