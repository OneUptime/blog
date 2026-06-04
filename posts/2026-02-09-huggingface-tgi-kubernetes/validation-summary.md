# Validation Summary: How to Deploy Hugging Face Text Generation Inference Server on Kubernetes

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Hugging Face Text Generation Inference (TGI)
- Hugging Face Hub
- Kubernetes Deployments, Services, Secrets, PersistentVolumeClaims, Ingress, and HorizontalPodAutoscaler
- NVIDIA GPU scheduling on Kubernetes
- ingress-nginx annotations
- Prometheus and PrometheusRule alerting
- NGINX reverse proxy configuration

## Sources Consulted
- Hugging Face TGI documentation: https://huggingface.co/docs/text-generation-inference/index
- Hugging Face TGI Quick Tour: https://huggingface.co/docs/text-generation-inference/quicktour
- Hugging Face TGI launcher options: https://huggingface.co/docs/text-generation-inference/main/reference/launcher
- Hugging Face TGI private and gated model access: https://huggingface.co/docs/text-generation-inference/basic_tutorials/gated_model_access
- Hugging Face TGI quantization guide: https://huggingface.co/docs/text-generation-inference/en/conceptual/quantization
- Hugging Face TGI exported metrics: https://huggingface.co/docs/text-generation-inference/main/en/reference/metrics
- Hugging Face Hub environment variables: https://huggingface.co/docs/huggingface_hub/en/package_reference/environment_variables
- Kubernetes HorizontalPodAutoscaler API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Horizontal Pod Autoscaling docs: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes Ingress docs: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- ingress-nginx annotation docs: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/

## Issues Found
- The TGI feature list included GGML quantization and specifically called out Flash Attention v2. Current TGI documentation lists supported quantization schemes such as bitsandbytes, GPTQ, AWQ, EETQ, and FP8, and describes Flash Attention and Paged Attention. Updated the feature list accordingly.
- The deployment used the older `ghcr.io/huggingface/text-generation-inference:2.0` image tag. Current Hugging Face examples use `3.3.5`, so the deployment was updated to that tag.
- The deployment used deprecated Hugging Face Hub environment variable names: `HUGGING_FACE_HUB_TOKEN` and `HUGGINGFACE_HUB_CACHE`. Updated them to `HF_TOKEN` and `HF_HUB_CACHE`.
- The deployment used `MAX_INPUT_LENGTH`, which TGI now documents as the legacy form of `MAX_INPUT_TOKENS`. Updated the environment variable to `MAX_INPUT_TOKENS`.
- The base deployment set `QUANTIZE` to an empty string. The post now leaves `QUANTIZE` unset for FP16 and explains how to set it for on-the-fly 4-bit quantization or pre-quantized GPTQ/AWQ models.
- The quantization guidance implied that `gptq` or `awq` could be applied directly to standard model weights. TGI documentation distinguishes on-the-fly quantization from serving pre-quantized GPTQ/AWQ weights, so the guidance was corrected.
- The ingress example used `nginx.ingress.kubernetes.io/rate-limit`, which is not an ingress-nginx annotation, and described `limit-rps` as a global total rate. Updated the example to use `nginx.ingress.kubernetes.io/limit-rps` only and clarified that it is per client IP per controller replica.
- The PrometheusRule used `tgi_request_duration_seconds_bucket`, but TGI documents the histogram as `tgi_request_duration`, which is exposed to Prometheus with the `_bucket` histogram suffix. Updated the query to `tgi_request_duration_bucket`.
- The PrometheusRule used `tgi_request_success_total`, while the current TGI metric documentation names the counter `tgi_request_success`. Updated the throughput query.

## Review Notes
TGI is currently documented by Hugging Face as being in maintenance mode, with vLLM, SGLang, llama.cpp, and MLX recommended for many new optimized inference use cases. The post remains technically relevant as a TGI deployment guide, but future updates should consider mentioning that status and comparing alternatives.
