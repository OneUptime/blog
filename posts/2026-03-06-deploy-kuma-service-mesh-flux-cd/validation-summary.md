# Validation Summary: How to Deploy Kuma Service Mesh with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kuma
- Kubernetes
- Helm
- Envoy
- Service mesh policies

## Sources Consulted
- Kuma Helm installation documentation: https://kuma.io/docs/2.13.x/production/cp-deployment/kubernetes/
- Kuma single-zone control plane documentation: https://kuma.io/docs/2.13.x/production/cp-deployment/single-zone/
- Kuma Helm chart repository: https://kumahq.github.io/charts/
- Kuma control-plane configuration reference: https://kuma.io/docs/2.13.x/reference/kuma-cp/
- Kuma data plane on Kubernetes documentation: https://kuma.io/docs/2.13.x/production/dp-config/dpp-on-kubernetes/
- Kuma Kubernetes annotations and labels reference: https://kuma.io/docs/2.13.x/reference/kubernetes-annotations/
- Kuma Mesh resource documentation: https://kuma.io/docs/2.13.x/resources/mesh/
- Kuma MeshTrafficPermission documentation: https://kuma.io/docs/2.13.x/policies/meshtrafficpermission/
- Kuma MeshHTTPRoute documentation: https://kuma.io/docs/2.13.x/policies/meshhttproute/
- Kuma MeshCircuitBreaker documentation: https://kuma.io/docs/2.13.x/policies/meshcircuitbreaker/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The post described a standalone deployment and set `controlPlane.mode: standalone`. Current Kuma single-zone Kubernetes deployment documentation uses `controlPlane.mode: zone`, so the wording and Helm values were updated.
- The pinned Kuma chart range was outdated. The HelmRelease now uses `2.13.x`, matching the current Kuma documentation and chart repository at review time.
- The Helm values attempted to configure `dataPlane.resources`, which is not a Kuma chart value. The invalid block was removed; Kuma documents sidecar resource customization through `ContainerPatch`.
- The Helm values attempted to configure `controlPlane.apiServer.corsAllowedDomains`, which is part of Kuma control-plane configuration rather than the chart values path shown. The unnecessary block was removed.
- The HelmRepository example used a path outside the Flux Kustomization path shown later in the post. The path comment was updated so the source and release are reconciled together.
- The CNI block enabled Kuma CNI while the comment claimed the init container approach was being used. The snippet now leaves CNI disabled for the default init container approach.
- Sidecar injection was shown as a namespace annotation. Kuma documents `kuma.io/sidecar-injection` as a label, so the namespace manifest was corrected.
- The sample Service was missing `appProtocol: http`, which Kuma requires for HTTP routing policies such as `MeshHTTPRoute`.
- The access-control example used the older `TrafficPermission` policy. It was updated to `MeshTrafficPermission`, with mesh selection moved to the Kubernetes metadata labels used by current Kuma policy examples.
- The routing example used the older `TrafficRoute` policy. It was updated to `MeshHTTPRoute`, which current Kuma documentation recommends for HTTP routing.
- The circuit breaker example mixed fields from different policy generations. It was updated to `MeshCircuitBreaker` with current `connectionLimits` and `outlierDetection` structure.
- The verification command for traffic permissions was updated from `trafficpermissions` to `meshtrafficpermissions`.
- The troubleshooting command still checked namespace annotations after sidecar injection was moved to labels. It was updated to inspect namespace labels.

## Review Notes
The sample canary route references a frontend caller and a canary backend subset that are not fully defined in the abbreviated sample application. The policy syntax is valid, but a complete runnable demo would need matching frontend and canary workloads with the referenced labels/tags.
