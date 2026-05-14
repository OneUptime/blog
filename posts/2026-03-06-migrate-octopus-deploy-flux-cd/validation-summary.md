# Validation Summary: How to Migrate from Octopus Deploy to Flux CD

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Flux CD
- Octopus Deploy
- Kubernetes
- Kustomize
- Helm
- GitOps
- Kubernetes Jobs
- Flux notification-controller

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux GitRepository and HelmRepository source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux bootstrap GitHub command reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/

## Issues Found
- The Kustomize overlay examples used `patchesStrategicMerge`, which is deprecated in current Kustomize usage. Changed the examples to use the current `patches` field with `path`.
- The Flux production Kustomization set `wait: true` together with explicit `healthChecks`. Flux ignores `healthChecks` when `wait` is true, so the example no longer sets `wait: true` there.
- The Flux Kustomization examples referenced production and staging namespaces but did not explicitly target those namespaces. Added `targetNamespace` to the staging and production examples.
- The lifecycle mapping overstated Flux Kustomization dependencies as an across-cluster lifecycle replacement. Updated the wording to describe Git-based promotion between cluster paths, while noting that Kustomization dependencies are for ordering within a cluster.
- The runbook Job example implied annotations and `force: true` would rerun a Job. Updated the Job name and comments to show that each rerun needs a unique Job name, and clarified that Flux `force` is for recreating resources when immutable fields change.
- The Flux notification examples used `notification.toolkit.fluxcd.io/v1`, but current Flux notification Provider and Alert examples use `notification.toolkit.fluxcd.io/v1beta3`. Updated both API versions.

## Review Notes
The remaining examples are intentionally illustrative and assume supporting resources such as namespaces, secrets, container images, chart repositories, and Git credentials already exist or are created elsewhere. The Flux and Kubernetes API versions shown are current as of 2026-05-14.
