# Validation Summary: How to Deploy Hugging Face Text Generation Inference with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Hugging Face Text Generation Inference (TGI)
- Kubernetes Deployments, Services, Secrets, PersistentVolumeClaims, probes, and GPU resources
- NVIDIA Kubernetes device plugin / GPU Operator
- Flux CD v2 Kustomizations
- Kustomize
- Hugging Face Hub authentication
- OpenAI-compatible chat completions API

## Sources Consulted
- Hugging Face TGI README and Docker guidance: https://github.com/huggingface/text-generation-inference
- Hugging Face TGI launcher argument reference: https://huggingface.co/docs/text-generation-inference/en/reference/launcher
- Hugging Face TGI HTTP API reference: https://huggingface.co/docs/text-generation-inference/en/reference/api_reference
- Hugging Face TGI gated/private model access: https://huggingface.co/docs/text-generation-inference/en/basic_tutorials/gated_model_access
- Hugging Face Hub environment variables: https://huggingface.co/docs/huggingface_hub/package_reference/environment_variables
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes liveness, readiness, and startup probes: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- NVIDIA Kubernetes device plugin documentation: https://github.com/NVIDIA/k8s-device-plugin

## Issues Found
- The post used `HUGGING_FACE_HUB_TOKEN` for Hugging Face authentication. Hugging Face now documents `HF_TOKEN` as the supported variable for TGI and marks `HUGGING_FACE_HUB_TOKEN` as deprecated in the Hub client. Updated the secret key and container environment variable to `HF_TOKEN`.
- The secret creation command targeted the `tgi` namespace before ensuring that namespace existed. Added `kubectl apply -f clusters/my-cluster/tgi/namespace.yaml` before creating the secret.
- The TGI image tag `2.0.4` was stale for a current deployment guide. Updated it to `3.3.7`, the latest release shown in the official TGI GitHub releases at review time.
- The deployment relied on delayed readiness and liveness probes for a slow-starting model server. Kubernetes recommends startup probes for applications that need extra startup time because they suppress liveness/readiness checks until startup succeeds. Added a `startupProbe` and removed the liveness/readiness initial delays.
- The Flux Kustomization had health checks but no extended timeout, which can be too short for first-time model download and load. Added `timeout: 15m`.
- The test commands used `http://<tgi-svc-ip>:8080` even though the Service is the default `ClusterIP`, which is normally internal to the cluster. Added `kubectl port-forward svc/tgi-server -n tgi 8080:8080` and changed local test URLs to `localhost:8080`.

## Review Notes
- `--max-input-length` is documented by TGI as a legacy alias for `--max-input-tokens`; it remains supported, so it was not changed.
- The official TGI GitHub repository is archived as of March 21, 2026, but the current documentation and container artifacts remain available. This is worth considering for future platform selection, but it does not make the deployment steps invalid.
- Local `kubectl` and `flux` binaries were not installed in the review environment, so CLI behavior was verified against official command references instead of local `--help` output.
