# Validation Summary: How to Configure HelmRelease Uninstall with disableHooks in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux HelmRelease
- Helm
- Kubernetes
- GitOps
- Helm hooks

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux CLI `flux reconcile helmrelease` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_helmrelease/
- Helm `helm uninstall` command documentation: https://docs.helm.sh/docs/helm/helm_uninstall/
- Helm chart hooks documentation: https://helm.sh/docs/topics/charts_hooks/
- Helm uninstall implementation: https://github.com/helm/helm/blob/main/pkg/action/uninstall.go

## Issues Found
No technical issues found.

## Review Notes
The post uses the current Flux `helm.toolkit.fluxcd.io/v2` HelmRelease API and valid fields under `spec.install`, `spec.upgrade`, and `spec.uninstall`. The `disableHooks` setting corresponds to Helm uninstall behavior with `--no-hooks`, and the Flux troubleshooting guidance matches the official Flux documentation for failed uninstalls caused by failing pre-delete hooks.
