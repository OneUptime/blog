# Validation Summary: How to Fix Source Controller Disk Space Exhaustion in Flux

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux Source Controller
- Flux CLI
- Kubernetes
- PersistentVolumeClaims
- emptyDir volumes
- Helm repositories
- GitRepository, HelmRepository, HelmChart, and OCIRepository resources

## Sources Consulted
- Flux Source Controller documentation: https://fluxcd.io/flux/components/source/
- Flux Source Controller options: https://fluxcd.io/flux/components/source/options/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux vertical scaling and persistent artifact storage documentation: https://fluxcd.io/flux/installation/configuration/vertical-scaling/
- Flux CLI `flux get sources all`: https://fluxcd.io/flux/cmd/flux_get_sources_all/
- Flux CLI `flux delete source git`: https://fluxcd.io/flux/cmd/flux_delete_source_git/
- Flux CLI `flux delete source helm`: https://fluxcd.io/flux/cmd/flux_delete_source_helm/
- Kubernetes local ephemeral storage documentation: https://kubernetes.io/docs/concepts/storage/ephemeral-storage/
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes StorageClass volume expansion documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/

## Issues Found
- The post said Git repositories with extensive history or many branches can consume significant Source Controller artifact storage. Flux GitRepository resources produce an artifact for a resolved revision, and `spec.ignore` applies while archiving, so the clearer storage risk is large files or broad working trees in the produced artifact. Updated the wording accordingly.
- The `spec.ignore` example omitted the important Flux behavior that specifying `ignore` overrides the default exclusion list. Added that caveat to avoid readers accidentally re-including files Flux would otherwise exclude.
- The Helm repository index section said popular indexes can be hundreds of megabytes without mentioning Flux's configured maximum index size. Added a note that Flux rejects indexes larger than `--helm-index-max-size`.
- The PVC resize example used a partial PersistentVolumeClaim manifest with a generic name, which is ambiguous and can be unsafe as an apply example. Replaced it with a `kubectl patch pvc` command that updates only `spec.resources.requests.storage` on the existing claim.

## Review Notes
The remaining commands and Kubernetes snippets are syntactically plausible and align with the official Flux and Kubernetes documentation. The manual artifact deletion command is intentionally generic; in a production cluster, operators should identify exact artifact directories before deleting data from `/data`.
