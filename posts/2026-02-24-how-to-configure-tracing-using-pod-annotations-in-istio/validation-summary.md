# Validation Summary: How to Configure Tracing Using Pod Annotations in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes pod annotations
- Istio sidecar proxy configuration
- Distributed tracing
- Istio Telemetry API
- kubectl
- istioctl

## Sources Consulted
- Istio: Configure tracing using MeshConfig and pod annotations: https://istio.io/latest/docs/tasks/observability/distributed-tracing/mesh-and-proxy-config/
- Istio: Configure trace sampling: https://istio.io/latest/docs/tasks/observability/distributed-tracing/sampling/
- Istio: Telemetry reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio: MeshConfig and ProxyConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio: Resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Kubernetes: Container environment: https://kubernetes.io/docs/concepts/containers/container-environment/
- Kubernetes: Define environment variables for a container: https://kubernetes.io/docs/tasks/inject-data-application/define-environment-variable-container/

## Issues Found
- The post used `customTags` inside `proxy.istio.io/config`, but Istio's MeshConfig/ProxyConfig tracing examples use `custom_tags`. Updated all pod annotation tracing examples and the verification grep to use `custom_tags`.
- The post said pod annotations take priority over Telemetry API configuration. Istio documents random sampling precedence as Telemetry API > pod annotation > MeshConfig. Updated the priority section, example explanation, and summary.
- The environment-variable custom tag example put downward API variables on the application container and said the Envoy sidecar shares that environment. Kubernetes container env vars are per container, and Istio says environment custom tags read variables known to the sidecar proxy. Updated the example to use `proxyMetadata` for static proxy env vars and clarified that dynamic downward API values require sidecar injection template customization.
- The post implied a custom-tag-only annotation preserved mesh default tracing settings. Istio's ProxyConfig merge semantics replace the `tracing` field rather than deeply merging it. Added a caveat and updated the canary/stable example to include the intended stable sampling rate.
- The Telemetry API use-case list mentioned CEL-based filtering for this tracing context. Replaced it with supported tracing concerns: providers, context propagation, and span reporting.

## Review Notes
The examples assume the mesh already has tracing enabled and an appropriate tracing provider configured. For deployments that still rely on legacy `defaultConfig.tracing` backend settings, those settings may need to be repeated in the pod annotation because the `tracing` field is not deeply merged.
