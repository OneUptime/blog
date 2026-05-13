# Validation Summary: How to Configure FluxInstance with Specific Flux Version

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux Operator
- FluxInstance custom resource
- Flux CD
- Kubernetes
- kubectl
- Prometheus Operator PrometheusRule

## Sources Consulted
- Flux Operator FluxInstance documentation: https://fluxoperator.dev/docs/crd/fluxinstance/
- Flux Operator monitoring and reporting documentation: https://fluxoperator.dev/docs/instance/monitoring/
- Kubernetes kubectl create secret docker-registry reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Flux CD release policy and support information: https://fluxcd.io/flux/releases/
- Flux CD Flux 2.4.0 release announcement: https://fluxcd.io/blog/2024/09/flux-v2.4.0/
- Flux CD Flux 2.5.0 release announcement: https://fluxcd.io/blog/2025/02/flux-v2.5.0/

## Issues Found
- The private registry FluxInstance example used a third-party registry without setting `.spec.distribution.variant`. Flux Operator documentation states that `variant` is required when specifying a third-party registry or registry mirror. Added `variant: upstream-alpine` to match a mirror of the upstream Flux distribution.
- The Prometheus alert used `flux_instance_info{version!="2.4.0"}`, but the documented `flux_instance_info` metric exposes `revision`, not `version`. Updated the expression to match the installed revision label with `revision!~"v2\\.4\\.0@.*"`.

## Review Notes
The examples use Flux 2.4.0 and 2.5.0, which are real Flux releases, but as of this review they are older than the current Flux 2.8 series shown in Flux Operator examples and GitHub releases. The examples remain technically valid for demonstrating exact version pinning and upgrades, but future updates may want to use currently supported Flux minor versions.
