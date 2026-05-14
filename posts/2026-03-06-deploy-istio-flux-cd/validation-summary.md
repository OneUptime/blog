# Validation Summary: How to Deploy Istio with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Flux CD
- Kubernetes
- Helm and HelmRelease
- Kustomization
- Istio PeerAuthentication
- Istio Telemetry
- Istio Ingress Gateway

## Sources Consulted
- Istio supported releases: https://istio.io/latest/docs/releases/supported-releases/
- Istio 1.22 release announcement and Kubernetes support: https://istio.io/latest/news/releases/1.22.x/announcing-1.22/
- Istio 1.22 end-of-life announcement: https://istio.io/latest/news/support/announcing-1.22-eol/
- Istio Helm installation guide: https://istio.io/latest/docs/setup/install/helm/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio Telemetry reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Envoy access log task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The guide used Istio `1.22.x`, which is end-of-life and was only officially supported on Kubernetes `1.27` to `1.30`. Updated the prerequisites and HelmRelease chart versions to `1.29.x`, which is a supported Istio release as of the review date.
- The HelmRelease examples used `istio-system` and `istio-ingress` as resource namespaces without creating those namespaces. Added Namespace manifests to the relevant snippets so Flux can apply the HelmRelease resources successfully.
- The PeerAuthentication example used `portLevelMtls` without a workload selector. Istio documents that port-level mTLS settings only apply when a workload selector is specified. Added a selector and aligned the port override with the sample workload container port.
- The upgrade example referenced upgrading from `1.22.x` to `1.23.x`, both outdated for this review. Updated the example to show upgrading from `1.28.x` to `1.29.x`.

## Review Notes
- The tracing example uses MeshConfig-based tracing, which remains documented, but Istio encourages users to transition tracing configuration to the Telemetry API.
- The AWS load balancer service annotations are provider-specific and may need adjustment for the exact AWS controller or EKS mode in use.
