# Validation Summary: How to Run Stable Diffusion in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker and Docker Compose
- NVIDIA GPU container runtime and NVIDIA Container Toolkit
- NVIDIA CUDA container images
- AUTOMATIC1111 Stable Diffusion WebUI
- Hugging Face diffusers
- PyTorch with CUDA wheels
- FastAPI and Uvicorn
- NGINX basic authentication

## Sources Consulted
- NVIDIA Container Toolkit installation guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/1.17.8/install-guide.html
- Docker Compose Deploy Specification for GPU device reservations: https://docs.docker.com/reference/compose-file/deploy/
- Docker Compose service healthcheck reference: https://docs.docker.com/reference/compose-file/services/#healthcheck
- PyTorch installation selector and CUDA wheel index guidance: https://pytorch.org/get-started/locally/
- Hugging Face diffusers Stable Diffusion text-to-image pipeline docs: https://huggingface.co/docs/diffusers/api/pipelines/stable_diffusion/text2img
- AUTOMATIC1111 command-line arguments wiki: https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Command-Line-Arguments-and-Settings
- neggles/sd-webui-docker repository and Compose/entrypoint files: https://github.com/neggles/sd-webui-docker
- FastAPI custom response documentation: https://fastapi.tiangolo.com/advanced/custom-response/
- NGINX basic authentication documentation: https://docs.nginx.com/nginx/admin-guide/security-controls/configuring-http-basic-authentication/

## Issues Found
- The NVIDIA Container Toolkit repository command used the older distribution-specific `libnvidia-container/$distribution/libnvidia-container.list` URL. Updated it to the current official `stable/deb/nvidia-container-toolkit.list` repository URL.
- The neggles Docker image examples mounted `/app/models`, `/app/outputs`, and `/app/extensions`, but that image maps persistent model/config data through `/data` and output through `/output`. Updated the project directories, Compose volumes, model download path, and later snippets to use `/data`, `/output`, and the image's expected model subdirectories.
- The article stated that the first WebUI startup downloads Stable Diffusion model weights. Updated this to say startup initializes WebUI files and caches, and that model weights should be added to the shared model volume before generation.
- The API Dockerfile used a Compose healthcheck that runs `curl`, but the image did not install `curl`. Added `curl` to the API image dependencies.
- The diffusers example described `enable_attention_slicing()` as memory-efficient attention. Adjusted the comment to say it lowers peak memory usage, matching diffusers behavior and avoiding a misleading performance implication.
- Several later Compose examples used an undefined `sd-webui:latest` image. Updated them to the same `ghcr.io/neggles/sd-webui-docker:latest` image used earlier in the guide.

## Review Notes
The post is technically relevant and validated after fixes. The examples still use CUDA 12.2 base images and PyTorch CUDA 12.1 wheels, which is acceptable with a compatible NVIDIA driver, but future refreshes should revisit CUDA/PyTorch versions and the maintenance status of third-party WebUI container images.
