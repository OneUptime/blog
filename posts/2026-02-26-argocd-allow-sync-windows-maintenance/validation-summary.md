# Validation Summary: How to Create Allow Sync Windows for Maintenance Windows in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD AppProject sync windows
- Kubernetes custom resources
- GitOps deployment controls
- Cron schedules and time zones
- Argo CD CLI

## Sources Consulted
- Argo CD Sync Windows documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD `argocd proj windows list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_windows_list/
- Argo CD AppProject project specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD v2.6 AppProject CRD schema: https://raw.githubusercontent.com/argoproj/argo-cd/v2.6.0/manifests/crds/appproject-crd.yaml
- Argo CD v2.7 AppProject CRD schema: https://raw.githubusercontent.com/argoproj/argo-cd/v2.7.0/manifests/crds/appproject-crd.yaml

## Issues Found
- Clarified that allow sync windows restrict syncs for matching applications. Argo CD documentation states that if no windows match an application, syncs are allowed, so the original wording was too broad.
- Corrected the quarter-end deny-window explanation. The cron schedule starts a 96-hour freeze on the 28th of March, June, September, and December; this is not exactly the last four calendar days for every quarter-ending month.
- Removed the inaccurate version-specific statement that implied Argo CD 2.6 lacks `timeZone` support. The v2.6 and v2.7 AppProject CRD schemas include the `timeZone` field.

## Review Notes
- The sync window fields used in the examples (`kind`, `schedule`, `duration`, `applications`, `clusters`, `manualSync`, and `timeZone`) match the AppProject sync window schema.
- The CLI verification commands match the current Argo CD command reference, but the local environment did not have the `argocd` CLI installed, so command verification was done against official documentation rather than local `--help` output.
