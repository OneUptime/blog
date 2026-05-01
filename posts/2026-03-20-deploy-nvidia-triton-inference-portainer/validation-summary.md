# Validation Summary: How to Deploy NVIDIA Triton Inference Server via Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- NVIDIA Triton Inference Server
- Portainer
- Docker Compose / Portainer stacks
- NVIDIA Container Toolkit
- Python (`tritonclient`, `numpy`)
- Prometheus

## Sources Consulted
- NVIDIA Triton Inference Server 24.01 release notes: https://docs.nvidia.com/deeplearning/triton-inference-server/archives/triton-inference-server-2420/release-notes/rel-24-01.html
- Triton model repository docs: https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/user_guide/model_repository.html
- Triton model repository extension (HTTP API): https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/protocol/extension_model_repository.html
- Triton model configuration docs and dynamic batching behavior: https://docs.nvidia.com/deeplearning/triton-inference-server/archives/triton_inference_server_230/user-guide/docs/model_configuration.html
- Triton conceptual guide for dynamic batching and instance groups: https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/tutorials/Conceptual_Guide/Part_2-improving_resource_utilization/README.html
- Triton HTTP client reference: https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/_reference/tritonclient/tritonclient.http.html
- Triton metrics reference: https://docs.nvidia.com/deeplearning/triton-inference-server/archives/triton-inference-server-2450/user-guide/docs/user_guide/metrics.html
- Docker Compose GPU support docs: https://docs.docker.com/compose/how-tos/gpu-support/
- Docker Compose deploy specification: https://docs.docker.com/reference/compose-file/deploy/
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add
- Portainer GPU support docs: https://docs.portainer.io/user/docker/containers/advanced

## Issues Found
- The prerequisite driver version was incorrect for `nvcr.io/nvidia/tritonserver:24.01-py3`. Triton 24.01 is based on CUDA 12.3.2 and generally requires NVIDIA driver 545 or later, with documented exceptions for supported data center GPU driver branches. The prerequisite bullet was corrected.
- The post did not mention that Portainer GPU support is documented for Docker Standalone environments. A prerequisite bullet was added to make that requirement explicit.
- The `config.pbtxt` example enabled `dynamic_batching` but omitted `max_batch_size`, which is a required batching setting unless you rely on backend auto-completion. `max_batch_size: 32` was added to make the config complete and consistent with the preferred batch sizes shown.
- The stack command used `--strict-model-config=false`, which is a deprecated Triton flag and unnecessary for the provided explicit config. It was removed.
- The model-status example used `GET /v2/models`, which is not the Triton repository index endpoint. It was replaced with the documented `POST /v2/repository/index` request and an example READY response.
- The metric description for `nv_gpu_utilization` described the value as a percentage, but Triton documents it as a utilization rate from `0.0` to `1.0`. The metric descriptions were updated for accuracy and units.

## Review Notes
- The post pins the Triton container to `24.01-py3`. That is technically valid, but it is not the latest Triton release as of May 1, 2026, so readers should verify driver and backend support if they choose a newer image tag.
- The Prometheus target `triton:8002` assumes Prometheus can resolve the `triton` service name, typically by running on the same Docker network. The example is valid in that setup.
