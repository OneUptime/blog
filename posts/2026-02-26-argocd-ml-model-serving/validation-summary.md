# Validation Summary: How to Deploy ML Model Serving with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes Deployments, Services, HPAs, probes, node selectors, tolerations, and GPU resources
- KServe InferenceService
- Seldon Core 1 SeldonDeployment
- Istio VirtualService traffic splitting
- Prometheus alerting rules
- Mike Farah yq
- OneUptime monitoring

## Sources Consulted
- Argo CD Application Specification: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- KServe v0.12 installation docs: https://kserve.github.io/archive/0.12/get_started/
- KServe v0.12 serverless installation docs: https://kserve.github.io/archive/0.12/admin/serverless/serverless/
- KServe canary rollout docs: https://kserve.github.io/archive/0.13/modelserving/v1beta1/rollout/canary-example/
- KServe ServingRuntime docs: https://kserve.github.io/website/docs/concepts/resources/servingruntime
- KServe autoscaling docs: https://kserve.github.io/archive/0.15/modelserving/autoscaling/autoscaling/
- Knative scale bounds docs: https://knative.dev/docs/serving/autoscaling/scale-bounds/
- Seldon Core 1 installation docs: https://docs.seldon.ai/seldon-core-1/getting-started/installation/installation
- Seldon Core 1 Helm chart docs: https://docs.seldon.ai/seldon-core-1/reference/helm_charts
- Seldon Core 1 inference graph docs: https://docs.seldon.ai/seldon-core-1/configuration/routing/inference-graph
- Seldon Core 1 Istio canary / A/B docs: https://docs.seldon.ai/seldon-core-1/tutorials/notebooks/istio_canary
- Seldon Core 1 SKLearn server docs: https://docs.seldon.ai/seldon-core-1/configuration/servers/sklearn
- Seldon Core 1 prepackaged model server docs: https://docs.seldon.ai/seldon-core-1/v1.19/configuration/servers/overview
- Kubernetes Deployment docs: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Horizontal Pod Autoscaling docs: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes GPU scheduling docs: https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- yq evaluate command docs: https://mikefarah.gitbook.io/yq/commands/evaluate

## Issues Found
- The KServe InferenceService comment said "Scale to zero when idle" while `autoscaling.knative.dev/minScale: "1"` keeps at least one replica running. Changed the comment to "Keep at least one replica warm."
- The Seldon Core canary example assigned `traffic: 10` only to the canary predictor. Added `traffic: 90` to the default predictor to match Seldon's documented canary traffic split pattern.
- The GPU Deployment example omitted the required `spec.selector` and matching pod template labels for an `apps/v1` Deployment. Added `app: gpu-model-server` labels and selector.
- The Istio A/B testing example routed to `model-a` and `model-b` hosts without defining corresponding Kubernetes Services. Added minimal Services and made the Deployment examples include matching selectors, pod labels, and container ports.

## Review Notes
- The KServe installation example pins v0.12.0. The syntax and repository path are valid for that version, but KServe has newer releases available as of this review.
- The HPA custom pod metric example is structurally valid for `autoscaling/v2`, but it requires a custom metrics adapter exposing `inference_requests_per_second`.
- The Prometheus rule examples assume the model server exports the named inference and drift metrics.
