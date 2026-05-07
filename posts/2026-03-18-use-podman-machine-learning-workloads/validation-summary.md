# Validation Summary: How to Use Podman for Machine Learning Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- NVIDIA Container Toolkit
- Container Device Interface (CDI)
- NVIDIA CUDA container images
- PyTorch
- torchvision
- JupyterLab
- Flask
- Gunicorn
- Python
- Bash

## Sources Consulted
- NVIDIA Container Toolkit installation guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html
- NVIDIA Container Toolkit CDI support: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/1.18.0/cdi-support.html
- Podman `run` reference: https://docs.podman.io/en/v5.2.0/markdown/podman-run.1.html
- PyTorch previous versions matrix: https://docs.pytorch.org/get-started/previous-versions/
- PyTorch `torch.cuda.get_device_properties` API: https://docs.pytorch.org/docs/2.12/generated/torch.cuda.get_device_properties.html
- Jupyter Server security documentation: https://jupyter-server.readthedocs.io/en/latest/operators/security.html
- Jupyter Server full configuration reference: https://jupyter-server.readthedocs.io/en/stable/other/full-config.html
- Dockerfile reference for `CMD`/`ENTRYPOINT` behavior: https://docs.docker.com/reference/dockerfile
- NVIDIA CUDA image tags on Docker Hub: https://hub.docker.com/r/nvidia/cuda/tags?name=ubuntu22.04&page_size=100

## Issues Found
- The introduction said the container encapsulates GPU drivers. That is inaccurate for Podman/NVIDIA GPU workloads; the container uses the host NVIDIA driver and CDI injects device access. I corrected the explanation to refer to the user-space CUDA/framework stack and the host driver.
- The training and experiment `podman run` examples mounted `/workspace/data` read-only while the sample code uses `datasets.MNIST(..., download=True)`, which writes into that directory. I changed those data mounts to writable so the example can run as written.
- The training script used `torch.cuda.get_device_properties(0).total_mem`, which is not the PyTorch property name. I corrected it to `total_memory`.
- The Jupyter image inherited `ENTRYPOINT ["python3"]` from the training image, so the original `CMD ["jupyter", "lab", ...]` would have been passed to Python instead of launching Jupyter. I replaced that with an explicit Jupyter `ENTRYPOINT`, removed the deprecated/unsafe token-disabling example, added the missing image build command, and updated the access instructions to use the tokenized URL from `podman logs`.
- The model-serving image installed packages from the PyTorch CPU wheel index in a way that would not reliably provide Flask and Gunicorn, omitted `torchvision` even though the code imports it, and the serving script referenced `SimpleNet` without defining it. I split the installs, added `torchvision`, added the missing image build command, and defined `SimpleNet` in `serve.py`.

## Review Notes
- Current NVIDIA Container Toolkit releases can auto-generate and refresh CDI specifications with `nvidia-cdi-refresh`; the manual `nvidia-ctk cdi generate` flow used in the post remains valid.
- The post pins older but still officially documented versions (`torch==2.2.0`, `torchvision==0.17.0`, `torchaudio==2.2.0`, CUDA 12.1 wheels). Those version pins are accurate, but they are not current stable releases as of 2026-05-07.
