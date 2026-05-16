# Validation Summary: How to Run LLM Inference Workloads on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes (Deployment, Service, PersistentVolumeClaim, HorizontalPodAutoscaler)
- NVIDIA GPU device plugin / GPU Operator
- vLLM (vllm/vllm-openai container image, OpenAI-compatible API)
- Hugging Face Text Generation Inference (TGI)
- Ollama
- Hugging Face Hub (model hosting, HF_TOKEN auth)
- Mistral 7B Instruct, Llama 2 70B Chat (example models)
- AWQ quantization
- Prometheus metrics (for vLLM/TGI)
- HPA autoscaling/v2 with custom Pods metrics

## Sources Consulted
- vLLM documentation and CLI args: https://docs.vllm.ai/en/latest/serving/openai_compatible_server.html
- vLLM OpenAI-compatible server (`/health`, `/v1/chat/completions`): https://docs.vllm.ai/
- Hugging Face TGI CLI launcher args: https://huggingface.co/docs/text-generation-inference/reference/launcher
- TGI quantization (AWQ requires pre-quantized models): https://huggingface.co/docs/text-generation-inference/conceptual/quantization
- Ollama API and Docker image: https://github.com/ollama/ollama/blob/main/docs/api.md, https://hub.docker.com/r/ollama/ollama
- Ollama default data directory `/root/.ollama` and port 11434
- Kubernetes HorizontalPodAutoscaler autoscaling/v2 reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#horizontalpodautoscaler-v2-autoscaling
- Mistral model on Hugging Face: https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.2
- TheBloke AWQ Mistral model: https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-AWQ
- NVIDIA device plugin for Kubernetes: https://github.com/NVIDIA/k8s-device-plugin

## Issues Found

1. **Missing PVC reference for Ollama deployment.** The Ollama Deployment referenced `claimName: ollama-storage`, but no such PVC was defined anywhere in the post (only `model-cache` was created at the top). Applying the manifest as written would leave the pod stuck in `Pending` with an "unbound PVC" error. Fixed by changing the Ollama Deployment's `claimName` to `model-cache`, which matches the single PVC defined earlier in the guide. (The PVC is `ReadWriteOnce`, but the post presents the three frameworks as alternatives, so this is consistent with running one at a time.)

2. **TGI `--quantize awq` used against a non-AWQ model.** TGI's `--quantize awq` flag loads pre-quantized AWQ weights; it does not perform on-the-fly quantization of FP16 weights. Pointing it at `mistralai/Mistral-7B-Instruct-v0.2` (which ships in FP16) causes TGI to error out at model load with a weights/format mismatch. Fixed by changing the `--model-id` to `TheBloke/Mistral-7B-Instruct-v0.2-AWQ`, which is the AWQ-quantized variant of the same model that `awq` mode expects.

## Review Notes

- **TGI `--max-input-length` flag**: This flag is still accepted by recent TGI releases but has been superseded by `--max-input-tokens` in TGI 2.x+. It continues to work, so it was left as-is, but readers running very recent TGI versions may see a deprecation notice.
- **HPA custom metric name (`vllm_requests_running`)**: vLLM exports `vllm:num_requests_running` in Prometheus format. When surfaced through prometheus-adapter to the Kubernetes custom metrics API, the colon is typically rewritten (commonly to `vllm_num_requests_running`). The exact metric name the HPA can target depends on the user's prometheus-adapter rules, so the example name is illustrative; readers will need to confirm what their adapter exposes.
- **vLLM image tag `latest`**: The post uses `vllm/vllm-openai:latest`. Pinning to a specific version (e.g. `vllm/vllm-openai:v0.6.x`) is recommended in production for reproducibility, but `latest` is acceptable for a getting-started tutorial.
- **Llama 2 70B access**: `meta-llama/Llama-2-70b-chat-hf` is a gated model on Hugging Face — the user must request access on the model page before the `HUGGING_FACE_HUB_TOKEN` will be able to pull weights. Not strictly a bug, just a gotcha worth being aware of.
- **VRAM sizing for Llama 2 70B**: A 4-GPU tensor-parallel deployment of Llama 2 70B at FP16 needs roughly 4×40 GB or larger GPUs (e.g. A100 80 GB or H100). The "48 GB for 13B+" prerequisite line is fine for 13B but does not directly cover the 70B example; readers attempting the multi-GPU example on smaller cards should plan accordingly.
- **Ollama model tag**: `mistral:7b` is a valid Ollama tag; `mistral` alone also resolves to the 7B default. Either works.
