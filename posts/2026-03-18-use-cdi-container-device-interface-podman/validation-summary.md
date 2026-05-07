# Validation Summary: How to Use CDI (Container Device Interface) with Podman

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Container Device Interface (CDI)
- Podman
- NVIDIA Container Toolkit
- NVIDIA GPUs and CUDA containers
- CDI YAML specifications
- Podman Compose
- Kubernetes GPU resource requests
- CRI-O and containerd

## Sources Consulted
- CDI specification: https://github.com/cncf-tags/container-device-interface/blob/main/SPEC.md
- Podman manual, global `--cdi-spec-dir` option: https://docs.podman.io/en/latest/markdown/podman.1.html
- Podman `run` manual, `--device` and `--gpus` options: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- NVIDIA Container Toolkit CDI support: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/1.18.1/cdi-support.html
- Kubernetes Container Runtime Interface documentation: https://kubernetes.io/docs/concepts/containers/cri/
- NVIDIA GPU Operator CDI support for Kubernetes: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/25.10/cdi.html

## Issues Found
- The post described `~/.config/cdi/` as a rootless Podman CDI spec directory. Current Podman documentation exposes CDI spec directories through `--cdi-spec-dir` and `containers.conf`; the documented default global path is `/etc/cdi`, while `/var/run/cdi` is commonly used for generated specs. I changed the text to describe configured spec directories and showed `~/.config/cdi` only as a user-managed directory added with `--cdi-spec-dir`.
- NVIDIA CDI generation examples used `/etc/cdi/nvidia.yaml` as the primary output. NVIDIA Container Toolkit 1.18 documents automatic generation at `/var/run/cdi/nvidia.yaml` and recommends restarting `nvidia-cdi-refresh.service` for regeneration. I updated the examples to use `/var/run/cdi/nvidia.yaml` and mention the service.
- NVIDIA Podman run examples omitted `--security-opt=label=disable`. NVIDIA's Podman CDI examples include this option to avoid SELinux labeling conflicts. I added it to the NVIDIA run commands.
- The validation section used `podman run --rm --device=?` to list CDI devices. I could not verify this as a documented Podman listing mechanism, while NVIDIA documents `nvidia-ctk --debug cdi list` for listing devices and reporting CDI spec loading errors. I replaced the command.
- The Kubernetes section said "Podman as a CRI-O backend" and labeled a standard GPU resource request as "CDI annotations." Podman is not a CRI-O backend, and the snippet did not contain CDI annotations. I corrected the section to refer to Kubernetes CRI runtimes such as CRI-O and containerd, and described the YAML as an NVIDIA GPU resource request.
- The CDI locations block contained bare directory paths inside a shell block, which would be invalid if copied into a shell. I converted those path lines to comments.

## Review Notes
Podman was not installed in the local workspace, so CLI behavior could not be checked with local `--help` output. Validation was performed against current official Podman, NVIDIA, Kubernetes, and CDI documentation.
