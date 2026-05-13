# Validation Summary: How to Deploy Sidecar Proxies with Microservices in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux HelmRelease and Kustomization resources
- Kubernetes Deployments, Namespaces, Services, ConfigMaps, and sidecar containers
- Kustomize patches
- Istio sidecar injection
- Linkerd proxy injection
- Envoy proxy configuration

## Sources Consulted
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRepository API reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux CLI `reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Istio Helm installation documentation: https://istio.io/latest/docs/setup/install/helm/
- Istio supported releases: https://istio.io/latest/docs/releases/supported-releases/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Linkerd automatic proxy injection documentation: https://linkerd.io/2/features/proxy-injection/
- Envoy version history: https://www.envoyproxy.io/docs/envoy/latest/version_history/version_history
- Envoy HTTP connection manager v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto.html
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The HelmRelease example used `spec.createNamespace`, but Flux exposes namespace creation under the Helm install action. Changed it to `spec.install.createNamespace`.
- The Istio Helm examples referenced `1.20.x`, which is no longer supported in 2026. Updated the examples to `1.29.x`, a currently supported Istio release at validation time.
- The Istio Helm examples referenced a `HelmRepository` named `istio` without defining it. Added a Flux `HelmRepository` for the official Istio chart repository.
- The Istio base chart example omitted the default revision value shown in Istio's Helm installation guidance. Added `values.defaultRevision: default`.
- The Flux Kustomization example attempted to depend on `istiod`, which was shown as a HelmRelease. Flux Kustomization `dependsOn` depends on other Flux Kustomization objects, so the example now depends on an `istio-infrastructure` Kustomization.
- The per-pod Istio injection override used `sidecar.istio.io/inject` as an annotation, which Istio marks deprecated in favor of the pod label. Moved it under pod template labels.
- The Linkerd alternative was shown as a namespace label, but Linkerd documents `linkerd.io/inject: enabled` as an annotation. Updated the commented alternative.
- The manual Envoy sidecar image used `envoyproxy/envoy:v1.28-latest`, which is archived. Updated it to `envoyproxy/envoy:v1.38-latest`, a supported Envoy stable version at validation time.
- The manual Envoy example described the proxy as a traffic interceptor even though the manifest did not configure iptables redirection. Reworded it as a local reverse proxy and clarified that the Service `targetPort` or callers must use port 15001 for Envoy to be in the request path.
- The verification step implied automatic Istio injection and manual Envoy injection should be applied together while still expecting `2/2` containers. Clarified that these are alternative patterns and that enabling both results in both proxies being present.

## Review Notes
- The Istio proxy resource annotations used in the post are still documented, but several are marked alpha by Istio.
- The Envoy admin listener is exposed on `0.0.0.0` inside the pod for demonstration and then accessed with `kubectl port-forward`; production deployments should restrict access to the admin interface.
