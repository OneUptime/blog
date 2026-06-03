# Validation Summary: How to Implement Multi-Model Servers with Triton Inference Server on Kubernetes

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- NVIDIA Triton Inference Server
- Kubernetes Deployments, Services, PersistentVolumeClaims, and kubectl
- Triton model repositories and model configuration (`config.pbtxt`)
- Triton HTTP/KServe inference and model repository APIs
- Prometheus metrics and Prometheus Operator ServiceMonitor
- GPU scheduling and Triton rate limiting

## Sources Consulted
- NVIDIA Triton Inference Server model configuration documentation: https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/user_guide/model_configuration.html
- NVIDIA Triton Inference Server model repository extension documentation: https://docs.nvidia.com/deeplearning/triton-inference-server/archives/triton-inference-server-2620/user-guide/docs/protocol/extension_model_repository.html
- NVIDIA Triton Inference Server model management documentation: https://docs.nvidia.com/deeplearning/triton-inference-server/archives/triton-inference-server-2340/user-guide/docs/user_guide/model_management.html
- NVIDIA Triton Inference Server metrics documentation: https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/user_guide/metrics.html
- NVIDIA Triton Inference Server rate limiter documentation: https://docs.nvidia.com/deeplearning/triton-inference-server/archives/triton-inference-server-2370/user-guide/docs/user_guide/rate_limiter.html
- NVIDIA Triton Inference Server Kubernetes deployment guide: https://docs.nvidia.com/deeplearning/triton-inference-server/archives/triton-inference-server-2670/user-guide/docs/tutorials/Deployment/Kubernetes/README.html
- NVIDIA Triton Inference Server release compatibility matrix: https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/introduction/compatibility.html
- Kubernetes kubectl documentation: https://kubernetes.io/docs/reference/kubectl/
- Prometheus Operator ServiceMonitor API documentation: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The article said Triton always watches the model repository and dynamically loads updates. Triton only does that behavior when configured with the appropriate model control mode, so the explanation was corrected to mention startup loading, polling, and repository API loading.
- The PyTorch sentiment model example used `model.onnx` in the repository tree and described a PyTorch model. The file name was changed to `model.pt`, and the text now says TorchScript.
- The batched Triton model config used `dims: [ -1, 128 ]` and `dims: [ -1, 2 ]`, which incorrectly included an extra dynamic dimension because Triton prepends the batch dimension when `max_batch_size > 0`. The dimensions were corrected to `[ 128 ]` and `[ 2 ]`.
- The deployment used the soft-deprecated `--strict-model-config=false` flag. It was removed, and the snippet now relies on Triton's default auto-complete behavior for supported backends.
- The ServiceMonitor selector matched `app: triton-server`, but the Service did not have that label. The Service metadata now includes the label.
- The testing section used `curl http://localhost:8000/v2/models` to list models. Triton's repository index API is `POST /v2/repository/index`, so the command and explanatory text were corrected.
- The inference request body used `...`, making it invalid JSON. It now generates a valid `sentiment-input.json` with 128-token `input_ids` and `attention_mask` arrays.
- The dynamic loading section used a non-existent repository status URL. It now uses the repository index API to check model readiness.
- The rate limiter example placed `rate_limiter` at the top level of the model config and treated the resource count like MiB of GPU memory. Triton expects rate limiter config under `instance_group`, with abstract resource counts; the snippet was corrected accordingly.

## Review Notes
- The post still uses `nvcr.io/nvidia/tritonserver:24.01-py3`. That tag is older than the current 2026 Triton releases, but it is not inherently invalid for a version-pinned tutorial. Future updates should consider refreshing the image tag and driver compatibility notes together.
