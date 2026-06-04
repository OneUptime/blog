# Validation Summary: How to Run ComfyUI in Docker for AI Image Generation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- NVIDIA Container Toolkit / GPU container access
- NVIDIA CUDA container images
- ComfyUI
- AI-Dock ComfyUI Docker image
- Python
- PyTorch
- Stable Diffusion / SDXL model files
- ComfyUI custom nodes and API workflow JSON

## Sources Consulted
- Docker Compose GPU support documentation: https://docs.docker.com/compose/how-tos/gpu-support/
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Compose `version` top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- AI-Dock ComfyUI README: https://github.com/ai-dock/comfyui
- AI-Dock ComfyUI compose example: https://raw.githubusercontent.com/ai-dock/comfyui/main/docker-compose.yaml
- ComfyUI CLI arguments source: https://github.com/Comfy-Org/ComfyUI/blob/master/comfy/cli_args.py
- ComfyUI official API example: https://github.com/Comfy-Org/ComfyUI/blob/master/script_examples/basic_api_example.py
- ComfyUI README: https://github.com/Comfy-Org/ComfyUI
- ComfyUI Manager README: https://github.com/Comfy-Org/ComfyUI-Manager
- Hugging Face model URLs referenced in the post were checked with HTTP HEAD requests.

## Issues Found
- The Docker Compose snippet used the obsolete top-level `version: "3.8"` field. Removed it because current Docker Compose uses the Compose Specification and marks the field obsolete.
- The AI-Dock image was configured with `CLI_ARGS`, but AI-Dock documents `COMFYUI_ARGS` for ComfyUI startup flags. Replaced `CLI_ARGS` with `COMFYUI_ARGS` in both Compose examples.
- The AI-Dock image enables web authentication by default, while the post instructs users to open the UI directly. Added `WEB_ENABLE_AUTH=false` to match the local tutorial flow.
- ComfyUI Manager was cloned into `ComfyUI-Manager`, but its current README documents `custom_nodes/comfyui-manager` as the correct directory. Updated the clone command and related paths.
- Custom node dependency installation used `/app/custom_nodes/...`, which only matches the custom Dockerfile image and not the AI-Dock Compose setup. Updated dependency installation and update commands to use `/workspace/ComfyUI/custom_nodes/...`.
- The Civitai LoRA URL used a non-working placeholder endpoint. Replaced it with a real public Hugging Face LoRA download URL and an explicit output filename.
- The post manually cloned custom nodes that have Python requirements but only installed Manager dependencies. Added dependency installation commands for `comfyui_controlnet_aux` and `was-node-suite-comfyui`.

## Review Notes
- The Docker Compose GPU reservation syntax validated successfully with the installed Docker Compose CLI.
- The GHCR AI-Dock ComfyUI image tag was reachable. NVIDIA Docker Hub manifest checks were attempted but Docker Hub returned an unauthenticated pull rate limit, so those tag checks could not be completed locally.
- The ComfyUI API example follows the official prompt JSON shape and queues a workflow; it does not wait for generation completion or retrieve output files.
