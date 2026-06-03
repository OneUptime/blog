# Validation Summary: Deploy vLLM on Kubernetes for High-Throughput Large Language Model Inference

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- vLLM
- Kubernetes Deployments, Services, PersistentVolumeClaims, and HorizontalPodAutoscaler
- NVIDIA GPUs and NVIDIA GPU Operator node labels
- Docker
- FastAPI
- Pydantic
- Prometheus metrics
- Hugging Face model access tokens

## Sources Consulted
- vLLM Docker deployment documentation: https://docs.vllm.ai/en/v0.22.0/deployment/docker/
- vLLM OpenAI-compatible server documentation: https://docs.vllm.ai/en/latest/serving/online_serving/openai_compatible_server/
- vLLM Python API documentation for `LLM`: https://docs.vllm.ai/en/stable/api/vllm/
- vLLM `SamplingParams` API documentation: https://docs.vllm.ai/en/stable/api/vllm/sampling_params/
- Kubernetes HorizontalPodAutoscaler v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- NVIDIA GPU Operator documentation: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/getting-started.html
- NVIDIA GPU Operator GPU feature labels example: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/23.6.1/gpu-operator-mig.html
- vLLM PagedAttention announcement and throughput claim: https://vllm.ai/blog/vllm
- PyPI vLLM package version listing checked via `python3 -m pip index versions vllm`

## Issues Found
- The Dockerfile pinned an old `vllm==0.3.0` stack on a raw CUDA base image. Updated it to derive from the official `vllm/vllm-openai:v0.22.0` image and install only the additional web/metrics packages needed by the custom FastAPI app.
- The Dockerfile set `CUDA_VISIBLE_DEVICES=0`, which would prevent the later tensor-parallel example from seeing more than one GPU. Removed that environment variable and let the Kubernetes NVIDIA device plugin control visible devices.
- The official vLLM OpenAI image uses `vllm serve` as its entrypoint, so the custom FastAPI `CMD` would not run as intended. Replaced it with an explicit `ENTRYPOINT ["python3", "/app/serve.py"]`.
- The batch generation curl payload sent an object with a `requests` field, but the FastAPI handler expected a raw list. Added a `BatchGenerateRequest` Pydantic model with `min_length=1` and updated the handler accordingly.
- The Hugging Face token environment variable used `HUGGING_FACE_HUB_TOKEN`, while current vLLM Docker examples use `HF_TOKEN`. Updated the Kubernetes environment variable to `HF_TOKEN`.
- The secret creation command used the `llm-serving` namespace before creating it. Moved namespace creation before the secret command.
- The metrics endpoint was started on port 9090 but the Deployment and Service did not expose that port. Added the metrics port to both resources.
- The HPA referenced `vllm_requests_per_second`, but the Prometheus example did not export that metric and Kubernetes requires a custom metrics adapter for Pods metrics. Updated the HPA to use an exported `vllm_concurrent_requests` gauge and documented the Prometheus Adapter requirement.
- The Prometheus `generate` snippet referenced undefined `outputs` and `response` variables. Replaced it with a complete, syntactically valid version of the handler that records counters, latency, generated tokens, and in-progress requests.

## Review Notes
- The Python and YAML examples were syntax-checked locally where possible. Runtime execution was not attempted because it requires GPU nodes, a Hugging Face token, model license access, and a Kubernetes cluster with the NVIDIA device plugin/GPU Operator and custom metrics adapter configured.
- The model memory requirements remain approximate because actual GPU memory use depends on dtype, quantization, context length, batch size, and vLLM configuration.
