# Validation Summary: How to Export Kustomization Resources in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux CLI
- Kubernetes Kustomization custom resources
- Kubernetes CronJobs
- GitOps backup and migration workflows

## Sources Consulted
- Flux CLI `flux export kustomization` documentation: https://fluxcd.io/flux/cmd/flux_export_kustomization/
- Flux CLI `flux export source git` documentation: https://fluxcd.io/flux/cmd/flux_export_source_git/
- Flux CLI `flux get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI installation and container image documentation: https://fluxcd.io/flux/cmd/
- Flux CLI source confirming `ks` aliases and exported metadata/spec behavior: https://raw.githubusercontent.com/fluxcd/flux2/main/cmd/flux/export_kustomization.go
- Flux v2.8.7 release page: https://github.com/fluxcd/flux2/releases/tag/v2.8.7
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
- The post stated that `flux export ks` removes runtime annotations/generated runtime metadata. Flux's export implementation preserves object labels and annotations while rebuilding the resource with TypeMeta, ObjectMeta name/namespace/labels/annotations, and spec. I changed the wording to say it removes status, managed fields, and Kubernetes-generated identifiers while preserving configured labels and annotations.
- The `Export vs. kubectl get` section described the export as "just spec". The output also includes API version, kind, metadata, labels, annotations, and spec, so I changed the comment to "metadata and spec".
- The CronJob example referenced a ServiceAccount and PersistentVolumeClaim but did not say they must exist. I added a short prerequisite note for the ServiceAccount, RBAC permissions, and PVC.

## Review Notes
- The `flux export ks` alias is valid in the Flux CLI source, although official CLI docs primarily display the full `flux export kustomization` form.
- `flux export source git --all`, `flux export alert --all`, `flux export alert-provider --all`, and `flux export receiver --all` are valid commands in current Flux documentation. The alert and provider export commands are marked preview in Flux documentation.
- Source credential Secrets are not exported by `flux export source git --all` unless `--with-credentials` is used; the post correctly notes that referenced Secrets must exist on the target cluster during migration.
