# Validation Summary: How to Run Automatic1111 Web UI in Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- NVIDIA Container Toolkit / GPU containers
- AI-Dock Stable Diffusion WebUI Docker image
- AUTOMATIC1111 Stable Diffusion WebUI
- Stable Diffusion model checkpoints, LoRA, and VAE files
- AUTOMATIC1111 REST API
- Python
- Bash

## Sources Consulted
- Docker Compose GPU support documentation: https://docs.docker.com/compose/how-tos/gpu-support/
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- AI-Dock Stable Diffusion WebUI image documentation: https://github.com/ai-dock/stable-diffusion-webui
- AI-Dock Stable Diffusion WebUI startup scripts and storage mappings: https://github.com/ai-dock/stable-diffusion-webui
- AI-Dock base image security notes: https://github.com/ai-dock/base-image/wiki/
- AUTOMATIC1111 command-line arguments documentation: https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Command-Line-Arguments-and-Settings
- AUTOMATIC1111 API documentation: https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/API
- AUTOMATIC1111 settings option definitions: https://github.com/AUTOMATIC1111/stable-diffusion-webui
- Hugging Face Stable Diffusion XL Base 1.0 model repository: https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0
- Hugging Face Stable Diffusion VAE repository: https://huggingface.co/stabilityai/sd-vae-ft-mse-original
- Hugging Face Stable Diffusion 1.5 model redirect: https://huggingface.co/runwayml/stable-diffusion-v1-5
- PyTorch installation selector/package index: https://pytorch.org/get-started/locally/

## Issues Found
- The Docker Compose snippet used the obsolete top-level `version: "3.8"` field. Removed it because current Docker Compose ignores it and warns that it is obsolete.
- The AI-Dock image startup arguments were configured with `CLI_ARGS`, but the image documents and uses `WEBUI_ARGS`. Updated all AI-Dock compose examples to use `WEBUI_ARGS`.
- The AI-Dock image runs AUTOMATIC1111 from `/opt/stable-diffusion-webui`, but the volume mounts targeted `/workspace/stable-diffusion-webui`. Updated the mount targets to `/opt/stable-diffusion-webui/...`.
- The post said to mount `config.json` but the compose snippet did not mount it. Added a `config.json` bind mount and a setup command that creates a valid initial `{}` file.
- The API examples would not work against the AI-Dock image's default authenticated reverse proxy. Added `WEB_ENABLE_AUTH=false` to match the local unauthenticated `curl http://localhost:7860/...` examples.
- The example LoRA URL pointed at a nonexistent placeholder repository. Replaced it with the real SDXL offset LoRA file from Stability AI's SDXL Base repository.
- The CPU-only startup flags were incomplete for AUTOMATIC1111. Added `--precision full --no-half`, matching the official CPU guidance.
- The `config.json` snippet contained `//` comments inside a `json` code block, which is invalid JSON. Removed the comments so the snippet is parseable.

## Review Notes
The Dockerfile and runtime commands are syntactically valid, but the custom source build remains intentionally minimal and may take longer than stated depending on hardware and network speed. The AI-Dock image is a third-party container image rather than an official AUTOMATIC1111 image, so future image-specific environment variables and paths should be rechecked before publication.
