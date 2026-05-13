# Validation Summary: How to Configure Flux Controller Pod Topology Spread Constraints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux
- Kubernetes Deployments
- Kubernetes pod topology spread constraints
- Kubernetes node affinity
- Kustomize patches
- kubectl
- Git

## Sources Consulted
- Kubernetes documentation: Pod Topology Spread Constraints - https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes documentation: Well-Known Labels, Annotations and Taints - https://kubernetes.io/docs/reference/labels-annotations-taints/
- Flux documentation: Bootstrap customization - https://fluxcd.io/flux/installation/configuration/bootstrap-customization/
- Flux official manifests: source-controller Kustomize base and release deployment - https://github.com/fluxcd/flux2/tree/main/manifests/bases/source-controller
- Flux official manifests: helm-controller and kustomize-controller Kustomize bases - https://github.com/fluxcd/flux2/tree/main/manifests/bases

## Issues Found
- The verification step used `kubectl get pods -n flux-system -o wide` and then said to confirm pods are on different nodes or zones. That command shows pod node placement but does not display node zone labels. I added `kubectl get nodes -L topology.kubernetes.io/zone` and updated the explanatory sentence so zone-level verification is accurate.

## Review Notes
- The topology spread constraint fields, `maxSkew`, `topologyKey`, `whenUnsatisfiable`, and `labelSelector`, match the Kubernetes pod spec API.
- The Flux controller examples use the default `app` labels from the official controller deployment manifests, and the Flux bootstrap customization pattern using Kustomize patches is consistent with the Flux documentation.
- `ScheduleAnyway` is correctly described as a soft scheduling preference. With that setting, the scheduler prioritizes placements that reduce skew but may still schedule pods even when the target skew cannot be achieved.
