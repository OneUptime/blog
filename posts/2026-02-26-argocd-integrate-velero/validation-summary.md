# Validation Summary: How to Integrate ArgoCD with Velero for Backup

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Helm
- Velero
- AWS S3 backup storage
- GCP and Azure Velero backup storage

## Sources Consulted
- Argo CD resource hooks documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Argo CD custom health checks documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Velero Helm chart values for chart 5.2.0: https://raw.githubusercontent.com/vmware-tanzu/helm-charts/velero-5.2.0/charts/velero/values.yaml
- Velero current Helm chart values: https://raw.githubusercontent.com/vmware-tanzu/helm-charts/main/charts/velero/values.yaml
- Velero Schedule API type documentation: https://velero.io/docs/v1.17/api-types/schedule/
- Velero install CLI documentation: https://velero.io/docs/v1.17/velero-install/
- Velero BackupStorageLocation documentation: https://velero.io/docs/v1.0.0/api-types/backupstoragelocation/

## Issues Found
- The Helm values example used `credentials.secretContents` with `${AWS_ACCESS_KEY_ID}` and `${AWS_SECRET_ACCESS_KEY}` placeholders. Argo CD/Helm values do not automatically substitute those shell environment variables in Git-managed values, so this would create an unusable secret containing literal placeholders. Changed the example to use `credentials.existingSecret: velero-cloud-credentials` and added a short note to create that Secret separately.
- The Velero backup hook example omitted `includedResources: pods`. Velero backup exec hooks run against pod resources, and the official Schedule API example scopes hook resources to `pods`. Added `includedResources: pods`.
- The disaster recovery `velero install` command for AWS omitted the provider plugin and backup/snapshot location region configuration shown in the official Velero install examples. Updated the command to include `--plugins velero/velero-plugin-for-aws:v1.8.0`, `--backup-location-config region=us-east-1`, and `--snapshot-location-config region=us-east-1`.

## Review Notes
- The post pins the Velero Helm chart to `5.2.0`, which deploys Velero `v1.12.2` by default. The values shown are valid for that chart version, but future maintenance should consider updating the chart and plugin versions together.
- YAML snippets were parsed successfully after the corrections.
