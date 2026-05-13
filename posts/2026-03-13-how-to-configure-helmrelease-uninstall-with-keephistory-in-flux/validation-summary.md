# Validation Summary: How to Configure HelmRelease Uninstall with keepHistory in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Helm Controller
- HelmRelease `helm.toolkit.fluxcd.io/v2`
- Helm
- Kubernetes Secrets
- kubectl

## Sources Consulted
- Flux HelmRelease API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease guide: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux for Helm users: https://fluxcd.io/flux/use-cases/helm/
- Helm `helm uninstall` command reference: https://helm.sh/docs/helm/helm_uninstall/
- Helm `helm history` command reference: https://helm.sh/docs/helm/helm_history/
- Helm `helm get values` command reference: https://helm.sh/docs/helm/helm_get_values/
- Helm Using Helm guide: https://helm.sh/docs/v3/intro/using_helm/

## Issues Found
- The post stated that preserved history during uninstall remediation could cause a subsequent reinstall to behave as an upgrade. Flux documents that when upgrade remediation uses the `uninstall` strategy, the install configuration takes over after uninstall, while Helm/Flux retained history affects release-name reuse and replacement behavior. Updated the wording to say that keeping history leaves a deleted release record behind and may require explicit replacement behavior for a later install with the same release name.

## Review Notes
The Flux `spec.uninstall.keepHistory`, `disableHooks`, `disableWait`, `timeout`, and `maxHistory` fields are current for `helm.toolkit.fluxcd.io/v2`. Helm command examples use valid commands and flags. Flux currently documents `maxHistory` as defaulting to 5 revisions, with 0 meaning unlimited.
