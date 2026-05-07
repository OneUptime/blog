# Validation Summary: How to Use GPU Passthrough with Podman

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- NVIDIA Container Toolkit
- CDI (Container Device Interface)
- NVIDIA GPUs
- AMD ROCm
- Linux device passthrough
- SELinux

## Sources Consulted
- Podman `run` reference: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- NVIDIA Container Toolkit install guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/1.17.8/install-guide.html
- NVIDIA Container Toolkit CDI support: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/1.18.1/cdi-support.html
- NVIDIA Container Toolkit sample workload guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/sample-workload.html
- AMD ROCm container guidance: https://rocm.docs.amd.com/projects/install-on-linux/en/latest/how-to/docker.html

## Issues Found
- The AMD guidance treated Intel and AMD the same and only passed `/dev/dri`. That is incomplete for AMD ROCm compute workloads, which also require `/dev/kfd`. I corrected the AMD example and the verification command to include both devices and to use `rocminfo`.
- The NVIDIA direct-mapping example implied that mapping device nodes alone was enough for a working workload. NVIDIA’s current guidance recommends CDI for Podman so driver libraries and related mounts are handled correctly. I changed the direct-mapping example to show device exposure only, and kept working NVIDIA workload examples under CDI.
- The NVIDIA toolkit installation block used outdated repository and CDI-generation guidance. I updated it to current distro-specific install commands and to the current `nvidia-cdi-refresh` behavior documented for NVIDIA Container Toolkit v1.18+.
- The NVIDIA CDI run examples were missing `--security-opt=label=disable`, which NVIDIA documents for Podman sample workloads on SELinux systems. I added that flag and aligned the commands with current NVIDIA examples.
- The rootless access guidance was incomplete. Podman documents that group-based device access in rootless containers needs `--group-add keep-groups`; I updated the security section accordingly and added the `crun` runtime caveat that Podman documents.
- The SELinux example used `--security-opt label=type:container_runtime_t`, which is not an appropriate generic recommendation for GPU passthrough containers. I replaced it with the Podman-documented `container_use_devices` SELinux boolean for direct device mapping.
- The Intel verification example used a questionable image reference. I replaced it with a generic DRI visibility check that is technically accurate without depending on an unverified container image.

## Review Notes
- Podman also documents a `--gpus` flag in current releases, but the post remains technically valid focusing on `--device` and CDI after these fixes.
- NVIDIA Toolkit behavior differs by version: v1.18+ auto-generates CDI specs, while older releases more commonly relied on manual `nvidia-ctk cdi generate` workflows.
- For Intel workloads, validating actual media or compute acceleration inside a container depends on the user-space stack included in the chosen image, not just device visibility.
