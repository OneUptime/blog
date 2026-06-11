# Validation Summary: How to Implement Canary Model Deployment

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- Seldon Core 1
- KServe
- Helm
- Python Kubernetes client
- Prometheus and PromQL
- Argo Rollouts
- Flagger
- Istio

## Sources Consulted
- Seldon Core 1 Quick Start Guide: https://docs.seldon.ai/seldon-core-1
- Seldon Core 1 SeldonDeployment CRD reference: https://docs.seldon.ai/seldon-core-1/reference/seldon-deployment-crd
- Seldon Core source CRD types: https://github.com/SeldonIO/seldon-core/blob/master/operator/apis/machinelearning.seldon.io/v1/seldondeployment_types.go
- KServe Canary Rollout Strategy: https://kserve.github.io/website/docs/model-serving/predictive-inference/rollout-strategies/canary
- KServe Canary Rollout Example: https://kserve.github.io/website/docs/model-serving/predictive-inference/rollout-strategies/canary-example
- KServe HPA autoscaling docs: https://kserve.github.io/website/docs/model-serving/predictive-inference/autoscaling/hpa-autoscaler
- Argo Rollouts Analysis documentation: https://argo-rollouts.readthedocs.io/en/stable/features/analysis/
- Argo Rollouts Prometheus analysis documentation: https://argo-rollouts.readthedocs.io/en/stable/analysis/prometheus/
- Flagger deployment strategies: https://docs.flagger.app/usage/deployment-strategies
- Flagger metrics analysis: https://docs.flagger.app/usage/metrics
- Helm install command reference: https://helm.sh/docs/helm/helm_install/
- Prometheus recording rules: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Kubernetes Python client CustomObjectsApi reference: https://github.com/kubernetes-client/python/blob/master/kubernetes/docs/CustomObjectsApi.md

## Issues Found
- Removed deprecated Seldon `spec.name` fields from SeldonDeployment examples. The current Seldon Core 1 CRD marks this field as deprecated, and `metadata.name` plus predictor names are sufficient for these examples.
- Corrected the KServe canary example. KServe uses `canaryTrafficPercent` under `spec.predictor` and routes traffic between the last good revision and the latest ready revision; it does not use a top-level `spec.canary` block with a nested predictor.
- Clarified that KServe canary rollout applies in serverless deployment mode, matching current KServe documentation.
- Replaced the KServe/Argo wording that implied Argo Rollouts directly manages a KServe InferenceService. The shown Rollout is a Kubernetes workload rollout for a model server behind Istio, not an InferenceService controller.
- Fixed Flagger comments for `threshold` and `maxWeight`. `threshold` is the failed-check threshold before rollback, while `maxWeight` is the maximum canary traffic weight before promotion.
- Fixed the Seldon shadow deployment example to use a separate predictor with `shadow: true`, matching the SeldonDeployment predictor schema, instead of modeling shadow traffic as a child node in the inference graph.
- Removed an unused `Optional` import from the Python example.
- Corrected a Prometheus alert annotation that described a latency ratio as "higher than baseline"; it now says "of baseline."

## Review Notes
The examples are illustrative and still require a real cluster with the relevant CRDs, ingress or service mesh resources, model artifacts, Prometheus scraping, and custom model accuracy metrics. I did not run these manifests against a live Kubernetes cluster.
