# Validation Summary: How to Configure Flux Operator for Multi-Cluster Fleet Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux
- Flux Operator
- FluxInstance custom resources
- Kubernetes
- Kustomize
- Helm
- Prometheus and PrometheusRule
- Sealed Secrets

## Sources Consulted
- Flux Operator FluxInstance API reference: https://fluxoperator.dev/docs/crd/fluxinstance/
- Flux Operator installation guide: https://fluxoperator.dev/docs/guides/install/
- Flux Operator Helm chart documentation: https://fluxoperator.dev/docs/charts/flux-operator/
- Flux Operator instance customization guide: https://fluxoperator.dev/docs/instance/customization/
- Flux Operator GitHub repository documentation: https://github.com/controlplaneio-fluxcd/flux-operator
- Kustomize v5.0.0 release notes / deprecations: https://github.com/kubernetes-sigs/kustomize/releases/tag/kustomize%2Fv5.0.0
- Prometheus federation documentation: https://prometheus.io/docs/prometheus/latest/federation/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
- The bootstrap script installed the operator from the older `fluxcd-community` Helm repository. Updated it to install the official Flux Operator OCI chart from `oci://ghcr.io/controlplaneio-fluxcd/charts/flux-operator`, matching current Flux Operator documentation.
- The production Kustomize overlay used deprecated `patchesStrategicMerge`. Replaced it with the current `patches` field using `path: flux-instance-patch.yaml`.
- The bootstrap script declared an unused `GIT_REPO` variable. Removed it because it was not used by any command in the script.
- The Prometheus alert examples used `flux_instance_ready` and grouped by a `version` label on `flux_instance_info`. Current Flux Operator docs expose FluxInstance status through `flux_instance_info` labels including `ready` and `revision`, so the alerts now use `flux_instance_info{ready!="True"} == 1` and group version drift by `revision`.

## Review Notes
- The `FluxInstance` API version and fields used in the examples are valid for the current Flux Operator API.
- The Flux version examples pin older Flux versions (`2.4.0` and `2.5.0`), but they are syntactically valid examples of exact version pinning. A future content refresh could update these example versions to the latest Flux release line.
