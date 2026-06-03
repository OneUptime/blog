# Validation Summary: How to Build Velero Integration with GitOps Workflows

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Velero
- GitOps
- Argo CD
- Argo CD ApplicationSet
- Kustomize
- GitHub Actions
- kubeconform
- Prometheus Operator
- Sealed Secrets
- External Secrets Operator

## Sources Consulted
- Velero BackupStorageLocation API documentation: https://velero.io/docs/v1.18/api-types/backupstoragelocation/
- Velero Schedule API documentation: https://velero.io/docs/v1.14/api-types/schedule/
- Velero backup reference and CLI examples: https://velero.io/docs/v1.17/backup-reference/
- Velero backup storage location documentation: https://velero.io/docs/v1.18/locations/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/release-2.14/user-guide/application-specification/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD ApplicationSet list generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators/
- Argo CD sync phases and hooks documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization
- GitHub Actions checkout action documentation: https://github.com/actions/checkout
- GitHub Actions environments documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- kubeconform usage documentation: https://kubeconform.mandragor.org/docs/usage/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Sealed Secrets documentation: https://github.com/bitnami-labs/sealed-secrets
- External Secrets Operator ExternalSecret API documentation: https://external-secrets.io/latest/api/externalsecret/

## Issues Found
- The production Kustomize overlay used the deprecated `bases` field. Changed it to include `../../base` under `resources`, which is the current Kustomize-compatible composition pattern.
- The ApplicationSet example mixed a Kustomize overlay path with Helm parameters, so the bucket and schedule values would not affect rendered manifests. Replaced those parameters with an explicit `overlay` value and `path: overlays/{{overlay}}`.
- The GitHub Actions workflow used `actions/checkout@v2`, which is outdated. Updated it to `actions/checkout@v4`.
- The pull request validation workflow used kubeval, which is unmaintained and does not reliably validate modern CRD-heavy manifests. Replaced it with kubeconform using `-strict -ignore-missing-schemas`.
- The post-sync validation Job used `velero/velero:latest` with `/bin/bash`, but Velero images are distroless and do not provide a shell. Updated the example to use a purpose-built tools image and `/bin/sh`.
- The production approval workflow implied GitHub environment approval would gate production while the earlier Argo CD Application had automated sync enabled. Added a note that automated sync must be disabled for that approval workflow to control production syncs.
- The runbook Markdown example had broken nested code fences. Changed the outer Markdown fence to four backticks and removed stray trailing fences.

## Review Notes
- The Velero CRD fields, Schedule templates, BackupStorageLocation fields, Argo CD Application fields, ApplicationSet list generator structure, PrometheusRule example, SealedSecret example, and ExternalSecret example are technically valid when the corresponding CRDs/controllers are installed.
- The kubeconform command intentionally ignores missing schemas because Velero and Argo CD resources are custom resources unless their schemas are supplied separately.
