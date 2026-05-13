# Validation Summary: How to Deploy KServe for Model Inference with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- KServe
- Flux CD
- Kubernetes
- Knative Serving
- Istio
- HelmRelease
- OCIRepository
- S3-backed model storage

## Sources Consulted
- KServe v0.13 model storage URI documentation: https://kserve.github.io/archive/0.13/modelserving/storage/uri/uri/
- KServe v0.13 PyTorch/TorchServe InferenceService documentation: https://kserve.github.io/archive/0.13/modelserving/v1beta1/torchserve/
- KServe v0.13 chart values from the official repository: https://raw.githubusercontent.com/kserve/kserve/v0.13.0/charts/kserve-resources/values.yaml
- KServe v0.13 API source for predictor fields: https://raw.githubusercontent.com/kserve/kserve/v0.13.0/pkg/apis/serving/v1beta1/predictor.go
- KServe current canary rollout documentation: https://kserve.github.io/website/docs/model-serving/predictive-inference/rollout-strategies/canary-example
- KServe current S3 configuration documentation: https://kserve.github.io/website/docs/admin-guide/configurations
- KServe current installation documentation for OCI Helm charts: https://kserve.github.io/website/docs/admin-guide/kubernetes-deployment
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux HelmRelease documentation: https://fluxcd.io/flux/guides/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Knative scale-to-zero documentation: https://knative.dev/docs/serving/autoscaling/scale-to-zero/

## Issues Found
- The post used a non-working KServe Helm repository URL and referenced a `kserve` chart. KServe publishes the relevant charts as OCI artifacts, and the v0.13 install is split into `kserve-crd` and `kserve-resources`, so the Flux source and HelmRelease examples were changed to use `OCIRepository` plus `chartRef`.
- The KServe Helm values used invalid keys for the v0.13 chart, including full image strings under `agent.image` and `router.image`, top-level `controller`, and top-level `ingress`. These were corrected to match the official chart values.
- The examples referenced the `kserve-models` namespace without creating it. A `Namespace` manifest was added before the Secret and ServiceAccount.
- The scale-to-zero example used the old camelCase Knative annotation and set `minReplicas: 1`, which prevents scaling to zero. The annotation was updated to `autoscaling.knative.dev/scale-to-zero-pod-retention-period`, and the example model now uses `minReplicas: 0`.
- The Scikit-learn example tested the V2 inference endpoint without configuring V2 protocol. The predictor was updated to the supported `model` schema with `modelFormat: sklearn` and `protocolVersion: v2`.
- The PyTorch example used `runtimeVersion: "2.1.0"`, which is not how KServe selects the TorchServe runtime in the documented v0.13 examples. It was changed to the `model` schema with `modelFormat: pytorch`.
- The canary rollout field was placed at `spec.canaryTrafficPercent`, but KServe defines it under the predictor component. It was moved under `spec.predictor`.
- The Flux Kustomization example depended on a `kserve` Kustomization that the article did not define. That dependency was removed to avoid implying that a Kustomization can depend directly on the HelmRelease shown earlier.

## Review Notes
The examples still assume that Knative, Istio, DNS/ingress routing, SOPS secret handling, and model artifacts are configured correctly outside the snippets. The KServe version used in the article is pinned to v0.13.0; newer KServe releases prefer the Standard deployment mode for many production workloads, but the serverless/Knative mode remains technically valid for the tutorial's stated goal.
