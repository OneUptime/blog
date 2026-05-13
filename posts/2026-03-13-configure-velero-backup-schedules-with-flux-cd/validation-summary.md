# Validation Summary: How to Configure Velero Backup Schedules with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Velero
- Velero Schedule custom resources
- Velero backup hooks
- Kubernetes custom resources
- Flux CD Kustomization resources
- AWS S3 CLI verification

## Sources Consulted
- Velero Schedule API Type documentation: https://velero.io/docs/v1.17/api-types/schedule/
- Velero Backup Hooks documentation: https://velero.io/docs/main/backup-hooks/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes label selector documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/

## Issues Found
- The Velero `Schedule` examples placed generated backup labels directly under `spec.template.labels`. Velero's Schedule API documents generated backup labels under `spec.template.metadata.labels`. Updated all schedule examples to use `metadata.labels` so backups created by the schedules receive the intended labels and the later `velero backup get --selector schedule=full-cluster-daily` command can match them.

## Review Notes
- The Flux `Kustomization` example uses the current `kustomize.toolkit.fluxcd.io/v1` API and valid `sourceRef`, `path`, `prune`, `interval`, and `dependsOn` fields.
- The Velero hook example uses supported `pre` and `post` exec hook fields. Hook commands are correctly wrapped in `/bin/sh -c` because Velero does not execute hook commands through a shell by default.
- The namespace-specific examples set `includeClusterResources: false`, which is valid. For workloads that depend on cluster-scoped resources such as CRDs, storage classes, or persistent volumes, future revisions could explain when to leave this field unset or include selected cluster-scoped resources.
