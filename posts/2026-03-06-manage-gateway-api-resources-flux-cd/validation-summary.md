# Validation Summary: How to Manage Gateway API Resources with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Gateway API
- Flux CD v2
- Flux Kustomization
- Flux HelmRelease
- Flux OCIRepository
- Envoy Gateway
- Kubernetes Gateway, GatewayClass, HTTPRoute, and GRPCRoute resources
- kubectl and flux CLI verification commands

## Sources Consulted
- Kubernetes Gateway API getting started documentation: https://gateway-api.sigs.k8s.io/guides/getting-started/
- Kubernetes Gateway API v1.5 release announcement: https://kubernetes.io/blog/2026/04/21/gateway-api-v1-5/
- Kubernetes Gateway API v1.5 specification reference: https://gateway-api.sigs.k8s.io/reference/1.5/spec/
- Gateway API HTTP redirects and rewrites guide: https://gateway-api.sigs.k8s.io/guides/http-redirect-rewrite/
- Gateway API HTTP header modifier guide: https://gateway-api.sigs.k8s.io/guides/http-header-modifier/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Envoy Gateway Flux installation documentation: https://gateway.envoyproxy.io/v1.7/install/install-flux/
- Envoy Gateway Helm chart values reference: https://gateway.envoyproxy.io/v1.7/install/gateway-helm-api/
- Envoy Gateway Gateway API support documentation: https://gateway.envoyproxy.io/v1.7/tasks/traffic/gatewayapi-support/
- Envoy Gateway GitHub releases: https://github.com/envoyproxy/gateway/releases

## Issues Found
- The post described Gateway API as a direct replacement for Ingress. I changed this to "successor to the Ingress model" because Ingress remains a GA Kubernetes API while Gateway API is the newer, more expressive successor.
- The Gateway API CRD install URL used `v1.2.0`. I updated it to `v1.5.0`, the current standard install bundle documented by the Gateway API project as of this review.
- The Envoy Gateway Helm source used an HTTP HelmRepository URL, but the official Envoy Gateway Helm chart is published as an OCI artifact. I replaced it with a Flux `OCIRepository` pointing at `oci://docker.io/envoyproxy/gateway-helm`.
- The Envoy Gateway HelmRelease used `spec.chart` with a HelmRepository source. I updated it to use `spec.chartRef` against the `OCIRepository`, matching Flux and Envoy Gateway documentation for OCI charts.
- The Envoy Gateway HelmRelease was namespaced to `envoy-gateway-system`, which would require that namespace to exist before the HelmRelease object could be created. I moved the HelmRelease to `flux-system` and set `targetNamespace: envoy-gateway-system`, keeping `install.createNamespace: true`.
- The Envoy Gateway values placed resource requests under `deployment.resources`, but the chart defines container resources under `deployment.envoyGateway.resources`. I corrected the values path.
- The Gateway HTTP listener comment said it redirected to HTTPS, but the manifest only defined a listener and did not configure an HTTPRoute `RequestRedirect` filter. I changed the comment to describe the listener accurately.

## Review Notes
The Gateway API examples use Standard-channel `gateway.networking.k8s.io/v1` resources and fields that match current Gateway API documentation. Some features, especially filters such as `ResponseHeaderModifier`, can be implementation-dependent; Envoy Gateway documents support for the filter in current releases.
