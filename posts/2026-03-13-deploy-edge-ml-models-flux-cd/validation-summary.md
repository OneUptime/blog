# Validation Summary: How to Deploy Edge ML Models with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes Deployments, Services, Jobs, and Kustomizations
- Flux OCIRepository
- OCI artifacts
- NVIDIA Triton Inference Server
- ONNX model serving
- GitOps for edge ML deployments

## Sources Consulted
- Flux CLI `push artifact` documentation: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux CLI `pull artifact` documentation: https://fluxcd.io/flux/cmd/flux_pull_artifact/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Source API reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- NVIDIA Triton model repository documentation: https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/user_guide/model_repository.html
- NVIDIA Triton runtime and port documentation: https://docs.nvidia.com/deeplearning/triton-inference-server/archives/triton_inference_server_230/user-guide/docs/run.html
- Kubernetes workload and Service API behavior: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/ and https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The artifact packaging example copied a flat ONNX file and JSON config into `/models`, but the serving example used Triton-compatible health endpoints. Updated the artifact layout to use Triton's required model repository structure with `model-repository/<model-name>/1/model.onnx` and `config.pbtxt`.
- The artifact packaging example claimed to package manifests but did not include them. Added `cp -R apps /tmp/model-artifact/` so the Flux `Kustomization` path can resolve from the OCI artifact.
- The `flux push artifact --revision` value used only `v2.3.0`, but Flux documents the revision format as `<branch|tag>@sha1:<commit-sha>`. Added `GIT_REVISION="$(git rev-parse HEAD)"` and used `--revision="${MODEL_VERSION}@sha1:${GIT_REVISION}"`.
- The `flux push artifact --annotations` example used a comma-separated string. Flux accepts repeated annotation flags in `key=value` format, so the example now uses separate `--annotations` flags.
- The inference deployment used `mcr.microsoft.com/onnxruntime/server:latest` with Triton-style `/v2/health/ready` checks and incorrect ports. Updated the deployment to use `nvcr.io/nvidia/tritonserver:24.04-py3`, `tritonserver --model-repository=/models`, HTTP port `8000`, gRPC port `8001`, and metrics port `8002`.
- The readiness probe checked `/v2/health/ready` on port `8002`, which is Triton's metrics port. Updated it to port `8000`.
- The deployment targeted GPU nodes but did not request a GPU device. Added `nvidia.com/gpu: 1` to resource limits for the GPU-targeted example.
- The Flux `postBuild.substitute` example set `MODEL_VERSION` to `"${MODEL_VERSION}"`, which would not be a concrete substitution value in the Kustomization manifest. Changed it to `"v2.3.0"`.
- The blue-green deployment snippet used the same obsolete ONNX Runtime Server image and lacked the model download/storage setup needed for Triton. Updated it to mirror the Triton model pull and serving pattern.
- The Service exposed only gRPC port `8001`, while the validation job uses HTTP. Added HTTP port `8000` and kept gRPC port `8001`.
- The validation job referenced `defect-detector-green`, but the post did not define that Service. Added a candidate Service selecting `slot: green`.
- The validation job targeted HTTP on port `8002`, which is the Triton metrics port. Updated it to port `8000`.

## Review Notes
- The examples still use placeholder registry images such as `my-registry.example.com/model-downloader:latest` and `my-registry.example.com/model-validator:latest`; those custom images must include the Flux CLI and validation logic described by the snippets.
- `nvcr.io/nvidia/tritonserver:24.04-py3` is pinned instead of `latest`, which is preferable for reproducible deployments. Teams should select a Triton image version compatible with their edge hardware, CUDA, JetPack, and driver stack.
