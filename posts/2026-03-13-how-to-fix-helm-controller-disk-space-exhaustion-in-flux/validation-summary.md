# Validation Summary: How to Fix Helm Controller Disk Space Exhaustion in Flux

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux Helm Controller
- Flux Source Controller
- Flux HelmRelease API
- Kubernetes Deployments
- Kubernetes ephemeral storage
- Kubernetes emptyDir volumes
- Helm release secrets
- kubectl
- Kustomize patches

## Sources Consulted
- Flux Helm Controller options: https://fluxcd.io/flux/components/helm/options/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmChart documentation: https://fluxcd.io/flux/components/source/helmcharts/
- Flux Helm Controller deployment manifest: https://github.com/fluxcd/helm-controller/blob/main/config/manager/deployment.yaml
- Kubernetes resource management for ephemeral storage: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#local-ephemeral-storage
- Kubernetes emptyDir volume documentation: https://kubernetes.io/docs/concepts/storage/volumes/#emptydir
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Helm upgrade command documentation: https://helm.sh/docs/helm/helm_upgrade/

## Issues Found
- The temporary directory search used `find /tmp -type d -name "helm-*"`, which could miss Flux temporary paths using the `helmchart` prefix. Changed the pattern to `helm*`.
- The Source Controller chart size command used `/data/helmchart/*`, which reports namespace-level directories rather than chart-level directories. Changed it to `/data/helmchart/*/*`, matching Flux HelmChart artifact paths.
- The stale secret cleanup command could invoke `kubectl delete` with no input when there are no old revisions. Replaced `xargs` with a `while read` loop so the delete command only runs when there are objects to delete.
- The Kustomize patch for ephemeral storage used JSON patch paths that assume nested resource maps already exist. Replaced it with a strategic merge-style patch that sets the full `resources` block for the `manager` container while preserving the existing CPU and memory values from the Flux Helm Controller manifest.
- The concurrency patch could append a duplicate `--concurrent` argument if the flag was already present. Added text clarifying that the command should be used only when `--concurrent` is not already set.
- The post recommended mounting a new dedicated `/tmp` volume, but the Flux Helm Controller deployment already mounts an `emptyDir` volume named `temp` at `/tmp`. Updated the section to set `emptyDir.sizeLimit` on the existing volume instead.

## Review Notes
The post is technically valid after the corrections. Future improvements could mention that Flux `spec.maxHistory` defaults to 5, and that manually deleting Helm release secrets should be done carefully because Helm uses them for revision history and rollbacks.
