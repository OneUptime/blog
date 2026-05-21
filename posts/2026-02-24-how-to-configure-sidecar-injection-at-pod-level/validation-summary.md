# Validation Summary: How to Configure Sidecar Injection at Pod Level

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio sidecar injection
- Istio pod labels and annotations
- Istio ProxyConfig
- Envoy sidecar traffic interception
- Kubernetes Deployments and pod templates
- kubectl JSONPath output

## Sources Consulted
- Istio Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio Resource Labels: https://istio.io/latest/docs/reference/config/labels/
- Istio Installing the Sidecar: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio ProxyConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/#ProxyConfig
- Istio tracing with MeshConfig and pod annotations: https://istio.io/latest/docs/tasks/observability/distributed-tracing/mesh-and-proxy-config/
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- Several `apps/v1` Deployment examples omitted `spec.selector` and matching pod template labels. Added selectors and labels so the manifests are valid Kubernetes Deployments.
- The post used `sidecar.istio.io/inject` as an annotation. In current Istio documentation, the annotation is deprecated in favor of the `sidecar.istio.io/inject` pod label. Updated examples and wording to use the label.
- The introduction and summary described all pod-level controls as annotations and stated that annotations override namespace-level defaults. Updated this to say labels and annotations, and softened the namespace-level precedence wording.
- A traffic interception heading said "outbound ports" while the example used `traffic.sidecar.istio.io/includeOutboundIPRanges`. Updated the heading to "outbound IP ranges."
- The AWS metadata endpoint note tied IMDS access to IAM roles for service accounts too broadly. Reworded it to refer to workloads that intentionally depend on direct metadata-service access.
- The readiness section showed an application container readiness probe checking the sidecar port. Replaced it with Istio's sidecar readiness timing annotations and kept `holdApplicationUntilProxyStarts` as the startup-ordering recommendation.
- The sidecar image override example used an older Istio proxy tag. Updated the illustrative tag to `1.30.0-custom`, matching the current Istio documentation version consulted.

## Review Notes
The post is technically relevant and remains a valid Istio sidecar-injection guide after the corrections. Some annotations discussed are marked Alpha in Istio's reference docs, so future updates should re-check annotation status and behavior against the Istio version being targeted.
