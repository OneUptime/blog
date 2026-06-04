# Validation Summary: How to Run LLM Inference with vLLM in Docker

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- vLLM
- Docker
- Docker Compose
- NVIDIA Container Toolkit
- NVIDIA CUDA GPUs
- Hugging Face Hub
- Prometheus
- OpenAI-compatible chat completions API

## Sources Consulted
- vLLM Docker deployment documentation: https://docs.vllm.ai/en/latest/deployment/docker/
- vLLM GPU installation requirements: https://docs.vllm.ai/en/latest/getting_started/installation/gpu/
- vLLM OpenAI-compatible serving documentation: https://docs.vllm.ai/en/latest/serving/online_serving/
- vLLM CLI reference for `vllm serve`: https://docs.vllm.ai/en/latest/cli/serve/
- vLLM production metrics documentation: https://docs.vllm.ai/en/latest/usage/metrics/
- Docker Compose GPU support documentation: https://docs.docker.com/compose/how-tos/gpu-support/
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Hugging Face Hub environment variables documentation: https://huggingface.co/docs/huggingface_hub/package_reference/environment_variables

## Issues Found
- Updated the NVIDIA GPU prerequisite from compute capability 7.0+ to 7.5+ to match current vLLM CUDA requirements.
- Added `--ipc=host` to single-node Docker examples and `ipc: host` to the Compose service, matching vLLM's current Docker guidance for shared memory access.
- Replaced `HUGGING_FACE_HUB_TOKEN` with `HF_TOKEN` in Docker and Compose examples to match current vLLM and Hugging Face Hub environment variable guidance.
- Replaced stale `vllm:avg_generation_throughput_toks_per_s` monitoring guidance with current documented metrics: `vllm:generation_tokens` and `vllm:request_queue_time_seconds`.
- Changed the custom Dockerfile dependency install command from `pip install` to `uv pip install --system`, matching the official vLLM Docker image guidance for installing extra dependencies.
- Replaced the outdated `--disable-log-requests` flag with the current `--disable-uvicorn-access-log` flag and adjusted the explanation accordingly.
- Clarified the AWQ memory reduction claim so it applies to model weights rather than total runtime VRAM, which also depends on KV cache, context length, and concurrency.

## Review Notes
The examples remain generally valid, but production deployments should pin a specific vLLM image tag instead of using `latest` when repeatability matters. Model availability, license gating, and exact VRAM needs can change by model revision and workload.
