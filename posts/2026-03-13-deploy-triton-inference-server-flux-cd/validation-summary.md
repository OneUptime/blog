# Validation Summary: How to Deploy Triton Inference Server with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- NVIDIA Triton Inference Server
- Flux CD v2
- Kubernetes Deployments, Services, Namespaces, and Kustomize manifests
- NVIDIA GPU Operator and Kubernetes GPU scheduling
- Prometheus metrics
- Triton HTTP inference and model repository APIs

## Sources Consulted
- NVIDIA Triton Inference Server model repository documentation: https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/user_guide/model_repository.html
- NVIDIA Triton Inference Server model repository extension: https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/protocol/extension_model_repository.html
- NVIDIA Triton Inference Server batcher documentation: https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/user_guide/batcher.html
- NVIDIA Triton Inference Server parameters and HTTP inference examples: https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/protocol/extension_parameters.html
- NVIDIA Triton Inference Server metrics documentation: https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/user_guide/metrics.html
- NVIDIA GPU Operator documentation: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/index.html
- Kubernetes command and args documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI `flux get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/

## Issues Found
- The prerequisites said Triton requires CUDA-capable GPUs. Triton can be deployed for CPU-backed workloads, but this tutorial specifically targets GPU-backed inference. Changed the wording to require NVIDIA GPU nodes for GPU-backed inference.
- The PVC-backed example referenced `triton-model-pvc` but the prerequisite did not name that required claim. Clarified that the PVC example expects a claim named `triton-model-pvc`.
- Step 1 was titled "Create Namespace and Model Repository ConfigMap" but the snippet only created a Namespace. Updated the heading to match the snippet.
- The deployment snippet included a comment that implied dynamic batching is enabled globally by server arguments. Triton configures dynamic batching per model in `config.pbtxt`, so the misleading comment was removed and a best-practice note was added.
- The model listing command used `GET /v2/models`, which is not Triton's documented model repository index endpoint. Replaced it with `POST /v2/repository/index` and a valid JSON body.
- The inference curl example used `data: [...]`, which is not valid JSON. Replaced it with a syntactically valid request body and clarified that users must substitute fields from their model config.
- The validation commands used `<triton-svc-ip>` placeholders in shell commands, which would be interpreted as shell redirection if copied literally. Replaced them with a `TRITON_HTTP_URL` variable using the Kubernetes service DNS name.

## Review Notes
- The Triton image tag `nvcr.io/nvidia/tritonserver:23.10-py3` is version-pinned and older than the review date. It is not inherently invalid, but future updates should consider testing against a newer Triton release and updating any version-specific guidance accordingly.
- The guide assumes the validation commands run from a network context that can resolve the cluster service DNS name, such as an in-cluster debug pod. For local workstation validation, a `kubectl port-forward` workflow would be a useful future addition.
