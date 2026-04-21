# Validation Summary: How to Deploy NVIDIA Triton Inference Server via Portainer - Server

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- NVIDIA Triton Inference Server
- Portainer stacks
- Docker and Docker Compose
- NVIDIA Container Toolkit / GPU containers
- Prometheus metrics
- Bash backup scripting

## Sources Consulted
- NVIDIA Triton Inference Server Quickstart: https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/getting_started/quickstart.html
- NVIDIA Triton model repository documentation: https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/user_guide/model_repository.html
- NVIDIA Triton metrics documentation: https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/user_guide/metrics.html
- NVIDIA Triton model repository API extension: https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/protocol/extension_model_repository.html
- NVIDIA Triton 26.03 release notes: https://docs.nvidia.com/deeplearning/triton-inference-server/release-notes/rel-26-03.html
- NVIDIA Container Toolkit installation guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html
- Docker Compose GPU support documentation: https://docs.docker.com/compose/how-tos/gpu-support/
- Docker Compose top-level version documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer add stack documentation: https://docs.portainer.io/user/docker/stacks/add

## Issues Found
- The Docker Compose example used a placeholder image (`relevant-image:latest`) and a generic `ml-app` service instead of Triton. Updated it to use `nvcr.io/nvidia/tritonserver:26.03-py3`, run `tritonserver --model-repository=/models`, and mount a Triton model repository.
- The compose file exposed port `8080`, but Triton uses port `8000` for HTTP, `8001` for gRPC, and `8002` for Prometheus metrics. Updated the port mappings and comments.
- The health check and verification commands used `/health`, which is not Triton's readiness endpoint. Updated them to use `/v2/health/ready`.
- The post referenced an application UI on port `8080`. Triton exposes APIs, not a built-in UI, so this was corrected to the HTTP API base URL.
- The application configuration snippet was generic and not applicable to Triton. Replaced it with Triton's required model repository layout.
- The persistent storage, Prometheus scrape target, and backup script all referenced `app-data`, `/data/ml-app`, and `ml-app:8080`. Updated them to use the Triton model repository volume, `/data/triton/models`, and `tritonserver:8002`.
- The compose example included the obsolete top-level `version: "3.8"` key. Removed it to align with the current Compose Specification.
- Added the missing NVIDIA Container Toolkit and Triton 26.03 CUDA/GPU compatibility prerequisites for GPU deployments.
- Updated the GPU verification container from an older CUDA example to the current Docker documentation example image.

## Review Notes
Docker is not installed in this workspace, so `docker compose config` and live container startup could not be run locally. I validated Markdown code block syntax with PyYAML for YAML snippets and `bash -n` for Bash snippets, then verified behavior and endpoints against the official documentation above.
