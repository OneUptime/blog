# Validation Summary: How to Fix 'dry-run failed' Error in Flux CD Kustomization

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Flux CD
- Flux Kustomization
- Flux HelmRelease
- Kubernetes server-side apply and dry-run
- Kubernetes CRDs
- Kubernetes RBAC
- Kubernetes API version migration

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Kubernetes Deprecated API Migration Guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/

## Issues Found
- The CRD Kustomization example implied CRDs should not use server-side apply validation. Flux Kustomizations validate and apply manifests through the Kubernetes API; `wait: true` performs health checks. Changed the comment to say it waits for CRDs to be established.
- The HelmRelease dependency example implied a Kustomization can depend directly on a HelmRelease. Flux `.spec.dependsOn` references other Kustomization resources, so the text now says to depend on the Kustomization that applies the HelmRelease.
- The server-side apply conflict section recommended `.spec.force: true` to take ownership of conflicting fields. Flux `.spec.force` recreates resources when immutable field patching fails; it is not an SSA conflict override. Replaced the example with the documented `kustomize.toolkit.fluxcd.io/ssa: "Merge"` resource annotation and clarified its limits.
- The "Skipping Dry-Run Validation" section showed `kustomize.toolkit.fluxcd.io/ssa: "IfNotPresent"` on a Flux Kustomization and combined it with `force: true`. That annotation is for managed resources, not for disabling Kustomization dry-run validation. Replaced the section with a note that Flux does not provide a Kustomization field to disable dry-run validation and showed the documented `Ignore` policy for resources Flux should not manage.
- Local dry-run commands used `kubectl apply --dry-run=server`, which performs server-side dry-run but does not explicitly request server-side apply. Updated relevant commands to `kubectl apply --server-side --dry-run=server` to better match Flux's server-side apply behavior.

## Review Notes
The API removal examples for Ingress, CronJob, and PodDisruptionBudget match the Kubernetes deprecation guide. The `kubectl get all` helper only checks the resource types included by `kubectl get all`; a future revision could use a more comprehensive cluster audit approach for deprecated API discovery.
