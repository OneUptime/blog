# Validation Summary: How to Configure HelmRelease Max History in Flux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Flux CD Helm Controller
- HelmRelease custom resources
- Helm
- Kubernetes Secrets
- kubectl
- flux CLI

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux CLI `flux reconcile helmrelease` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_helmrelease/
- Helm `helm upgrade` command documentation: https://helm.sh/docs/helm/helm_upgrade/
- Helm `helm history` command documentation: https://helm.sh/docs/helm/helm_history/
- Helm 3 FAQ on Secrets as the default storage driver: https://helm.sh/docs/v3/faq/changes_since_helm2/

## Issues Found
- The post said Helm release Secrets are stored in the release namespace. In Flux, Helm storage defaults to the HelmRelease namespace and can be changed with `spec.storageNamespace`, which may differ from the release target namespace. Updated the wording to refer to the Helm storage namespace.
- The cleanup example used `flux reconcile helmrelease` without `--force`, which only triggers reconciliation and does not necessarily perform a Helm install or upgrade. Updated the command to `flux reconcile helmrelease my-app -n default --force`, matching Flux documentation for forcing a one-off install or upgrade.
- The cleanup command comment said Secrets were sorted by revision, but the command sorted by creation timestamp. Updated the comment to match the command.
- The history count command counted the table header from `helm history`. Updated it to skip the header before piping to `wc -l`.

## Review Notes
The `spec.maxHistory` field, default value of `5`, unlimited value of `0`, Helm direct `--history-max` default of `10`, and Flux remediation example fields were verified against current official documentation.
