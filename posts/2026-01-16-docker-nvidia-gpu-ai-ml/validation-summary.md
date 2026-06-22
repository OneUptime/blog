# Validation Summary: How to Set Up NVIDIA GPU Support in Docker for AI/ML Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker Compose
- NVIDIA Container Toolkit
- NVIDIA CUDA container images
- TensorFlow
- PyTorch
- NCCL
- YAML, Dockerfile, Bash, and Python snippets

## Sources Consulted
- NVIDIA Container Toolkit install guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html
- NVIDIA Container Toolkit Docker specialized configurations: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/docker-specialized.html
- Docker Compose GPU support: https://docs.docker.com/compose/how-tos/gpu-support/
- Docker Compose version top-level element reference: https://docs.docker.com/reference/compose-file/version-and-name/
- TensorFlow Docker install guide: https://www.tensorflow.org/install/docker
- TensorFlow GPU guide: https://www.tensorflow.org/guide/gpu
- PyTorch CUDA memory API documentation: https://docs.pytorch.org/docs/stable/generated/torch.cuda.memory.set_per_process_memory_fraction.html
- Docker Hub image manifests for TensorFlow, PyTorch, and NVIDIA CUDA images

## Issues Found
- Updated the RPM-based install command from `yum` to `dnf` to match the current NVIDIA Container Toolkit instructions for RHEL/CentOS/Fedora/Amazon Linux.
- Removed obsolete top-level `version: '3.8'` fields from Docker Compose examples because current Docker Compose treats the field as informational and emits an obsolete warning.
- Corrected the Docker Compose specific-capabilities example. Compose device reservations should request `capabilities: [gpu]`; NVIDIA driver capabilities such as `compute` and `utility` are configured with `NVIDIA_DRIVER_CAPABILITIES`.
- Corrected the NVIDIA driver capability list by removing `gpu` from the driver-capabilities list and adding `compat32`.
- Split the TensorFlow memory growth and logical device memory limit examples because they are alternative configurations that must be set before GPU initialization.
- Replaced a healthcheck that depended on `curl` being installed in the PyTorch runtime image with a Python standard-library `urllib.request` check.
- Changed the CUDA version verification command from a `base` CUDA image to a `devel` CUDA image because `nvcc` is available in development images, not base/runtime images.

## Review Notes
The pinned PyTorch and CUDA examples are older but still valid and the referenced image tags were verified as available. The `latest` TensorFlow tags are valid, but future maintenance may prefer pinned tags for reproducibility.
