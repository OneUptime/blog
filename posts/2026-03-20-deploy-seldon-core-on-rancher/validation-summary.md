# Validation Summary: How to Deploy Seldon Core on Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- Kubectl
- Seldon Core 1
- Istio
- Ambassador
- scikit-learn
- Prometheus
- PromQL

## Sources Consulted
- Seldon Core 1 installation docs: https://docs.seldon.ai/seldon-core-1/getting-started/installation/installation
- Seldon Core 1 Istio routing docs: https://docs.seldon.ai/seldon-core-1/configuration/routing/istio
- Seldon Core 1 Ambassador routing docs: https://docs.seldon.ai/seldon-core-1/configuration/routing/ambassador
- Seldon Core 1 SKLearn server docs: https://docs.seldon.ai/seldon-core-1/configuration/servers/sklearn
- Seldon Core 1 prepackaged model server docs: https://docs.seldon.ai/seldon-core-1/configuration/servers/overview
- Seldon Core 1 endpoint testing docs: https://docs.seldon.ai/seldon-core-1/configuration/deployments/serving
- Seldon Core 1 Prometheus metrics docs: https://docs.seldon.ai/seldon-core-1/configuration/integrations/analytics
- Seldon Core 1 explainer docs: https://docs.seldon.ai/seldon-core-1/configuration/integrations/explainers
- MLServer deployment with Seldon Core docs: https://docs.seldon.ai/mlserver/user-guide/deployment/seldon-core
- Seldon Core 1 protocol examples: https://docs.seldon.ai/seldon-core-1/v1.19/tutorials/notebooks/protocol_examples

## Issues Found
- The introduction said Seldon Core provides explainability with SHAP/LIME. Current Seldon Core 1 docs describe Alibi-based explainers and list supported methods such as Kernel SHAP, Tree SHAP, Integrated Gradients, and Anchors, but not LIME as a built-in Seldon Core explainer. I changed this to Alibi explainers such as Kernel SHAP and Anchors.
- The post was version-ambiguous even though the commands and CRDs are for Seldon Core 1. I clarified that the guide uses Seldon Core 1.
- The prerequisites and Helm install step implied that switching off `istio.enabled` was enough for Ambassador. Official install docs require `--set ambassador.enabled=true` for Ambassador, and Istio setups also require a configured gateway resource. I corrected both points.
- The CRD verification command was broad (`kubectl get crd | grep seldon`). I replaced it with a direct check for `seldondeployments.machinelearning.seldon.io`, which is the specific CRD created for Seldon deployments.
- The model deployment section trained a local `model.joblib` but then jumped straight to an object-store `modelUri` without explaining that the serialized model must be uploaded there and readable by Seldon. I added that requirement and noted the need for a scikit-learn version compatible with the installed `SKLEARN_SERVER` image.
- The deployment example used `namespace: production` without creating that namespace first. I added `kubectl create namespace production` before applying the manifest.
- The test command assumed an Istio load balancer IP only. I changed it to handle either an IP or hostname and noted that the example is Istio-specific while Ambassador users should use their Ambassador ingress address instead.
- The Prometheus example used executor server metrics for “prediction rate per model” and “model latency p99”. According to the metrics docs, per-model latency and per-component request metrics should use `seldon_api_executor_client_requests_seconds_*`. I updated the PromQL accordingly and filtered by `deployment_name`.
- The A/B test manifest omitted the namespace used earlier in the tutorial. I aligned it to the `production` namespace to keep the example consistent with the rest of the post.

## Review Notes
- The tutorial now matches documented Seldon Core 1 behavior, but Seldon’s current docs recommend the Open Inference Protocol (`protocol: v2`) for new work and note that the legacy Seldon protocol is no longer the preferred path. This post still uses the documented `/api/v1.0/predictions` flow, which remains valid for Core 1, but a future refresh should consider moving the examples to OIP/V2.
