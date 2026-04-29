# Validation Summary: How to Deploy ML Model Serving on Rancher - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- KServe (v0.11.0)
- Knative Serving (v1.12.0)
- cert-manager (v1.13.0)
- NVIDIA Triton Inference Server (23.09-py3)
- TensorFlow Serving / Scikit-Learn / TorchServe / Seldon Core (mentioned)
- Kubernetes (InferenceService, Deployment, autoscaling)
- Rancher (referenced as the platform)

## Sources Consulted
- KServe v0.11 release samples: https://github.com/kserve/kserve/tree/release-0.11/docs/samples/v1beta1/rollout
- KServe canary sample (canary.yaml): https://raw.githubusercontent.com/kserve/kserve/release-0.11/docs/samples/v1beta1/rollout/canary.yaml
- KServe v0.11.0 release assets: https://github.com/kserve/kserve/releases/tag/v0.11.0 (kserve.yaml, kserve-runtimes.yaml verified to exist)
- Knative Serving v1.12.0 release: https://github.com/knative/serving/releases/tag/knative-v1.12.0
- cert-manager v1.13.0 release: https://github.com/cert-manager/cert-manager/releases/tag/v1.13.0
- Triton Inference Server documentation (default ports 8000 HTTP, 8001 gRPC, 8002 metrics; `/v2/health/ready` endpoint)
- KServe V1 inference protocol (`/v1/models/{name}:predict`)
- Knative autoscaling annotations documentation (`autoscaling.knative.dev/min-scale`, `max-scale`, `target`)

## Issues Found
- **Canary deployment YAML (Step 6)**: The original snippet incorrectly mixed a `containers:` block alongside the `sklearn:` framework predictor. KServe canary rollouts work by updating the InferenceService with a new `storageUri` and a `canaryTrafficPercent`; KServe automatically retains the previously promoted (default) revision and routes the specified percentage to the new (canary) revision. There is no separate canary container declaration. Removed the extraneous `containers:` block so the example matches the official v0.11 sample structure (`spec.predictor.canaryTrafficPercent` + framework + storageUri).

## Review Notes
- The placement of `canaryTrafficPercent` under `spec.predictor` is correct for KServe v0.11.0 (verified against the official `release-0.11` sample). Note that in newer KServe releases this has moved to `spec.canaryTrafficPercent` at the InferenceService spec level — readers using a newer KServe version should consult their version's docs.
- The legacy framework-named predictor specs (`sklearn:`, `tensorflow:`) are valid in v1beta1 for v0.11; newer KServe releases prefer the `model:` block with `modelFormat`. This is correct for the version pinned in the post but will look dated against current docs.
- The `autoscaling.knative.dev/target` annotation comment "requests per pod" is slightly imprecise — by default the metric is `concurrency`, so the target is concurrent in-flight requests per pod rather than RPS. Not technically wrong enough to require correction since users often interpret it loosely, but worth keeping in mind.
- The Triton image tag `nvcr.io/nvidia/tritonserver:23.09-py3` is a real, valid release tag from NGC.
- The KServe install URLs (`kserve.yaml` and `kserve-runtimes.yaml`) for v0.11.0 were verified to exist (HTTP 302 from GitHub release downloads).
- The curl prediction example assumes the `${MODEL_URL}` returned by `.status.url` is reachable; in serverless KServe deployments the URL is often only resolvable via the cluster ingress gateway, which may require a `Host` header when accessed externally. The in-cluster example is fine as written.
