# Validation Summary: How to Configure Kubernetes Gateway API with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Gateway API
- Flux CD
- Envoy Gateway
- Kubernetes CRDs
- GatewayClass, Gateway, and HTTPRoute
- HelmRelease and OCIRepository

## Sources Consulted
- Kubernetes Gateway API documentation: https://gateway-api.sigs.k8s.io/
- Kubernetes Gateway API v1.4.1 release assets and CRD layout: https://github.com/kubernetes-sigs/gateway-api/releases/tag/v1.4.1
- Kubernetes Gateway API hostnames documentation: https://gateway-api.sigs.k8s.io/concepts/hostnames/
- Kubernetes Gateway API HTTP redirect and rewrite guide: https://gateway-api.sigs.k8s.io/guides/http-redirect-rewrite/
- Envoy Gateway install with Flux CD documentation: https://gateway.envoyproxy.io/v1.7/install/install-flux/
- Envoy Gateway Helm chart values documentation: https://gateway.envoyproxy.io/docs/install/gateway-helm-api/
- Envoy Gateway compatibility matrix: https://gateway.envoyproxy.io/news/releases/matrix/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The Gateway API CRD source used `oci://ghcr.io/fluxcd/manifests/gateway-api` with tag `v1.2.0`, which is not the official Gateway API release source and was outdated for this guide. Changed it to a Flux `GitRepository` pointing at `https://github.com/kubernetes-sigs/gateway-api` tag `v1.4.1`, with the Kustomization path set to `./config/crd`.
- The prerequisites listed Kubernetes `v1.26 or later`, but the updated Envoy Gateway v1.7 compatibility matrix supports Kubernetes v1.32 through v1.35. Updated the prerequisite accordingly.
- The Envoy Gateway Helm source used an HTTP `HelmRepository` URL that returns 404 and is not the current official chart distribution method. Replaced it with an `OCIRepository` for `oci://docker.io/envoyproxy/gateway-helm`.
- The Envoy Gateway `HelmRelease` used the older chart template style and version `1.2.x`. Updated it to the official Flux `chartRef` pattern with Envoy Gateway `v1.7.3`.
- The Envoy Gateway values placed controller resource requests and limits under top-level `resources`, but the chart expects them under `deployment.envoyGateway.resources`. Moved the values to the correct path.
- The Gateway example defined two HTTPS listeners on port 443 where one listener had no hostname and another used `api.example.com`, creating an overlapping listener configuration. Added `hostname: "app.example.com"` to the general HTTPS listener.
- The `api-https` listener allowed routes only from namespaces matching a selector, but the example HTTPRoute was in the `default` namespace without showing the required namespace label. Changed the listener to `allowedRoutes.namespaces.from: Same` so the sample route can attach.
- The path-based `HTTPRoute` for `api.example.com` referenced the wrong listener section. Updated it to `sectionName: api-https`.

## Review Notes
The final Flux Kustomization uses `dependsOn` entries that must refer to Flux Kustomization resources, not directly to the HelmRelease object. This is valid if the Envoy Gateway manifests are applied by a separate Flux Kustomization named `envoy-gateway`; otherwise, that dependency object should be added in the repository structure.
