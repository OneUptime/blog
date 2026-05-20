# Validation Summary: How to Deploy vLLM with ArgoCD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- vLLM
- ArgoCD
- Kubernetes Deployments, Services, Ingress, PVCs, and HPA
- NVIDIA GPU Operator and NVIDIA Kubernetes GPU scheduling
- Hugging Face Hub model authentication and caching
- Prometheus ServiceMonitor and Prometheus Adapter custom metrics
- OpenAI-compatible Python client usage
- AWS CLI S3 model synchronization

## Sources Consulted
- vLLM OpenAI-compatible server documentation: https://docs.vllm.ai/en/v0.7.0/serving/openai_compatible_server.html
- vLLM production metrics documentation: https://docs.vllm.ai/en/latest/usage/metrics/
- vLLM PagedAttention announcement: https://blog.vllm.ai/2023/06/20/vllm.html
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes device plugin documentation: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD diff customization documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/diffing/
- NVIDIA GPU Operator installation documentation: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/install-gpu-operator.html
- Hugging Face Hub environment variable documentation: https://huggingface.co/docs/huggingface_hub/main/en/package_reference/environment_variables
- Prometheus Adapter documentation: https://github.com/kubernetes-sigs/prometheus-adapter
- OpenAI Chat Completions API reference: https://platform.openai.com/docs/api-reference/chat/create-chat-completion

## Issues Found
- The opening sentence claimed vLLM is "the fastest" open-source engine. Changed it to "a high-throughput" engine because the absolute claim is not reliably valid as a current technical statement.
- The NVIDIA GPU Operator example used `operator.defaultRuntime`, which NVIDIA documents as deprecated. Replaced it with the documented containerd toolkit environment settings.
- The basic deployment used `HUGGING_FACE_HUB_TOKEN`; Hugging Face documents `HF_TOKEN` as the environment variable for authentication. Updated the secret-backed environment variable.
- The multi-GPU Deployment omitted `spec.template.metadata.labels`, so its selector would not match the pod template and Kubernetes would reject it. Added matching pod template labels.
- The HPA example referenced a non-vLLM metric name, `vllm_pending_requests`, and said it scaled on GPU utilization even though only one metric was configured. Updated the explanation to require a Prometheus Adapter mapping from `vllm:num_requests_waiting` and changed the HPA metric name to `vllm_num_requests_waiting`.
- The monitoring section listed older vLLM metric names for GPU cache and average throughput. Updated them to current documented metrics: `vllm:kv_cache_usage_perc`, `vllm:prompt_tokens`, and `vllm:generation_tokens`.

## Review Notes
The post still pins older example versions such as `vllm/vllm-openai:v0.3.3` and NVIDIA GPU Operator chart `v23.9.1`. The examples are version-specific and broadly plausible, but future maintenance should refresh those pins and retest the snippets against the exact target Kubernetes, GPU Operator, and vLLM versions used by readers.
