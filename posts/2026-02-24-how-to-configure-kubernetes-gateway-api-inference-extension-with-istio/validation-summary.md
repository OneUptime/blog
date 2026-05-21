# Validation Summary: How to Configure Kubernetes Gateway API Inference Extension with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes Gateway API
- Gateway API Inference Extension
- InferencePool
- InferenceObjective
- InferenceModelRewrite
- Endpoint Picker
- HTTPRoute
- vLLM-compatible inference serving
- Prometheus / Istio metrics

## Sources Consulted
- Istio official task: Kubernetes Gateway API Inference Extension: https://istio.io/latest/docs/tasks/traffic-management/ingress/gateway-api-inference-extension/
- Istio 1.27 release announcement: https://istio.io/latest/news/releases/1.27.x/announcing-1.27/
- Istio 1.28 release announcement: https://istio.io/latest/news/releases/1.28.x/announcing-1.28/
- Gateway API Inference Extension official InferencePool documentation: https://gateway-api-inference-extension.sigs.k8s.io/api-types/inferencepool/
- Gateway API Inference Extension official InferenceObjective documentation: https://gateway-api-inference-extension.sigs.k8s.io/api-types/inferenceobjective/
- Gateway API Inference Extension official InferenceModelRewrite documentation: https://gateway-api-inference-extension.sigs.k8s.io/api-types/inferencemodelrewrite/
- Gateway API Inference Extension v1 API reference: https://gateway-api-inference-extension.sigs.k8s.io/reference/spec/
- Gateway API Inference Extension v1alpha2 API reference: https://gateway-api-inference-extension.sigs.k8s.io/reference/x-v1a2-spec/
- Gateway API Inference Extension priority and capacity documentation: https://gateway-api-inference-extension.sigs.k8s.io/concepts/priority-and-capacity/
- Gateway API GitHub release artifact: https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.5.1/standard-install.yaml
- Gateway API Inference Extension GitHub release artifact: https://github.com/kubernetes-sigs/gateway-api-inference-extension/releases/latest/download/manifests.yaml

## Issues Found
- The prerequisites referenced Istio 1.22+ and Gateway API experimental CRDs. Updated the post to require Istio 1.28+ for current `InferencePool` v1 compatibility, added the Istio install flags for Gateway API Inference Extension support, and changed the Gateway API CRD command to the current standard CRD release.
- The `InferencePool` examples used the old `inference.networking.x-k8s.io/v1alpha2` API with `targetPortNumber` and `extensionRef`. Updated them to the current stable `inference.networking.k8s.io/v1` API with `targetPorts` and `endpointPickerRef`.
- The post described `InferenceModel`, `modelName`, and `criticality` fields that are no longer current for the documented extension flow. Replaced them with `InferenceObjective` priority examples and an `InferenceModelRewrite` example for model-name matching and rewriting.
- The HTTPRoute backend reference used the old inference API group and included a `port` field. Updated it to use `inference.networking.k8s.io` and removed the backend port for the `InferencePool` reference.
- The model server example used an unpinned `vllm/vllm-openai:latest` deployment with a gated model and GPU requirements. Replaced it with the official vLLM-compatible simulator pattern used by the Istio task so the example is runnable in a basic test cluster.
- The Endpoint Picker deployment used outdated image location and argument names and omitted the HTTP/2 Service setting, plugin configuration, Istio TLS DestinationRule, and RBAC needed by the documented Istio integration. Updated the example to match the official deployment pattern.
- The request flow said the extension parses the body and matches `InferenceModel` resources. Updated it to describe HTTPRoute-to-InferencePool routing, optional `InferenceModelRewrite`, and `x-gateway-inference-objective` priority handling.
- The load-aware routing explanation claimed routing used GPU utilization directly. Updated it to the documented Endpoint Picker metric categories such as queue depth, KV-cache utilization, prefix-cache locality, and active LoRA adapters.
- The practical tips said the whole extension is alpha and used `criticality` levels. Updated the wording to note that `InferenceObjective` and `InferenceModelRewrite` are alpha and to use objective priorities instead.

## Review Notes
The Gateway API Inference Extension is still moving quickly. `InferencePool` is GA in `inference.networking.k8s.io/v1`, while `InferenceObjective` and `InferenceModelRewrite` remain alpha in `inference.networking.x-k8s.io/v1alpha2`; these examples should be rechecked against the latest Istio task and extension release before publication.
