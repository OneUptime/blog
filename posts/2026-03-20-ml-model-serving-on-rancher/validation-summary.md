# Validation Summary: How to Deploy ML Model Serving on Rancher

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Rancher (Kubernetes management)
- KServe (InferenceService CRD, v1beta1 API, V1 inference protocol)
- NVIDIA Triton Inference Server (24.01-py3 image)
- Kubernetes Deployment, HorizontalPodAutoscaler (autoscaling/v2)
- tritonclient Python library (HTTP)
- Prometheus / PromQL (Triton metrics, DCGM GPU metrics)
- scikit-learn model serving on KServe

## Sources Consulted
- KServe v0.12.0 release assets (verified `kserve.yaml` exists at https://github.com/kserve/kserve/releases/download/v0.12.0/kserve.yaml — 302 redirect confirms artifact is published)
- KServe documentation, Deploy Your First Predictive AI Service: https://kserve.github.io/website/docs/getting-started/predictive-first-isvc (confirms V1 protocol body uses `{"instances": [...]}`)
- KServe v1beta1 InferenceService CRD spec (`serving.kserve.io/v1beta1`, `predictor.model.modelFormat.name`, `storageUri`, `resources` fields)
- NVIDIA Triton Inference Server documentation: standard ports (8000 HTTP, 8001 gRPC, 8002 metrics), `--model-repository` and `--log-verbose` flags
- NVIDIA NGC catalog: `nvcr.io/nvidia/tritonserver:24.01-py3` is a real, published image tag
- tritonclient Python API: `InferenceServerClient`, `InferInput`, `set_data_from_numpy`, `infer`, `as_numpy`
- Kubernetes HPA `autoscaling/v2` API (stable since 1.23)
- Triton Prometheus metric names: `nv_inference_request_success`, `nv_inference_compute_infer_duration_us`
- NVIDIA DCGM exporter metric: `DCGM_FI_DEV_GPU_UTIL`

## Issues Found

1. **KServe inference request body used wrong protocol format.**
   - The example posted to the V1 endpoint `/v1/models/sklearn-iris:predict` but used a V2-style body `{"inputs": [{"data": [[5.1, 3.5, 1.4, 0.2]]}]}`. The V1 protocol requires `{"instances": [...]}` (per KServe V1 protocol spec). Sending the V2-shaped payload to the V1 endpoint would fail to parse.
   - **Fix:** Changed the body to `{"instances": [[5.1, 3.5, 1.4, 0.2]]}` and clarified the comment to "KServe inference (V1 protocol)" so the URL and body are consistent.

## Review Notes
- Section headers jump from "Option 1" / "Option 2" to "Step 3" / "Step 4" / "Step 5". This is a stylistic inconsistency, not a technical error, so it was left as-is per the review instructions.
- The KServe install command targets `v0.12.0`, which is the serverless install bundle requiring cert-manager and Knative (correctly noted in the comment). Newer KServe releases (v0.13+) exist, but v0.12.0 is a valid pinned version and the artifact URL works.
- The Triton image tag `24.01-py3` (January 2024) is older than the current Triton releases as of late 2026, but it is a real, valid published tag and the documented launch flags are unchanged. Readers may want to bump to a more recent monthly release in production.
- The KServe `InferenceService` places `resources` under `predictor.model`. This is supported in v1beta1's ModelSpec, though some examples in the official docs put resources at the predictor level — both forms are valid.
- The Triton `--log-verbose=1` flag accepts a non-negative integer level (0 disables, higher = more verbose); `=1` is correct.
- The `tritonclient.http.InferenceServerClient` accepts `host:port` without a scheme prefix — the example follows this correctly.
- The PromQL latency expression `nv_inference_compute_infer_duration_us / nv_inference_request_success` divides two counters; for an instantaneous average over a window it is more accurate to use `rate(...) / rate(...)` over the same window. This is a measurement-quality observation rather than an error, so it was not modified.
