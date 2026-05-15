# Validation Summary: How to Export and Backup GitRepository Resources in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux CLI
- Kubernetes custom resources
- Kubernetes Secrets
- Kubernetes CronJobs
- SOPS
- age encryption
- GitOps backup and restore workflows

## Sources Consulted
- Flux CLI command reference for `flux export source git`: https://fluxcd.io/flux/cmd/flux_export_source_git/
- Flux CLI command reference for `flux export kustomization`: https://fluxcd.io/flux/cmd/flux_export_kustomization/
- Flux CLI command reference for `flux export helmrelease`: https://fluxcd.io/flux/cmd/flux_export_helmrelease/
- Flux CLI command reference for `flux export alert` and `flux export alert-provider`: https://fluxcd.io/flux/cmd/flux_export_alert/ and https://fluxcd.io/flux/cmd/flux_export_alert-provider/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux installation documentation for CLI images and `flux install`: https://fluxcd.io/flux/installation/
- Flux releases / GitHub releases API for the `v2.8.7` CLI image tag: https://github.com/fluxcd/flux2/releases
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Flux SOPS guide: https://fluxcd.io/flux/guides/mozilla-sops/

## Issues Found
No technical issues found.

## Review Notes
The Flux export examples are correct for the selected namespace, which defaults to `flux-system` unless `--namespace` is supplied. Operators who keep Flux resources in multiple namespaces would need to run the exports per namespace or otherwise account for that scope. The `flux export alert-provider` command is marked preview in the Flux CLI reference, but the command and examples used in the post are current.
