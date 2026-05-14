# Validation Summary: How to Configure Flagger with Gateway API and Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes Gateway API
- HTTPRoute
- Envoy Gateway
- Flux
- Flagger
- HelmRelease and HelmRepository
- Prometheus
- Canary deployments

## Sources Consulted
- Flagger Gateway API Canary Deployments: https://docs.flagger.app/main/tutorials/gatewayapi-progressive-delivery
- Flagger Install with Flux: https://docs.flagger.app/main/install/flagger-install-with-flux
- Flagger Metrics Analysis: https://docs.flagger.app/main/usage/metrics
- Flagger Helm chart values: https://github.com/fluxcd/flagger/blob/main/charts/flagger/values.yaml
- Flagger Canary CRD: https://github.com/fluxcd/flagger/blob/main/artifacts/flagger/crd.yaml
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Envoy Gateway Helm installation documentation: https://gateway.envoyproxy.io/latest/install/install-helm/
- Envoy Gateway HTTP routing documentation: https://gateway.envoyproxy.io/latest/tasks/traffic/http-routing/
- Gateway API releases: https://github.com/kubernetes-sigs/gateway-api/releases

## Issues Found
- The Gateway API CRD Flux source used `oci://ghcr.io/fluxcd/manifests/gateway-api`, which could not be verified as the official Gateway API source. Changed it to a Flux `GitRepository` pointing at `https://github.com/kubernetes-sigs/gateway-api` and updated the Kustomization path to `./config/crd`.
- The direct Gateway API CRD install command used the older `v1.1.0` URL. Updated it to `v1.5.1` and added `--server-side`, matching current Gateway API release installation practice.
- The Envoy Gateway Helm repository URL `https://gateway.envoyproxy.io/charts` returned 404. Updated the Flux source to an OCI HelmRepository using `oci://docker.io/envoyproxy`, matching Envoy Gateway's official Helm chart location.
- The Envoy Gateway and Prometheus HelmRelease resources were placed in namespaces that had not been created. Added namespace manifests for `envoy-gateway-system` and `monitoring`.
- The Gateway example referenced a `gatewayClassName` without defining a matching `GatewayClass`. Added a `GatewayClass` with Envoy Gateway's official controller name.
- The Flagger Helm values used `meshProvider: gatewayapi`, but current Flagger values document `gatewayapi:v1` and `gatewayapi:v1beta1`. Updated the provider to `gatewayapi:v1`.
- The post instructed readers to define an HTTPRoute manually and used `spec.routeRef` in the Canary. Flagger's Gateway API provider generates the HTTPRoute from `spec.service.hosts` and `spec.service.gatewayRefs`; `routeRef` is for APISIX routes in the Flagger CRD. Updated the HTTPRoute step to describe the generated route and moved the Gateway API route attachment configuration into the Canary service spec.
- The `demo` namespace was created after the Gateway resource that used it. Moved namespace creation before the Gateway.
- Troubleshooting text referred to `routeRef` for Gateway API. Updated it to refer to `gatewayRefs` and Gateway route acceptance.

## Review Notes
- The built-in Flagger metrics `request-success-rate` and `request-duration` are valid, but in real clusters the underlying Prometheus queries depend on the Gateway API implementation and metrics emitted by the data plane.
- The Envoy Gateway chart version is pinned to the current stable `v1.8.0` rather than a floating range so the example remains reproducible.
