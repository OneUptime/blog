# Validation Summary: Running Self-Hosted LLMs on Kubernetes: A Complete Guide

## Status
validated

## Post Type
Technical tutorial / deployment guide

## Technologies Covered
- Kubernetes
- NVIDIA Kubernetes Device Plugin
- NVIDIA GPU time-slicing
- Helm
- vLLM
- Hugging Face Hub
- OpenAI Python and Node.js SDKs
- KEDA
- Prometheus and ServiceMonitor
- Nginx Ingress / Nginx proxy configuration

## Sources Consulted
- Kubernetes GPU scheduling documentation: https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- NVIDIA Kubernetes Device Plugin documentation: https://github.com/NVIDIA/k8s-device-plugin
- NVIDIA GPU Operator GPU sharing documentation: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/gpu-sharing.html
- vLLM OpenAI-compatible server documentation: https://docs.vllm.ai/en/stable/cli/serve/
- vLLM production metrics documentation: https://docs.vllm.ai/en/latest/usage/metrics/
- KEDA Prometheus scaler documentation: https://keda.sh/docs/2.20/scalers/prometheus/
- Hugging Face Hub download documentation: https://huggingface.co/docs/huggingface_hub/en/guides/download
- NVIDIA CUDA container image registry: https://hub.docker.com/r/nvidia/cuda

## Issues Found
- The CUDA test pod used `nvidia/cuda:12.0-base`, which is not a current explicit CUDA image tag format. Changed it to `nvidia/cuda:12.4.1-base-ubuntu22.04`.
- The GPU time-slicing ConfigMap was applied but not connected to the NVIDIA device plugin. Added the Helm upgrade command with `config.name=nvidia-device-plugin-config`.
- The Hugging Face `snapshot_download` example used `local_dir_use_symlinks=False`, which is no longer part of the current recommended local directory download example. Removed the parameter.
- The vLLM deployment comment said tensor parallelism used all GPUs while the value was `--tensor-parallel-size=1`. Corrected the comment.
- The vLLM deployment always enabled `--trust-remote-code` even though the selected Mistral model does not require it and the comment only applied to custom models. Removed the flag from the default example.
- The ServiceMonitor selected Services with `app: vllm-server`, but the Service did not have that label. Added the label to the Service metadata.
- The KEDA Prometheus trigger included `metricName`, which is not part of the current KEDA Prometheus trigger metadata, and used an outdated vLLM metric name. Removed `metricName` and changed the query to `vllm:num_requests_waiting`.
- The ResourceQuota used `nvidia.com/gpu`, but Kubernetes extended resource quotas require the `requests.` prefix. Changed it to `requests.nvidia.com/gpu`.
- The vLLM metrics list used outdated underscore metric names. Updated the list to current colon-separated vLLM metrics and replaced the old GPU cache and average throughput metric examples.
- The authentication section claimed the snippet showed API key validation, but the snippet only defined an Nginx sidecar container. Reworded the sentence to avoid overstating what the snippet implements.

## Review Notes
- The post remains a practical guide, but production deployments should pin container image versions instead of using `vllm/vllm-openai:latest`.
- The `ReadWriteMany` PVC example assumes the selected storage class supports RWX volumes.
- The KEDA Prometheus query assumes the Prometheus setup attaches a `namespace` label to scraped vLLM metrics.
