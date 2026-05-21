# Validation Summary: How to Use Istio Gateway API Inference Extension

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
- HTTPRoute
- vLLM-compatible inference serving
- Kubernetes HorizontalPodAutoscaler

## Sources Consulted
- Istio official task: Kubernetes Gateway API Inference Extension: https://istio.io/latest/docs/tasks/traffic-management/ingress/gateway-api-inference-extension/
- Gateway API Inference Extension official released getting started guide: https://gateway-api-inference-extension.sigs.k8s.io/guides/
- Gateway API Inference Extension official InferencePool documentation: https://gateway-api-inference-extension.sigs.k8s.io/api-types/inferencepool/
- Gateway API Inference Extension official v1 API reference: https://gateway-api-inference-extension.sigs.k8s.io/reference/spec/
- Gateway API Inference Extension official v1alpha2 API reference: https://gateway-api-inference-extension.sigs.k8s.io/reference/x-v1a2-spec/
- Istio official istioctl reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Gateway API Inference Extension GitHub releases: https://github.com/kubernetes-sigs/gateway-api-inference-extension/releases

## Issues Found
- The post used the old `inference.networking.x-k8s.io/v1alpha2` `InferencePool` shape with `targetPortNumber` and `endpointPickerConfig.extensionRef`. Updated the example to the current stable `inference.networking.k8s.io/v1` `InferencePool` API with `targetPorts` and `endpointPickerRef`.
- The install commands referenced older Gateway API CRDs and a stale inference extension `v0.3.0/install.yaml` URL. Updated them to current Gateway API CRDs and the released inference extension `manifests.yaml` artifact.
- The Istio install command only enabled alpha Gateway API support. Updated it to enable Istio's Gateway API Inference Extension support flags.
- The post described and used `InferenceModel`, which is no longer a current API resource. Replaced it with `InferenceObjective` for priority and `InferenceModelRewrite` for weighted model-name rewriting.
- The HTTPRoute backend reference used the old inference API group and included a `port` field for the InferencePool backend. Updated it to use `inference.networking.k8s.io` and removed the port.
- The endpoint picker deployment used outdated argument names and image location. Updated the example to the current EPP argument form and added the required config, HTTP/2 service setting, and Istio `DestinationRule` pattern shown in official Istio documentation.
- The test command retrieved an Istio-generated Service name directly. Updated it to read the Gateway status address, which matches the Gateway API flow.

## Review Notes
The project remains experimental/fast-moving, and some examples rely on release-specific EPP images and CRD versions. Future reviews should re-check the latest Istio task and Gateway API Inference Extension release before publishing.
