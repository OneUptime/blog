# Validation Summary: How to Build LLM Deployment Architecture

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- vLLM
- Hugging Face Text Generation Inference
- NVIDIA TensorRT-LLM
- Kubernetes Deployments, Services, Ingress, and HPA
- KEDA
- Prometheus, Grafana, and ServiceMonitor
- Redis
- Karpenter on AWS
- Docker
- Python

## Sources Consulted
- vLLM Automatic Prefix Caching: https://docs.vllm.ai/en/latest/features/automatic_prefix_caching/
- vLLM serving CLI arguments: https://docs.vllm.ai/en/stable/cli/serve/
- vLLM production metrics: https://docs.vllm.ai/en/stable/usage/metrics/
- Hugging Face Text Generation Inference documentation: https://huggingface.co/docs/text-generation-inference/index
- Hugging Face TGI quantization documentation: https://huggingface.co/docs/text-generation-inference/en/conceptual/quantization
- Hugging Face TGI Messages API documentation: https://huggingface.co/docs/text-generation-inference/en/messages_api
- NVIDIA TensorRT-LLM documentation: https://nvidia.github.io/TensorRT-LLM/
- NVIDIA TensorRT-LLM trtllm-serve documentation: https://nvidia.github.io/TensorRT-LLM/1.0.0rc2/commands/trtllm-serve.html
- Karpenter NodePools documentation: https://karpenter.sh/docs/concepts/nodepools/
- Karpenter NodeClasses documentation: https://karpenter.sh/docs/concepts/nodeclasses/
- KEDA Prometheus scaler documentation: https://keda.sh/docs/2.20/scalers/prometheus/
- KEDA RabbitMQ scaler documentation: https://keda.sh/docs/2.19/scalers/rabbitmq-queue/

## Issues Found
- The architecture diagram and caching section implied Redis could be used as a distributed model KV cache. Updated the wording and Redis example to describe application-level response caching, while keeping vLLM prefix caching as in-engine KV cache reuse.
- The framework comparison listed TensorRT-LLM as not supporting an OpenAI-compatible API. Updated it to "Yes" because `trtllm-serve` exposes OpenAI-compatible endpoints.
- The framework comparison used "PagedAttention" as a generic feature across all frameworks. Updated it to "Paged KV Cache" to avoid treating vLLM's specific PagedAttention implementation name as universal.
- The Kubernetes TGI example used an older TGI image tag. Updated it to the current documented example tag used by Hugging Face documentation.
- The KEDA RabbitMQ trigger used `queueLength`; current KEDA RabbitMQ trigger documentation uses `mode: QueueLength` and `value` for the threshold. Updated the trigger fields.
- The KEDA Prometheus metric name used `vllm_pending_requests`, while the vLLM metric discussed in the post is exposed as `vllm_num_requests_waiting` after Prometheus name normalization. Updated the KEDA metric name.
- The Grafana P99 latency query did not aggregate histogram buckets by `le`, which can produce incorrect percentile series. Updated the query to use `sum by (le)`.
- The AWS spot instance example used the obsolete Karpenter `Provisioner` API. Replaced it with current `NodePool` and `EC2NodeClass` resources.

## Review Notes
The examples are illustrative and still require environment-specific configuration, such as Prometheus adapter rules for HPA custom metrics, real Karpenter discovery tags, IAM role names, GPU node labels, and secrets. The Python, JSON, and YAML fenced examples were parsed successfully after the corrections.
