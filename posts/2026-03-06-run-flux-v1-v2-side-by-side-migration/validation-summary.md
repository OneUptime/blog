# Validation Summary: How to Run Flux v1 and v2 Side by Side During Migration

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Flux CD
- Flux v1 / Flux Legacy
- Flux v2 GitOps Toolkit
- Kubernetes
- Helm and Flux HelmRelease resources
- Flux image automation

## Sources Consulted
- Flux official migration guide: https://fluxcd.io/flux/migration/flux-v1-migration/
- Flux official Helm Operator migration guide: https://fluxcd.io/flux/migration/helm-operator-migration/
- Flux official HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux official image automation migration guide: https://fluxcd.io/flux/migration/flux-v1-automation-migration/
- Flux official ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux v1 daemon flag reference: https://github.com/fluxcd/flux/blob/master/docs/references/daemon.md
- Flux v1 .flux.yaml reference: https://github.com/fluxcd/flux/blob/master/docs/references/fluxyaml-config-files.md

## Issues Found
- The post suggested using a `.flux.yaml` file with empty `commandUpdated` generators as a way to make Flux v1 skip a directory. Flux v1 `.flux.yaml` is for manifest generation under target paths, not a general ignore file. Replaced that option with moving migrated manifests outside every Flux v1 `--git-path`.
- The Flux v2 `Kustomization` pointed at `./workloads/worker-service`, but the later migration command moved the manifests to `workloads/migrated/worker-service`. Updated the Kustomization path to match the migrated location.
- The Helm migration steps said to delete the Flux v1 `HelmRelease` while implying the deployed resources would remain. The official migration guide warns that deleting the old resource while Helm Operator is running can delete the Helm release. Added a step to scale the Helm Operator down before deleting the v1 custom resource.
- The Flux v2 HelmRelease example omitted `releaseName` and `storageNamespace`. Because the example places the HelmRelease object in `flux-system` while the existing release is in `ingress`, Flux v2 needs matching release and storage settings to adopt the existing release. Added `releaseName: nginx-ingress` and `storageNamespace: ingress`.
- The Flux v2 image automation marker was on the line before the `image` field. Flux expects the setter marker as an inline comment on the field to update. Moved the marker to the end of the `image:` line.

## Review Notes
Flux v1 and Helm Operator are end-of-life, but the migration topic remains technically relevant for legacy clusters. Future revisions could add stronger caveats around testing migration order in non-production and checking whether the existing Helm release uses Helm v2 or Helm v3 storage.
