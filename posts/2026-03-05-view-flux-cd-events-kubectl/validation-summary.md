# Validation Summary: How to View Flux CD Events with kubectl

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes events
- kubectl
- Flux CD controllers
- Flux CLI
- jq

## Sources Consulted
- Kubernetes kubectl events reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kubectl describe reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Kubernetes kube-apiserver reference for event TTL: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Flux events documentation: https://fluxcd.io/flux/monitoring/events/
- Flux events CLI reference: https://fluxcd.io/flux/cmd/flux_events/
- Flux notification controller documentation: https://fluxcd.io/flux/components/notification/

## Issues Found
- The cluster-wide `jq` example filtered on `.source.component` directly. Non-Flux Kubernetes events may not have that field, which can cause `jq` to error when `test()` receives `null`. Updated the filter to fall back to `.reportingComponent` and then an empty string before applying `test()`.

## Review Notes
The post uses `kubectl get events`, which remains valid and supports the documented `--field-selector`, `--sort-by`, `--watch`, JSON, wide, and custom-column patterns. Current Kubernetes and Flux documentation also highlight the newer `kubectl events` command with `--for` and `--types`, which could be a useful future enhancement but is not required for correctness.
