# Validation Summary: How to Use GPU Access in podman-compose

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- podman-compose
- Compose Specification
- NVIDIA Container Toolkit
- NVIDIA CDI (Container Device Interface)
- CUDA containers
- Python, Jupyter, PyTorch, TensorBoard

## Sources Consulted
- NVIDIA Container Toolkit CDI support: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/1.18.0/cdi-support.html
- NVIDIA Container Toolkit release notes: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/release-notes.html
- Podman run documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Compose Specification, `devices` and `gpus`: https://compose-spec.github.io/compose-spec/spec.html
- Compose Deploy Specification, device reservations: https://docs.docker.com/reference/compose-file/deploy/
- podman-compose upstream implementation and README: https://github.com/containers/podman-compose

## Issues Found
- The Podman CDI verification command omitted `--security-opt=label=disable`, which NVIDIA's Podman CDI documentation includes to avoid SELinux labeling problems. Added the option.
- The article described `nvidia-ctk cdi generate` as configuring the NVIDIA runtime for Podman. Updated the comment to clarify that it generates a CDI specification.
- Compose snippets used the obsolete top-level `version: "3.8"` field. Removed it so the examples follow the current Compose Specification style.
- CDI-based podman-compose snippets did not include `security_opt: label=disable`. Added it to the direct CDI examples.
- The manual NVIDIA device passthrough example mounted a single host `libnvidia-ml.so` path, which is not portable and is insufficient for general CUDA driver injection. Replaced it with a caveat that CDI is preferred for NVIDIA GPUs and kept the manual device-node example scoped to custom setups.
- The Jupyter example used `pip` in a CUDA runtime image without installing Python package tooling. Added installation of `python3-pip` and switched to `python3 -m pip`.
- The `x-podman.podman_args` service example was invalid for current podman-compose. Replaced it with the supported Compose `deploy.resources.reservations.devices` GPU reservation syntax, which podman-compose maps to NVIDIA CDI device arguments.
- The verification command checked PyTorch inside `ml-training`, but that service only runs `nvidia-smi` and does not install PyTorch. Updated the command to check the `jupyter` service.

## Review Notes
The post now uses CDI as the primary NVIDIA GPU path, which is the recommended Podman approach in NVIDIA's current documentation. The machine learning example installs packages at container startup for simplicity; for production use, baking Python dependencies into a custom image would be more repeatable and faster.
