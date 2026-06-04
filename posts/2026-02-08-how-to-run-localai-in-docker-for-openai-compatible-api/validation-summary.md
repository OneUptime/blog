# Validation Summary: How to Run LocalAI in Docker for OpenAI-Compatible API

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- LocalAI
- Docker
- Docker Compose
- NVIDIA GPU support for Docker
- OpenAI-compatible REST APIs
- OpenAI Python SDK
- GGUF model configuration
- Stable Diffusion image generation
- Whisper speech-to-text

## Sources Consulted
- LocalAI Quickstart: https://localai.io/basics/getting_started/
- LocalAI Containers guide: https://localai.io/installation/containers/
- LocalAI Model Gallery documentation: https://localai.io/models/
- LocalAI Model Configuration documentation: https://localai.io/advanced/model-configuration/
- LocalAI GPU Acceleration documentation: https://localai.io/features/gpu-acceleration/
- LocalAI System Info and CLI reference: https://localai.io/index.print
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Compose GPU support: https://docs.docker.com/compose/how-tos/gpu-support/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- OpenAI API OpenAPI specification for Chat Completions: https://api.openai.com/v1/chat/completions

## Issues Found
- The Docker examples mounted models at `/build/models`, but current LocalAI container documentation uses `/models`. Updated Docker and Compose snippets to mount `/models`.
- The Docker Compose example mounted two different sources to the same container path, which would obscure one mount. Replaced it with a single `./models:/models` bind mount.
- The Compose examples used the obsolete top-level `version: "3.8"` field. Removed it to match the current Compose Specification.
- The preload and chat examples used a likely invalid gallery model name, `llama3.1-8b-instruct`. Replaced it with the documented gallery model `llama-3.2-1b-instruct:q4_k_m`.
- The model job polling example used `/models/jobs` without a job ID. Updated it to `/models/jobs/<JOB_ID>`, matching the job status endpoint documented by LocalAI.
- The manual model path examples used `./model-configs` while the container mounted `./models`. Updated the download and YAML filename examples to `./models`.
- The Phi-3 YAML placed `context_size` inside `parameters`; LocalAI documents `context_size` as a top-level model setting. Moved it to the top level.
- The embeddings examples used `text-embedding-ada-002` without installing a compatible LocalAI embeddings model. Added the documented `bert-embeddings` install command with `name` set to `text-embedding-ada-002`.
- The GPU verification command used `docker exec localai nvidia-smi`, which depends on the LocalAI image containing `nvidia-smi`. Replaced it with Docker's documented GPU access test using an NVIDIA CUDA image.
- The Stable Diffusion and Whisper install examples used IDs where LocalAI documentation shows URL-based gallery installs for those examples. Updated the request bodies to use the documented gallery URLs and the `whisper-1` override name.
- The performance tuning snippet listed `MMAP` and `GPU_LAYERS` as environment variables, but LocalAI documents `mmap` and `gpu_layers` as model YAML settings. Updated the section to distinguish service environment variables from per-model YAML fields.
- The post claimed OpenAI SDK applications work without code changes. Narrowed the wording to "minimal configuration changes" because clients still need to point at the LocalAI base URL.

## Review Notes
- The examples use `latest-cpu` and `latest-gpu-nvidia-cuda-12`, both shown in current LocalAI quickstart/container image references. For reproducible production deployments, pinning a specific LocalAI version would be preferable.
- The Docker Compose memory limit under `deploy.resources.limits` is valid in the Compose specification, but behavior can vary by Compose implementation and deployment target.
