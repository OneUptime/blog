# Validation Summary: How to Configure Custom Health Checks for StatefulSets in Flux Kustomization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux Kustomization
- Flux CLI
- Kubernetes StatefulSet
- Kubernetes readiness probes
- kubectl
- YAML configuration

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI `get kustomizations` reference: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes `kubectl rollout` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/

## Issues Found
- The debugging command used `flux get kustomization database`, but the official Flux CLI command is `flux get kustomizations`. Updated it to `flux get kustomizations postgres-cluster`.
- The debugging commands mixed resource names from different examples (`postgresql` and `postgres`). Updated the StatefulSet, pod, and log commands to use `postgres`, matching the StatefulSet example with `app=postgres`.

## Review Notes
The Flux Kustomization fields (`healthChecks`, `wait`, `timeout`, and `dependsOn`) are valid for `kustomize.toolkit.fluxcd.io/v1`. Kubernetes StatefulSet rollout behavior, default `RollingUpdate` strategy, ordered readiness behavior, and `kubectl rollout status` support for StatefulSets were verified against official Kubernetes documentation.
