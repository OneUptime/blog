# Validation Summary: How to Deploy Dex Identity Provider with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dex Identity Provider
- OpenID Connect (OIDC)
- Flux CD
- Kubernetes
- Helm and HelmRelease
- Kustomize
- SOPS
- kubelogin
- Kubernetes RBAC

## Sources Consulted
- Dex Helm chart repository and chart values: https://github.com/dexidp/helm-charts
- Dex Helm chart templates: https://github.com/dexidp/helm-charts/tree/master/charts/dex/templates
- Dex configuration example: https://github.com/dexidp/dex/blob/master/config.yaml.dist
- Dex storage documentation: https://dexidp.io/docs/configuration/storage/
- Dex GitHub connector documentation: https://dexidp.io/docs/connectors/github/
- Dex LDAP connector documentation: https://dexidp.io/docs/connectors/ldap/
- Dex Google connector documentation: https://dexidp.io/docs/connectors/google/
- Dex Kubernetes authentication guide: https://dexidp.io/docs/guides/kubernetes/
- Flux HelmRelease API documentation: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes authentication documentation: https://kubernetes.io/docs/reference/access-authn-authz/authentication/
- kubelogin documentation: https://github.com/int128/kubelogin

## Issues Found
- The HelmRelease used `replicas`, but the official Dex Helm chart uses `replicaCount`. Changed the value key to `replicaCount`.
- The chart version was pinned to `0.19.x`, while the current official Dex chart line is `0.24.x`. Updated the example to `0.24.x`.
- The gRPC Dex config was present, but the chart's gRPC service/container port is controlled by the top-level `grpc.enabled` value. Added `grpc.enabled: true`.
- Static clients used `secret: $ENV_VAR`; Dex static clients use `secretEnv` for environment-sourced client secrets. Changed the Kubernetes, Grafana, and custom app clients to `secretEnv`.
- The token configuration used deprecated `expiry.signingKeys`. Replaced it with `signer.config.keysRotationPeriod`.
- The service values included a configurable telemetry service port, but the Dex chart exposes telemetry on a fixed service port. Removed the unsupported `service.ports.telemetry` value.
- The GitHub RBAC group names omitted the organization prefix. Updated them to match Dex's GitHub group claim format of `<org>:<team>` plus the Kubernetes OIDC group prefix.
- The Flux Kustomization resource was shown as `clusters/my-cluster/dex/kustomization.yaml`, which conflicts with the Kustomize file expected at the reconciled path. Added a real Kustomize `kustomization.yaml` under `dex/` and moved the Flux Kustomization resource example to `clusters/my-cluster/kustomization-dex.yaml`.
- The kubelogin verification command did not request the `groups` scope, which is needed for group-based RBAC checks. Added `--oidc-extra-scope=groups`.

## Review Notes
The examples remain environment-specific placeholders and require real OAuth clients, SOPS metadata, TLS configuration, and provider-specific control plane support. `helm`, `flux`, and `kubectl` were not installed in the review environment, so local chart rendering and CLI help checks could not be performed; validation was done against official upstream documentation and chart source.
